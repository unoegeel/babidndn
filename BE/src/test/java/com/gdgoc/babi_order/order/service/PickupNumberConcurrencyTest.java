package com.gdgoc.babi_order.order.service;

import com.gdgoc.babi_order.menu.repository.MenuOptionRepository;
import com.gdgoc.babi_order.menu.repository.MenuRepository;
import com.gdgoc.babi_order.order.entity.Order;
import com.gdgoc.babi_order.order.repository.OrderRepository;
import com.gdgoc.babi_order.order.security.OrderAccessGuard;
import com.gdgoc.babi_order.order.security.OrderAccessTokens;
import com.gdgoc.babi_order.push.service.PushNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import({
        OrderService.class,
        PickupNumberLock.class,
        OrderAccessGuard.class
})
class PickupNumberConcurrencyTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @MockitoBean
    private MenuRepository menuRepository;

    @MockitoBean
    private MenuOptionRepository menuOptionRepository;

    @MockitoBean
    private OrderEventService orderEventService;

    @MockitoBean
    private PushNotificationService pushNotificationService;

    @BeforeEach
    void clearOrders() {
        entityManager.getEntityManager().createNativeQuery("DELETE FROM order_item_options").executeUpdate();
        entityManager.getEntityManager().createNativeQuery("DELETE FROM order_items").executeUpdate();
        entityManager.getEntityManager().createNativeQuery("DELETE FROM orders").executeUpdate();
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    void simultaneousActivationAssignsDistinctActivePickupNumbers() throws Exception {
        Order first = persistUnpaidOrder(baseTime);
        Order second = persistUnpaidOrder(baseTime.plusSeconds(1));
        entityManager.flush();
        Long firstId = first.getId();
        Long secondId = second.getId();
        commitAndRestart();

        TransactionTemplate requiresNew = new TransactionTemplate(transactionManager);
        requiresNew.setPropagationBehavior(TransactionTemplate.PROPAGATION_REQUIRES_NEW);

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<Integer> f1 = pool.submit(() -> {
                start.await(5, TimeUnit.SECONDS);
                return requiresNew.execute(status ->
                        orderService.activateAfterPayment(firstId).getPickupNumber());
            });
            Future<Integer> f2 = pool.submit(() -> {
                start.await(5, TimeUnit.SECONDS);
                return requiresNew.execute(status ->
                        orderService.activateAfterPayment(secondId).getPickupNumber());
            });
            start.countDown();
            Integer pickup1 = f1.get(30, TimeUnit.SECONDS);
            Integer pickup2 = f2.get(30, TimeUnit.SECONDS);

            assertThat(pickup1).isNotNull();
            assertThat(pickup2).isNotNull();
            assertThat(pickup1).isNotEqualTo(pickup2);
        } finally {
            pool.shutdownNow();
        }

        Set<Integer> activePickups = orderRepository.findAll().stream()
                .filter(Order::hasPickupNumber)
                .map(Order::getPickupNumber)
                .collect(Collectors.toSet());
        assertThat(activePickups).hasSize(2);
        assertThat(List.of(
                orderRepository.findById(firstId).orElseThrow().getPickupNumber(),
                orderRepository.findById(secondId).orElseThrow().getPickupNumber()
        )).doesNotHaveDuplicates();
    }

    /**
     * Prod-shaped sequence (createdAt order ≠ payment order):
     * A paid→1, B created unpaid, C created then paid→2, B paid→3, D paid→ must be 4.
     * Old createdAt-latest allocator would give D pickup 3 again (primary bug).
     */
    @Test
    void outOfOrderPaymentDoesNotReuseActivePickupFromEarlierCreatedOrder() {
        LocalDateTime t0 = baseTime;
        Order orderA = persistUnpaidOrder(t0);
        Order orderB = persistUnpaidOrder(t0.plusSeconds(10));
        Order orderC = persistUnpaidOrder(t0.plusSeconds(20));
        entityManager.flush();
        Long idA = orderA.getId();
        Long idB = orderB.getId();
        Long idC = orderC.getId();
        commitAndRestart();

        assertThat(orderService.activateAfterPayment(idA).getPickupNumber()).isEqualTo(1);
        assertThat(orderService.activateAfterPayment(idC).getPickupNumber()).isEqualTo(2);
        assertThat(orderService.activateAfterPayment(idB).getPickupNumber()).isEqualTo(3);

        Order orderD = persistUnpaidOrder(t0.plusSeconds(30));
        entityManager.flush();
        Long idD = orderD.getId();
        commitAndRestart();

        assertThat(orderService.activateAfterPayment(idD).getPickupNumber()).isEqualTo(4);

        assertThat(List.of(
                orderRepository.findById(idA).orElseThrow().getPickupNumber(),
                orderRepository.findById(idB).orElseThrow().getPickupNumber(),
                orderRepository.findById(idC).orElseThrow().getPickupNumber(),
                orderRepository.findById(idD).orElseThrow().getPickupNumber()
        )).containsExactly(1, 3, 2, 4);
    }

    private final LocalDateTime baseTime = LocalDateTime.now().withNano(0);

    private Order persistUnpaidOrder(LocalDateTime createdAt) {
        Order order = new Order(Order.UNASSIGNED_PICKUP_NUMBER);
        order.assignAccessTokenHash(OrderAccessTokens.sha256Hex(OrderAccessTokens.generateRaw()));
        Order saved = entityManager.persist(order);
        entityManager.flush();
        // created_at is updatable=false — force chronology for out-of-order payment scenarios
        entityManager.getEntityManager()
                .createNativeQuery("UPDATE orders SET created_at = ?1, updated_at = ?1 WHERE id = ?2")
                .setParameter(1, createdAt)
                .setParameter(2, saved.getId())
                .executeUpdate();
        entityManager.refresh(saved);
        return saved;
    }

    private void commitAndRestart() {
        entityManager.flush();
        entityManager.clear();
        if (TestTransaction.isActive()) {
            TestTransaction.flagForCommit();
            TestTransaction.end();
        }
        TestTransaction.start();
    }
}

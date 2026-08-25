package com.gdgoc.babi_order.order.service;

import com.gdgoc.babi_order.menu.repository.MenuOptionRepository;
import com.gdgoc.babi_order.menu.repository.MenuRepository;
import com.gdgoc.babi_order.order.dto.response.OrderDetailResponse;
import com.gdgoc.babi_order.order.dto.response.OrderSummaryResponse;
import com.gdgoc.babi_order.order.entity.Order;
import com.gdgoc.babi_order.order.entity.OrderStatus;
import com.gdgoc.babi_order.order.repository.OrderRepository;
import com.gdgoc.babi_order.order.security.OrderAccessGuard;
import com.gdgoc.babi_order.order.security.OrderAccessTokens;
import com.gdgoc.babi_order.payment.entity.Payment;
import com.gdgoc.babi_order.payment.entity.PaymentStatus;
import com.gdgoc.babi_order.push.service.PushNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.transaction.TestTransaction;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runtime scenario: creation order ≠ payment/activation order.
 * Queue chronology must follow pickupAssignedAt, not createdAt/id.
 */
@DataJpaTest
@Import({
        OrderService.class,
        PickupNumberLock.class,
        OrderAccessGuard.class
})
class QueueOrderingRegressionTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private TestEntityManager entityManager;

    @MockitoBean
    private MenuRepository menuRepository;

    @MockitoBean
    private MenuOptionRepository menuOptionRepository;

    @MockitoBean
    private OrderEventService orderEventService;

    @MockitoBean
    private PushNotificationService pushNotificationService;

    private final LocalDateTime baseTime = LocalDateTime.now().withNano(0);

    @BeforeEach
    void clearOrders() {
        entityManager.getEntityManager().createNativeQuery("DELETE FROM payments").executeUpdate();
        entityManager.getEntityManager().createNativeQuery("DELETE FROM order_item_options").executeUpdate();
        entityManager.getEntityManager().createNativeQuery("DELETE FROM order_items").executeUpdate();
        entityManager.getEntityManager().createNativeQuery("DELETE FROM orders").executeUpdate();
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    void adminQueueAndWaitingFollowPickupAssignmentNotCreatedAt() {
        Fixture fixture = runOutOfOrderActivationScenario();

        List<Integer> adminPickups = orderService.getOrders().stream()
                .map(OrderSummaryResponse::getPickupNumber)
                .toList();
        assertThat(adminPickups).containsExactly(1, 2, 3, 4);

        OrderDetailResponse pickup3 = orderService.getOrder(fixture.idB(), fixture.tokenB());
        assertThat(pickup3.getPickupNumber()).isEqualTo(3);
        assertThat(pickup3.getWaitingAheadCount()).isEqualTo(2);

        Order orderA = orderRepository.findById(fixture.idA()).orElseThrow();
        orderA.changeStatus(OrderStatus.COMPLETED);
        entityManager.flush();

        assertThat(orderService.getOrder(fixture.idB(), fixture.tokenB()).getWaitingAheadCount())
                .isEqualTo(1);

        Order orderC = orderRepository.findById(fixture.idC()).orElseThrow();
        orderC.changeStatus(OrderStatus.CANCELED);
        entityManager.flush();

        assertThat(orderService.getOrder(fixture.idB(), fixture.tokenB()).getWaitingAheadCount())
                .isEqualTo(0);
    }

    @Test
    void pickupWrapStillOrdersByAssignmentTimeNotPickupNumber() {
        Order early = persistUnpaidOrder(baseTime);
        Order late = persistUnpaidOrder(baseTime.plusSeconds(10));
        entityManager.flush();
        Long earlyId = early.getId();
        Long lateId = late.getId();
        commitAndRestart();

        orderService.activateAfterPayment(earlyId);
        entityManager.getEntityManager()
                .createNativeQuery(
                        "UPDATE orders SET pickup_number = 99, pickup_assigned_at = ?1 WHERE id = ?2")
                .setParameter(1, baseTime.minusSeconds(10))
                .setParameter(2, earlyId)
                .executeUpdate();
        entityManager.clear();
        commitAndRestart();

        assertThat(orderService.activateAfterPayment(lateId).getPickupNumber()).isEqualTo(1);

        persistDonePayment(orderRepository.findById(earlyId).orElseThrow(), "wrap-early");
        Order lateLoaded = orderRepository.findById(lateId).orElseThrow();
        persistDonePayment(lateLoaded, "wrap-late");
        String token = OrderAccessTokens.generateRaw();
        lateLoaded.assignAccessTokenHash(OrderAccessTokens.sha256Hex(token));
        entityManager.flush();
        commitAndRestart();

        assertThat(orderService.getOrders().stream().map(OrderSummaryResponse::getPickupNumber).toList())
                .containsExactly(99, 1);
        assertThat(orderService.getOrder(lateId, token).getWaitingAheadCount()).isEqualTo(1);
    }

    private Fixture runOutOfOrderActivationScenario() {
        Order orderA = persistUnpaidOrder(baseTime);
        Order orderB = persistUnpaidOrder(baseTime.plusSeconds(10));
        Order orderC = persistUnpaidOrder(baseTime.plusSeconds(20));
        entityManager.flush();
        Long idA = orderA.getId();
        Long idB = orderB.getId();
        Long idC = orderC.getId();
        String tokenB = OrderAccessTokens.generateRaw();
        orderB.assignAccessTokenHash(OrderAccessTokens.sha256Hex(tokenB));
        entityManager.flush();
        commitAndRestart();

        assertThat(orderService.activateAfterPayment(idA).getPickupNumber()).isEqualTo(1);
        assertThat(orderService.activateAfterPayment(idC).getPickupNumber()).isEqualTo(2);
        assertThat(orderService.activateAfterPayment(idB).getPickupNumber()).isEqualTo(3);

        Order orderD = persistUnpaidOrder(baseTime.plusSeconds(30));
        entityManager.flush();
        Long idD = orderD.getId();
        commitAndRestart();

        assertThat(orderService.activateAfterPayment(idD).getPickupNumber()).isEqualTo(4);

        persistDonePayment(orderRepository.findById(idA).orElseThrow(), "a");
        persistDonePayment(orderRepository.findById(idB).orElseThrow(), "b");
        persistDonePayment(orderRepository.findById(idC).orElseThrow(), "c");
        persistDonePayment(orderRepository.findById(idD).orElseThrow(), "d");
        Order b = orderRepository.findById(idB).orElseThrow();
        b.assignAccessTokenHash(OrderAccessTokens.sha256Hex(tokenB));
        entityManager.flush();
        commitAndRestart();

        return new Fixture(idA, idB, idC, idD, tokenB);
    }

    private Order persistUnpaidOrder(LocalDateTime createdAt) {
        Order order = new Order(Order.UNASSIGNED_PICKUP_NUMBER);
        order.assignAccessTokenHash(OrderAccessTokens.sha256Hex(OrderAccessTokens.generateRaw()));
        Order saved = entityManager.persist(order);
        entityManager.flush();
        entityManager.getEntityManager()
                .createNativeQuery("UPDATE orders SET created_at = ?1, updated_at = ?1 WHERE id = ?2")
                .setParameter(1, createdAt)
                .setParameter(2, saved.getId())
                .executeUpdate();
        entityManager.refresh(saved);
        return saved;
    }

    private void persistDonePayment(Order order, String key) {
        int amount = order.getTotalAmount() == null || order.getTotalAmount() == 0
                ? 1000
                : order.getTotalAmount();
        entityManager.persist(Payment.builder()
                .order(order)
                .tossOrderId("toss-" + key)
                .paymentKey("pay-" + key)
                .amount(amount)
                .status(PaymentStatus.DONE)
                .approvedAt(order.getPickupAssignedAt() != null
                        ? order.getPickupAssignedAt()
                        : LocalDateTime.now())
                .methodLabel("카드")
                .build());
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

    private record Fixture(Long idA, Long idB, Long idC, Long idD, String tokenB) {
    }
}

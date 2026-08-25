package com.gdgoc.babi_order.order.service;

import com.gdgoc.babi_order.common.time.StoreTime;
import com.gdgoc.babi_order.menu.repository.MenuOptionRepository;
import com.gdgoc.babi_order.menu.repository.MenuRepository;
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
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import({OrderService.class, PickupNumberLock.class, OrderAccessGuard.class})
class OrderCalledAtRegressionTest {

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

    @BeforeEach
    void clear() {
        entityManager.getEntityManager().createNativeQuery("DELETE FROM payments").executeUpdate();
        entityManager.getEntityManager().createNativeQuery("DELETE FROM order_item_options").executeUpdate();
        entityManager.getEntityManager().createNativeQuery("DELETE FROM order_items").executeUpdate();
        entityManager.getEntityManager().createNativeQuery("DELETE FROM orders").executeUpdate();
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    void firstCallSetsCalledAtRecallDoesNotChangeIt() {
        Order order = new Order(Order.UNASSIGNED_PICKUP_NUMBER);
        order.assignAccessTokenHash(OrderAccessTokens.sha256Hex(OrderAccessTokens.generateRaw()));
        Order saved = entityManager.persist(order);
        entityManager.flush();
        ReflectionTestUtils.setField(saved, "pickupNumber", 1);
        ReflectionTestUtils.setField(saved, "pickupAssignedAt", StoreTime.now().minusMinutes(5));
        ReflectionTestUtils.setField(saved, "status", OrderStatus.PREPARING);
        entityManager.persist(Payment.builder()
                .order(saved)
                .tossOrderId("toss-c")
                .paymentKey("pay-c")
                .amount(1000)
                .status(PaymentStatus.DONE)
                .approvedAt(StoreTime.now())
                .methodLabel("카드")
                .build());
        entityManager.flush();
        Long id = saved.getId();
        commitAndRestart();

        orderService.callCustomer(id);
        commitAndRestart();
        Order afterFirst = orderRepository.findById(id).orElseThrow();
        LocalDateTime firstCalledAt = afterFirst.getCalledAt();
        assertThat(firstCalledAt).isNotNull();

        orderService.callCustomer(id);
        commitAndRestart();
        Order afterRecall = orderRepository.findById(id).orElseThrow();
        assertThat(afterRecall.getCalledAt()).isEqualTo(firstCalledAt);
    }

    @Test
    void genericReadyStatusTransitionDoesNotSetCalledAt() {
        Order order = new Order(Order.UNASSIGNED_PICKUP_NUMBER);
        order.assignAccessTokenHash(OrderAccessTokens.sha256Hex(OrderAccessTokens.generateRaw()));
        Order saved = entityManager.persist(order);
        entityManager.flush();
        ReflectionTestUtils.setField(saved, "pickupNumber", 2);
        ReflectionTestUtils.setField(saved, "pickupAssignedAt", StoreTime.now().minusMinutes(3));
        ReflectionTestUtils.setField(saved, "status", OrderStatus.PREPARING);
        entityManager.persist(Payment.builder()
                .order(saved)
                .tossOrderId("toss-status")
                .paymentKey("pay-status")
                .amount(1000)
                .status(PaymentStatus.DONE)
                .approvedAt(StoreTime.now())
                .methodLabel("카드")
                .build());
        entityManager.flush();
        Long id = saved.getId();
        commitAndRestart();

        orderService.updateStatus(id, OrderStatus.READY);
        commitAndRestart();

        Order afterStatus = orderRepository.findById(id).orElseThrow();
        assertThat(afterStatus.getStatus()).isEqualTo(OrderStatus.READY);
        assertThat(afterStatus.getCalledAt()).isNull();
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

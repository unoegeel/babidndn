package com.gdgoc.babi_order.order.service;

import com.gdgoc.babi_order.common.time.StoreTime;
import com.gdgoc.babi_order.menu.repository.MenuOptionRepository;
import com.gdgoc.babi_order.menu.repository.MenuRepository;
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
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Waiting count / Admin queue must use the same KST business-day scope.
 * Payment history ordering is covered separately (id desc source + FE approvedAt DESC).
 */
@DataJpaTest
@Import({
        OrderService.class,
        PickupNumberLock.class,
        OrderAccessGuard.class
})
class QueueBusinessDayRegressionTest {

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
    void clearOrders() {
        entityManager.getEntityManager().createNativeQuery("DELETE FROM payments").executeUpdate();
        entityManager.getEntityManager().createNativeQuery("DELETE FROM order_item_options").executeUpdate();
        entityManager.getEntityManager().createNativeQuery("DELETE FROM order_items").executeUpdate();
        entityManager.getEntityManager().createNativeQuery("DELETE FROM orders").executeUpdate();
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    void pastActiveOrdersDoNotInflateTodayWaitingAhead() {
        LocalDateTime yesterday = StoreTime.startOfToday().minusHours(5);
        for (int i = 0; i < 15; i++) {
            persistActiveAssigned(yesterday.minusMinutes(i), 10 + i, "past-" + i);
        }

        String token = OrderAccessTokens.generateRaw();
        Order today = persistActiveAssigned(StoreTime.now(), 1, "today-first");
        today.assignAccessTokenHash(OrderAccessTokens.sha256Hex(token));
        entityManager.flush();
        commitAndRestart();

        assertThat(orderService.getWaitingCount().getWaitingCount()).isEqualTo(1L);
        assertThat(orderService.getOrders()).extracting(OrderSummaryResponse::getPickupNumber)
                .containsExactly(1);
        assertThat(orderService.getOrder(today.getId(), token).getWaitingAheadCount()).isZero();
    }

    @Test
    void todayActiveOrdersCountAsAhead() {
        LocalDateTime t0 = StoreTime.startOfToday().plusHours(10);
        persistActiveAssigned(t0, 1, "a");
        persistActiveAssigned(t0.plusMinutes(1), 2, "b");

        String token = OrderAccessTokens.generateRaw();
        Order c = persistActiveAssigned(t0.plusMinutes(2), 3, "c");
        c.assignAccessTokenHash(OrderAccessTokens.sha256Hex(token));
        entityManager.flush();
        commitAndRestart();

        assertThat(orderService.getOrder(c.getId(), token).getWaitingAheadCount()).isEqualTo(2);
        assertThat(orderService.getOrders()).extracting(OrderSummaryResponse::getPickupNumber)
                .containsExactly(1, 2, 3);
    }

    @Test
    void yesterdayActiveExcludedFromTodayAdminQueue() {
        persistActiveAssigned(StoreTime.startOfToday().minusSeconds(1), 7, "yesterday");
        persistActiveAssigned(StoreTime.startOfToday().plusMinutes(1), 1, "today");
        entityManager.flush();
        commitAndRestart();

        assertThat(orderService.getOrders()).extracting(OrderSummaryResponse::getPickupNumber)
                .containsExactly(1);
        assertThat(orderService.getWaitingCount().getWaitingCount()).isEqualTo(1L);
    }

    @Test
    void kstMidnightBoundarySplitsBusinessDays() {
        LocalDateTime justBefore = StoreTime.startOfToday().minusNanos(1_000_000);
        LocalDateTime justAfter = StoreTime.startOfToday();
        persistActiveAssigned(justBefore, 9, "before-midnight");
        persistActiveAssigned(justAfter, 1, "after-midnight");
        entityManager.flush();
        commitAndRestart();

        assertThat(orderService.getOrders()).extracting(OrderSummaryResponse::getPickupNumber)
                .containsExactly(1);
    }

    @Test
    void creationOrderReversedStillUsesPickupAssignedAtWithinDay() {
        LocalDateTime createdEarly = StoreTime.startOfToday().plusHours(9);
        LocalDateTime createdLate = createdEarly.plusMinutes(10);

        Order createdFirst = persistUnpaid(createdEarly);
        Order createdSecond = persistUnpaid(createdLate);
        entityManager.flush();
        Long firstId = createdFirst.getId();
        Long secondId = createdSecond.getId();
        String firstToken = OrderAccessTokens.generateRaw();
        String secondToken = OrderAccessTokens.generateRaw();
        createdFirst.assignAccessTokenHash(OrderAccessTokens.sha256Hex(firstToken));
        createdSecond.assignAccessTokenHash(OrderAccessTokens.sha256Hex(secondToken));
        entityManager.flush();
        commitAndRestart();

        // Pay second order first → pickup 1 earlier in queue chronology
        assertThat(orderService.activateAfterPayment(secondId).getPickupNumber()).isEqualTo(1);
        assertThat(orderService.activateAfterPayment(firstId).getPickupNumber()).isEqualTo(2);

        persistDonePayment(orderRepository.findById(firstId).orElseThrow(), "first");
        persistDonePayment(orderRepository.findById(secondId).orElseThrow(), "second");
        Order first = orderRepository.findById(firstId).orElseThrow();
        Order second = orderRepository.findById(secondId).orElseThrow();
        first.assignAccessTokenHash(OrderAccessTokens.sha256Hex(firstToken));
        second.assignAccessTokenHash(OrderAccessTokens.sha256Hex(secondToken));
        entityManager.flush();
        commitAndRestart();

        assertThat(orderService.getOrders()).extracting(OrderSummaryResponse::getPickupNumber)
                .containsExactly(1, 2);
        assertThat(orderService.getOrder(firstId, firstToken).getWaitingAheadCount()).isEqualTo(1);
    }

    @Test
    void paymentHistorySourceIsNotQueueFifo() {
        LocalDateTime t0 = StoreTime.startOfToday().plusHours(11);
        Order older = persistActiveAssigned(t0, 1, "older-pay");
        Order newer = persistActiveAssigned(t0.plusMinutes(5), 2, "newer-pay");
        // Override approved_at so history chronology ≠ queue FIFO if someone sorts wrong
        entityManager.getEntityManager()
                .createNativeQuery("UPDATE payments SET approved_at = ?1 WHERE order_id = ?2")
                .setParameter(1, t0.plusHours(1))
                .setParameter(2, older.getId())
                .executeUpdate();
        entityManager.getEntityManager()
                .createNativeQuery("UPDATE payments SET approved_at = ?1 WHERE order_id = ?2")
                .setParameter(1, t0.plusHours(2))
                .setParameter(2, newer.getId())
                .executeUpdate();
        entityManager.flush();
        commitAndRestart();

        List<Long> queueIds = orderService.getOrders().stream().map(OrderSummaryResponse::getId).toList();
        List<Long> historyIds = orderService.getPaidOrdersForHistory().stream()
                .map(OrderSummaryResponse::getId)
                .toList();

        assertThat(queueIds).containsExactly(older.getId(), newer.getId());
        // history follows payment approvedAt DESC (newer paid later → first), not queue FIFO
        assertThat(historyIds).containsExactly(newer.getId(), older.getId());
    }

    private Order persistActiveAssigned(LocalDateTime assignedAt, int pickup, String key) {
        Order order = persistUnpaid(assignedAt);
        ReflectionTestUtils.setField(order, "pickupNumber", pickup);
        ReflectionTestUtils.setField(order, "pickupAssignedAt", assignedAt);
        ReflectionTestUtils.setField(order, "status", OrderStatus.PREPARING);
        entityManager.flush();
        persistDonePayment(order, key);
        return order;
    }

    private Order persistUnpaid(LocalDateTime createdAt) {
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
}

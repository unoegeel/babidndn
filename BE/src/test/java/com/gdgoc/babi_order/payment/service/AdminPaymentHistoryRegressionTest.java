package com.gdgoc.babi_order.payment.service;

import com.gdgoc.babi_order.order.entity.Order;
import com.gdgoc.babi_order.order.entity.OrderStatus;
import com.gdgoc.babi_order.order.security.OrderAccessTokens;
import com.gdgoc.babi_order.order.service.OrderService;
import com.gdgoc.babi_order.payment.dto.response.AdminPaymentHistoryItemResponse;
import com.gdgoc.babi_order.payment.entity.Payment;
import com.gdgoc.babi_order.payment.entity.PaymentStatus;
import com.gdgoc.babi_order.payment.repository.PaymentRepository;
import com.gdgoc.babi_order.common.time.StoreTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Admin payment history must be independent of queue business-day / FIFO ordering.
 */
@DataJpaTest
@Import(PaymentService.class)
class AdminPaymentHistoryRegressionTest {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private TestEntityManager entityManager;

    @MockitoBean
    private com.gdgoc.babi_order.order.repository.OrderRepository orderRepository;

    @MockitoBean
    private com.gdgoc.babi_order.payment.client.TossPaymentClient tossPaymentClient;

    @MockitoBean
    private OrderService orderService;

    @MockitoBean
    private com.gdgoc.babi_order.order.security.OrderAccessGuard orderAccessGuard;

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
    void listAdminHistoryReturnsAllDaysNewestApprovedFirst() {
        LocalDateTime yesterday = StoreTime.startOfToday().minusHours(3);
        LocalDateTime todayMorning = StoreTime.startOfToday().plusHours(11);
        LocalDateTime todayAfternoon = StoreTime.startOfToday().plusHours(14);

        Order pastOrder = persistOrder(yesterday, 7, OrderStatus.PREPARING);
        Order morning = persistOrder(todayMorning, 1, OrderStatus.PREPARING);
        Order afternoon = persistOrder(todayAfternoon, 2, OrderStatus.PREPARING);

        persistPayment(pastOrder, yesterday, "past");
        persistPayment(morning, todayMorning, "morning");
        persistPayment(afternoon, todayAfternoon, "afternoon");
        entityManager.flush();
        entityManager.clear();

        List<AdminPaymentHistoryItemResponse> history = paymentService.listAdminHistory();

        assertThat(history).hasSize(3);
        assertThat(history).extracting(AdminPaymentHistoryItemResponse::getPickupNumber)
                .containsExactly(2, 1, 7);
        assertThat(history.getFirst().getApprovedAt()).isEqualTo(todayAfternoon);
        assertThat(history.getLast().getApprovedAt()).isEqualTo(yesterday);
    }

    @Test
    void repositoryOrderIsApprovedAtDescNotPickupAssignedAtAsc() {
        LocalDateTime t0 = StoreTime.startOfToday().plusHours(10);
        Order firstAssigned = persistOrder(t0, 1, OrderStatus.PREPARING);
        Order secondAssigned = persistOrder(t0.plusMinutes(1), 2, OrderStatus.PREPARING);
        // Pay second earlier in wall clock? No — pay first later so approved DESC ≠ FIFO ASC
        persistPayment(firstAssigned, t0.plusHours(2), "late-pay");
        persistPayment(secondAssigned, t0.plusHours(1), "early-pay");
        entityManager.flush();
        entityManager.clear();

        List<Payment> rows = paymentRepository.findAllForAdminHistory();
        assertThat(rows).extracting(p -> p.getOrder().getPickupNumber())
                .containsExactly(1, 2);
        assertThat(rows.getFirst().getApprovedAt()).isEqualTo(t0.plusHours(2));
    }

    private Order persistOrder(LocalDateTime assignedAt, int pickup, OrderStatus status) {
        Order order = new Order(Order.UNASSIGNED_PICKUP_NUMBER);
        order.assignAccessTokenHash(OrderAccessTokens.sha256Hex(OrderAccessTokens.generateRaw()));
        Order saved = entityManager.persist(order);
        entityManager.flush();
        ReflectionTestUtils.setField(saved, "pickupNumber", pickup);
        ReflectionTestUtils.setField(saved, "pickupAssignedAt", assignedAt);
        ReflectionTestUtils.setField(saved, "status", status);
        entityManager.flush();
        return saved;
    }

    private void persistPayment(Order order, LocalDateTime approvedAt, String key) {
        entityManager.persist(Payment.builder()
                .order(order)
                .tossOrderId("toss-" + key)
                .paymentKey("pay-" + key)
                .amount(1000)
                .status(PaymentStatus.DONE)
                .approvedAt(approvedAt)
                .methodLabel("카드")
                .build());
    }
}

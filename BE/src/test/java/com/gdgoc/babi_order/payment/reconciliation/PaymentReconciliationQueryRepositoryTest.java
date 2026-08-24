package com.gdgoc.babi_order.payment.reconciliation;

import com.gdgoc.babi_order.menu.entity.Category;
import com.gdgoc.babi_order.menu.entity.Menu;
import com.gdgoc.babi_order.menu.entity.SaleStatus;
import com.gdgoc.babi_order.order.entity.Order;
import com.gdgoc.babi_order.order.entity.OrderItem;
import com.gdgoc.babi_order.order.entity.OrderStatus;
import com.gdgoc.babi_order.payment.entity.Payment;
import com.gdgoc.babi_order.payment.entity.PaymentStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(PaymentReconciliationQueryRepository.class)
class PaymentReconciliationQueryRepositoryTest {

    private static final LocalDateTime FROM = LocalDateTime.of(2026, 8, 1, 0, 0);

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private PaymentReconciliationQueryRepository queryRepository;

    @Test
    void detectsPaymentDoneOrderNotActivated() {
        Menu menu = menu("삼겹소금", 3500);
        Order unpaidPickup = persistOrder(menu, Order.UNASSIGNED_PICKUP_NUMBER, 3500, OrderStatus.PREPARING);
        persistPayment(unpaidPickup, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 10, 12, 0), 3500, "not-act");

        Order activated = persistOrder(menu, 7, 3500, OrderStatus.PREPARING);
        persistPayment(activated, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 10, 13, 0), 3500, "ok");

        entityManager.flush();

        List<ReconciliationIssueRow> rows = queryRepository.findPaymentDoneOrderNotActivated(FROM);
        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst().orderId()).isEqualTo(unpaidPickup.getId());
    }

    @Test
    void detectsActivatedWithoutPaymentRow() {
        Menu menu = menu("삼겹소금", 3500);
        Order noPay = persistOrder(menu, 3, 3500, OrderStatus.PREPARING);
        Order withPay = persistOrder(menu, 5, 3500, OrderStatus.PREPARING);
        persistPayment(withPay, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 10, 12, 0), 3500, "has-pay");
        entityManager.flush();

        List<ReconciliationIssueRow> rows = queryRepository.findOrderActivatedWithoutPayment(FROM);
        assertThat(rows).extracting(ReconciliationIssueRow::orderId).containsExactly(noPay.getId());
        assertThat(rows.getFirst().type()).isEqualTo(ReconciliationIssueType.ORDER_ACTIVATED_WITHOUT_PAYMENT);
    }

    @Test
    void detectsPreparingWithCanceledPayment() {
        Menu menu = menu("삼겹소금", 3500);
        Order preparing = persistOrder(menu, 4, 3500, OrderStatus.PREPARING);
        persistPayment(preparing, PaymentStatus.CANCELED, LocalDateTime.of(2026, 8, 10, 12, 0), 3500, "prep-c");
        entityManager.flush();

        List<ReconciliationIssueRow> rows = queryRepository.findOrderActiveWithCanceledPayment(FROM);
        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst().orderId()).isEqualTo(preparing.getId());
        assertThat(rows.getFirst().type()).isEqualTo(ReconciliationIssueType.ORDER_ACTIVE_WITH_CANCELED_PAYMENT);
    }

    @Test
    void detectsReadyWithCanceledPayment() {
        Menu menu = menu("삼겹소금", 3500);
        Order ready = persistOrder(menu, 6, 3500, OrderStatus.READY);
        persistPayment(ready, PaymentStatus.CANCELED, LocalDateTime.of(2026, 8, 10, 12, 0), 3500, "ready-c");
        entityManager.flush();

        assertThat(queryRepository.findOrderActiveWithCanceledPayment(FROM))
                .extracting(ReconciliationIssueRow::orderId)
                .containsExactly(ready.getId());
    }

    @Test
    void ignoresCanceledOrderWithCanceledPayment() {
        Menu menu = menu("삼겹소금", 3500);
        Order canceled = persistOrder(menu, 8, 3500, OrderStatus.CANCELED);
        persistPayment(canceled, PaymentStatus.CANCELED, LocalDateTime.of(2026, 8, 10, 12, 0), 3500, "both-c");
        entityManager.flush();

        assertThat(queryRepository.findOrderActivatedWithoutPayment(FROM)).isEmpty();
        assertThat(queryRepository.findOrderActiveWithCanceledPayment(FROM)).isEmpty();
    }

    @Test
    void ignoresCompletedOrderWithCanceledPayment() {
        Menu menu = menu("삼겹소금", 3500);
        Order completed = persistOrder(menu, 9, 3500, OrderStatus.COMPLETED);
        persistPayment(completed, PaymentStatus.CANCELED, LocalDateTime.of(2026, 8, 10, 12, 0), 3500, "comp-c");
        entityManager.flush();

        assertThat(queryRepository.findOrderActivatedWithoutPayment(FROM)).isEmpty();
        assertThat(queryRepository.findOrderActiveWithCanceledPayment(FROM)).isEmpty();
    }

    @Test
    void ignoresPartialCanceledAsFullCancelAnomaly() {
        Menu menu = menu("삼겹소금", 3500);
        Order preparing = persistOrder(menu, 10, 3500, OrderStatus.PREPARING);
        persistPayment(preparing, PaymentStatus.PARTIAL_CANCELED, LocalDateTime.of(2026, 8, 10, 12, 0), 3500, "partial");
        entityManager.flush();

        assertThat(queryRepository.findOrderActivatedWithoutPayment(FROM)).isEmpty();
        assertThat(queryRepository.findOrderActiveWithCanceledPayment(FROM)).isEmpty();
    }

    @Test
    void detectsAmountMismatchOnlyForDone() {
        Menu menu = menu("삼겹소금", 3500);
        Order mismatch = persistOrder(menu, 8, 3500, OrderStatus.PREPARING);
        persistPayment(mismatch, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 10, 12, 0), 3000, "mismatch");
        entityManager.flush();

        List<ReconciliationIssueRow> rows = queryRepository.findPaymentAmountMismatch(FROM);
        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst().paymentAmount()).isEqualTo(3000);
    }

    @Test
    void detectsMultipleDonePayments() {
        Menu menu = menu("삼겹소금", 3500);
        Order multi = persistOrder(menu, 11, 3500, OrderStatus.PREPARING);
        persistPayment(multi, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 10, 11, 0), 3500, "m1");
        persistPayment(multi, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 10, 12, 0), 3500, "m2");
        entityManager.flush();

        assertThat(queryRepository.findMultipleValidPayments(FROM)).hasSize(1);
    }

    @Test
    void healthyPairProducesNoIssues() {
        Menu menu = menu("삼겹소금", 3500);
        Order order = persistOrder(menu, 15, 3500, OrderStatus.PREPARING);
        persistPayment(order, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 10, 12, 0), 3500, "healthy-all");
        entityManager.flush();

        assertThat(queryRepository.findPaymentDoneOrderNotActivated(FROM)).isEmpty();
        assertThat(queryRepository.findOrderActivatedWithoutPayment(FROM)).isEmpty();
        assertThat(queryRepository.findOrderActiveWithCanceledPayment(FROM)).isEmpty();
        assertThat(queryRepository.findPaymentAmountMismatch(FROM)).isEmpty();
        assertThat(queryRepository.findMultipleValidPayments(FROM)).isEmpty();
    }

    private Menu menu(String name, int price) {
        Category category = entityManager.persist(
                Category.builder().name("컵밥-" + name + "-" + System.nanoTime()).displayOrder(1).build());
        return entityManager.persist(Menu.builder()
                .category(category)
                .name(name)
                .basePrice(price)
                .displayOrder(1)
                .saleStatus(SaleStatus.AVAILABLE)
                .build());
    }

    private Order persistOrder(Menu menu, int pickupNumber, int expectedTotal, OrderStatus status) {
        Order order = new Order(pickupNumber);
        order.addItem(new OrderItem(menu, expectedTotal / menu.getBasePrice()));
        order.changeStatus(status);
        entityManager.persist(order);
        entityManager.flush();
        return order;
    }

    private void persistPayment(
            Order order,
            PaymentStatus status,
            LocalDateTime approvedAt,
            int amount,
            String key
    ) {
        entityManager.persist(Payment.builder()
                .order(order)
                .tossOrderId("toss-" + key)
                .paymentKey("pay-" + key)
                .amount(amount)
                .status(status)
                .approvedAt(approvedAt)
                .methodLabel("카드")
                .build());
    }
}

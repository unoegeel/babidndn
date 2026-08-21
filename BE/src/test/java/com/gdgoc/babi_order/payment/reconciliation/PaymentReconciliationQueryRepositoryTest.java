package com.gdgoc.babi_order.payment.reconciliation;

import com.gdgoc.babi_order.menu.entity.Category;
import com.gdgoc.babi_order.menu.entity.Menu;
import com.gdgoc.babi_order.menu.entity.SaleStatus;
import com.gdgoc.babi_order.order.entity.Order;
import com.gdgoc.babi_order.order.entity.OrderItem;
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
        Order unpaidPickup = persistOrder(menu, Order.UNASSIGNED_PICKUP_NUMBER, 3500);
        persistPayment(unpaidPickup, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 10, 12, 0), 3500, "not-act");

        Order activated = persistOrder(menu, 7, 3500);
        persistPayment(activated, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 10, 13, 0), 3500, "ok");

        entityManager.flush();

        List<ReconciliationIssueRow> rows = queryRepository.findPaymentDoneOrderNotActivated(FROM);
        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst().orderId()).isEqualTo(unpaidPickup.getId());
        assertThat(rows.getFirst().type()).isEqualTo(ReconciliationIssueType.PAYMENT_DONE_ORDER_NOT_ACTIVATED);
    }

    @Test
    void detectsOrderActivatedWithoutDonePayment() {
        Menu menu = menu("삼겹소금", 3500);
        Order activatedNoPay = persistOrder(menu, 3, 3500);
        Order activatedCanceledOnly = persistOrder(menu, 4, 3500);
        persistPayment(
                activatedCanceledOnly,
                PaymentStatus.CANCELED,
                LocalDateTime.of(2026, 8, 10, 12, 0),
                3500,
                "canceled-only"
        );
        Order healthy = persistOrder(menu, 5, 3500);
        persistPayment(healthy, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 10, 12, 0), 3500, "healthy");
        entityManager.flush();

        List<ReconciliationIssueRow> rows = queryRepository.findOrderActivatedWithoutValidPayment(FROM);
        assertThat(rows).extracting(ReconciliationIssueRow::orderId)
                .containsExactlyInAnyOrder(activatedNoPay.getId(), activatedCanceledOnly.getId());
    }

    @Test
    void detectsAmountMismatchOnlyForDone() {
        Menu menu = menu("삼겹소금", 3500);
        Order mismatch = persistOrder(menu, 8, 3500);
        persistPayment(mismatch, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 10, 12, 0), 3000, "mismatch");

        Order canceledMismatch = persistOrder(menu, 9, 3500);
        persistPayment(
                canceledMismatch,
                PaymentStatus.CANCELED,
                LocalDateTime.of(2026, 8, 10, 12, 0),
                100,
                "canceled-mm"
        );

        Order matched = persistOrder(menu, 10, 3500);
        persistPayment(matched, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 10, 12, 0), 3500, "match");
        entityManager.flush();

        List<ReconciliationIssueRow> rows = queryRepository.findPaymentAmountMismatch(FROM);
        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst().orderId()).isEqualTo(mismatch.getId());
        assertThat(rows.getFirst().paymentAmount()).isEqualTo(3000);
        assertThat(rows.getFirst().orderTotalAmount()).isEqualTo(3500);
    }

    @Test
    void detectsMultipleDonePayments() {
        Menu menu = menu("삼겹소금", 3500);
        Order multi = persistOrder(menu, 11, 3500);
        persistPayment(multi, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 10, 11, 0), 3500, "m1");
        persistPayment(multi, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 10, 12, 0), 3500, "m2");
        persistPayment(multi, PaymentStatus.CANCELED, LocalDateTime.of(2026, 8, 10, 13, 0), 3500, "m3");

        Order single = persistOrder(menu, 12, 3500);
        persistPayment(single, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 10, 12, 0), 3500, "s1");
        entityManager.flush();

        List<ReconciliationIssueRow> rows = queryRepository.findMultipleValidPayments(FROM);
        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst().orderId()).isEqualTo(multi.getId());
        assertThat(rows.getFirst().donePaymentCount()).isEqualTo(2L);
    }

    @Test
    void healthyPairProducesNoIssues() {
        Menu menu = menu("삼겹소금", 3500);
        Order order = persistOrder(menu, 15, 3500);
        persistPayment(order, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 10, 12, 0), 3500, "healthy-all");
        entityManager.flush();

        assertThat(queryRepository.findPaymentDoneOrderNotActivated(FROM)).isEmpty();
        assertThat(queryRepository.findOrderActivatedWithoutValidPayment(FROM)).isEmpty();
        assertThat(queryRepository.findPaymentAmountMismatch(FROM)).isEmpty();
        assertThat(queryRepository.findMultipleValidPayments(FROM)).isEmpty();
    }

    private Menu menu(String name, int price) {
        Category category = entityManager.persist(Category.builder().name("컵밥-" + name + "-" + System.nanoTime()).displayOrder(1).build());
        return entityManager.persist(Menu.builder()
                .category(category)
                .name(name)
                .basePrice(price)
                .displayOrder(1)
                .saleStatus(SaleStatus.AVAILABLE)
                .build());
    }

    private Order persistOrder(Menu menu, int pickupNumber, int expectedTotal) {
        Order order = new Order(pickupNumber);
        order.addItem(new OrderItem(menu, expectedTotal / menu.getBasePrice()));
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

package com.gdgoc.babi_order.sales.repository;

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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(SalesQueryRepository.class)
class SalesQueryRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private SalesQueryRepository salesQueryRepository;

    @Test
    void dailySalesCountsOnlyDonePaymentsAndGroupsByDate() {
        Menu salt = menu("삼겹소금", 3500);
        persistPaidOrder(salt, 1, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 13, 10, 0), 3500, "done-1");
        persistPaidOrder(salt, 1, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 13, 18, 0), 3500, "done-2");
        persistPaidOrder(salt, 1, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 12, 9, 0), 3500, "done-prev");
        persistPaidOrder(salt, 1, PaymentStatus.CANCELED, LocalDateTime.of(2026, 8, 13, 11, 0), 3500, "canceled");
        persistPaidOrder(salt, 1, PaymentStatus.PARTIAL_CANCELED, LocalDateTime.of(2026, 8, 13, 12, 0), 3500, "partial");
        entityManager.flush();

        List<DailySalesRow> rows = salesQueryRepository.findDailySales(
                LocalDateTime.of(2026, 8, 13, 0, 0),
                LocalDateTime.of(2026, 8, 14, 0, 0)
        );

        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst().date()).isEqualTo(LocalDate.of(2026, 8, 13));
        assertThat(rows.getFirst().paymentCount()).isEqualTo(2L);
        assertThat(rows.getFirst().totalAmount()).isEqualTo(7000L);
    }

    @Test
    void dailySalesRespectsInclusiveStartAndExclusiveEnd() {
        Menu salt = menu("삼겹소금", 3500);
        persistPaidOrder(salt, 1, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 1, 0, 0), 1000, "start");
        persistPaidOrder(salt, 1, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 13, 23, 59, 59), 2000, "end");
        persistPaidOrder(salt, 1, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 14, 0, 0), 3000, "after");
        persistPaidOrder(salt, 1, PaymentStatus.DONE, LocalDateTime.of(2026, 7, 31, 23, 59, 59), 4000, "before");
        entityManager.flush();

        List<DailySalesRow> rows = salesQueryRepository.findDailySales(
                LocalDateTime.of(2026, 8, 1, 0, 0),
                LocalDateTime.of(2026, 8, 14, 0, 0)
        );

        assertThat(rows).extracting(DailySalesRow::date)
                .containsExactly(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 13));
        assertThat(rows).extracting(DailySalesRow::totalAmount)
                .containsExactly(1000L, 2000L);
    }

    @Test
    void menuSalesSumsQuantityAndLineAmountBySnapshotName() {
        Menu salt = menu("삼겹소금", 3500);
        Menu spicy = menu("삼겹양념", 4000);

        Order combined = new Order(1);
        combined.addItem(new OrderItem(salt, 2));
        combined.addItem(new OrderItem(salt, 1));
        entityManager.persist(combined);
        persistPayment(combined, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 13, 10, 0), 10_500, "combo");

        persistPaidOrder(spicy, 2, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 13, 11, 0), 8000, "spicy");
        persistPaidOrder(salt, 5, PaymentStatus.CANCELED, LocalDateTime.of(2026, 8, 13, 12, 0), 17_500, "canceled-salt");
        entityManager.flush();

        List<MenuSalesRow> rows = salesQueryRepository.findMenuSales(
                LocalDateTime.of(2026, 8, 13, 0, 0),
                LocalDateTime.of(2026, 8, 14, 0, 0)
        );

        assertThat(rows).extracting(MenuSalesRow::menuName).containsExactly("삼겹소금", "삼겹양념");
        MenuSalesRow saltRow = rows.getFirst();
        assertThat(saltRow.itemQuantity()).isEqualTo(3L);
        assertThat(saltRow.totalAmount()).isEqualTo(10_500L);
        assertThat(rows.get(1).itemQuantity()).isEqualTo(2L);
        assertThat(rows.get(1).totalAmount()).isEqualTo(8000L);
    }

    @Test
    void hourlySalesCountsDonePaymentsByHour() {
        Menu salt = menu("삼겹소금", 3500);
        persistPaidOrder(salt, 1, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 13, 9, 10), 1000, "h9a");
        persistPaidOrder(salt, 1, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 12, 9, 50), 1000, "h9b");
        persistPaidOrder(salt, 1, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 13, 11, 0), 1000, "h11");
        persistPaidOrder(salt, 1, PaymentStatus.CANCELED, LocalDateTime.of(2026, 8, 13, 10, 0), 1000, "skip");
        persistPaidOrder(salt, 1, PaymentStatus.DONE, LocalDateTime.of(2026, 8, 10, 8, 0), 1000, "out");
        entityManager.flush();

        List<HourlySalesRow> rows = salesQueryRepository.findHourlySales(
                LocalDateTime.of(2026, 8, 12, 0, 0),
                LocalDateTime.of(2026, 8, 14, 0, 0)
        );

        assertThat(rows).extracting(HourlySalesRow::hour).containsExactly(9, 11);
        assertThat(rows).extracting(HourlySalesRow::orderCount).containsExactly(2L, 1L);
    }

    @Test
    void monthlyAndYearlySalesGroupDonePaymentsOnly() {
        Menu salt = menu("삼겹소금", 3500);
        persistPaidOrder(salt, 1, PaymentStatus.DONE, LocalDateTime.of(2025, 12, 31, 10, 0), 1000, "y2025");
        persistPaidOrder(salt, 1, PaymentStatus.DONE, LocalDateTime.of(2026, 5, 1, 10, 0), 2000, "may-1");
        persistPaidOrder(salt, 1, PaymentStatus.DONE, LocalDateTime.of(2026, 5, 31, 10, 0), 3000, "may-2");
        persistPaidOrder(salt, 1, PaymentStatus.DONE, LocalDateTime.of(2026, 6, 1, 10, 0), 4000, "jun");
        persistPaidOrder(salt, 1, PaymentStatus.CANCELED, LocalDateTime.of(2026, 5, 15, 10, 0), 9999, "canceled");
        entityManager.flush();

        List<MonthlySalesRow> months = salesQueryRepository.findMonthlySales();
        assertThat(months).extracting(row -> row.year() + "-" + row.month())
                .containsExactly("2025-12", "2026-5", "2026-6");
        assertThat(months.get(1).paymentCount()).isEqualTo(2L);
        assertThat(months.get(1).totalAmount()).isEqualTo(5000L);

        List<YearlySalesRow> years = salesQueryRepository.findYearlySales();
        assertThat(years).extracting(YearlySalesRow::year).containsExactly(2025, 2026);
        assertThat(years.get(1).paymentCount()).isEqualTo(3L);
        assertThat(years.get(1).totalAmount()).isEqualTo(9000L);
    }

    @Test
    void menuSalesAllIncludesEveryDonePayment() {
        Menu salt = menu("삼겹소금", 3500);
        persistPaidOrder(salt, 2, PaymentStatus.DONE, LocalDateTime.of(2026, 1, 1, 10, 0), 7000, "all");
        persistPaidOrder(salt, 1, PaymentStatus.CANCELED, LocalDateTime.of(2026, 1, 2, 10, 0), 3500, "skip");
        entityManager.flush();

        List<MenuSalesRow> rows = salesQueryRepository.findMenuSalesAll();
        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst().itemQuantity()).isEqualTo(2L);
        assertThat(rows.getFirst().totalAmount()).isEqualTo(7000L);
    }

    private Menu menu(String name, int price) {
        Category category = entityManager.persist(Category.builder().name("컵밥-" + name).displayOrder(1).build());
        return entityManager.persist(Menu.builder()
                .category(category)
                .name(name)
                .basePrice(price)
                .displayOrder(1)
                .saleStatus(SaleStatus.AVAILABLE)
                .build());
    }

    private void persistPaidOrder(
            Menu menu,
            int quantity,
            PaymentStatus status,
            LocalDateTime approvedAt,
            int amount,
            String key) {
        Order order = new Order(1);
        order.addItem(new OrderItem(menu, quantity));
        entityManager.persist(order);
        persistPayment(order, status, approvedAt, amount, key);
    }

    private void persistPayment(
            Order order,
            PaymentStatus status,
            LocalDateTime approvedAt,
            int amount,
            String key) {
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

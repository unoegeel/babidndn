package com.gdgoc.babi_order.payment.reconciliation;

import com.gdgoc.babi_order.menu.entity.Category;
import com.gdgoc.babi_order.menu.entity.Menu;
import com.gdgoc.babi_order.menu.entity.SaleStatus;
import com.gdgoc.babi_order.order.entity.Order;
import com.gdgoc.babi_order.order.entity.OrderItem;
import com.gdgoc.babi_order.payment.entity.Payment;
import com.gdgoc.babi_order.payment.entity.PaymentStatus;
import com.gdgoc.babi_order.payment.reconciliation.dto.ReconciliationScanResponse;
import com.gdgoc.babi_order.payment.reconciliation.entity.PaymentReconciliationIssue;
import com.gdgoc.babi_order.payment.reconciliation.repository.PaymentReconciliationIssueRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Uses NOT_SUPPORTED so each scan commits — matches REQUIRES_NEW insert isolation used in production.
 */
@DataJpaTest
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import({
        PaymentReconciliationQueryRepository.class,
        PaymentReconciliationService.class,
        PaymentReconciliationScanService.class,
        ObjectMapper.class
})
class PaymentReconciliationScanServiceTest {

    private static final LocalDateTime RECENT = LocalDateTime.now().minusHours(1);

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private PaymentReconciliationScanService scanService;

    @Autowired
    private PaymentReconciliationIssueRepository issueRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private TransactionTemplate tx;

    @BeforeEach
    void setUp() {
        tx = new TransactionTemplate(transactionManager);
        tx.executeWithoutResult(status -> {
            issueRepository.deleteAll();
            entityManager.getEntityManager().createQuery("delete from Payment").executeUpdate();
            entityManager.getEntityManager().createQuery("delete from OrderItem").executeUpdate();
            entityManager.getEntityManager().createQuery("delete from Order").executeUpdate();
            entityManager.getEntityManager().createQuery("delete from Menu").executeUpdate();
            entityManager.getEntityManager().createQuery("delete from Category").executeUpdate();
        });
    }

    @Test
    void createsOpenIssueForNewAnomaly() {
        Fixture fixture = tx.execute(status -> {
            Menu menu = menu("삼겹소금", 3500);
            Order order = persistOrder(menu, 0, 3500);
            Payment payment = persistPayment(order, PaymentStatus.DONE, RECENT, 3500, "new-1");
            entityManager.flush();
            return new Fixture(order.getId(), payment.getId());
        });

        ReconciliationScanResponse response = scanService.scan("30d");

        assertThat(response.getCreatedCount()).isEqualTo(1);
        assertThat(response.getCreatedIssueIds()).hasSize(1);
        assertThat(response.getUpdatedCount()).isZero();
        List<PaymentReconciliationIssue> open =
                issueRepository.findByStatus(ReconciliationIssueStatus.OPEN);
        assertThat(open).hasSize(1);
        assertThat(open.getFirst().getIssueType())
                .isEqualTo(ReconciliationIssueType.PAYMENT_DONE_ORDER_NOT_ACTIVATED);
        assertThat(open.getFirst().getPaymentId()).isEqualTo(fixture.paymentId());
        assertThat(open.getFirst().getActiveKey()).isEqualTo(open.getFirst().getLogicalKey());
        assertThat(open.getFirst().getOccurrenceCount()).isEqualTo(1L);
    }

    @Test
    void redetectTouchesWithoutNewRow() {
        tx.executeWithoutResult(status -> {
            Menu menu = menu("삼겹소금", 3500);
            Order order = persistOrder(menu, 0, 3500);
            persistPayment(order, PaymentStatus.DONE, RECENT, 3500, "touch-1");
            entityManager.flush();
        });

        scanService.scan("30d");
        PaymentReconciliationIssue first = issueRepository.findByStatus(ReconciliationIssueStatus.OPEN).getFirst();
        LocalDateTime firstDetected = first.getFirstDetectedAt();
        Long id = first.getId();

        ReconciliationScanResponse second = scanService.scan("30d");

        assertThat(second.getCreatedCount()).isZero();
        assertThat(second.getUpdatedCount()).isEqualTo(1);
        assertThat(issueRepository.findByStatus(ReconciliationIssueStatus.OPEN)).hasSize(1);
        PaymentReconciliationIssue touched = issueRepository.findById(id).orElseThrow();
        assertThat(touched.getOccurrenceCount()).isEqualTo(2L);
        assertThat(touched.getFirstDetectedAt()).isEqualTo(firstDetected);
        assertThat(touched.getLastDetectedAt()).isAfterOrEqualTo(firstDetected);
    }

    @Test
    void resolvesOnlyWhenBusinessConditionCleared() {
        Long orderId = tx.execute(status -> {
            Menu menu = menu("삼겹소금", 3500);
            Order order = persistOrder(menu, 0, 3500);
            persistPayment(order, PaymentStatus.DONE, RECENT, 3500, "resolve-1");
            entityManager.flush();
            return order.getId();
        });

        scanService.scan("30d");
        assertThat(issueRepository.findByStatus(ReconciliationIssueStatus.OPEN)).hasSize(1);

        tx.executeWithoutResult(status -> {
            Order order = entityManager.find(Order.class, orderId);
            order.assignPickupNumber(12);
            entityManager.flush();
        });

        ReconciliationScanResponse response = scanService.scan("30d");

        assertThat(response.getResolvedCount()).isEqualTo(1);
        assertThat(response.getOpenCount()).isZero();
        PaymentReconciliationIssue resolved = issueRepository.findAll().getFirst();
        assertThat(resolved.getStatus()).isEqualTo(ReconciliationIssueStatus.RESOLVED);
        assertThat(resolved.getActiveKey()).isNull();
        assertThat(resolved.getResolvedAt()).isNotNull();
    }

    @Test
    void recurrenceCreatesNewOpenRowKeepingResolvedHistory() {
        Fixture fixture = tx.execute(status -> {
            Menu menu = menu("삼겹소금", 3500);
            Order order = persistOrder(menu, 0, 3500);
            Payment payment = persistPayment(order, PaymentStatus.DONE, RECENT, 3500, "recur-1");
            entityManager.flush();
            return new Fixture(order.getId(), payment.getId());
        });

        scanService.scan("30d");
        tx.executeWithoutResult(status -> {
            Order order = entityManager.find(Order.class, fixture.orderId());
            order.assignPickupNumber(5);
            entityManager.flush();
        });
        scanService.scan("30d");
        assertThat(issueRepository.findByStatus(ReconciliationIssueStatus.RESOLVED)).hasSize(1);

        tx.executeWithoutResult(status -> {
            Order order = entityManager.find(Order.class, fixture.orderId());
            order.assignPickupNumber(0);
            entityManager.flush();
        });

        ReconciliationScanResponse response = scanService.scan("30d");

        assertThat(response.getCreatedCount()).isEqualTo(1);
        assertThat(issueRepository.findByStatus(ReconciliationIssueStatus.RESOLVED)).hasSize(1);
        assertThat(issueRepository.findByStatus(ReconciliationIssueStatus.OPEN)).hasSize(1);
        String logicalKey = ReconciliationLogicalKeys.of(
                ReconciliationIssueType.PAYMENT_DONE_ORDER_NOT_ACTIVATED,
                fixture.orderId(),
                fixture.paymentId()
        );
        assertThat(issueRepository.findAll())
                .filteredOn(i -> logicalKey.equals(i.getLogicalKey()))
                .hasSize(2);
    }

    @Test
    void differentTypesCreateSeparateIssues() {
        tx.executeWithoutResult(status -> {
            Menu menu = menu("삼겹소금", 3500);
            Order order = persistOrder(menu, 8, 3500);
            persistPayment(order, PaymentStatus.DONE, RECENT, 3000, "amt-1");
            persistPayment(order, PaymentStatus.DONE, RECENT.plusMinutes(1), 3000, "amt-2");
            entityManager.flush();
        });

        ReconciliationScanResponse response = scanService.scan("30d");

        assertThat(response.getCreatedCount()).isGreaterThanOrEqualTo(2);
        assertThat(issueRepository.findByStatus(ReconciliationIssueStatus.OPEN))
                .extracting(PaymentReconciliationIssue::getIssueType)
                .contains(
                        ReconciliationIssueType.PAYMENT_AMOUNT_MISMATCH,
                        ReconciliationIssueType.MULTIPLE_VALID_PAYMENTS
                );
    }

    @Test
    void periodOutsideOpenIssueIsNotResolvedWithoutConditionClear() {
        Fixture fixture = tx.execute(status -> {
            Menu menu = menu("삼겹소금", 3500);
            Order order = persistOrder(menu, 0, 3500);
            Payment payment = persistPayment(
                    order, PaymentStatus.DONE, LocalDateTime.now().minusDays(10), 3500, "old-1");
            entityManager.flush();
            String logicalKey = ReconciliationLogicalKeys.of(
                    ReconciliationIssueType.PAYMENT_DONE_ORDER_NOT_ACTIVATED,
                    order.getId(),
                    payment.getId());
            issueRepository.saveAndFlush(PaymentReconciliationIssue.open(
                    logicalKey,
                    ReconciliationIssueType.PAYMENT_DONE_ORDER_NOT_ACTIVATED,
                    ReconciliationSeverity.CRITICAL,
                    order.getId(),
                    payment.getId(),
                    "seed",
                    null,
                    LocalDateTime.now().minusDays(9)
            ));
            return new Fixture(order.getId(), payment.getId());
        });

        ReconciliationScanResponse response = scanService.scan("1d");

        assertThat(response.getResolvedCount()).isZero();
        assertThat(issueRepository.findByStatus(ReconciliationIssueStatus.OPEN)).hasSize(1);
        assertThat(issueRepository.findByStatus(ReconciliationIssueStatus.OPEN).getFirst().getOrderId())
                .isEqualTo(fixture.orderId());
    }

    @Test
    void deprecatedWithoutValidPaymentOpenIssueResolvesOnNextScan() {
        Long orderId = tx.execute(status -> {
            Menu menu = menu("삼겹소금", 3500);
            Order order = persistOrder(menu, 4, 3500);
            order.changeStatus(com.gdgoc.babi_order.order.entity.OrderStatus.CANCELED);
            persistPayment(order, PaymentStatus.CANCELED, RECENT, 3500, "fp-1");
            entityManager.flush();
            String logicalKey = ReconciliationLogicalKeys.of(
                    ReconciliationIssueType.ORDER_ACTIVATED_WITHOUT_VALID_PAYMENT,
                    order.getId(),
                    null);
            issueRepository.saveAndFlush(PaymentReconciliationIssue.open(
                    logicalKey,
                    ReconciliationIssueType.ORDER_ACTIVATED_WITHOUT_VALID_PAYMENT,
                    ReconciliationSeverity.CRITICAL,
                    order.getId(),
                    null,
                    "legacy false positive",
                    null,
                    LocalDateTime.now().minusDays(1)
            ));
            return order.getId();
        });

        ReconciliationScanResponse response = scanService.scan("30d");

        assertThat(response.getResolvedCount()).isEqualTo(1);
        assertThat(issueRepository.findByStatus(ReconciliationIssueStatus.OPEN))
                .noneMatch(i -> i.getIssueType() == ReconciliationIssueType.ORDER_ACTIVATED_WITHOUT_VALID_PAYMENT);
        PaymentReconciliationIssue resolved = issueRepository.findAll().stream()
                .filter(i -> i.getIssueType() == ReconciliationIssueType.ORDER_ACTIVATED_WITHOUT_VALID_PAYMENT)
                .findFirst()
                .orElseThrow();
        assertThat(resolved.getStatus()).isEqualTo(ReconciliationIssueStatus.RESOLVED);
        assertThat(resolved.getActiveKey()).isNull();
        assertThat(resolved.getResolvedAt()).isNotNull();
        assertThat(resolved.getOrderId()).isEqualTo(orderId);
    }

    @Test
    void uniqueActiveKeyRejectsDuplicateOpenRow() {
        String logicalKey = "PAYMENT_DONE_ORDER_NOT_ACTIVATED:1:2";
        tx.executeWithoutResult(status -> {
            issueRepository.saveAndFlush(PaymentReconciliationIssue.open(
                    logicalKey,
                    ReconciliationIssueType.PAYMENT_DONE_ORDER_NOT_ACTIVATED,
                    ReconciliationSeverity.CRITICAL,
                    1L,
                    2L,
                    "first",
                    null,
                    LocalDateTime.now()
            ));
        });

        assertThatThrownBy(() -> tx.executeWithoutResult(status -> {
            issueRepository.saveAndFlush(PaymentReconciliationIssue.open(
                    logicalKey,
                    ReconciliationIssueType.PAYMENT_DONE_ORDER_NOT_ACTIVATED,
                    ReconciliationSeverity.CRITICAL,
                    1L,
                    2L,
                    "second",
                    null,
                    LocalDateTime.now()
            ));
        })).isInstanceOf(DataIntegrityViolationException.class);

        assertThat(issueRepository.findByStatus(ReconciliationIssueStatus.OPEN)).hasSize(1);
    }

    @Test
    void concurrentScanKeepsSingleOpenActiveKey() throws Exception {
        tx.executeWithoutResult(status -> {
            Menu menu = menu("삼겹소금", 3500);
            Order order = persistOrder(menu, 0, 3500);
            persistPayment(order, PaymentStatus.DONE, RECENT, 3500, "race-1");
            entityManager.flush();
        });

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<?> f1 = pool.submit(() -> {
                start.await(5, TimeUnit.SECONDS);
                scanService.scan("30d");
                return null;
            });
            Future<?> f2 = pool.submit(() -> {
                start.await(5, TimeUnit.SECONDS);
                scanService.scan("30d");
                return null;
            });
            start.countDown();
            f1.get(30, TimeUnit.SECONDS);
            f2.get(30, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }

        List<PaymentReconciliationIssue> open =
                issueRepository.findByStatus(ReconciliationIssueStatus.OPEN);
        assertThat(open).hasSize(1);
        assertThat(open.getFirst().getActiveKey()).isNotNull();
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

    private Order persistOrder(Menu menu, int pickupNumber, int expectedTotal) {
        Order order = new Order(pickupNumber);
        order.addItem(new OrderItem(menu, expectedTotal / menu.getBasePrice()));
        entityManager.persist(order);
        entityManager.flush();
        return order;
    }

    private Payment persistPayment(
            Order order,
            PaymentStatus status,
            LocalDateTime approvedAt,
            int amount,
            String key
    ) {
        Payment payment = Payment.builder()
                .order(order)
                .tossOrderId("toss-" + key)
                .paymentKey("pay-" + key)
                .amount(amount)
                .status(status)
                .approvedAt(approvedAt)
                .methodLabel("카드")
                .build();
        entityManager.persist(payment);
        return payment;
    }

    private record Fixture(Long orderId, Long paymentId) {
    }
}

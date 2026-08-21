package com.gdgoc.babi_order.push.service;

import com.gdgoc.babi_order.order.entity.Order;
import com.gdgoc.babi_order.order.security.OrderAccessGuard;
import com.gdgoc.babi_order.order.security.OrderAccessTokens;
import com.gdgoc.babi_order.push.config.PushProperties;
import com.gdgoc.babi_order.push.entity.PushSubscription;
import com.gdgoc.babi_order.push.repository.PushSubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.transaction.TestTransaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@Import({
        PushNotificationService.class,
        OrderAccessGuard.class,
        PushNotificationServiceLinkOrderTest.PushTestConfig.class
})
class PushNotificationServiceLinkOrderTest {

    @Autowired
    private PushNotificationService pushNotificationService;

    @Autowired
    private PushSubscriptionRepository subscriptionRepository;

    @Autowired
    private TestEntityManager entityManager;

    @BeforeEach
    void cleanPushTables() {
        entityManager.getEntityManager().createNativeQuery("DELETE FROM push_subscription_orders").executeUpdate();
        entityManager.getEntityManager().createNativeQuery("DELETE FROM push_subscriptions").executeUpdate();
        entityManager.getEntityManager().createNativeQuery("DELETE FROM orders").executeUpdate();
        entityManager.flush();
        commitAndRestartTransaction();
    }

    @Test
    void linkOrderCreatesSubscriptionOrderRelation() {
        persistSubscription("https://push.example/create");
        OrderToken order = persistOrderWithToken();

        pushNotificationService.linkOrder("https://push.example/create", order.id(), order.rawToken());
        entityManager.clear();

        assertThat(countLinks()).isEqualTo(1);
        assertThat(findSubscription("https://push.example/create").getOrderIds()).containsExactly(order.id());
    }

    @Test
    void linkOrderIsIdempotentForSameSubscriptionAndOrder() {
        persistSubscription("https://push.example/idempotent");
        OrderToken order = persistOrderWithToken();

        pushNotificationService.linkOrder("https://push.example/idempotent", order.id(), order.rawToken());
        pushNotificationService.linkOrder("https://push.example/idempotent", order.id(), order.rawToken());
        entityManager.clear();

        assertThat(countLinks()).isEqualTo(1);
    }

    @Test
    void linkOrderAllowsDifferentOrdersForSameSubscription() {
        persistSubscription("https://push.example/multi-order");
        OrderToken first = persistOrderWithToken();
        OrderToken second = persistOrderWithToken();

        pushNotificationService.linkOrder("https://push.example/multi-order", first.id(), first.rawToken());
        pushNotificationService.linkOrder("https://push.example/multi-order", second.id(), second.rawToken());
        entityManager.clear();

        assertThat(countLinks()).isEqualTo(2);
        assertThat(findSubscription("https://push.example/multi-order").getOrderIds())
                .containsExactlyInAnyOrder(first.id(), second.id());
    }

    @Test
    void linkOrderAllowsSameOrderForDifferentSubscriptions() {
        persistSubscription("https://push.example/sub-a");
        persistSubscription("https://push.example/sub-b");
        OrderToken order = persistOrderWithToken();

        pushNotificationService.linkOrder("https://push.example/sub-a", order.id(), order.rawToken());
        pushNotificationService.linkOrder("https://push.example/sub-b", order.id(), order.rawToken());
        entityManager.clear();

        assertThat(countLinks()).isEqualTo(2);
    }

    @Test
    void isDuplicatePushSubOrderLinkDetectsUkConstraintOnly() {
        var duplicate = new DataIntegrityViolationException(
                "Duplicate entry",
                new java.sql.SQLException(
                        "Duplicate entry '7-92' for key 'push_subscription_orders.uk_push_sub_order'",
                        "23000",
                        1062
                )
        );
        var otherIntegrity = new DataIntegrityViolationException(
                "FK violation",
                new java.sql.SQLException("Cannot add or update a child row", "23000", 1452)
        );

        assertThat(PushNotificationService.isDuplicatePushSubOrderLink(duplicate)).isTrue();
        assertThat(PushNotificationService.isDuplicatePushSubOrderLink(otherIntegrity)).isFalse();
    }

    @Test
    void linkOrderDoesNotThrowWhenRelationAlreadyExistsInDatabase() {
        PushSubscription subscription = persistSubscription("https://push.example/prelinked");
        OrderToken order = persistOrderWithToken();
        insertLinkDirectly(subscription.getId(), order.id());
        entityManager.flush();
        commitAndRestartTransaction();
        entityManager.clear();

        pushNotificationService.linkOrder("https://push.example/prelinked", order.id(), order.rawToken());
        entityManager.clear();

        assertThat(countLinks()).isEqualTo(1);
    }

    @Test
    void linkOrderRejectsWrongAccessToken() {
        persistSubscription("https://push.example/denied");
        OrderToken order = persistOrderWithToken();

        assertThatThrownBy(() ->
                pushNotificationService.linkOrder(
                        "https://push.example/denied", order.id(), "wrong-token"))
                .isInstanceOf(com.gdgoc.babi_order.order.exception.OrderNotFoundException.class);
        assertThat(countLinks()).isZero();
    }

    @Test
    void duplicateDetectorDoesNotMaskUnrelatedIntegrityViolations() {
        var unrelated = new DataIntegrityViolationException(
                "NOT NULL",
                new java.sql.SQLException("Column cannot be null", "23000", 1048)
        );

        assertThatThrownBy(() -> {
            if (!PushNotificationService.isDuplicatePushSubOrderLink(unrelated)) {
                throw unrelated;
            }
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    private record OrderToken(Long id, String rawToken) {
    }

    private OrderToken persistOrderWithToken() {
        String raw = OrderAccessTokens.generateRaw();
        Order order = new Order(Order.UNASSIGNED_PICKUP_NUMBER);
        order.assignAccessTokenHash(OrderAccessTokens.sha256Hex(raw));
        entityManager.persist(order);
        entityManager.flush();
        commitAndRestartTransaction();
        return new OrderToken(order.getId(), raw);
    }

    private PushSubscription persistSubscription(String endpoint) {
        PushSubscription subscription = new PushSubscription(endpoint, "p256dh-key", "auth-key");
        entityManager.persist(subscription);
        entityManager.flush();
        commitAndRestartTransaction();
        return subscriptionRepository.findByEndpoint(endpoint).orElseThrow();
    }

    private void commitAndRestartTransaction() {
        TestTransaction.flagForCommit();
        TestTransaction.end();
        TestTransaction.start();
    }

    private void insertLinkDirectly(Long subscriptionId, Long orderId) {
        entityManager.getEntityManager().createNativeQuery(
                "INSERT INTO push_subscription_orders (subscription_id, order_id) VALUES (:subId, :orderId)"
        )
                .setParameter("subId", subscriptionId)
                .setParameter("orderId", orderId)
                .executeUpdate();
    }

    private PushSubscription findSubscription(String endpoint) {
        return subscriptionRepository.findByEndpoint(endpoint).orElseThrow();
    }

    private long countLinks() {
        Number count = (Number) entityManager.getEntityManager().createNativeQuery(
                "SELECT COUNT(*) FROM push_subscription_orders"
        ).getSingleResult();
        return count.longValue();
    }

    @TestConfiguration
    static class PushTestConfig {

        @Bean
        PushProperties pushProperties() {
            PushProperties properties = new PushProperties();
            properties.setEnabled(false);
            return properties;
        }
    }
}

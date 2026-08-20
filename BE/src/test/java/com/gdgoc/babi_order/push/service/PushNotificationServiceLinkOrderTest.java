package com.gdgoc.babi_order.push.service;

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
@Import({PushNotificationService.class, PushNotificationServiceLinkOrderTest.PushTestConfig.class})
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
        entityManager.flush();
        commitAndRestartTransaction();
    }

    @Test
    void linkOrderCreatesSubscriptionOrderRelation() {
        persistSubscription("https://push.example/create");

        pushNotificationService.linkOrder("https://push.example/create", 92L);
        entityManager.clear();

        assertThat(countLinks()).isEqualTo(1);
        assertThat(findSubscription("https://push.example/create").getOrderIds()).containsExactly(92L);
    }

    @Test
    void linkOrderIsIdempotentForSameSubscriptionAndOrder() {
        persistSubscription("https://push.example/idempotent");

        pushNotificationService.linkOrder("https://push.example/idempotent", 92L);
        pushNotificationService.linkOrder("https://push.example/idempotent", 92L);
        entityManager.clear();

        assertThat(countLinks()).isEqualTo(1);
    }

    @Test
    void linkOrderAllowsDifferentOrdersForSameSubscription() {
        persistSubscription("https://push.example/multi-order");

        pushNotificationService.linkOrder("https://push.example/multi-order", 92L);
        pushNotificationService.linkOrder("https://push.example/multi-order", 93L);
        entityManager.clear();

        assertThat(countLinks()).isEqualTo(2);
        assertThat(findSubscription("https://push.example/multi-order").getOrderIds())
                .containsExactlyInAnyOrder(92L, 93L);
    }

    @Test
    void linkOrderAllowsSameOrderForDifferentSubscriptions() {
        persistSubscription("https://push.example/sub-a");
        persistSubscription("https://push.example/sub-b");

        pushNotificationService.linkOrder("https://push.example/sub-a", 92L);
        pushNotificationService.linkOrder("https://push.example/sub-b", 92L);
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
        insertLinkDirectly(subscription.getId(), 92L);
        entityManager.flush();
        commitAndRestartTransaction();
        entityManager.clear();

        pushNotificationService.linkOrder("https://push.example/prelinked", 92L);
        entityManager.clear();

        assertThat(countLinks()).isEqualTo(1);
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

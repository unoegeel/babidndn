package com.gdgoc.babi_order.dev.analytics;

import com.gdgoc.babi_order.backenderror.entity.BackendError;
import com.gdgoc.babi_order.order.service.OrderEventService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

@DataJpaTest
@Import(ControlCenterQueryRepository.class)
class ControlCenterActionableBackendErrorQueryTest {

    private static final Instant T1 = Instant.parse("2026-08-20T10:00:00Z");
    private static final Instant FROM = Instant.parse("2026-08-20T00:00:00Z");
    private static final Instant TO = Instant.parse("2026-08-21T00:00:00Z");

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private ControlCenterQueryRepository opsQuery;

    @BeforeEach
    void clean() {
        entityManager.getEntityManager()
                .createNativeQuery("DELETE FROM backend_errors")
                .executeUpdate();
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    void countTopExceptionsAndPaths_executeWithoutSqlSyntaxError_andApplyActionableFilter() {
        persist("java.lang.NullPointerException", "/api/orders", 500);
        persist("com.gdgoc.babi_order.payment.exception.TossPaymentException", "/api/payments/confirm", 502);
        persist(ActionableBackendErrorCriteria.NO_RESOURCE_FOUND, "/.env", 500);
        persist(ActionableBackendErrorCriteria.ASYNC_REQUEST_TIMEOUT, OrderEventService.STREAM_PATH, 503);
        persist(ActionableBackendErrorCriteria.ASYNC_REQUEST_TIMEOUT, "/api/other", 503);
        entityManager.flush();
        entityManager.clear();

        assertThatCode(() -> opsQuery.countBackendErrors(FROM, TO)).doesNotThrowAnyException();
        assertThatCode(() -> opsQuery.topBackendExceptions(FROM, TO, 10)).doesNotThrowAnyException();
        assertThatCode(() -> opsQuery.topBackendPaths(FROM, TO, 10)).doesNotThrowAnyException();

        assertThat(opsQuery.countBackendErrors(FROM, TO)).isEqualTo(3L);

        List<ControlCenterQueryRepository.NamedCount> exceptions =
                opsQuery.topBackendExceptions(FROM, TO, 10);
        assertThat(exceptions).extracting(ControlCenterQueryRepository.NamedCount::name)
                .contains(
                        "java.lang.NullPointerException",
                        "com.gdgoc.babi_order.payment.exception.TossPaymentException",
                        ActionableBackendErrorCriteria.ASYNC_REQUEST_TIMEOUT)
                .doesNotContain(ActionableBackendErrorCriteria.NO_RESOURCE_FOUND);

        long asyncTimeoutRows = exceptions.stream()
                .filter(n -> ActionableBackendErrorCriteria.ASYNC_REQUEST_TIMEOUT.equals(n.name()))
                .mapToLong(ControlCenterQueryRepository.NamedCount::count)
                .sum();
        assertThat(asyncTimeoutRows).isEqualTo(1L);

        List<ControlCenterQueryRepository.NamedCount> paths = opsQuery.topBackendPaths(FROM, TO, 10);
        assertThat(paths).extracting(ControlCenterQueryRepository.NamedCount::name)
                .contains("/api/orders", "/api/payments/confirm", "/api/other")
                .doesNotContain("/.env")
                .doesNotContain(OrderEventService.STREAM_PATH);
    }

    private void persist(String exceptionClass, String path, int status) {
        BackendError error = new BackendError(
                "req-" + exceptionClass.hashCode() + "-" + path.hashCode(),
                "GET",
                path,
                status,
                exceptionClass,
                "test",
                null,
                10L,
                null
        );
        setCreatedAt(error, T1);
        entityManager.persist(error);
    }

    private static void setCreatedAt(BackendError error, Instant createdAt) {
        try {
            Field field = BackendError.class.getDeclaredField("createdAt");
            field.setAccessible(true);
            field.set(error, createdAt);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException(ex);
        }
    }
}

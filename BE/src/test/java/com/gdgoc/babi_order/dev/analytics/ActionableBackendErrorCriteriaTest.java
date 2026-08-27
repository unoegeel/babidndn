package com.gdgoc.babi_order.dev.analytics;

import com.gdgoc.babi_order.order.service.OrderEventService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ActionableBackendErrorCriteriaTest {

    @Test
    void unexpectedException_isActionable() {
        assertThat(ActionableBackendErrorCriteria.isActionable(
                "java.lang.IllegalStateException", "/api/orders")).isTrue();
    }

    @Test
    void tossGatewayError_isActionable() {
        assertThat(ActionableBackendErrorCriteria.isActionable(
                "com.gdgoc.babi_order.payment.exception.TossPaymentException",
                "/api/payments/confirm")).isTrue();
    }

    @Test
    void historicalNoResourceFound_isExcluded() {
        assertThat(ActionableBackendErrorCriteria.isActionable(
                ActionableBackendErrorCriteria.NO_RESOURCE_FOUND,
                "/.env")).isFalse();
        assertThat(ActionableBackendErrorCriteria.isActionable(
                ActionableBackendErrorCriteria.NO_RESOURCE_FOUND,
                "/api/anything")).isFalse();
    }

    @Test
    void historicalSseAsyncTimeout_isExcluded() {
        assertThat(ActionableBackendErrorCriteria.isActionable(
                ActionableBackendErrorCriteria.ASYNC_REQUEST_TIMEOUT,
                OrderEventService.STREAM_PATH)).isFalse();
    }

    @Test
    void asyncTimeoutOnOtherPath_isActionable() {
        assertThat(ActionableBackendErrorCriteria.isActionable(
                ActionableBackendErrorCriteria.ASYNC_REQUEST_TIMEOUT,
                "/api/other")).isTrue();
    }

    @Test
    void mixedRows_actionableCountMatchesExpected() {
        record Row(String exceptionClass, String path) {
        }
        List<Row> rows = List.of(
                new Row("java.lang.NullPointerException", "/api/orders"),
                new Row("com.gdgoc.babi_order.payment.exception.TossPaymentException", "/api/payments/confirm"),
                new Row(ActionableBackendErrorCriteria.NO_RESOURCE_FOUND, "/.env"),
                new Row(ActionableBackendErrorCriteria.NO_RESOURCE_FOUND, "/.git/config"),
                new Row(ActionableBackendErrorCriteria.ASYNC_REQUEST_TIMEOUT, OrderEventService.STREAM_PATH),
                new Row(ActionableBackendErrorCriteria.ASYNC_REQUEST_TIMEOUT, "/api/other")
        );

        long actionable = rows.stream()
                .filter(r -> ActionableBackendErrorCriteria.isActionable(r.exceptionClass(), r.path()))
                .count();

        assertThat(actionable).isEqualTo(3);
    }

    @Test
    void sqlPredicateMentionsOnlyScopedAsyncTimeout() {
        String sql = ActionableBackendErrorCriteria.SQL_ACTIONABLE_PREDICATE;
        assertThat(sql).contains("NoResourceFoundException");
        assertThat(sql).contains("AsyncRequestTimeoutException");
        assertThat(sql).contains(":sseStreamPath");
        assertThat(ActionableBackendErrorCriteria.sseStreamPath()).isEqualTo("/api/orders/stream");
    }
}

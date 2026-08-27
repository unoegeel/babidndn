package com.gdgoc.babi_order.dev.analytics;

import com.gdgoc.babi_order.order.service.OrderEventService;

/**
 * Analytics-only definition of actionable backend errors.
 * Raw {@code backend_errors} rows and {@code /dev/errors} are unchanged;
 * known expected historical noise is excluded from Control Center KPIs only.
 */
public final class ActionableBackendErrorCriteria {

    public static final String NO_RESOURCE_FOUND =
            "org.springframework.web.servlet.resource.NoResourceFoundException";
    public static final String ASYNC_REQUEST_TIMEOUT =
            "org.springframework.web.context.request.async.AsyncRequestTimeoutException";

    /**
     * SQL predicate (no leading AND) for native queries on {@code backend_errors}.
     * Bind {@code :sseStreamPath} to {@link #sseStreamPath()}.
     */
    public static final String SQL_ACTIONABLE_PREDICATE = """
            NOT (
              exception_class = 'org.springframework.web.servlet.resource.NoResourceFoundException'
              OR (
                exception_class = 'org.springframework.web.context.request.async.AsyncRequestTimeoutException'
                AND path = :sseStreamPath
              )
            )
            """;

    private ActionableBackendErrorCriteria() {
    }

    public static String sseStreamPath() {
        return OrderEventService.STREAM_PATH;
    }

    /**
     * @return true when the row should count toward Analytics server-error KPIs
     */
    public static boolean isActionable(String exceptionClass, String path) {
        if (exceptionClass == null || exceptionClass.isBlank()) {
            return true;
        }
        if (NO_RESOURCE_FOUND.equals(exceptionClass)) {
            return false;
        }
        if (ASYNC_REQUEST_TIMEOUT.equals(exceptionClass)
                && OrderEventService.STREAM_PATH.equals(path)) {
            return false;
        }
        return true;
    }
}

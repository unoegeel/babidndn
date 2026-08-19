package com.gdgoc.babi_order.common.logging;

import java.io.PrintWriter;
import java.io.StringWriter;

public final class ErrorLogSupport {

    private static final int MAX_STACK_LENGTH = 8000;

    private ErrorLogSupport() {
    }

    public static String sanitizeSingleLine(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value.replace('\n', ' ').replace('\r', ' ');
    }

    public static String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    public static String stackTraceOf(Throwable throwable) {
        if (throwable == null) {
            return null;
        }
        StringWriter writer = new StringWriter();
        throwable.printStackTrace(new PrintWriter(writer));
        return truncate(writer.toString(), MAX_STACK_LENGTH);
    }

    public static String simpleExceptionName(String exceptionClass) {
        if (exceptionClass == null || exceptionClass.isBlank()) {
            return "-";
        }
        int lastDot = exceptionClass.lastIndexOf('.');
        return lastDot >= 0 ? exceptionClass.substring(lastDot + 1) : exceptionClass;
    }

    public static String messageSummary(String message, int maxLength) {
        if (message == null || message.isBlank()) {
            return "-";
        }
        String sanitized = sanitizeSingleLine(message);
        return truncate(sanitized, maxLength);
    }
}

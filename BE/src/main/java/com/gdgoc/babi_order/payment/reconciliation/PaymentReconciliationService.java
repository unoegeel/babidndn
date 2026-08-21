package com.gdgoc.babi_order.payment.reconciliation;

import com.gdgoc.babi_order.common.exception.ApiException;
import com.gdgoc.babi_order.payment.reconciliation.dto.PaymentReconciliationResponse;
import com.gdgoc.babi_order.payment.reconciliation.dto.ReconciliationIssueResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Order ↔ Payment 정합성 이상을 조회한다. 자동 수정은 하지 않는다.
 */
@Service
@RequiredArgsConstructor
public class PaymentReconciliationService {

    static final ZoneId STORE_ZONE = ZoneId.of("Asia/Seoul");

    private final PaymentReconciliationQueryRepository queryRepository;

    @Transactional(readOnly = true)
    public PaymentReconciliationResponse reconcile(String period) {
        String normalized = normalizePeriod(period);
        LocalDateTime from = resolveFrom(normalized, LocalDate.now(STORE_ZONE));
        LocalDateTime now = LocalDateTime.now(STORE_ZONE);

        List<ReconciliationIssueResponse> issues = new ArrayList<>();
        for (ReconciliationIssueRow row : queryRepository.findPaymentDoneOrderNotActivated(from)) {
            issues.add(toIssue(row));
        }
        for (ReconciliationIssueRow row : queryRepository.findOrderActivatedWithoutValidPayment(from)) {
            issues.add(toIssue(row));
        }
        for (ReconciliationIssueRow row : queryRepository.findPaymentAmountMismatch(from)) {
            issues.add(toIssue(row));
        }
        for (ReconciliationIssueRow row : queryRepository.findMultipleValidPayments(from)) {
            issues.add(toIssue(row));
        }

        issues.sort(Comparator
                .comparing(ReconciliationIssueResponse::getSeverity)
                .thenComparing(ReconciliationIssueResponse::getDetectedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())));

        return PaymentReconciliationResponse.builder()
                .generatedAt(now)
                .period(normalized)
                .from(from)
                .issueCount(issues.size())
                .issues(issues)
                .build();
    }

    static String normalizePeriod(String period) {
        if (period == null || period.isBlank()) {
            return "7d";
        }
        return switch (period.trim().toLowerCase()) {
            case "1d", "today" -> "1d";
            case "7d" -> "7d";
            case "30d" -> "30d";
            default -> throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_REQUEST",
                    "period는 1d, 7d, 30d 중 하나여야 합니다."
            );
        };
    }

    static LocalDateTime resolveFrom(String normalizedPeriod, LocalDate todaySeoul) {
        return switch (normalizedPeriod) {
            case "1d" -> todaySeoul.atStartOfDay();
            case "7d" -> todaySeoul.minusDays(6).atStartOfDay();
            case "30d" -> todaySeoul.minusDays(29).atStartOfDay();
            default -> todaySeoul.minusDays(6).atStartOfDay();
        };
    }

    private static ReconciliationIssueResponse toIssue(ReconciliationIssueRow row) {
        ReconciliationSeverity severity = switch (row.type()) {
            case PAYMENT_DONE_ORDER_NOT_ACTIVATED,
                 ORDER_ACTIVATED_WITHOUT_VALID_PAYMENT,
                 MULTIPLE_VALID_PAYMENTS -> ReconciliationSeverity.CRITICAL;
            case PAYMENT_AMOUNT_MISMATCH -> ReconciliationSeverity.WARNING;
        };

        Map<String, Object> metadata = new LinkedHashMap<>();
        if (row.orderTotalAmount() != null) {
            metadata.put("orderTotalAmount", row.orderTotalAmount());
        }
        if (row.paymentAmount() != null) {
            metadata.put("paymentAmount", row.paymentAmount());
        }
        if (row.pickupNumber() != null) {
            metadata.put("pickupNumber", row.pickupNumber());
        }
        if (row.donePaymentCount() != null) {
            metadata.put("donePaymentCount", row.donePaymentCount());
        }

        return ReconciliationIssueResponse.builder()
                .type(row.type())
                .severity(severity)
                .orderId(row.orderId())
                .paymentId(row.paymentId())
                .message(buildMessage(row))
                .detectedAt(row.referenceAt())
                .metadata(metadata)
                .build();
    }

    private static String buildMessage(ReconciliationIssueRow row) {
        return switch (row.type()) {
            case PAYMENT_DONE_ORDER_NOT_ACTIVATED ->
                    "결제는 DONE인데 주문 픽업번호가 미발급(0)입니다. activateAfterPayment 누락 가능성이 있습니다.";
            case ORDER_ACTIVATED_WITHOUT_VALID_PAYMENT ->
                    "픽업번호가 발급됐지만 DONE 결제가 없습니다.";
            case PAYMENT_AMOUNT_MISMATCH ->
                    "주문 금액(" + row.orderTotalAmount() + ")과 결제 금액(" + row.paymentAmount() + ")이 다릅니다.";
            case MULTIPLE_VALID_PAYMENTS ->
                    "동일 주문에 DONE 결제가 " + row.donePaymentCount() + "건 있습니다.";
        };
    }
}

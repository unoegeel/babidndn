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
import java.util.List;

/**
 * Order ↔ Payment 정합성 이상을 조회한다. GET 경로에서는 자동 수정·persist 하지 않는다.
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

        List<DetectedAnomaly> detected = detectAnomalies(from);
        List<ReconciliationIssueResponse> issues = detected.stream()
                .map(PaymentReconciliationService::toSnapshotIssue)
                .sorted(Comparator
                        .comparing(ReconciliationIssueResponse::getSeverity)
                        .thenComparing(ReconciliationIssueResponse::getDetectedAt,
                                Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        return PaymentReconciliationResponse.builder()
                .generatedAt(now)
                .period(normalized)
                .from(from)
                .issueCount(issues.size())
                .issues(issues)
                .build();
    }

    /**
     * Phase A detection queries — reused by snapshot GET and persisted scan.
     */
    @Transactional(readOnly = true)
    public List<DetectedAnomaly> detectAnomalies(LocalDateTime fromInclusive) {
        List<DetectedAnomaly> detected = new ArrayList<>();
        for (ReconciliationIssueRow row : queryRepository.findPaymentDoneOrderNotActivated(fromInclusive)) {
            detected.add(DetectedAnomaly.from(row));
        }
        for (ReconciliationIssueRow row : queryRepository.findOrderActivatedWithoutPayment(fromInclusive)) {
            detected.add(DetectedAnomaly.from(row));
        }
        for (ReconciliationIssueRow row : queryRepository.findOrderActiveWithCanceledPayment(fromInclusive)) {
            detected.add(DetectedAnomaly.from(row));
        }
        for (ReconciliationIssueRow row : queryRepository.findPaymentAmountMismatch(fromInclusive)) {
            detected.add(DetectedAnomaly.from(row));
        }
        for (ReconciliationIssueRow row : queryRepository.findMultipleValidPayments(fromInclusive)) {
            detected.add(DetectedAnomaly.from(row));
        }
        return detected;
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

    private static ReconciliationIssueResponse toSnapshotIssue(DetectedAnomaly anomaly) {
        return ReconciliationIssueResponse.builder()
                .type(anomaly.type())
                .severity(anomaly.severity())
                .orderId(anomaly.orderId())
                .paymentId(anomaly.paymentId())
                .message(anomaly.message())
                .detectedAt(anomaly.referenceAt())
                .metadata(anomaly.metadata())
                .build();
    }
}

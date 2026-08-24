package com.gdgoc.babi_order.payment.reconciliation;

import com.gdgoc.babi_order.common.exception.ApiException;
import com.gdgoc.babi_order.payment.reconciliation.dto.PersistedReconciliationIssueResponse;
import com.gdgoc.babi_order.payment.reconciliation.dto.ReconciliationScanResponse;
import com.gdgoc.babi_order.payment.reconciliation.entity.PaymentReconciliationIssue;
import com.gdgoc.babi_order.payment.reconciliation.repository.PaymentReconciliationIssueRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Persisted reconciliation incident lifecycle (scan / list).
 * Does not mutate Order or Payment.
 */
@Slf4j
@Service
public class PaymentReconciliationScanService {

    private final PaymentReconciliationService reconciliationService;
    private final PaymentReconciliationQueryRepository queryRepository;
    private final PaymentReconciliationIssueRepository issueRepository;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate insertTransactionTemplate;

    public PaymentReconciliationScanService(
            PaymentReconciliationService reconciliationService,
            PaymentReconciliationQueryRepository queryRepository,
            PaymentReconciliationIssueRepository issueRepository,
            ObjectMapper objectMapper,
            PlatformTransactionManager transactionManager
    ) {
        this.reconciliationService = reconciliationService;
        this.queryRepository = queryRepository;
        this.issueRepository = issueRepository;
        this.objectMapper = objectMapper;
        this.insertTransactionTemplate = new TransactionTemplate(transactionManager);
        this.insertTransactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Transactional
    public ReconciliationScanResponse scan(String period) {
        String normalized = PaymentReconciliationService.normalizePeriod(period);
        LocalDateTime from = PaymentReconciliationService.resolveFrom(
                normalized, LocalDate.now(PaymentReconciliationService.STORE_ZONE));
        LocalDateTime now = LocalDateTime.now(PaymentReconciliationService.STORE_ZONE);

        List<DetectedAnomaly> detected = reconciliationService.detectAnomalies(from);
        Map<String, DetectedAnomaly> detectedByKey = new LinkedHashMap<>();
        for (DetectedAnomaly anomaly : detected) {
            detectedByKey.put(anomaly.logicalKey(), anomaly);
        }

        List<PaymentReconciliationIssue> openIssues =
                issueRepository.findByStatus(ReconciliationIssueStatus.OPEN);
        Map<String, PaymentReconciliationIssue> openByLogical = new HashMap<>();
        for (PaymentReconciliationIssue issue : openIssues) {
            openByLogical.put(issue.getLogicalKey(), issue);
        }

        List<Long> createdIssueIds = new ArrayList<>();
        int updatedCount = 0;

        for (DetectedAnomaly anomaly : detected) {
            PaymentReconciliationIssue existing = openByLogical.get(anomaly.logicalKey());
            if (existing != null) {
                existing.touch(now, anomaly.message(), toMetadataJson(anomaly.metadata()));
                updatedCount++;
                continue;
            }

            CreateOutcome outcome = createOpenOrTouchOnRace(anomaly, now);
            if (outcome.createdId() != null) {
                createdIssueIds.add(outcome.createdId());
                issueRepository.findById(outcome.createdId()).ifPresent(
                        created -> openByLogical.put(created.getLogicalKey(), created)
                );
            } else if (outcome.wasTouched()) {
                updatedCount++;
                issueRepository.findByActiveKey(anomaly.logicalKey()).ifPresent(
                        touched -> openByLogical.put(touched.getLogicalKey(), touched)
                );
            }
        }

        List<PaymentReconciliationIssue> resolveCandidates = openIssues.stream()
                .filter(issue -> !detectedByKey.containsKey(issue.getLogicalKey()))
                .toList();

        Set<String> stillAnomalous = findStillAnomalousLogicalKeys(resolveCandidates);
        int resolvedCount = 0;
        for (PaymentReconciliationIssue issue : resolveCandidates) {
            if (!stillAnomalous.contains(issue.getLogicalKey())) {
                issue.resolve(now);
                resolvedCount++;
            }
        }

        return ReconciliationScanResponse.builder()
                .scannedAt(now)
                .period(normalized)
                .detectedCount(detected.size())
                .createdCount(createdIssueIds.size())
                .updatedCount(updatedCount)
                .resolvedCount(resolvedCount)
                .openCount(issueRepository.countByStatus(ReconciliationIssueStatus.OPEN))
                .createdIssueIds(List.copyOf(createdIssueIds))
                .build();
    }

    @Transactional(readOnly = true)
    public List<PersistedReconciliationIssueResponse> listIssues(String statusParam, String period) {
        String normalizedPeriod = PaymentReconciliationService.normalizePeriod(period);
        LocalDateTime from = PaymentReconciliationService.resolveFrom(
                normalizedPeriod, LocalDate.now(PaymentReconciliationService.STORE_ZONE));

        ReconciliationIssueStatus statusFilter = parseStatus(statusParam);
        List<PaymentReconciliationIssue> issues;
        if (statusFilter != null) {
            issues = issueRepository.findByStatusAndLastDetectedAtGreaterThanEqualOrderByLastDetectedAtDesc(
                    statusFilter, from);
        } else {
            issues = issueRepository.findByLastDetectedAtGreaterThanEqualOrderByLastDetectedAtDesc(from);
        }
        return issues.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public PersistedReconciliationIssueResponse getIssue(Long id) {
        PaymentReconciliationIssue issue = issueRepository.findById(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "RECONCILIATION_ISSUE_NOT_FOUND",
                        "정합성 이슈를 찾을 수 없습니다."
                ));
        return toResponse(issue);
    }

    private CreateOutcome createOpenOrTouchOnRace(DetectedAnomaly anomaly, LocalDateTime now) {
        try {
            Long id = insertTransactionTemplate.execute(status -> {
                Optional<PaymentReconciliationIssue> existing =
                        issueRepository.findByActiveKey(anomaly.logicalKey());
                if (existing.isPresent()) {
                    existing.get().touch(now, anomaly.message(), toMetadataJson(anomaly.metadata()));
                    return null;
                }
                PaymentReconciliationIssue created = PaymentReconciliationIssue.open(
                        anomaly.logicalKey(),
                        anomaly.type(),
                        anomaly.severity(),
                        anomaly.orderId(),
                        anomaly.paymentId(),
                        anomaly.message(),
                        toMetadataJson(anomaly.metadata()),
                        now
                );
                issueRepository.saveAndFlush(created);
                return created.getId();
            });
            if (id != null) {
                return CreateOutcome.created(id);
            }
            return CreateOutcome.raceTouched();
        } catch (DataIntegrityViolationException exception) {
            if (!isDuplicateActiveKey(exception)) {
                throw exception;
            }
            PaymentReconciliationIssue existing = issueRepository.findByActiveKey(anomaly.logicalKey())
                    .orElseThrow(() -> exception);
            existing.touch(now, anomaly.message(), toMetadataJson(anomaly.metadata()));
            return CreateOutcome.raceTouched();
        }
    }

    private Set<String> findStillAnomalousLogicalKeys(List<PaymentReconciliationIssue> candidates) {
        Set<String> still = new HashSet<>();
        if (candidates.isEmpty()) {
            return still;
        }

        Map<ReconciliationIssueType, List<PaymentReconciliationIssue>> byType =
                new EnumMap<>(ReconciliationIssueType.class);
        for (PaymentReconciliationIssue issue : candidates) {
            byType.computeIfAbsent(issue.getIssueType(), ignored -> new ArrayList<>()).add(issue);
        }

        List<PaymentReconciliationIssue> notActivated =
                byType.getOrDefault(ReconciliationIssueType.PAYMENT_DONE_ORDER_NOT_ACTIVATED, List.of());
        if (!notActivated.isEmpty()) {
            List<Long> paymentIds = notActivated.stream().map(PaymentReconciliationIssue::getPaymentId).toList();
            Set<Long> stillIds = new HashSet<>(queryRepository.findPaymentIdsStillDoneNotActivated(paymentIds));
            for (PaymentReconciliationIssue issue : notActivated) {
                if (stillIds.contains(issue.getPaymentId())) {
                    still.add(issue.getLogicalKey());
                }
            }
        }

        List<PaymentReconciliationIssue> withoutValidDeprecated =
                byType.getOrDefault(ReconciliationIssueType.ORDER_ACTIVATED_WITHOUT_VALID_PAYMENT, List.of());
        // Deprecated rule: never keep OPEN; refined types are created in the same scan when needed.
        if (!withoutValidDeprecated.isEmpty()) {
            queryRepository.findOrderIdsStillActivatedWithoutValidPayment(
                    withoutValidDeprecated.stream().map(PaymentReconciliationIssue::getOrderId).toList());
        }

        List<PaymentReconciliationIssue> withoutPayment =
                byType.getOrDefault(ReconciliationIssueType.ORDER_ACTIVATED_WITHOUT_PAYMENT, List.of());
        if (!withoutPayment.isEmpty()) {
            List<Long> orderIds = withoutPayment.stream().map(PaymentReconciliationIssue::getOrderId).toList();
            Set<Long> stillIds = new HashSet<>(queryRepository.findOrderIdsStillActivatedWithoutPayment(orderIds));
            for (PaymentReconciliationIssue issue : withoutPayment) {
                if (stillIds.contains(issue.getOrderId())) {
                    still.add(issue.getLogicalKey());
                }
            }
        }

        List<PaymentReconciliationIssue> activeCanceled =
                byType.getOrDefault(ReconciliationIssueType.ORDER_ACTIVE_WITH_CANCELED_PAYMENT, List.of());
        if (!activeCanceled.isEmpty()) {
            List<Long> orderIds = activeCanceled.stream().map(PaymentReconciliationIssue::getOrderId).toList();
            Set<Long> stillIds = new HashSet<>(queryRepository.findOrderIdsStillActiveWithCanceledPayment(orderIds));
            for (PaymentReconciliationIssue issue : activeCanceled) {
                if (stillIds.contains(issue.getOrderId())) {
                    still.add(issue.getLogicalKey());
                }
            }
        }

        List<PaymentReconciliationIssue> amountMismatch =
                byType.getOrDefault(ReconciliationIssueType.PAYMENT_AMOUNT_MISMATCH, List.of());
        if (!amountMismatch.isEmpty()) {
            List<Long> paymentIds = amountMismatch.stream().map(PaymentReconciliationIssue::getPaymentId).toList();
            Set<Long> stillIds = new HashSet<>(queryRepository.findPaymentIdsStillAmountMismatch(paymentIds));
            for (PaymentReconciliationIssue issue : amountMismatch) {
                if (stillIds.contains(issue.getPaymentId())) {
                    still.add(issue.getLogicalKey());
                }
            }
        }

        List<PaymentReconciliationIssue> multiple =
                byType.getOrDefault(ReconciliationIssueType.MULTIPLE_VALID_PAYMENTS, List.of());
        if (!multiple.isEmpty()) {
            List<Long> orderIds = multiple.stream().map(PaymentReconciliationIssue::getOrderId).toList();
            Set<Long> stillIds = new HashSet<>(queryRepository.findOrderIdsStillMultipleValidPayments(orderIds));
            for (PaymentReconciliationIssue issue : multiple) {
                if (stillIds.contains(issue.getOrderId())) {
                    still.add(issue.getLogicalKey());
                }
            }
        }

        return still;
    }

    private PersistedReconciliationIssueResponse toResponse(PaymentReconciliationIssue issue) {
        return PersistedReconciliationIssueResponse.builder()
                .id(issue.getId())
                .logicalKey(issue.getLogicalKey())
                .type(issue.getIssueType())
                .severity(issue.getSeverity())
                .status(issue.getStatus())
                .orderId(issue.getOrderId())
                .paymentId(issue.getPaymentId())
                .message(issue.getMessage())
                .metadata(parseMetadata(issue.getMetadata()))
                .firstDetectedAt(issue.getFirstDetectedAt())
                .lastDetectedAt(issue.getLastDetectedAt())
                .resolvedAt(issue.getResolvedAt())
                .occurrenceCount(issue.getOccurrenceCount())
                .build();
    }

    private String toMetadataJson(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (Exception exception) {
            log.warn("Failed to serialize reconciliation metadata");
            return null;
        }
    }

    private Map<String, Object> parseMetadata(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (Exception exception) {
            return Map.of();
        }
    }

    static ReconciliationIssueStatus parseStatus(String statusParam) {
        if (statusParam == null || statusParam.isBlank()) {
            return ReconciliationIssueStatus.OPEN;
        }
        if ("ALL".equalsIgnoreCase(statusParam.trim())) {
            return null;
        }
        try {
            return ReconciliationIssueStatus.valueOf(statusParam.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_REQUEST",
                    "status는 OPEN, RESOLVED, ALL 중 하나여야 합니다."
            );
        }
    }

    static boolean isDuplicateActiveKey(DataIntegrityViolationException exception) {
        Throwable root = exception.getMostSpecificCause();
        if (!(root instanceof SQLException sqlException)) {
            return false;
        }
        String message = sqlException.getMessage();
        if (message == null || !message.toLowerCase().contains("uk_recon_active_key")) {
            return false;
        }
        int errorCode = sqlException.getErrorCode();
        if (errorCode == 1062 || errorCode == 23505) {
            return true;
        }
        return "23000".equals(sqlException.getSQLState());
    }

    private record CreateOutcome(Long createdId, boolean wasTouched) {
        static CreateOutcome created(Long id) {
            return new CreateOutcome(id, false);
        }

        static CreateOutcome raceTouched() {
            return new CreateOutcome(null, true);
        }
    }
}

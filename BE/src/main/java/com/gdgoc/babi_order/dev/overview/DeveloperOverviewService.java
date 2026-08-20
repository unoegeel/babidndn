package com.gdgoc.babi_order.dev.overview;

import com.gdgoc.babi_order.backenderror.entity.BackendError;
import com.gdgoc.babi_order.backenderror.repository.BackendErrorRepository;
import com.gdgoc.babi_order.clienterror.entity.ClientError;
import com.gdgoc.babi_order.clienterror.repository.ClientErrorRepository;
import com.gdgoc.babi_order.dev.analytics.DeveloperAnalyticsService;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsOverviewResponse;
import com.gdgoc.babi_order.dev.overview.dto.DeveloperOverviewResponse;
import com.gdgoc.babi_order.dev.overview.dto.OverviewErrorsMetrics;
import com.gdgoc.babi_order.dev.overview.dto.OverviewEventsMetrics;
import com.gdgoc.babi_order.dev.overview.dto.OverviewRequestsMetrics;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeveloperOverviewService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final ClientErrorRepository clientErrorRepository;
    private final BackendErrorRepository backendErrorRepository;
    private final DeveloperOverviewQueryRepository overviewQueryRepository;
    private final DeveloperAnalyticsService analyticsService;

    public DeveloperOverviewResponse overview() {
        Instant now = Instant.now();
        Instant errorsFrom = now.minusSeconds(24 * 60 * 60);
        Instant todayStart = todayStartSeoul(now);
        AnalyticsOverviewResponse funnel = analyticsService.overview(todayStart, now);

        return DeveloperOverviewResponse.builder()
                .errors(buildErrorsMetrics(errorsFrom, now))
                .requests(buildRequestsMetrics(todayStart, now))
                .events(buildEventsMetrics(todayStart, now))
                .funnel(funnel)
                .build();
    }

    private OverviewErrorsMetrics buildErrorsMetrics(Instant from, Instant to) {
        Specification<ClientError> clientRange = createdBetween(from, to);
        Specification<BackendError> backendRange = backendCreatedBetween(from, to);

        long frontendErrors = clientErrorRepository.count(clientRange);
        long serverErrors = backendErrorRepository.count(backendRange);

        Instant lastFrontend = overviewQueryRepository
                .maxInstant("client_errors", "created_at", from, to)
                .orElse(null);
        Instant lastBackend = overviewQueryRepository
                .maxInstant("backend_errors", "created_at", from, to)
                .orElse(null);
        Instant lastOccurredAt = maxInstant(lastFrontend, lastBackend);

        return OverviewErrorsMetrics.builder()
                .last24h(frontendErrors + serverErrors)
                .serverErrors(serverErrors)
                .frontendErrors(frontendErrors)
                .lastOccurredAt(lastOccurredAt)
                .build();
    }

    private OverviewRequestsMetrics buildRequestsMetrics(Instant from, Instant to) {
        DeveloperOverviewQueryRepository.RequestMetricsRow row =
                overviewQueryRepository.requestMetrics(from, to);
        return OverviewRequestsMetrics.builder()
                .today(row.total())
                .success(row.success())
                .clientErrors(row.clientErrors())
                .serverErrors(row.serverErrors())
                .averageDurationMs(row.averageDurationMs())
                .build();
    }

    private OverviewEventsMetrics buildEventsMetrics(Instant from, Instant to) {
        DeveloperOverviewQueryRepository.EventMetricsRow row =
                overviewQueryRepository.eventMetrics(from, to);
        return OverviewEventsMetrics.builder()
                .today(row.total())
                .uniqueSessions(row.uniqueSessions())
                .topEvent(row.topEvent())
                .build();
    }

    private static Instant todayStartSeoul(Instant now) {
        return ZonedDateTime.ofInstant(now, SEOUL)
                .toLocalDate()
                .atStartOfDay(SEOUL)
                .toInstant();
    }

    private static Specification<ClientError> createdBetween(Instant from, Instant to) {
        return (root, query, cb) -> cb.and(
                cb.greaterThanOrEqualTo(root.get("createdAt"), from),
                cb.lessThanOrEqualTo(root.get("createdAt"), to)
        );
    }

    private static Specification<BackendError> backendCreatedBetween(Instant from, Instant to) {
        return (root, query, cb) -> cb.and(
                cb.greaterThanOrEqualTo(root.get("createdAt"), from),
                cb.lessThanOrEqualTo(root.get("createdAt"), to)
        );
    }

    private static Instant maxInstant(Instant a, Instant b) {
        if (a == null) {
            return b;
        }
        if (b == null) {
            return a;
        }
        return a.isAfter(b) ? a : b;
    }
}

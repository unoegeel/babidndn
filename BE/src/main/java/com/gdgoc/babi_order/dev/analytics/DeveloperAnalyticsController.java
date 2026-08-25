package com.gdgoc.babi_order.dev.analytics;

import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsFunnelResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsMenuOptionsResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsMenusResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsOptionsResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsOverviewResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterFunnelResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterInsightsResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterMenusResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterOperationsResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterOverviewResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterPaymentsResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterPerformanceResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterReliabilityResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterSalesResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

/**
 * Developer Analytics Control Center API.
 * Period: from/to ISO-8601 Instant. Default = Asia/Seoul today 00:00 → now (StoreTime).
 */
@RestController
@RequestMapping("/api/dev/analytics")
@RequiredArgsConstructor
@Tag(name = "DeveloperAnalytics", description = "Developer Analytics Control Center")
public class DeveloperAnalyticsController {

    private final DeveloperAnalyticsService analyticsService;
    private final DeveloperControlCenterService controlCenterService;

    @GetMapping("/overview")
    @Operation(summary = "Control Center Overview KPIs")
    public ControlCenterOverviewResponse overview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return controlCenterService.overview(AnalyticsRange.of(from, to));
    }

    @GetMapping("/behavior-overview")
    @Operation(summary = "Legacy behavior-only overview (client_events)")
    public AnalyticsOverviewResponse behaviorOverview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        AnalyticsRange range = AnalyticsRange.of(from, to);
        return analyticsService.overview(range.fromInstant(), range.toInstant());
    }

    @GetMapping("/sales")
    public ControlCenterSalesResponse sales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return controlCenterService.sales(AnalyticsRange.of(from, to));
    }

    @GetMapping("/funnel")
    @Operation(summary = "Funnel — aggregate + sequential session")
    public ControlCenterFunnelResponse controlFunnel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return controlCenterService.funnel(AnalyticsRange.of(from, to));
    }

    @GetMapping("/funnel-legacy")
    @Operation(summary = "Legacy anonymous-id funnel (8 steps)")
    public AnalyticsFunnelResponse funnelLegacy(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        AnalyticsRange range = AnalyticsRange.of(from, to);
        return analyticsService.funnel(range.fromInstant(), range.toInstant());
    }

    @GetMapping("/menus")
    @Operation(summary = "Menu performance — behavior + paid sales")
    public ControlCenterMenusResponse controlMenus(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return controlCenterService.menus(AnalyticsRange.of(from, to));
    }

    @GetMapping("/menus-behavior")
    @Operation(summary = "Legacy menu views/cartAdds only")
    public AnalyticsMenusResponse menusBehavior(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        AnalyticsRange range = AnalyticsRange.of(from, to);
        return analyticsService.menus(range.fromInstant(), range.toInstant());
    }

    @GetMapping("/options")
    public AnalyticsOptionsResponse options(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        AnalyticsRange range = AnalyticsRange.of(from, to);
        return analyticsService.options(range.fromInstant(), range.toInstant());
    }

    @GetMapping("/menu-options")
    public AnalyticsMenuOptionsResponse menuOptions(
            @RequestParam long menuId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        AnalyticsRange range = AnalyticsRange.of(from, to);
        return analyticsService.menuOptions(menuId, range.fromInstant(), range.toInstant());
    }

    @GetMapping("/payments")
    public ControlCenterPaymentsResponse payments(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return controlCenterService.payments(AnalyticsRange.of(from, to));
    }

    @GetMapping("/operations")
    public ControlCenterOperationsResponse operations(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return controlCenterService.operations(AnalyticsRange.of(from, to));
    }

    @GetMapping("/performance")
    public ControlCenterPerformanceResponse performance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return controlCenterService.performance(AnalyticsRange.of(from, to));
    }

    @GetMapping("/reliability")
    public ControlCenterReliabilityResponse reliability(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return controlCenterService.reliability(AnalyticsRange.of(from, to));
    }

    @GetMapping("/insights")
    public ControlCenterInsightsResponse insights(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return controlCenterService.insights(AnalyticsRange.of(from, to));
    }
}

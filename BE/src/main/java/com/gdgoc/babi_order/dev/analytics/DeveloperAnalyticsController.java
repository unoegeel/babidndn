package com.gdgoc.babi_order.dev.analytics;

import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsFunnelResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsMenuOptionsResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsMenusResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsOptionsResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsOverviewResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * Developer Console Analytics API.
 *
 * 기간 파라미터: from / to (ISO-8601, UTC Instant).
 * 미전달 시 Asia/Seoul 기준 오늘(00:00:00 ~ 현재)로 기본 처리.
 *
 * 모든 엔드포인트는 ROLE_DEVELOPER 전용 (SecurityConfig에서 /api/dev/** 일괄 처리).
 */
@RestController
@RequestMapping("/api/dev/analytics")
@RequiredArgsConstructor
@Tag(name = "DeveloperAnalytics", description = "Developer Console Analytics")
public class DeveloperAnalyticsController {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final DeveloperAnalyticsService analyticsService;

    @GetMapping("/overview")
    @Operation(summary = "KPI Overview", description = "기간 내 사용자 행동 KPI 집계")
    public AnalyticsOverviewResponse overview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        Instant[] range = resolveRange(from, to);
        return analyticsService.overview(range[0], range[1]);
    }

    @GetMapping("/funnel")
    @Operation(summary = "주문 Funnel", description = "기간 내 단계별 고유 사용자 수 및 전환율")
    public AnalyticsFunnelResponse funnel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        Instant[] range = resolveRange(from, to);
        return analyticsService.funnel(range[0], range[1]);
    }

    @GetMapping("/menus")
    @Operation(summary = "메뉴 Analytics", description = "메뉴별 조회 수 / 장바구니 추가 수 순위")
    public AnalyticsMenusResponse menus(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        Instant[] range = resolveRange(from, to);
        return analyticsService.menus(range[0], range[1]);
    }

    @GetMapping("/options")
    @Operation(summary = "옵션 Analytics", description = "옵션 선택 수 순위")
    public AnalyticsOptionsResponse options(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        Instant[] range = resolveRange(from, to);
        return analyticsService.options(range[0], range[1]);
    }

    @GetMapping("/menu-options")
    @Operation(summary = "Menu × Option Analytics", description = "메뉴별 옵션 선택률 (MENU_OPTION_OPEN 기준)")
    public AnalyticsMenuOptionsResponse menuOptions(
            @RequestParam long menuId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        Instant[] range = resolveRange(from, to);
        return analyticsService.menuOptions(menuId, range[0], range[1]);
    }

    /**
     * from/to 미전달 시 Asia/Seoul 기준 오늘 00:00:00 ~ 현재로 기본 처리.
     */
    private static Instant[] resolveRange(Instant from, Instant to) {
        Instant now = Instant.now();
        if (from == null) {
            ZonedDateTime todaySeoul = ZonedDateTime.now(SEOUL)
                    .toLocalDate()
                    .atStartOfDay(SEOUL);
            from = todaySeoul.toInstant();
        }
        if (to == null) {
            to = now;
        }
        return new Instant[]{from, to};
    }
}

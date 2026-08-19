package com.gdgoc.babi_order.dev.analytics;

import com.gdgoc.babi_order.clientevent.ClientEventType;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsFunnelResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsMenusResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsOptionsResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsOverviewResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsPeriod;
import com.gdgoc.babi_order.dev.analytics.dto.FunnelStepResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeveloperAnalyticsService {

    private static final int TOP_N = 10;

    /**
     * Funnel 단계 정의 (순서 중요).
     * MENU_OPTION_OPEN, OPTION_SELECTED는 보조 지표이므로 Funnel에서 제외.
     */
    private static final List<String[]> FUNNEL_STEPS = List.of(
            new String[]{"MENU_VIEW", "메뉴 조회"},
            new String[]{"ADD_TO_CART", "장바구니 추가"},
            new String[]{"CART_VIEW", "장바구니 조회"},
            new String[]{"CHECKOUT_VIEW", "결제 화면 진입"},
            new String[]{"PAYMENT_START", "결제 시작"},
            new String[]{"PAYMENT_SUCCESS", "결제 성공"},
            new String[]{"ORDER_CREATED", "주문 생성"},
            new String[]{"ORDER_COMPLETED", "주문 완료"}
    );

    private final AnalyticsQueryRepository queryRepository;

    // ───────────── Overview ─────────────

    public AnalyticsOverviewResponse overview(Instant from, Instant to) {
        return AnalyticsOverviewResponse.builder()
                .period(period(from, to))
                // uniqueVisitors = MENU_VIEW의 distinct anonymousId
                .uniqueVisitors(queryRepository.countDistinctAnonymousId(
                        ClientEventType.MENU_VIEW.name(), from, to))
                .menuViews(queryRepository.countEvents(
                        ClientEventType.MENU_VIEW.name(), from, to))
                .cartAdds(queryRepository.countEvents(
                        ClientEventType.ADD_TO_CART.name(), from, to))
                .checkoutViews(queryRepository.countEvents(
                        ClientEventType.CHECKOUT_VIEW.name(), from, to))
                .paymentStarts(queryRepository.countEvents(
                        ClientEventType.PAYMENT_START.name(), from, to))
                .paymentSuccesses(queryRepository.countEvents(
                        ClientEventType.PAYMENT_SUCCESS.name(), from, to))
                .ordersCreated(queryRepository.countEvents(
                        ClientEventType.ORDER_CREATED.name(), from, to))
                .ordersCompleted(queryRepository.countEvents(
                        ClientEventType.ORDER_COMPLETED.name(), from, to))
                .build();
    }

    // ───────────── Funnel ─────────────

    /**
     * 기간 내 Funnel 각 단계의 distinct anonymousId 수를 집계한다.
     *
     * conversionRate = 첫 단계 대비 이 단계 uniqueUsers 비율
     * stepConversion = 직전 단계 대비 이 단계 uniqueUsers 비율
     *
     * 단순 기간 내 고유 사용자 수 비교 방식.
     * session-based sequential funnel이 아님.
     */
    public AnalyticsFunnelResponse funnel(Instant from, Instant to) {
        List<FunnelStepResponse> steps = new ArrayList<>();
        long firstCount = 0L;
        long prevCount = 0L;

        for (int i = 0; i < FUNNEL_STEPS.size(); i++) {
            String[] step = FUNNEL_STEPS.get(i);
            String eventType = step[0];
            String label = step[1];

            long uniqueUsers = queryRepository.countDistinctAnonymousId(eventType, from, to);

            if (i == 0) {
                firstCount = uniqueUsers;
                prevCount = uniqueUsers;
            }

            double conversionRate = firstCount > 0
                    ? round2((double) uniqueUsers / firstCount * 100.0) : 0.0;
            double stepConversion = prevCount > 0
                    ? round2((double) uniqueUsers / prevCount * 100.0) : 0.0;

            steps.add(FunnelStepResponse.builder()
                    .eventType(eventType)
                    .label(label)
                    .uniqueUsers(uniqueUsers)
                    .conversionRate(conversionRate)
                    .stepConversion(i == 0 ? 100.0 : stepConversion)
                    .build());

            prevCount = uniqueUsers;
        }

        return AnalyticsFunnelResponse.builder()
                .period(period(from, to))
                .steps(steps)
                .build();
    }

    // ───────────── Menus ─────────────

    public AnalyticsMenusResponse menus(Instant from, Instant to) {
        return AnalyticsMenusResponse.builder()
                .period(period(from, to))
                .topMenusByViews(queryRepository.topMenusByViews(from, to, TOP_N))
                .topMenusByCartAdds(queryRepository.topMenusByCartAdds(from, to, TOP_N))
                .build();
    }

    // ───────────── Options ─────────────

    public AnalyticsOptionsResponse options(Instant from, Instant to) {
        return AnalyticsOptionsResponse.builder()
                .period(period(from, to))
                .topOptions(queryRepository.topOptions(from, to, TOP_N))
                .build();
    }

    // ───────────── helpers ─────────────

    private static AnalyticsPeriod period(Instant from, Instant to) {
        return AnalyticsPeriod.builder().from(from).to(to).build();
    }

    private static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}

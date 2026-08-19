package com.gdgoc.babi_order.dev.analytics;

import com.gdgoc.babi_order.admin.config.AdminSecurityBeansConfig;
import com.gdgoc.babi_order.admin.config.JwtProperties;
import com.gdgoc.babi_order.admin.entity.Admin;
import com.gdgoc.babi_order.admin.entity.AdminRole;
import com.gdgoc.babi_order.admin.repository.AdminRepository;
import com.gdgoc.babi_order.admin.security.AdminAuthenticationEntryPoint;
import com.gdgoc.babi_order.admin.security.JwtTokenProvider;
import com.gdgoc.babi_order.backenderror.BackendErrorRecordService;
import com.gdgoc.babi_order.common.exception.ApiExceptionHandler;
import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsFunnelResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsMenusResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsOptionsResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsOverviewResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsPeriod;
import com.gdgoc.babi_order.dev.analytics.dto.FunnelStepResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DeveloperAnalyticsController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        AdminSecurityBeansConfig.class,
        AdminAuthenticationEntryPoint.class,
        ApiExceptionHandler.class,
        DeveloperAnalyticsService.class,
        JwtTokenProvider.class,
        DeveloperAnalyticsControllerTest.JwtTestConfig.class
})
class DeveloperAnalyticsControllerTest {

    private static final String DEVELOPER_LOGIN = "developer";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private DeveloperAnalyticsService analyticsService;

    @MockitoBean
    private AnalyticsQueryRepository analyticsQueryRepository;

    @MockitoBean
    private AdminRepository adminRepository;

    @MockitoBean
    private BackendErrorRecordService backendErrorRecordService;

    @BeforeEach
    void setUp() {
        given(adminRepository.findByLoginId(DEVELOPER_LOGIN))
                .willReturn(Optional.of(new Admin(DEVELOPER_LOGIN, "encoded", AdminRole.DEVELOPER)));
    }

    // ─── 권한 테스트 ───

    @Test
    @WithAnonymousUser
    void anonymousCannotAccessOverview() throws Exception {
        mockMvc.perform(get("/api/dev/analytics/overview"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCannotAccessOverview() throws Exception {
        mockMvc.perform(get("/api/dev/analytics/overview"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "USER")
    void userCannotAccessOverview() throws Exception {
        mockMvc.perform(get("/api/dev/analytics/overview"))
                .andExpect(status().isForbidden());
    }

    // ─── Developer 접근 가능 ───

    @Test
    void developerCanAccessOverview() throws Exception {
        AnalyticsOverviewResponse mockResponse = AnalyticsOverviewResponse.builder()
                .period(AnalyticsPeriod.builder()
                        .from(Instant.parse("2026-08-19T00:00:00Z"))
                        .to(Instant.parse("2026-08-19T15:00:00Z"))
                        .build())
                .uniqueVisitors(530L)
                .menuViews(1240L)
                .cartAdds(320L)
                .checkoutViews(250L)
                .paymentStarts(250L)
                .paymentSuccesses(221L)
                .ordersCreated(215L)
                .ordersCompleted(210L)
                .build();

        given(analyticsService.overview(any(Instant.class), any(Instant.class)))
                .willReturn(mockResponse);

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);

        mockMvc.perform(get("/api/dev/analytics/overview")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uniqueVisitors").value(530))
                .andExpect(jsonPath("$.menuViews").value(1240))
                .andExpect(jsonPath("$.cartAdds").value(320));
    }

    @Test
    void developerCanAccessFunnel() throws Exception {
        AnalyticsFunnelResponse mockResponse = AnalyticsFunnelResponse.builder()
                .period(AnalyticsPeriod.builder()
                        .from(Instant.parse("2026-08-19T00:00:00Z"))
                        .to(Instant.parse("2026-08-19T15:00:00Z"))
                        .build())
                .steps(List.of(
                        FunnelStepResponse.builder()
                                .eventType("MENU_VIEW")
                                .label("메뉴 조회")
                                .uniqueUsers(530L)
                                .conversionRate(100.0)
                                .stepConversion(100.0)
                                .build(),
                        FunnelStepResponse.builder()
                                .eventType("ADD_TO_CART")
                                .label("장바구니 추가")
                                .uniqueUsers(320L)
                                .conversionRate(60.38)
                                .stepConversion(60.38)
                                .build()
                ))
                .build();

        given(analyticsService.funnel(any(Instant.class), any(Instant.class)))
                .willReturn(mockResponse);

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);

        mockMvc.perform(get("/api/dev/analytics/funnel")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.steps[0].eventType").value("MENU_VIEW"))
                .andExpect(jsonPath("$.steps[0].uniqueUsers").value(530))
                .andExpect(jsonPath("$.steps[1].eventType").value("ADD_TO_CART"))
                .andExpect(jsonPath("$.steps[1].conversionRate").value(60.38));
    }

    @Test
    void developerCanAccessMenus() throws Exception {
        AnalyticsMenusResponse mockResponse = AnalyticsMenusResponse.builder()
                .period(AnalyticsPeriod.builder()
                        .from(Instant.parse("2026-08-19T00:00:00Z"))
                        .to(Instant.parse("2026-08-19T15:00:00Z"))
                        .build())
                .topMenusByViews(List.of())
                .topMenusByCartAdds(List.of())
                .build();

        given(analyticsService.menus(any(Instant.class), any(Instant.class)))
                .willReturn(mockResponse);

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);

        mockMvc.perform(get("/api/dev/analytics/menus")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topMenusByViews").isArray())
                .andExpect(jsonPath("$.topMenusByCartAdds").isArray());
    }

    @Test
    void developerCanAccessOptions() throws Exception {
        AnalyticsOptionsResponse mockResponse = AnalyticsOptionsResponse.builder()
                .period(AnalyticsPeriod.builder()
                        .from(Instant.parse("2026-08-19T00:00:00Z"))
                        .to(Instant.parse("2026-08-19T15:00:00Z"))
                        .build())
                .topOptions(List.of())
                .build();

        given(analyticsService.options(any(Instant.class), any(Instant.class)))
                .willReturn(mockResponse);

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);

        mockMvc.perform(get("/api/dev/analytics/options")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topOptions").isArray());
    }

    @Test
    void overviewWithExplicitDateRange() throws Exception {
        AnalyticsOverviewResponse mockResponse = AnalyticsOverviewResponse.builder()
                .period(AnalyticsPeriod.builder()
                        .from(Instant.parse("2026-08-12T15:00:00Z"))
                        .to(Instant.parse("2026-08-19T14:59:59Z"))
                        .build())
                .uniqueVisitors(0L)
                .menuViews(0L)
                .cartAdds(0L)
                .checkoutViews(0L)
                .paymentStarts(0L)
                .paymentSuccesses(0L)
                .ordersCreated(0L)
                .ordersCompleted(0L)
                .build();

        given(analyticsService.overview(any(Instant.class), any(Instant.class)))
                .willReturn(mockResponse);

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);

        mockMvc.perform(get("/api/dev/analytics/overview")
                        .param("from", "2026-08-12T15:00:00Z")
                        .param("to", "2026-08-19T14:59:59Z")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uniqueVisitors").value(0));
    }

    @TestConfiguration
    static class JwtTestConfig {
        @Bean
        ObjectMapper objectMapper() {
            return new ObjectMapper();
        }

        @Bean
        JwtProperties jwtProperties() {
            JwtProperties properties = new JwtProperties();
            properties.setSecret("test-jwt-secret-key-at-least-32-bytes-long");
            properties.setExpirationSeconds(3600);
            return properties;
        }
    }
}

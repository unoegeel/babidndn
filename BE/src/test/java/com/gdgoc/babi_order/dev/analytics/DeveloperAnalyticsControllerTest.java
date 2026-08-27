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
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsPeriod;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterFunnelResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterMenusResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterOverviewResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsOptionsResponse;
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
    private DeveloperControlCenterService controlCenterService;

    @MockitoBean
    private AdminRepository adminRepository;

    @MockitoBean
    private BackendErrorRecordService backendErrorRecordService;

    @BeforeEach
    void setUp() {
        given(adminRepository.findByLoginId(DEVELOPER_LOGIN))
                .willReturn(Optional.of(new Admin(DEVELOPER_LOGIN, "encoded", AdminRole.DEVELOPER)));
    }

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
    void developerCanAccessOverview() throws Exception {
        given(controlCenterService.overview(any())).willReturn(ControlCenterOverviewResponse.builder()
                .period(AnalyticsPeriod.builder()
                        .from(Instant.parse("2026-08-19T00:00:00Z"))
                        .to(Instant.parse("2026-08-19T15:00:00Z"))
                        .build())
                .paidOrders(12L)
                .revenue(120000L)
                .uniqueVisitors(50L)
                .menuViews(100L)
                .build());

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);
        mockMvc.perform(get("/api/dev/analytics/overview")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paidOrders").value(12))
                .andExpect(jsonPath("$.revenue").value(120000))
                .andExpect(jsonPath("$.uniqueVisitors").value(50));
    }

    @Test
    void developerCanAccessFunnel() throws Exception {
        given(controlCenterService.funnel(any())).willReturn(ControlCenterFunnelResponse.builder()
                .period(AnalyticsPeriod.builder()
                        .from(Instant.parse("2026-08-19T00:00:00Z"))
                        .to(Instant.parse("2026-08-19T15:00:00Z"))
                        .build())
                .aggregateByAnonymous(List.of(
                        ControlCenterFunnelResponse.FunnelAggregateStep.builder()
                                .eventType("MENU_VIEW")
                                .label("메뉴 조회")
                                .uniqueCount(100L)
                                .eventCount(200L)
                                .stepConversion(null)
                                .dropOffRate(null)
                                .build()))
                .sequentialBySession(List.of())
                .metricNote("test")
                .build());

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);
        mockMvc.perform(get("/api/dev/analytics/funnel")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aggregateByAnonymous[0].eventType").value("MENU_VIEW"));
    }

    @Test
    void developerCanAccessMenus() throws Exception {
        given(controlCenterService.menus(any())).willReturn(ControlCenterMenusResponse.builder()
                .period(AnalyticsPeriod.builder()
                        .from(Instant.parse("2026-08-19T00:00:00Z"))
                        .to(Instant.parse("2026-08-19T15:00:00Z"))
                        .build())
                .minViewsForConversion(10)
                .menus(List.of())
                .build());

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);
        mockMvc.perform(get("/api/dev/analytics/menus")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.menus").isArray());
    }

    @Test
    void developerCanAccessOptions() throws Exception {
        given(analyticsService.options(any(), any())).willReturn(AnalyticsOptionsResponse.builder()
                .period(AnalyticsPeriod.builder()
                        .from(Instant.parse("2026-08-19T00:00:00Z"))
                        .to(Instant.parse("2026-08-19T15:00:00Z"))
                        .build())
                .topOptions(List.of())
                .build());

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);
        mockMvc.perform(get("/api/dev/analytics/options")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topOptions").isArray());
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

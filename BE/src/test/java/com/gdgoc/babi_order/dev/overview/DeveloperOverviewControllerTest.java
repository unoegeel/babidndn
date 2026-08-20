package com.gdgoc.babi_order.dev.overview;

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
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsOverviewResponse;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsPeriod;
import com.gdgoc.babi_order.dev.overview.dto.DeveloperOverviewResponse;
import com.gdgoc.babi_order.dev.overview.dto.OverviewErrorsMetrics;
import com.gdgoc.babi_order.dev.overview.dto.OverviewEventsMetrics;
import com.gdgoc.babi_order.dev.overview.dto.OverviewRequestsMetrics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.Optional;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DeveloperOverviewController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        AdminSecurityBeansConfig.class,
        AdminAuthenticationEntryPoint.class,
        ApiExceptionHandler.class,
        JwtTokenProvider.class,
        DeveloperOverviewControllerTest.JwtTestConfig.class
})
class DeveloperOverviewControllerTest {

    private static final String DEVELOPER_LOGIN = "developer";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private DeveloperOverviewService developerOverviewService;

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
        mockMvc.perform(get("/api/dev/overview"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void developerCanAccessOverview() throws Exception {
        Instant now = Instant.parse("2026-08-20T02:00:00Z");
        given(developerOverviewService.overview()).willReturn(
                DeveloperOverviewResponse.builder()
                        .errors(OverviewErrorsMetrics.builder()
                                .last24h(12)
                                .frontendErrors(9)
                                .serverErrors(3)
                                .lastOccurredAt(now)
                                .build())
                        .requests(OverviewRequestsMetrics.builder()
                                .today(100)
                                .success(90)
                                .clientErrors(6)
                                .serverErrors(4)
                                .averageDurationMs(31)
                                .build())
                        .events(OverviewEventsMetrics.builder()
                                .today(50)
                                .uniqueSessions(10)
                                .topEvent("MENU_VIEW")
                                .build())
                        .funnel(AnalyticsOverviewResponse.builder()
                                .period(AnalyticsPeriod.builder().from(now).to(now).build())
                                .ordersCompleted(4)
                                .paymentSuccesses(5)
                                .build())
                        .build()
        );

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);

        mockMvc.perform(get("/api/dev/overview")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errors.last24h").value(12))
                .andExpect(jsonPath("$.requests.today").value(100))
                .andExpect(jsonPath("$.events.topEvent").value("MENU_VIEW"))
                .andExpect(jsonPath("$.funnel.ordersCompleted").value(4));
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

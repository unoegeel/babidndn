package com.gdgoc.babi_order.payment.controller;

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
import com.gdgoc.babi_order.payment.reconciliation.PaymentReconciliationService;
import com.gdgoc.babi_order.payment.reconciliation.ReconciliationIssueType;
import com.gdgoc.babi_order.payment.reconciliation.ReconciliationSeverity;
import com.gdgoc.babi_order.payment.reconciliation.dto.PaymentReconciliationResponse;
import com.gdgoc.babi_order.payment.reconciliation.dto.ReconciliationIssueResponse;
import com.gdgoc.babi_order.testsupport.WebMvcSliceTestConfig;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminPaymentController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        AdminSecurityBeansConfig.class,
        AdminAuthenticationEntryPoint.class,
        ApiExceptionHandler.class,
        JwtTokenProvider.class,
        WebMvcSliceTestConfig.class,
        AdminPaymentControllerTest.JwtTestConfig.class
})
class AdminPaymentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private PaymentReconciliationService paymentReconciliationService;

    @MockitoBean
    private AdminRepository adminRepository;

    @BeforeEach
    void setUp() {
        given(adminRepository.findByLoginId("owner"))
                .willReturn(Optional.of(new Admin("owner", "encoded", AdminRole.ADMIN)));
        given(adminRepository.findByLoginId("developer"))
                .willReturn(Optional.of(new Admin("developer", "encoded", AdminRole.DEVELOPER)));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanReadReconciliation() throws Exception {
        given(paymentReconciliationService.reconcile(eq("7d")))
                .willReturn(PaymentReconciliationResponse.builder()
                        .generatedAt(LocalDateTime.of(2026, 8, 21, 12, 0))
                        .period("7d")
                        .from(LocalDateTime.of(2026, 8, 15, 0, 0))
                        .issueCount(1)
                        .issues(List.of(ReconciliationIssueResponse.builder()
                                .type(ReconciliationIssueType.PAYMENT_DONE_ORDER_NOT_ACTIVATED)
                                .severity(ReconciliationSeverity.CRITICAL)
                                .orderId(1L)
                                .paymentId(9L)
                                .message("test")
                                .detectedAt(LocalDateTime.of(2026, 8, 20, 10, 0))
                                .metadata(Map.of("pickupNumber", 0))
                                .build()))
                        .build());

        mockMvc.perform(get("/api/admin/payments/reconciliation").param("period", "7d"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.issueCount").value(1))
                .andExpect(jsonPath("$.issues[0].type").value("PAYMENT_DONE_ORDER_NOT_ACTIVATED"));
    }

    @Test
    @WithAnonymousUser
    void anonymousIsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/admin/payments/reconciliation"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void developerJwtIsForbidden() throws Exception {
        String token = jwtTokenProvider.createToken("developer", AdminRole.DEVELOPER);
        mockMvc.perform(get("/api/admin/payments/reconciliation")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
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

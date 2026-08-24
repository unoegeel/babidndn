package com.gdgoc.babi_order.dev.reconciliation;

import com.gdgoc.babi_order.admin.config.AdminSecurityBeansConfig;
import com.gdgoc.babi_order.admin.config.JwtProperties;
import com.gdgoc.babi_order.admin.entity.Admin;
import com.gdgoc.babi_order.admin.entity.AdminRole;
import com.gdgoc.babi_order.admin.repository.AdminRepository;
import com.gdgoc.babi_order.admin.security.AdminAuthenticationEntryPoint;
import com.gdgoc.babi_order.admin.security.JwtTokenProvider;
import com.gdgoc.babi_order.common.exception.ApiExceptionHandler;
import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
import com.gdgoc.babi_order.payment.reconciliation.PaymentReconciliationScanService;
import com.gdgoc.babi_order.payment.reconciliation.PaymentReconciliationService;
import com.gdgoc.babi_order.payment.reconciliation.PaymentTossVerifyService;
import com.gdgoc.babi_order.payment.reconciliation.ReconciliationIssueType;
import com.gdgoc.babi_order.payment.reconciliation.ReconciliationSeverity;
import com.gdgoc.babi_order.payment.reconciliation.dto.PaymentReconciliationResponse;
import com.gdgoc.babi_order.payment.reconciliation.dto.PaymentTossVerifyResponse;
import com.gdgoc.babi_order.payment.reconciliation.dto.PersistedReconciliationIssueResponse;
import com.gdgoc.babi_order.payment.reconciliation.dto.ReconciliationIssueResponse;
import com.gdgoc.babi_order.payment.reconciliation.dto.ReconciliationScanResponse;
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
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DeveloperReconciliationController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        AdminSecurityBeansConfig.class,
        AdminAuthenticationEntryPoint.class,
        ApiExceptionHandler.class,
        JwtTokenProvider.class,
        WebMvcSliceTestConfig.class,
        DeveloperReconciliationControllerTest.JwtTestConfig.class
})
class DeveloperReconciliationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private PaymentReconciliationService paymentReconciliationService;

    @MockitoBean
    private PaymentReconciliationScanService paymentReconciliationScanService;

    @MockitoBean
    private PaymentTossVerifyService paymentTossVerifyService;

    @MockitoBean
    private AdminRepository adminRepository;

    @BeforeEach
    void setUp() {
        given(adminRepository.findByLoginId("developer"))
                .willReturn(Optional.of(new Admin("developer", "encoded", AdminRole.DEVELOPER)));
        given(adminRepository.findByLoginId("owner"))
                .willReturn(Optional.of(new Admin("owner", "encoded", AdminRole.ADMIN)));
    }

    @Test
    @WithMockUser(roles = "DEVELOPER")
    void developerCanReadSnapshot() throws Exception {
        given(paymentReconciliationService.reconcile(eq("7d")))
                .willReturn(PaymentReconciliationResponse.builder()
                        .generatedAt(LocalDateTime.of(2026, 8, 24, 12, 0))
                        .period("7d")
                        .from(LocalDateTime.of(2026, 8, 18, 0, 0))
                        .issueCount(1)
                        .issues(List.of(ReconciliationIssueResponse.builder()
                                .type(ReconciliationIssueType.ORDER_ACTIVATED_WITHOUT_PAYMENT)
                                .severity(ReconciliationSeverity.CRITICAL)
                                .orderId(1L)
                                .message("test")
                                .detectedAt(LocalDateTime.of(2026, 8, 20, 10, 0))
                                .metadata(Map.of())
                                .build()))
                        .build());

        mockMvc.perform(get("/api/dev/reconciliation").param("period", "7d"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.issueCount").value(1));
    }

    @Test
    @WithMockUser(roles = "DEVELOPER")
    void developerCanScan() throws Exception {
        given(paymentReconciliationScanService.scan(eq("7d")))
                .willReturn(ReconciliationScanResponse.builder()
                        .scannedAt(LocalDateTime.of(2026, 8, 24, 12, 0))
                        .period("7d")
                        .detectedCount(1)
                        .createdCount(1)
                        .updatedCount(0)
                        .resolvedCount(0)
                        .openCount(1)
                        .createdIssueIds(List.of(42L))
                        .build());

        mockMvc.perform(post("/api/dev/reconciliation/scan").param("period", "7d").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdCount").value(1));
    }

    @Test
    @WithMockUser(roles = "DEVELOPER")
    void developerCanListIssues() throws Exception {
        given(paymentReconciliationScanService.listIssues(eq("OPEN"), eq("30d")))
                .willReturn(List.of(PersistedReconciliationIssueResponse.builder()
                        .id(1L)
                        .logicalKey("ORDER_ACTIVATED_WITHOUT_PAYMENT:1")
                        .type(ReconciliationIssueType.ORDER_ACTIVATED_WITHOUT_PAYMENT)
                        .severity(ReconciliationSeverity.CRITICAL)
                        .orderId(1L)
                        .message("test")
                        .occurrenceCount(1L)
                        .build()));

        mockMvc.perform(get("/api/dev/reconciliation/issues").param("status", "OPEN").param("period", "30d"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    @WithMockUser(roles = "DEVELOPER")
    void developerCanVerifyPayment() throws Exception {
        given(paymentTossVerifyService.verify(eq(9L)))
                .willReturn(PaymentTossVerifyResponse.builder()
                        .paymentId(9L)
                        .orderId(1L)
                        .internalStatus("DONE")
                        .tossStatus("DONE")
                        .internalAmount(7500)
                        .tossAmount(7500)
                        .statusMatches(true)
                        .amountMatches(true)
                        .verifiedAt(LocalDateTime.of(2026, 8, 24, 12, 0))
                        .build());

        mockMvc.perform(post("/api/dev/reconciliation/payments/9/verify").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statusMatches").value(true));
    }

    @Test
    @WithAnonymousUser
    void anonymousIsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/dev/reconciliation"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminIsForbidden() throws Exception {
        mockMvc.perform(get("/api/dev/reconciliation"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminJwtIsForbiddenOnScan() throws Exception {
        String token = jwtTokenProvider.createToken("owner", AdminRole.ADMIN);
        mockMvc.perform(post("/api/dev/reconciliation/scan")
                        .header("Authorization", "Bearer " + token)
                        .with(csrf()))
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

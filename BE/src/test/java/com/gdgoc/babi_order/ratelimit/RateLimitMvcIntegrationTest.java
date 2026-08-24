package com.gdgoc.babi_order.ratelimit;

import com.gdgoc.babi_order.backenderror.BackendErrorRecordService;
import com.gdgoc.babi_order.common.exception.ApiExceptionHandler;
import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
import com.gdgoc.babi_order.payment.controller.PaymentController;
import com.gdgoc.babi_order.payment.dto.response.PaymentConfirmResponse;
import com.gdgoc.babi_order.payment.exception.PaymentExceptionHandler;
import com.gdgoc.babi_order.payment.service.PaymentService;
import com.gdgoc.babi_order.testsupport.WebMvcSliceTestConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PaymentController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        PaymentExceptionHandler.class,
        ApiExceptionHandler.class,
        WebMvcSliceTestConfig.class,
        RateLimitClockConfig.class,
        RateLimitWebMvcConfig.class,
        RateLimitMvcIntegrationTest.FixedClockConfig.class
})
@TestPropertySource(properties = {
        "app.rate-limit.enabled=true",
        "app.rate-limit.cache-maximum-size=10000",
        "app.rate-limit.trusted-proxies[0]=127.0.0.1",
        "app.rate-limit.policies.payment-confirm.client-limit=2",
        "app.rate-limit.policies.payment-confirm.client-window-seconds=60",
        "app.rate-limit.policies.payment-confirm.ip-limit=2",
        "app.rate-limit.policies.payment-confirm.ip-window-seconds=60",
        "app.rate-limit.policies.order-create.client-limit=6",
        "app.rate-limit.policies.order-create.client-window-seconds=60",
        "app.rate-limit.policies.order-create.ip-limit=30",
        "app.rate-limit.policies.order-create.ip-window-seconds=60",
        "app.rate-limit.policies.contact.client-limit=3",
        "app.rate-limit.policies.contact.client-window-seconds=600",
        "app.rate-limit.policies.contact.ip-limit=15",
        "app.rate-limit.policies.contact.ip-window-seconds=600",
        "app.rate-limit.policies.client-errors.client-limit=30",
        "app.rate-limit.policies.client-errors.client-window-seconds=60",
        "app.rate-limit.policies.client-errors.ip-limit=300",
        "app.rate-limit.policies.client-errors.ip-window-seconds=60",
        "app.rate-limit.policies.client-events.client-limit=120",
        "app.rate-limit.policies.client-events.client-window-seconds=60",
        "app.rate-limit.policies.client-events.ip-limit=1200",
        "app.rate-limit.policies.client-events.ip-window-seconds=60",
        "app.rate-limit.policies.auth-login.ip-limit=10",
        "app.rate-limit.policies.auth-login.ip-window-seconds=300"
})
class RateLimitMvcIntegrationTest {

    private static final String CONFIRM_BODY = """
            {
              "paymentKey": "pay_test_key",
              "orderId": "order-1",
              "amount": 1000
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PaymentService paymentService;

    @MockitoBean
    private BackendErrorRecordService backendErrorRecordService;

    @BeforeEach
    void stubConfirm() {
        given(paymentService.confirm(any())).willReturn(PaymentConfirmResponse.builder()
                .id(1L)
                .paymentKey("pay_test_key")
                .orderId(1L)
                .tossOrderId("order-1")
                .amount(1000)
                .status("DONE")
                .build());
    }

    @Test
    @WithAnonymousUser
    void paymentConfirmExceedsLimitBeforeServiceAndReturns429Contract() throws Exception {
        String clientKey = UUID.randomUUID().toString();

        performConfirm(clientKey).andExpect(status().isOk());
        performConfirm(clientKey).andExpect(status().isOk());
        performConfirm(clientKey)
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists(HttpHeaders.RETRY_AFTER))
                .andExpect(jsonPath("$.code").value(RateLimitExceededException.CODE))
                .andExpect(jsonPath("$.message").value(RateLimitExceededException.DEFAULT_MESSAGE))
                .andExpect(jsonPath("$.status").value(429));

        verify(paymentService, times(2)).confirm(any());
        verify(backendErrorRecordService, never()).recordServerError(any(), any(), any());
    }

    @Test
    @WithAnonymousUser
    void optionsPreflightIsNotRateLimited() throws Exception {
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(options("/api/payments/confirm")
                            .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                    .andExpect(result ->
                            org.assertj.core.api.Assertions.assertThat(result.getResponse().getStatus())
                                    .isNotEqualTo(429));
        }
    }

    @Test
    @WithAnonymousUser
    void webhookIsNotMatchedByPaymentConfirmPolicy() throws Exception {
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/payments/webhook")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "eventType": "PAYMENT_STATUS_CHANGED", "data": { "paymentKey": "k" } }
                                    """)
                            .with(request -> {
                                request.setRemoteAddr("203.0.113.50");
                                return request;
                            }))
                    .andExpect(status().isOk());
        }
        verify(paymentService, times(5)).syncFromWebhook(any());
    }

    private org.springframework.test.web.servlet.ResultActions performConfirm(String clientKey) throws Exception {
        return mockMvc.perform(post("/api/payments/confirm")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Client-Key", clientKey)
                .with(request -> {
                    request.setRemoteAddr("203.0.113.50");
                    return request;
                })
                .content(CONFIRM_BODY));
    }

    @TestConfiguration
    static class FixedClockConfig {
        @Bean
        @Primary
        Clock clock() {
            return Clock.fixed(Instant.parse("2026-08-24T12:00:00Z"), ZoneOffset.UTC);
        }
    }
}

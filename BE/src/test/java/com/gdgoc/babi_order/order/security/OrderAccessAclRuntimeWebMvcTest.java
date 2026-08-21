package com.gdgoc.babi_order.order.security;

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
import com.gdgoc.babi_order.order.controller.OrderController;
import com.gdgoc.babi_order.order.dto.response.OrderDetailResponse;
import com.gdgoc.babi_order.order.exception.OrderExceptionHandler;
import com.gdgoc.babi_order.order.exception.OrderNotFoundException;
import com.gdgoc.babi_order.order.service.OrderEventService;
import com.gdgoc.babi_order.order.service.OrderService;
import com.gdgoc.babi_order.payment.controller.PaymentController;
import com.gdgoc.babi_order.payment.dto.response.PaymentResponse;
import com.gdgoc.babi_order.payment.exception.PaymentExceptionHandler;
import com.gdgoc.babi_order.payment.service.PaymentService;
import com.gdgoc.babi_order.push.controller.PushController;
import com.gdgoc.babi_order.push.service.PushNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Order ACL이 CORS → Header → JwtFilter → Guard → Controller까지 연결되는지 검증.
 */
@WebMvcTest(controllers = {
        OrderAccessAclProbeController.class,
        OrderController.class,
        PaymentController.class,
        PushController.class
})
@AutoConfigureMockMvc(addFilters = true)
@TestPropertySource(properties = "app.cors.allowed-origins=http://localhost:5173")
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        OrderAccessGuard.class,
        OrderExceptionHandler.class,
        PaymentExceptionHandler.class,
        ApiExceptionHandler.class,
        AdminSecurityBeansConfig.class,
        AdminAuthenticationEntryPoint.class,
        JwtTokenProvider.class,
        OrderAccessAclRuntimeWebMvcTest.JwtTestConfig.class
})
class OrderAccessAclRuntimeWebMvcTest {

    private static final String ORIGIN = "http://localhost:5173";
    private static final String ADMIN_LOGIN = "owner";
    private static final String DEVELOPER_LOGIN = "developer";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private AdminRepository adminRepository;

    @MockitoBean
    private BackendErrorRecordService backendErrorRecordService;

    @MockitoBean
    private OrderService orderService;

    @MockitoBean
    private OrderEventService orderEventService;

    @MockitoBean
    private PaymentService paymentService;

    @MockitoBean
    private PushNotificationService pushNotificationService;

    @BeforeEach
    void setUp() {
        given(adminRepository.findByLoginId(ADMIN_LOGIN))
                .willReturn(Optional.of(new Admin(ADMIN_LOGIN, "encoded", AdminRole.ADMIN)));
        given(adminRepository.findByLoginId(DEVELOPER_LOGIN))
                .willReturn(Optional.of(new Admin(DEVELOPER_LOGIN, "encoded", AdminRole.DEVELOPER)));
    }

    @Test
    void corsPreflightAllowsOrderAccessTokenHeader() throws Exception {
        mockMvc.perform(options("/api/orders/1")
                        .header(HttpHeaders.ORIGIN, ORIGIN)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, OrderAccessGuard.HEADER))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, ORIGIN))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"))
                .andExpect(header().string(
                        HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS,
                        org.hamcrest.Matchers.containsString(OrderAccessGuard.HEADER)));
    }

    @Test
    void createOrderResponseIncludesAccessTokenOnce() throws Exception {
        given(orderService.createOrder(org.mockito.ArgumentMatchers.any()))
                .willReturn(OrderDetailResponse.builder()
                        .id(10L)
                        .pickupNumber(0)
                        .status("PREPARING")
                        .totalAmount(1000)
                        .accessToken("raw-create-token")
                        .items(List.of())
                        .build());

        mockMvc.perform(post("/api/orders")
                        .contentType("application/json")
                        .content("""
                                {
                                  "items": [
                                    {"menuId": 1, "quantity": 1, "options": []}
                                  ]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").value("raw-create-token"))
                .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    void getOrderDoesNotExposeAccessTokenWhenServiceOmitsIt() throws Exception {
        given(orderService.getOrder(eq(10L), eq("tok")))
                .willReturn(OrderDetailResponse.builder()
                        .id(10L)
                        .pickupNumber(1)
                        .status("PREPARING")
                        .totalAmount(1000)
                        .items(List.of())
                        .build());

        mockMvc.perform(get("/api/orders/10")
                        .header(OrderAccessGuard.HEADER, "tok"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.accessToken").doesNotExist());
    }

    @Test
    void getOrderForwardsAccessTokenHeader() throws Exception {
        given(orderService.getOrder(eq(1L), eq("correct")))
                .willReturn(OrderDetailResponse.builder()
                        .id(1L)
                        .pickupNumber(1)
                        .status("PREPARING")
                        .totalAmount(1000)
                        .items(List.of())
                        .build());

        mockMvc.perform(get("/api/orders/1")
                        .header(OrderAccessGuard.HEADER, "correct"))
                .andExpect(status().isOk());

        verify(orderService).getOrder(1L, "correct");
    }

    @Test
    void getOrderMissingTokenSurfacesNotFoundFromService() throws Exception {
        given(orderService.getOrder(eq(1L), isNull()))
                .willThrow(new OrderNotFoundException(1L));

        mockMvc.perform(get("/api/orders/1"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ORDER_NOT_FOUND"));
    }

    @Test
    void paymentGetByOrderIdForwardsAccessToken() throws Exception {
        given(paymentService.getByOrderId(eq(5L), eq("pay-tok")))
                .willReturn(PaymentResponse.builder()
                        .id(1L)
                        .paymentKey("pk")
                        .orderId(5L)
                        .amount(1000)
                        .status("DONE")
                        .build());

        mockMvc.perform(get("/api/payments/orders/5")
                        .header(OrderAccessGuard.HEADER, "pay-tok"))
                .andExpect(status().isOk());

        verify(paymentService).getByOrderId(5L, "pay-tok");
    }

    @Test
    void paymentGetByPaymentKeyForwardsAccessToken() throws Exception {
        given(paymentService.getByPaymentKey(eq("pk-1"), eq("pay-tok")))
                .willReturn(PaymentResponse.builder()
                        .id(1L)
                        .paymentKey("pk-1")
                        .orderId(5L)
                        .amount(1000)
                        .status("DONE")
                        .build());

        mockMvc.perform(get("/api/payments/pk-1")
                        .header(OrderAccessGuard.HEADER, "pay-tok"))
                .andExpect(status().isOk());

        verify(paymentService).getByPaymentKey("pk-1", "pay-tok");
    }

    @Test
    void abandonUnpaidForwardsAccessToken() throws Exception {
        mockMvc.perform(delete("/api/orders/9/unpaid")
                        .header(OrderAccessGuard.HEADER, "del-tok"))
                .andExpect(status().isNoContent());

        verify(orderService).abandonUnpaidOrder(9L, "del-tok");
    }

    @Test
    void pushLinkOrderForwardsAccessToken() throws Exception {
        mockMvc.perform(post("/api/push/subscriptions/link-order")
                        .contentType("application/json")
                        .header(OrderAccessGuard.HEADER, "push-tok")
                        .content("""
                                {
                                  "endpoint": "https://push.example/ep",
                                  "orderId": 3
                                }
                                """))
                .andExpect(status().isNoContent());

        verify(pushNotificationService).linkOrder("https://push.example/ep", 3L, "push-tok");
    }

    @Test
    void adminJwtBypassesOrderTokenOnProbe() throws Exception {
        String raw = OrderAccessTokens.generateRaw();
        String hash = OrderAccessTokens.sha256Hex(raw);
        String jwt = jwtTokenProvider.createToken(ADMIN_LOGIN, AdminRole.ADMIN);

        mockMvc.perform(get("/__acl-probe/orders/1")
                        .param("hash", hash)
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isNoContent());
    }

    @Test
    void developerJwtCannotBypassOrderTokenOnProbe() throws Exception {
        String raw = OrderAccessTokens.generateRaw();
        String hash = OrderAccessTokens.sha256Hex(raw);
        String jwt = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);

        mockMvc.perform(get("/__acl-probe/orders/1")
                        .param("hash", hash)
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ORDER_NOT_FOUND"));
    }

    @Test
    void probeAllowsCorrectTokenWithoutJwt() throws Exception {
        String raw = OrderAccessTokens.generateRaw();
        String hash = OrderAccessTokens.sha256Hex(raw);

        mockMvc.perform(get("/__acl-probe/orders/1")
                        .param("hash", hash)
                        .header(OrderAccessGuard.HEADER, raw))
                .andExpect(status().isNoContent());
    }

    @Test
    void probeDeniesMissingWrongAndOtherOrderToken() throws Exception {
        String rawA = OrderAccessTokens.generateRaw();
        String rawB = OrderAccessTokens.generateRaw();
        String hashA = OrderAccessTokens.sha256Hex(rawA);

        mockMvc.perform(get("/__acl-probe/orders/1").param("hash", hashA))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/__acl-probe/orders/1")
                        .param("hash", hashA)
                        .header(OrderAccessGuard.HEADER, "wrong"))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/__acl-probe/orders/1")
                        .param("hash", hashA)
                        .header(OrderAccessGuard.HEADER, rawB))
                .andExpect(status().isNotFound());
    }

    @Test
    void probeDeniesLegacyNullHashForCustomerAllowsAdmin() throws Exception {
        mockMvc.perform(get("/__acl-probe/orders/1")
                        .header(OrderAccessGuard.HEADER, "any"))
                .andExpect(status().isNotFound());

        String jwt = jwtTokenProvider.createToken(ADMIN_LOGIN, AdminRole.ADMIN);
        mockMvc.perform(get("/__acl-probe/orders/1")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isNoContent());
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

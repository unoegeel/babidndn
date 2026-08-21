package com.gdgoc.babi_order.payment.controller;

import com.gdgoc.babi_order.common.exception.ApiExceptionHandler;
import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
import com.gdgoc.babi_order.payment.dto.response.PaymentConfirmResponse;
import com.gdgoc.babi_order.payment.exception.PaymentExceptionHandler;
import com.gdgoc.babi_order.payment.exception.PaymentOrderNotFoundException;
import com.gdgoc.babi_order.payment.service.PaymentService;
import com.gdgoc.babi_order.testsupport.WebMvcSliceTestConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PaymentController.class)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        PaymentExceptionHandler.class,
        ApiExceptionHandler.class,
        WebMvcSliceTestConfig.class
})
class PaymentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PaymentService paymentService;

    @Test
    void confirmReturnsBadRequestWhenOrderIdIsBlank() throws Exception {
        mockMvc.perform(post("/api/payments/confirm")
                        .contentType("application/json")
                        .content("""
                                {
                                  "paymentKey": "payKey",
                                  "orderId": "",
                                  "amount": 1000
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void confirmReturnsBadRequestWhenAmountIsNotPositive() throws Exception {
        mockMvc.perform(post("/api/payments/confirm")
                        .contentType("application/json")
                        .content("""
                                {
                                  "paymentKey": "payKey",
                                  "orderId": "1",
                                  "amount": 0
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void confirmReturnsOkForValidRequest() throws Exception {
        given(paymentService.confirm(any())).willReturn(PaymentConfirmResponse.builder()
                .id(1L)
                .paymentKey("payKey")
                .orderId(1L)
                .tossOrderId("1")
                .amount(1000)
                .status("DONE")
                .build());

        mockMvc.perform(post("/api/payments/confirm")
                        .contentType("application/json")
                        .content("""
                                {
                                  "paymentKey": "payKey",
                                  "orderId": "1",
                                  "amount": 1000
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DONE"));
    }

    @Test
    void successReturnsBadRequestWhenAmountParamIsMissing() throws Exception {
        mockMvc.perform(get("/api/payments/success")
                        .param("paymentKey", "payKey")
                        .param("orderId", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void successReturnsBadRequestWhenAmountParamIsNotNumeric() throws Exception {
        mockMvc.perform(get("/api/payments/success")
                        .param("paymentKey", "payKey")
                        .param("orderId", "1")
                        .param("amount", "not-a-number"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void successRedirectsToFrontendWhenRedirectParamIsAllowed() throws Exception {
        given(paymentService.confirm(any())).willReturn(PaymentConfirmResponse.builder()
                .id(1L)
                .paymentKey("payKey")
                .orderId(40L)
                .tossOrderId("000040-abc")
                .amount(1000)
                .status("DONE")
                .build());

        mockMvc.perform(get("/api/payments/success")
                        .param("paymentKey", "payKey")
                        .param("orderId", "000040-abc")
                        .param("amount", "1000")
                        .param("redirect", "https://www.babidndn.shop/user/payment/success")
                        .param("internalOrderId", "40"))
                .andExpect(status().is3xxRedirection())
                .andExpect(header().string("Location",
                        "https://www.babidndn.shop/user/payment/success?confirmedOrderId=40"));
    }

    @Test
    void successPropagatesPaymentApiExceptionAsPaymentErrorResponse() throws Exception {
        given(paymentService.confirm(any())).willThrow(new PaymentOrderNotFoundException("999"));

        mockMvc.perform(get("/api/payments/success")
                        .param("paymentKey", "payKey")
                        .param("orderId", "999")
                        .param("amount", "1000"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PAYMENT_ORDER_NOT_FOUND"));
    }

    @Test
    void cancelReturnsBadRequestWhenCancelReasonIsBlank() throws Exception {
        mockMvc.perform(post("/api/payments/{paymentKey}/cancel", "payKey")
                        .contentType("application/json")
                        .content("""
                                {
                                  "cancelReason": ""
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }
}

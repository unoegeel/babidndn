package com.gdgoc.babi_order.order.controller;

import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
import com.gdgoc.babi_order.menu.exception.MenuNotFoundException;
import com.gdgoc.babi_order.order.dto.response.OrderDetailResponse;
import com.gdgoc.babi_order.order.dto.response.OrderSummaryResponse;
import com.gdgoc.babi_order.order.exception.OrderExceptionHandler;
import com.gdgoc.babi_order.order.exception.OrderNotFoundException;
import com.gdgoc.babi_order.order.service.OrderService;
import com.gdgoc.babi_order.order.service.OrderEventService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrderController.class)
@Import({SecurityConfig.class, CorsProperties.class, OrderExceptionHandler.class})
@WithMockUser(roles = "ADMIN")
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrderService orderService;

    @MockitoBean
    private OrderEventService orderEventService;

    @Test
    void createOrderReturnsCreated() throws Exception {
        given(orderService.createOrder(any())).willReturn(OrderDetailResponse.builder()
                .id(1L)
                .pickupNumber(1)
                .status("PREPARING")
                .totalAmount(18000)
                .items(List.of())
                .build());

        mockMvc.perform(post("/api/orders")
                        .contentType("application/json")
                        .content("""
                                {
                                  "items": [
                                    {
                                      "menuId": 1,
                                      "quantity": 2,
                                      "options": [
                                        {"menuOptionId": 1, "quantity": 1}
                                      ]
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/orders/1"))
                .andExpect(jsonPath("$.status").value("PREPARING"))
                .andExpect(jsonPath("$.totalAmount").value(18000));
    }

    @Test
    void createOrderReturnsBadRequestForEmptyItems() throws Exception {
        mockMvc.perform(post("/api/orders")
                        .contentType("application/json")
                        .content("{\"items\": []}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void createOrderReturnsNotFoundWhenMenuDoesNotExist() throws Exception {
        given(orderService.createOrder(any())).willThrow(new MenuNotFoundException(999L));

        mockMvc.perform(post("/api/orders")
                        .contentType("application/json")
                        .content("""
                                {
                                  "items": [
                                    {
                                      "menuId": 999,
                                      "quantity": 1,
                                      "options": []
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MENU_NOT_FOUND"));
    }

    @Test
    void getOrdersReturnsOrderList() throws Exception {
        given(orderService.getOrders()).willReturn(List.of(OrderSummaryResponse.builder()
                .id(1L)
                .pickupNumber(1)
                .status("PREPARING")
                .totalAmount(18000)
                .build()));

        mockMvc.perform(get("/api/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].pickupNumber").value(1));
    }

    @Test
    void getOrderReturnsNotFound() throws Exception {
        given(orderService.getOrder(999L)).willThrow(new OrderNotFoundException(999L));

        mockMvc.perform(get("/api/orders/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ORDER_NOT_FOUND"));
    }

    @Test
    void updateOrderStatusReturnsUpdatedOrder() throws Exception {
        given(orderService.updateStatus(any(), any())).willReturn(OrderDetailResponse.builder()
                .id(1L)
                .pickupNumber(1)
                .status("READY")
                .paymentStatus("DONE")
                .totalAmount(18000)
                .items(List.of())
                .build());

        mockMvc.perform(patch("/api/orders/1/status")
                        .contentType("application/json")
                        .content("{\"status\":\"READY\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("READY"));
    }

    @Test
    void updateOrderStatusReturnsBadRequestWhenStatusIsMissing() throws Exception {
        mockMvc.perform(patch("/api/orders/1/status")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void subscribeOrderEventsStartsSseStreamWithoutProxyBuffering() throws Exception {
        given(orderEventService.subscribe()).willReturn(new SseEmitter());

        mockMvc.perform(get("/api/orders/stream"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-cache"))
                .andExpect(header().string("X-Accel-Buffering", "no"))
                .andExpect(request().asyncStarted());
    }
}

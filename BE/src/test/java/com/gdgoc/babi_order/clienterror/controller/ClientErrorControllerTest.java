package com.gdgoc.babi_order.clienterror.controller;

import com.gdgoc.babi_order.backenderror.BackendErrorRecordService;
import com.gdgoc.babi_order.clienterror.ClientErrorController;
import com.gdgoc.babi_order.clienterror.ClientErrorService;
import com.gdgoc.babi_order.clienterror.exception.ClientErrorExceptionHandler;
import com.gdgoc.babi_order.clienterror.repository.ClientErrorRepository;
import com.gdgoc.babi_order.common.exception.ApiExceptionHandler;
import com.gdgoc.babi_order.common.request.RequestIdFilterConfig;
import com.gdgoc.babi_order.common.request.RequestIdSupport;
import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ClientErrorController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        ClientErrorExceptionHandler.class,
        ClientErrorService.class,
        ApiExceptionHandler.class,
        RequestIdFilterConfig.class
})
class ClientErrorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ClientErrorRepository clientErrorRepository;

    @MockitoBean
    private BackendErrorRecordService backendErrorRecordService;

    @Test
    @WithAnonymousUser
    void acceptsValidReportFromAnonymousUser() throws Exception {
        mockMvc.perform(post("/api/client-errors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "timestamp": "2026-08-19T06:00:00Z",
                                  "source": "WINDOW",
                                  "errorName": "TypeError",
                                  "message": "Cannot read properties of undefined",
                                  "route": "/user/cart",
                                  "userAgent": "Mozilla/5.0 Test"
                                }
                                """))
                .andExpect(status().isNoContent())
                .andExpect(header().exists(RequestIdSupport.HEADER_NAME));

        verify(clientErrorRepository).save(any());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void acceptsValidReportFromAdminUser() throws Exception {
        mockMvc.perform(post("/api/client-errors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "timestamp": "2026-08-19T06:00:00Z",
                                  "source": "REACT",
                                  "errorName": "Error",
                                  "message": "render failed",
                                  "route": "/admin/orders",
                                  "relatedRequestId": "abc-request-id-01",
                                  "userAgent": "Mozilla/5.0 Test"
                                }
                                """))
                .andExpect(status().isNoContent());
    }

    @Test
    void rejectsInvalidSource() throws Exception {
        mockMvc.perform(post("/api/client-errors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "timestamp": "2026-08-19T06:00:00Z",
                                  "source": "INVALID",
                                  "errorName": "TypeError",
                                  "message": "fail",
                                  "route": "/user"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void rejectsOverlongMessage() throws Exception {
        String longMessage = "x".repeat(2001);
        mockMvc.perform(post("/api/client-errors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "timestamp": "2026-08-19T06:00:00Z",
                                  "source": "WINDOW",
                                  "errorName": "Error",
                                  "message": "%s",
                                  "route": "/user"
                                }
                                """.formatted(longMessage)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void rejectsInvalidRelatedRequestId() throws Exception {
        mockMvc.perform(post("/api/client-errors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "timestamp": "2026-08-19T06:00:00Z",
                                  "source": "API",
                                  "errorName": "Error",
                                  "message": "parse failed",
                                  "route": "/user/checkout",
                                  "relatedRequestId": "bad id with spaces"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }
}

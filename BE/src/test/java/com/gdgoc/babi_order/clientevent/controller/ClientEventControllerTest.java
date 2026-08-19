package com.gdgoc.babi_order.clientevent.controller;

import com.gdgoc.babi_order.clientevent.ClientEventController;
import com.gdgoc.babi_order.clientevent.ClientEventService;
import com.gdgoc.babi_order.clientevent.exception.ClientEventExceptionHandler;
import com.gdgoc.babi_order.clientevent.repository.ClientEventRepository;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ClientEventController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        ClientEventExceptionHandler.class,
        ClientEventService.class,
        ApiExceptionHandler.class,
        RequestIdFilterConfig.class
})
class ClientEventControllerTest {

    private static final String ANON_ID = "11111111-1111-1111-1111-111111111111";
    private static final String SESSION_ID = "22222222-2222-2222-2222-222222222222";
    private static final String EVENT_ID = "33333333-3333-3333-3333-333333333333";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ClientEventRepository clientEventRepository;

    @Test
    @WithAnonymousUser
    void acceptsValidEventFromAnonymousUser() throws Exception {
        mockMvc.perform(post("/api/client-events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload("MENU_VIEW", """
                                {"menuId": 1, "categoryId": 2}
                                """)))
                .andExpect(status().isNoContent())
                .andExpect(header().exists(RequestIdSupport.HEADER_NAME));

        verify(clientEventRepository).save(any());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void acceptsValidEventFromAuthenticatedUser() throws Exception {
        mockMvc.perform(post("/api/client-events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload("ADD_TO_CART", """
                                {"menuId": 10, "quantity": 1, "cartItemCount": 2}
                                """)))
                .andExpect(status().isNoContent());
    }

    @Test
    void rejectsUnsupportedEventType() throws Exception {
        mockMvc.perform(post("/api/client-events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventId": "%s",
                                  "eventType": "BUTTON_CLICK",
                                  "timestamp": "2026-08-19T06:00:00Z",
                                  "anonymousId": "%s",
                                  "sessionId": "%s",
                                  "route": "/user"
                                }
                                """.formatted(EVENT_ID, ANON_ID, SESSION_ID)))
                .andExpect(status().isBadRequest());

        verify(clientEventRepository, never()).save(any());
    }

    @Test
    void rejectsOverlongAnonymousId() throws Exception {
        mockMvc.perform(post("/api/client-events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload("MENU_VIEW", "{}", "a".repeat(65), SESSION_ID)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void rejectsInvalidRelatedRequestId() throws Exception {
        mockMvc.perform(post("/api/client-events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventId": "%s",
                                  "eventType": "ORDER_CREATED",
                                  "timestamp": "2026-08-19T06:00:00Z",
                                  "anonymousId": "%s",
                                  "sessionId": "%s",
                                  "route": "/user/checkout",
                                  "relatedRequestId": "bad id"
                                }
                                """.formatted(EVENT_ID, ANON_ID, SESSION_ID)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void rejectsOversizedMetadata() throws Exception {
        String longValue = "x".repeat(600);
        mockMvc.perform(post("/api/client-events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload("MENU_VIEW", """
                                {"note": "%s"}
                                """.formatted(longValue))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    private static String validPayload(String eventType, String metadataJson) {
        return validPayload(eventType, metadataJson, ANON_ID, SESSION_ID);
    }

    private static String validPayload(
            String eventType,
            String metadataJson,
            String anonymousId,
            String sessionId
    ) {
        return """
                {
                  "eventId": "%s",
                  "eventType": "%s",
                  "timestamp": "2026-08-19T06:00:00Z",
                  "anonymousId": "%s",
                  "sessionId": "%s",
                  "route": "/user",
                  "metadata": %s
                }
                """.formatted(EVENT_ID, eventType, anonymousId, sessionId, metadataJson);
    }
}

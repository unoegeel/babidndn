package com.gdgoc.babi_order.common.exception;

import com.gdgoc.babi_order.backenderror.BackendErrorRecordService;
import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
import com.gdgoc.babi_order.httprequest.RequestRecordService;
import com.gdgoc.babi_order.common.request.RequestIdFilterConfig;
import com.gdgoc.babi_order.order.service.OrderEventService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.async.AsyncRequestTimeoutException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AsyncRequestTimeoutExceptionHandlingTest.ProbeController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        ApiExceptionHandler.class,
        RequestIdFilterConfig.class,
        AsyncRequestTimeoutExceptionHandlingTest.ProbeController.class
})
class AsyncRequestTimeoutExceptionHandlingTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BackendErrorRecordService backendErrorRecordService;

    @MockitoBean
    private RequestRecordService requestRecordService;

    @Test
    @WithMockUser(roles = "ADMIN")
    void orderSseAsyncTimeoutDoesNotRecordBackendError() throws Exception {
        mockMvc.perform(get(OrderEventService.STREAM_PATH))
                .andExpect(status().isServiceUnavailable());

        verify(backendErrorRecordService, never()).recordServerError(any(), any(), any());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void nonSseAsyncTimeoutStillRecordsBackendError() throws Exception {
        mockMvc.perform(get("/api/test/probe/async-timeout"))
                .andExpect(status().isServiceUnavailable());

        verify(backendErrorRecordService, times(1)).recordServerError(any(), any(), any());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void unexpectedExceptionStillRecordsBackendError() throws Exception {
        mockMvc.perform(get("/api/test/probe/boom"))
                .andExpect(status().isInternalServerError());

        verify(backendErrorRecordService, times(1)).recordServerError(any(), any(), any());
    }

    @RestController
    static class ProbeController {

        @GetMapping(OrderEventService.STREAM_PATH)
        ResponseEntity<Void> orderStreamTimeout() {
            throw new AsyncRequestTimeoutException();
        }

        @GetMapping("/api/test/probe/async-timeout")
        ResponseEntity<Void> otherAsyncTimeout() {
            throw new AsyncRequestTimeoutException();
        }

        @GetMapping("/api/test/probe/boom")
        ResponseEntity<Void> boom() {
            throw new IllegalStateException("boom");
        }
    }
}

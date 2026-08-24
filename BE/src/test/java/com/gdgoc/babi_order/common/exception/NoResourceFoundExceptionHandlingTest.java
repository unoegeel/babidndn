package com.gdgoc.babi_order.common.exception;

import com.gdgoc.babi_order.backenderror.BackendErrorRecordService;
import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
import com.gdgoc.babi_order.httprequest.RequestRecordService;
import com.gdgoc.babi_order.common.request.RequestIdFilterConfig;
import com.gdgoc.babi_order.common.request.RequestIdSupport;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = NoResourceFoundExceptionHandlingTest.ProbeController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        ApiExceptionHandler.class,
        RequestIdFilterConfig.class,
        NoResourceFoundExceptionHandlingTest.ProbeController.class
})
class NoResourceFoundExceptionHandlingTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BackendErrorRecordService backendErrorRecordService;

    @MockitoBean
    private RequestRecordService requestRecordService;

    @Test
    @WithAnonymousUser
    void unmappedPathReturns404WithoutBackendError() throws Exception {
        mockMvc.perform(get("/definitely-not-existing-resource"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.code").value(ApiExceptionHandler.RESOURCE_NOT_FOUND_CODE))
                .andExpect(jsonPath("$.message").value(ApiExceptionHandler.RESOURCE_NOT_FOUND_MESSAGE));

        verify(backendErrorRecordService, never()).recordServerError(any(), any(), any());

        ArgumentCaptor<HttpServletResponse> responseCaptor = ArgumentCaptor.forClass(HttpServletResponse.class);
        verify(requestRecordService, times(1)).complete(any(HttpServletRequest.class), responseCaptor.capture(), anyLong());
        assertThat(responseCaptor.getValue().getStatus()).isEqualTo(404);
    }

    @Test
    @WithAnonymousUser
    void scannerLikePathReturns404WithoutBackendError() throws Exception {
        mockMvc.perform(get("/.env"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(ApiExceptionHandler.RESOURCE_NOT_FOUND_CODE));

        verify(backendErrorRecordService, never()).recordServerError(any(), any(), any());
    }

    @Test
    @WithAnonymousUser
    void unexpectedExceptionStillRecordsBackendError() throws Exception {
        mockMvc.perform(get("/api/test/probe/boom")
                        .header(RequestIdSupport.HEADER_NAME, "probe-error-id"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR"));

        verify(backendErrorRecordService, times(1))
                .recordServerError(any(), eq(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR), any(Exception.class));
    }

    @Test
    @WithAnonymousUser
    void mappedOkStillWorks() throws Exception {
        mockMvc.perform(get("/api/test/probe/ok"))
                .andExpect(status().isOk());
        verify(backendErrorRecordService, never()).recordServerError(any(), any(), any());
    }

    @RestController
    static class ProbeController {

        @GetMapping("/api/test/probe/ok")
        ResponseEntity<String> ok() {
            return ResponseEntity.ok("ok");
        }

        @GetMapping("/api/test/probe/boom")
        ResponseEntity<String> boom() {
            throw new IllegalStateException("boom");
        }
    }
}

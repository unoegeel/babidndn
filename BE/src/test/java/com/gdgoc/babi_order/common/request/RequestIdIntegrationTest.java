package com.gdgoc.babi_order.common.request;

import com.gdgoc.babi_order.backenderror.BackendErrorRecordService;
import com.gdgoc.babi_order.common.exception.ApiExceptionHandler;
import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
import com.gdgoc.babi_order.httprequest.RequestRecordService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = RequestIdIntegrationTest.TestController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        RequestIdFilterConfig.class,
        ApiExceptionHandler.class,
        RequestIdIntegrationTest.TestController.class
})
class RequestIdIntegrationTest {

    @MockitoBean
    private RequestRecordService requestRecordService;

    @MockitoBean
    private BackendErrorRecordService backendErrorRecordService;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsGeneratedRequestIdHeader() throws Exception {
        mockMvc.perform(get("/api/test/request-id/ok"))
                .andExpect(status().isOk())
                .andExpect(header().exists(RequestIdSupport.HEADER_NAME));
    }

    @Test
    void echoesValidExternalRequestId() throws Exception {
        mockMvc.perform(get("/api/test/request-id/ok")
                        .header(RequestIdSupport.HEADER_NAME, "test-request-id"))
                .andExpect(status().isOk())
                .andExpect(header().string(RequestIdSupport.HEADER_NAME, "test-request-id"));
    }

    @Test
    void replacesInvalidExternalRequestId() throws Exception {
        mockMvc.perform(get("/api/test/request-id/ok")
                        .header(RequestIdSupport.HEADER_NAME, "bad request id"))
                .andExpect(status().isOk())
                .andExpect(result -> {
                    String header = result.getResponse().getHeader(RequestIdSupport.HEADER_NAME);
                    org.assertj.core.api.Assertions.assertThat(header)
                            .isNotEqualTo("bad request id")
                            .isNotBlank();
                });
    }

    @Test
    void unexpectedExceptionIncludesRequestIdHeader() throws Exception {
        mockMvc.perform(get("/api/test/request-id/error")
                        .header(RequestIdSupport.HEADER_NAME, "error-request-id"))
                .andExpect(status().isInternalServerError())
                .andExpect(header().string(RequestIdSupport.HEADER_NAME, "error-request-id"))
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR"));
    }

    @TestConfiguration
    static class TestConfig {
        @Bean
        CorsProperties corsProperties() {
            CorsProperties properties = new CorsProperties();
            properties.setAllowedOrigins(java.util.List.of("http://localhost:5173"));
            return properties;
        }
    }

    @RestController
    static class TestController {

        @GetMapping("/api/test/request-id/ok")
        ResponseEntity<String> ok() {
            return ResponseEntity.ok("ok");
        }

        @GetMapping("/api/test/request-id/error")
        ResponseEntity<String> error() {
            throw new RuntimeException("test failure");
        }
    }
}

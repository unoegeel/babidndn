package com.gdgoc.babi_order.dev.request;

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
import com.gdgoc.babi_order.httprequest.entity.HttpRequestRecord;
import com.gdgoc.babi_order.httprequest.repository.HttpRequestRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DeveloperRequestController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        AdminSecurityBeansConfig.class,
        AdminAuthenticationEntryPoint.class,
        ApiExceptionHandler.class,
        DeveloperRequestService.class,
        JwtTokenProvider.class,
        DeveloperRequestControllerTest.JwtTestConfig.class
})
class DeveloperRequestControllerTest {

    private static final String DEVELOPER_LOGIN = "developer";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private HttpRequestRecordRepository httpRequestRecordRepository;

    @MockitoBean
    private AdminRepository adminRepository;

    @MockitoBean
    private BackendErrorRecordService backendErrorRecordService;

    @BeforeEach
    void setUp() {
        given(adminRepository.findByLoginId(DEVELOPER_LOGIN))
                .willReturn(Optional.of(new Admin(DEVELOPER_LOGIN, "encoded", AdminRole.DEVELOPER)));
    }

    @Test
    @WithAnonymousUser
    void anonymousCannotListRequests() throws Exception {
        mockMvc.perform(get("/api/dev/requests"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCannotListRequests() throws Exception {
        mockMvc.perform(get("/api/dev/requests"))
                .andExpect(status().isForbidden());
    }

    @Test
    void developerCanListRequests() throws Exception {
        Instant now = Instant.parse("2026-08-19T06:00:00Z");
        HttpRequestRecord record = new HttpRequestRecord("req-1", "POST", "/api/orders", 201, 184L, null);
        setField(record, "id", 1L);
        setField(record, "createdAt", now);

        given(httpRequestRecordRepository.findAll(any(Specification.class), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(record)));

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);

        mockMvc.perform(get("/api/dev/requests")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].requestId").value("req-1"))
                .andExpect(jsonPath("$.content[0].method").value("POST"))
                .andExpect(jsonPath("$.content[0].status").value(201));
    }

    @Test
    void developerCanGetDetail() throws Exception {
        Instant now = Instant.parse("2026-08-19T06:00:00Z");
        HttpRequestRecord record = new HttpRequestRecord("req-1", "GET", "/api/menus", 200, 42L, "TestAgent");
        setField(record, "id", 5L);
        setField(record, "createdAt", now);

        given(httpRequestRecordRepository.findById(5L)).willReturn(Optional.of(record));

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);

        mockMvc.perform(get("/api/dev/requests/5")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requestId").value("req-1"))
                .andExpect(jsonPath("$.durationMs").value(42));
    }

    private static void setField(Object target, String fieldName, Object value) {
        try {
            var field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException(ex);
        }
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

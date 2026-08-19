package com.gdgoc.babi_order.dev.error;

import com.gdgoc.babi_order.admin.config.AdminSecurityBeansConfig;
import com.gdgoc.babi_order.admin.config.JwtProperties;
import com.gdgoc.babi_order.admin.entity.Admin;
import com.gdgoc.babi_order.admin.entity.AdminRole;
import com.gdgoc.babi_order.admin.repository.AdminRepository;
import com.gdgoc.babi_order.admin.security.AdminAuthenticationEntryPoint;
import com.gdgoc.babi_order.admin.security.JwtTokenProvider;
import com.gdgoc.babi_order.backenderror.entity.BackendError;
import com.gdgoc.babi_order.backenderror.BackendErrorRecordService;
import com.gdgoc.babi_order.backenderror.repository.BackendErrorRepository;
import com.gdgoc.babi_order.clienterror.ClientErrorSource;
import com.gdgoc.babi_order.clienterror.entity.ClientError;
import com.gdgoc.babi_order.clienterror.repository.ClientErrorRepository;
import com.gdgoc.babi_order.common.exception.ApiExceptionHandler;
import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
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

@WebMvcTest(DeveloperErrorController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        AdminSecurityBeansConfig.class,
        AdminAuthenticationEntryPoint.class,
        ApiExceptionHandler.class,
        DeveloperErrorService.class,
        JwtTokenProvider.class,
        DeveloperErrorControllerTest.JwtTestConfig.class
})
class DeveloperErrorControllerTest {

    private static final String DEVELOPER_LOGIN = "developer";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private ClientErrorRepository clientErrorRepository;

    @MockitoBean
    private BackendErrorRepository backendErrorRepository;

    @MockitoBean
    private BackendErrorRecordService backendErrorRecordService;

    @MockitoBean
    private AdminRepository adminRepository;

    @BeforeEach
    void setUp() {
        given(adminRepository.findByLoginId(DEVELOPER_LOGIN))
                .willReturn(Optional.of(new Admin(DEVELOPER_LOGIN, "encoded", AdminRole.DEVELOPER)));
    }

    @Test
    @WithAnonymousUser
    void anonymousCannotListErrors() throws Exception {
        mockMvc.perform(get("/api/dev/errors"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCannotListErrors() throws Exception {
        mockMvc.perform(get("/api/dev/errors"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "USER")
    void userCannotListErrors() throws Exception {
        mockMvc.perform(get("/api/dev/errors"))
                .andExpect(status().isForbidden());
    }

    @Test
    void developerCanListErrors() throws Exception {
        Instant now = Instant.parse("2026-08-19T06:00:00Z");
        ClientError frontend = new ClientError(
                "req-fe-1", null, ClientErrorSource.WINDOW, "TypeError", "boom",
                null, null, "/user/cart", null, "Chrome", "Mac", now
        );
        setField(frontend, "id", 1L);
        setField(frontend, "createdAt", now);

        given(clientErrorRepository.count(any(Specification.class))).willReturn(1L);
        given(backendErrorRepository.count(any(Specification.class))).willReturn(0L);
        given(clientErrorRepository.findAll(any(Specification.class), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(frontend)));
        given(backendErrorRepository.findAll(any(Specification.class), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of()));

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);

        mockMvc.perform(get("/api/dev/errors")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("frontend-1"))
                .andExpect(jsonPath("$.content[0].source").value("FRONTEND"))
                .andExpect(jsonPath("$.content[0].route").value("/user/cart"));
    }

    @Test
    void developerCanGetDetail() throws Exception {
        Instant now = Instant.parse("2026-08-19T06:00:00Z");
        BackendError backend = new BackendError(
                "req-be-1", "POST", "/api/orders", 500,
                "java.lang.RuntimeException", "failed", "stack", 12L, null
        );
        setField(backend, "id", 2L);
        setField(backend, "createdAt", now);

        given(backendErrorRepository.findById(2L)).willReturn(Optional.of(backend));

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);

        mockMvc.perform(get("/api/dev/errors/backend-2")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("backend-2"))
                .andExpect(jsonPath("$.source").value("BACKEND"))
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.requestId").value("req-be-1"));
    }

    @Test
    void detailReturnsNotFoundForMissingError() throws Exception {
        given(clientErrorRepository.findById(999L)).willReturn(Optional.empty());

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);

        mockMvc.perform(get("/api/dev/errors/frontend-999")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ERROR_NOT_FOUND"));
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

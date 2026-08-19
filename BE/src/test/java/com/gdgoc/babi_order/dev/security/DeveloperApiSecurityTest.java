package com.gdgoc.babi_order.dev.security;

import com.gdgoc.babi_order.admin.config.AdminSecurityBeansConfig;
import com.gdgoc.babi_order.admin.config.JwtProperties;
import com.gdgoc.babi_order.admin.entity.Admin;
import com.gdgoc.babi_order.admin.entity.AdminRole;
import com.gdgoc.babi_order.admin.repository.AdminRepository;
import com.gdgoc.babi_order.admin.security.AdminAuthenticationEntryPoint;
import com.gdgoc.babi_order.admin.security.JwtTokenProvider;
import com.gdgoc.babi_order.common.exception.ApiExceptionHandler;
import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.util.Optional;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DeveloperSecurityProbeController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        AdminSecurityBeansConfig.class,
        AdminAuthenticationEntryPoint.class,
        ApiExceptionHandler.class,
        JwtTokenProvider.class,
        DeveloperApiSecurityTest.JwtTestConfig.class
})
class DeveloperApiSecurityTest {

    private static final String DEVELOPER_LOGIN = "developer";
    private static final String ADMIN_LOGIN = "owner";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private AdminRepository adminRepository;

    @BeforeEach
    void setUp() {
        given(adminRepository.findByLoginId(DEVELOPER_LOGIN))
                .willReturn(Optional.of(new Admin(DEVELOPER_LOGIN, "encoded", AdminRole.DEVELOPER)));
        given(adminRepository.findByLoginId(ADMIN_LOGIN))
                .willReturn(Optional.of(new Admin(ADMIN_LOGIN, "encoded", AdminRole.ADMIN)));
    }

    @Test
    @WithAnonymousUser
    void anonymousCannotAccessDeveloperApi() throws Exception {
        mockMvc.perform(get("/api/dev/__security-probe"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void userRoleCannotAccessDeveloperApi() throws Exception {
        mockMvc.perform(get("/api/dev/__security-probe"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminRoleCannotAccessDeveloperApi() throws Exception {
        mockMvc.perform(get("/api/dev/__security-probe"))
                .andExpect(status().isForbidden());
    }

    @Test
    void developerJwtCanAccessDeveloperApi() throws Exception {
        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);

        mockMvc.perform(get("/api/dev/__security-probe")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    @Test
    void adminJwtCannotAccessDeveloperApi() throws Exception {
        String token = jwtTokenProvider.createToken(ADMIN_LOGIN, AdminRole.ADMIN);

        mockMvc.perform(get("/api/dev/__security-probe")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
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

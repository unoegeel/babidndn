package com.gdgoc.babi_order.dev.event;

import com.gdgoc.babi_order.admin.config.AdminSecurityBeansConfig;
import com.gdgoc.babi_order.admin.config.JwtProperties;
import com.gdgoc.babi_order.admin.entity.Admin;
import com.gdgoc.babi_order.admin.entity.AdminRole;
import com.gdgoc.babi_order.admin.repository.AdminRepository;
import com.gdgoc.babi_order.admin.security.AdminAuthenticationEntryPoint;
import com.gdgoc.babi_order.admin.security.JwtTokenProvider;
import com.gdgoc.babi_order.backenderror.BackendErrorRecordService;
import com.gdgoc.babi_order.clientevent.ClientEventType;
import com.gdgoc.babi_order.clientevent.entity.ClientEvent;
import com.gdgoc.babi_order.clientevent.repository.ClientEventRepository;
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
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DeveloperEventController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        AdminSecurityBeansConfig.class,
        AdminAuthenticationEntryPoint.class,
        ApiExceptionHandler.class,
        DeveloperEventService.class,
        JwtTokenProvider.class,
        DeveloperEventControllerTest.JwtTestConfig.class
})
class DeveloperEventControllerTest {

    private static final String DEVELOPER_LOGIN = "developer";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private ClientEventRepository clientEventRepository;

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
    void anonymousCannotListEvents() throws Exception {
        mockMvc.perform(get("/api/dev/events"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCannotListEvents() throws Exception {
        mockMvc.perform(get("/api/dev/events"))
                .andExpect(status().isForbidden());
    }

    @Test
    void developerCanListEvents() throws Exception {
        Instant occurredAt = Instant.parse("2026-08-19T07:40:00Z");
        ClientEvent event = new ClientEvent(
                "evt-123",
                ClientEventType.ADD_TO_CART,
                occurredAt,
                "anon-001",
                "sess-001",
                "/user/cart",
                "req-456",
                Map.of("menuId", 123, "quantity", 1)
        );
        setField(event, "id", 1L);

        given(clientEventRepository.findAll(any(Specification.class), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(event)));

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);

        mockMvc.perform(get("/api/dev/events")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].eventId").value("evt-123"))
                .andExpect(jsonPath("$.content[0].eventType").value("ADD_TO_CART"))
                .andExpect(jsonPath("$.content[0].relatedRequestId").value("req-456"))
                .andExpect(jsonPath("$.content[0].metadata").doesNotExist());
    }

    @Test
    void developerCanFilterByEventType() throws Exception {
        given(clientEventRepository.findAll(any(Specification.class), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of()));

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);

        mockMvc.perform(get("/api/dev/events")
                        .param("eventType", "MENU_VIEW")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void developerCanGetDetail() throws Exception {
        Instant occurredAt = Instant.parse("2026-08-19T07:40:00Z");
        ClientEvent event = new ClientEvent(
                "evt-123",
                ClientEventType.ADD_TO_CART,
                occurredAt,
                "anon-001",
                "sess-001",
                "/user/cart",
                "req-456",
                Map.of("menuId", 123, "quantity", 1, "cartItemCount", 2)
        );
        setField(event, "id", 3L);

        given(clientEventRepository.findById(3L)).willReturn(Optional.of(event));

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);

        mockMvc.perform(get("/api/dev/events/3")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eventId").value("evt-123"))
                .andExpect(jsonPath("$.metadata.menuId").value(123))
                .andExpect(jsonPath("$.metadata.cartItemCount").value(2));
    }

    @Test
    void developerGetsNotFoundForMissingEvent() throws Exception {
        given(clientEventRepository.findById(999L)).willReturn(Optional.empty());

        String token = jwtTokenProvider.createToken(DEVELOPER_LOGIN, AdminRole.DEVELOPER);

        mockMvc.perform(get("/api/dev/events/999")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
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

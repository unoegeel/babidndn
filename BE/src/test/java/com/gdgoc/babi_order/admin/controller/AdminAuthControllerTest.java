package com.gdgoc.babi_order.admin.controller;

import com.gdgoc.babi_order.admin.dto.response.AdminLoginResponse;
import com.gdgoc.babi_order.admin.exception.AdminAuthException;
import com.gdgoc.babi_order.admin.exception.AdminAuthExceptionHandler;
import com.gdgoc.babi_order.admin.service.AdminAuthService;
import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminAuthController.class)
@Import({SecurityConfig.class, CorsProperties.class, AdminAuthExceptionHandler.class})
class AdminAuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminAuthService adminAuthService;

    @Test
    void loginReturnsAccessToken() throws Exception {
        given(adminAuthService.login(any())).willReturn(AdminLoginResponse.builder()
                .accessToken("access-token")
                .tokenType("Bearer")
                .expiresIn(3600)
                .build());

        mockMvc.perform(post("/api/admin/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "owner",
                                  "password": "password"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(3600));
    }

    @Test
    void loginRejectsBlankCredentials() throws Exception {
        mockMvc.perform(post("/api/admin/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "",
                                  "password": ""
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void loginReturnsUnauthorizedForInvalidCredentials() throws Exception {
        given(adminAuthService.login(any())).willThrow(new AdminAuthException(
                "INVALID_ADMIN_CREDENTIALS",
                "아이디 또는 비밀번호가 올바르지 않습니다."
        ));

        mockMvc.perform(post("/api/admin/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "owner",
                                  "password": "wrong"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_ADMIN_CREDENTIALS"));
    }

    @Test
    void signupCreatesAccountAndReturnsAccessToken() throws Exception {
        given(adminAuthService.signup(any())).willReturn(AdminLoginResponse.builder()
                .accessToken("access-token")
                .tokenType("Bearer")
                .expiresIn(3600)
                .build());

        mockMvc.perform(post("/api/admin/auth/signup")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "new-owner",
                                  "password": "password123"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").value("access-token"));
    }

    @Test
    void signupRejectsDuplicateLoginId() throws Exception {
        given(adminAuthService.signup(any())).willThrow(new AdminAuthException(
                org.springframework.http.HttpStatus.CONFLICT,
                "DUPLICATE_LOGIN_ID",
                "이미 사용 중인 아이디입니다."
        ));

        mockMvc.perform(post("/api/admin/auth/signup")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "owner",
                                  "password": "password123"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_LOGIN_ID"));
    }
}

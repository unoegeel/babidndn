package com.gdgoc.babi_order.admin.service;

import com.gdgoc.babi_order.admin.dto.request.AdminLoginRequest;
import com.gdgoc.babi_order.admin.dto.request.AdminSignupRequest;
import com.gdgoc.babi_order.admin.dto.response.AdminLoginResponse;
import com.gdgoc.babi_order.admin.entity.Admin;
import com.gdgoc.babi_order.admin.exception.AdminAuthException;
import com.gdgoc.babi_order.admin.repository.AdminRepository;
import com.gdgoc.babi_order.admin.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdminAuthServiceTest {

    @Mock
    private AdminRepository adminRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtTokenProvider jwtTokenProvider;

    private AdminAuthService adminAuthService;

    @BeforeEach
    void setUp() {
        adminAuthService = new AdminAuthService(
                adminRepository, passwordEncoder, jwtTokenProvider);
    }

    @Test
    void loginReturnsAccessTokenForValidCredentials() {
        Admin admin = new Admin("owner", "encoded-password");
        given(adminRepository.findByLoginId("owner")).willReturn(Optional.of(admin));
        given(passwordEncoder.matches("password", "encoded-password")).willReturn(true);
        given(jwtTokenProvider.createToken("owner")).willReturn("access-token");
        given(jwtTokenProvider.getExpirationSeconds()).willReturn(3600L);

        AdminLoginResponse result = adminAuthService.login(
                new AdminLoginRequest("owner", "password"));

        assertThat(result.getAccessToken()).isEqualTo("access-token");
        assertThat(result.getTokenType()).isEqualTo("Bearer");
        assertThat(result.getExpiresIn()).isEqualTo(3600L);
    }

    @Test
    void loginRejectsUnknownLoginId() {
        given(adminRepository.findByLoginId("unknown")).willReturn(Optional.empty());

        assertThatThrownBy(() -> adminAuthService.login(
                new AdminLoginRequest("unknown", "password")))
                .isInstanceOf(AdminAuthException.class)
                .extracting("code")
                .isEqualTo("INVALID_ADMIN_CREDENTIALS");
    }

    @Test
    void loginRejectsWrongPassword() {
        Admin admin = new Admin("owner", "encoded-password");
        given(adminRepository.findByLoginId("owner")).willReturn(Optional.of(admin));
        given(passwordEncoder.matches("wrong", "encoded-password")).willReturn(false);

        assertThatThrownBy(() -> adminAuthService.login(
                new AdminLoginRequest("owner", "wrong")))
                .isInstanceOf(AdminAuthException.class)
                .extracting("code")
                .isEqualTo("INVALID_ADMIN_CREDENTIALS");
    }

    @Test
    void signupCreatesAdminAndReturnsAccessToken() {
        given(adminRepository.existsByLoginId("new-owner")).willReturn(false);
        given(passwordEncoder.encode("password123")).willReturn("encoded-password");
        given(adminRepository.save(org.mockito.ArgumentMatchers.any(Admin.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        given(jwtTokenProvider.createToken("new-owner")).willReturn("access-token");
        given(jwtTokenProvider.getExpirationSeconds()).willReturn(3600L);

        AdminLoginResponse result = adminAuthService.signup(
                new AdminSignupRequest("new-owner", "password123"));

        assertThat(result.getAccessToken()).isEqualTo("access-token");
        verify(adminRepository).save(org.mockito.ArgumentMatchers.any(Admin.class));
    }

    @Test
    void signupRejectsDuplicateLoginId() {
        given(adminRepository.existsByLoginId("owner")).willReturn(true);

        assertThatThrownBy(() -> adminAuthService.signup(
                new AdminSignupRequest("owner", "password123")))
                .isInstanceOf(AdminAuthException.class)
                .extracting("code")
                .isEqualTo("DUPLICATE_LOGIN_ID");
    }
}

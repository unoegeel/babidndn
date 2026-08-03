package com.gdgoc.babi_order.admin.service;

import com.gdgoc.babi_order.admin.dto.request.AdminLoginRequest;
import com.gdgoc.babi_order.admin.dto.request.AdminSignupRequest;
import com.gdgoc.babi_order.admin.dto.response.AdminLoginResponse;
import com.gdgoc.babi_order.admin.entity.Admin;
import com.gdgoc.babi_order.admin.exception.AdminAuthException;
import com.gdgoc.babi_order.admin.repository.AdminRepository;
import com.gdgoc.babi_order.admin.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAuthService {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AdminLoginResponse login(AdminLoginRequest request) {
        Admin admin = adminRepository.findByLoginId(request.getLoginId())
                .orElseThrow(this::invalidCredentials);
        if (!passwordEncoder.matches(request.getPassword(), admin.getPassword())) {
            throw invalidCredentials();
        }
        return AdminLoginResponse.builder()
                .accessToken(jwtTokenProvider.createToken(admin.getLoginId()))
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getExpirationSeconds())
                .build();
    }

    @Transactional
    public AdminLoginResponse signup(AdminSignupRequest request) {
        String loginId = request.getLoginId().trim();
        if (adminRepository.existsByLoginId(loginId)) {
            throw duplicateLoginId();
        }

        Admin admin = adminRepository.save(new Admin(
                loginId,
                passwordEncoder.encode(request.getPassword())
        ));

        return AdminLoginResponse.builder()
                .accessToken(jwtTokenProvider.createToken(admin.getLoginId()))
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getExpirationSeconds())
                .build();
    }

    private AdminAuthException invalidCredentials() {
        return new AdminAuthException(
                "INVALID_ADMIN_CREDENTIALS",
                "아이디 또는 비밀번호가 올바르지 않습니다."
        );
    }

    private AdminAuthException duplicateLoginId() {
        return new AdminAuthException(
                HttpStatus.CONFLICT,
                "DUPLICATE_LOGIN_ID",
                "이미 사용 중인 아이디입니다."
        );
    }
}

package com.gdgoc.babi_order.admin.controller;

import com.gdgoc.babi_order.admin.dto.request.AdminLoginRequest;
import com.gdgoc.babi_order.admin.dto.request.AdminSignupRequest;
import com.gdgoc.babi_order.admin.dto.response.AdminLoginResponse;
import com.gdgoc.babi_order.admin.service.AdminAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
@Tag(name = "Admin Auth", description = "관리자 인증 API")
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    @PostMapping("/login")
    @Operation(summary = "관리자 로그인")
    public ResponseEntity<AdminLoginResponse> login(
            @Valid @RequestBody AdminLoginRequest request) {
        return ResponseEntity.ok(adminAuthService.login(request));
    }

    @PostMapping("/signup")
    @Operation(summary = "관리자 회원가입")
    public ResponseEntity<AdminLoginResponse> signup(
            @Valid @RequestBody AdminSignupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminAuthService.signup(request));
    }
}

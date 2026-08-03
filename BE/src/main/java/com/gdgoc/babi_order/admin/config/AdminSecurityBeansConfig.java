package com.gdgoc.babi_order.admin.config;

import com.gdgoc.babi_order.admin.repository.AdminRepository;
import com.gdgoc.babi_order.admin.security.JwtAuthenticationFilter;
import com.gdgoc.babi_order.admin.security.JwtTokenProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AdminSecurityBeansConfig {

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter(
            JwtTokenProvider jwtTokenProvider,
            AdminRepository adminRepository
    ) {
        return new JwtAuthenticationFilter(jwtTokenProvider, adminRepository);
    }
}

package com.gdgoc.babi_order.admin.config;

import com.gdgoc.babi_order.admin.entity.Admin;
import com.gdgoc.babi_order.admin.repository.AdminRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class AdminAccountInitializer implements ApplicationRunner {

    private final AdminRepository adminRepository;
    private final AdminAccountProperties properties;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (properties.getLoginId() == null || properties.getLoginId().isBlank()
                || properties.getPassword() == null || properties.getPassword().isBlank()) {
            return;
        }
        if (!adminRepository.existsByLoginId(properties.getLoginId())) {
            adminRepository.save(new Admin(
                    properties.getLoginId(),
                    passwordEncoder.encode(properties.getPassword())
            ));
        }
    }
}

package com.gdgoc.babi_order.admin.config;

import com.gdgoc.babi_order.admin.entity.Admin;
import com.gdgoc.babi_order.admin.entity.AdminRole;
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
        createIfMissing(
                properties.getLoginId(),
                properties.getPassword(),
                AdminRole.ADMIN
        );
        createIfMissing(
                properties.getDeveloperLoginId(),
                properties.getDeveloperPassword(),
                AdminRole.DEVELOPER
        );
    }

    private void createIfMissing(String loginId, String password, AdminRole role) {
        if (loginId == null || loginId.isBlank() || password == null || password.isBlank()) {
            return;
        }
        if (!adminRepository.existsByLoginId(loginId)) {
            adminRepository.save(new Admin(
                    loginId,
                    passwordEncoder.encode(password),
                    role
            ));
        }
    }
}

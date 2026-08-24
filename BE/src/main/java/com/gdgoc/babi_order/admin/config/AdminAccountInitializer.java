package com.gdgoc.babi_order.admin.config;

import com.gdgoc.babi_order.admin.entity.Admin;
import com.gdgoc.babi_order.admin.entity.AdminRole;
import com.gdgoc.babi_order.admin.repository.AdminRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminAccountInitializer implements ApplicationRunner {

    private final AdminRepository adminRepository;
    private final AdminAccountProperties properties;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        ensureConfiguredAccount(
                properties.getLoginId(),
                properties.getPassword(),
                AdminRole.ADMIN
        );
        ensureConfiguredAccount(
                properties.getDeveloperLoginId(),
                properties.getDeveloperPassword(),
                AdminRole.DEVELOPER
        );
    }

    private void ensureConfiguredAccount(String loginId, String password, AdminRole role) {
        if (loginId == null || loginId.isBlank() || password == null || password.isBlank()) {
            return;
        }

        adminRepository.findByLoginId(loginId).ifPresentOrElse(
                admin -> syncPasswordIfChanged(admin, password, role),
                () -> adminRepository.save(new Admin(
                        loginId,
                        passwordEncoder.encode(password),
                        role
                ))
        );
    }

    private void syncPasswordIfChanged(Admin admin, String configuredPassword, AdminRole role) {
        if (passwordEncoder.matches(configuredPassword, admin.getPassword())) {
            return;
        }
        admin.changePassword(passwordEncoder.encode(configuredPassword));
        log.info("Synced password hash for configured {} account", role);
    }
}

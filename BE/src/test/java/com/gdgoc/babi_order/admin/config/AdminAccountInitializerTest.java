package com.gdgoc.babi_order.admin.config;

import com.gdgoc.babi_order.admin.entity.Admin;
import com.gdgoc.babi_order.admin.entity.AdminRole;
import com.gdgoc.babi_order.admin.repository.AdminRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdminAccountInitializerTest {

    private static final String LOGIN_ID = "owner";
    private static final String OLD_PASSWORD = "old-secret-password";
    private static final String NEW_PASSWORD = "new-secret-password";

    @Mock
    private AdminRepository adminRepository;

    private final AdminAccountProperties properties = new AdminAccountProperties();
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private AdminAccountInitializer initializer;

    @BeforeEach
    void setUp() {
        properties.setLoginId(LOGIN_ID);
        properties.setPassword(NEW_PASSWORD);
        properties.setDeveloperLoginId(null);
        properties.setDeveloperPassword(null);
        initializer = new AdminAccountInitializer(adminRepository, properties, passwordEncoder);
    }

    @Test
    void createsAdminWhenMissing() {
        given(adminRepository.findByLoginId(LOGIN_ID)).willReturn(Optional.empty());
        given(adminRepository.save(any(Admin.class))).willAnswer(invocation -> invocation.getArgument(0));

        initializer.run(new DefaultApplicationArguments());

        ArgumentCaptor<Admin> captor = ArgumentCaptor.forClass(Admin.class);
        verify(adminRepository).save(captor.capture());
        Admin saved = captor.getValue();
        assertThat(saved.getLoginId()).isEqualTo(LOGIN_ID);
        assertThat(saved.getRole()).isEqualTo(AdminRole.ADMIN);
        assertThat(passwordEncoder.matches(NEW_PASSWORD, saved.getPassword())).isTrue();
    }

    @Test
    void doesNotChangePasswordWhenMatches() {
        String existingHash = passwordEncoder.encode(NEW_PASSWORD);
        Admin existing = new Admin(LOGIN_ID, existingHash, AdminRole.ADMIN);
        given(adminRepository.findByLoginId(LOGIN_ID)).willReturn(Optional.of(existing));

        initializer.run(new DefaultApplicationArguments());

        verify(adminRepository, never()).save(any());
        assertThat(existing.getPassword()).isSameAs(existingHash);
        assertThat(passwordEncoder.matches(NEW_PASSWORD, existing.getPassword())).isTrue();
    }

    @Test
    void updatesPasswordHashWhenEnvPasswordChanged() {
        String oldHash = passwordEncoder.encode(OLD_PASSWORD);
        Admin existing = new Admin(LOGIN_ID, oldHash, AdminRole.ADMIN);
        given(adminRepository.findByLoginId(LOGIN_ID)).willReturn(Optional.of(existing));

        initializer.run(new DefaultApplicationArguments());

        verify(adminRepository, never()).save(any());
        assertThat(passwordEncoder.matches(NEW_PASSWORD, existing.getPassword())).isTrue();
        assertThat(passwordEncoder.matches(OLD_PASSWORD, existing.getPassword())).isFalse();
        assertThat(existing.getPassword()).isNotEqualTo(oldHash);
        assertThat(existing.getRole()).isEqualTo(AdminRole.ADMIN);
        assertThat(existing.getLoginId()).isEqualTo(LOGIN_ID);
    }

    @Test
    void preservesExistingRoleWhenSyncingPassword() {
        String oldHash = passwordEncoder.encode(OLD_PASSWORD);
        Admin existing = new Admin(LOGIN_ID, oldHash, AdminRole.ADMIN);
        given(adminRepository.findByLoginId(LOGIN_ID)).willReturn(Optional.of(existing));

        initializer.run(new DefaultApplicationArguments());

        assertThat(existing.getRole()).isEqualTo(AdminRole.ADMIN);
    }

    @Test
    void skipsWhenConfiguredCredentialsBlank() {
        properties.setLoginId(" ");
        properties.setPassword(NEW_PASSWORD);

        initializer.run(new DefaultApplicationArguments());

        verify(adminRepository, never()).findByLoginId(any());
        verify(adminRepository, never()).save(any());
    }
}

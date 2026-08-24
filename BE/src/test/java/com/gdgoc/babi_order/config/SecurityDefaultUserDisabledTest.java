package com.gdgoc.babi_order.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class SecurityDefaultUserDisabledTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Test
    void doesNotRegisterSpringDefaultInMemoryUser() {
        assertThat(applicationContext.getBeanNamesForType(InMemoryUserDetailsManager.class)).isEmpty();
        assertThat(applicationContext.getBeanNamesForType(UserDetailsService.class)).isEmpty();
    }

    @Test
    void passwordEncoderRemainsAvailableForAdminAuth() {
        assertThat(applicationContext.getBean(PasswordEncoder.class)).isNotNull();
    }
}

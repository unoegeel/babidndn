package com.gdgoc.babi_order;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

/**
 * Excludes Spring Boot default user auto-configuration.
 * BabiOrder authenticates via AdminAuthService + JWT, not InMemoryUserDetailsManager.
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class BabiOrderApplication {

	public static void main(String[] args) {
		SpringApplication.run(BabiOrderApplication.class, args);
	}

}


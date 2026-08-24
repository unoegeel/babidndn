package com.gdgoc.babi_order.ratelimit;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.Clock;

/**
 * Registered only when {@code app.rate-limit.enabled=true}.
 * Keeps @WebMvcTest slices free of incomplete rate-limit wiring (tests default disabled).
 */
@Configuration
@EnableConfigurationProperties(RateLimitProperties.class)
@ConditionalOnProperty(prefix = "app.rate-limit", name = "enabled", havingValue = "true")
public class RateLimitWebMvcConfig {

    @Bean
    ClientIpResolver clientIpResolver(RateLimitProperties properties) {
        return new ClientIpResolver(properties);
    }

    @Bean
    RateLimitService rateLimitService(
            RateLimitProperties properties,
            ClientIpResolver clientIpResolver,
            Clock clock
    ) {
        RateLimitService service = new RateLimitService(properties, clientIpResolver, clock);
        service.initCache();
        return service;
    }

    @Bean
    RateLimitInterceptor rateLimitInterceptor(
            RateLimitProperties properties,
            RateLimitService rateLimitService
    ) {
        return new RateLimitInterceptor(properties, rateLimitService);
    }

    @Bean
    WebMvcConfigurer rateLimitWebMvcConfigurer(RateLimitInterceptor rateLimitInterceptor) {
        return new WebMvcConfigurer() {
            @Override
            public void addInterceptors(InterceptorRegistry registry) {
                registry.addInterceptor(rateLimitInterceptor);
            }
        };
    }
}

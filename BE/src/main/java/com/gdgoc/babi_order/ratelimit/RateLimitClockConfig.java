package com.gdgoc.babi_order.ratelimit;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class RateLimitClockConfig {

    @Bean
    @ConditionalOnMissingBean(Clock.class)
    Clock rateLimitClock() {
        return Clock.systemUTC();
    }
}

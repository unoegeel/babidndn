package com.gdgoc.babi_order.ratelimit;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.rate-limit")
public class RateLimitProperties {

    private boolean enabled = true;
    private long cacheMaximumSize = 100_000L;
    /** Connection remotes allowed to supply X-Forwarded-For / X-Real-IP. Loopback only by default. */
    private List<String> trustedProxies = new ArrayList<>(List.of("127.0.0.1/32", "::1/128"));
    private Map<String, PolicyLimits> policies = new LinkedHashMap<>();

    @Getter
    @Setter
    public static class PolicyLimits {
        /** 0 or negative = client bucket disabled for this policy. */
        private int clientLimit;
        private int clientWindowSeconds;
        private int ipLimit;
        private int ipWindowSeconds;
    }

    public PolicyLimits requirePolicy(RateLimitPolicy policy) {
        PolicyLimits limits = policies.get(policy.getConfigKey());
        if (limits == null) {
            throw new IllegalStateException("Missing rate-limit policy config: " + policy.getConfigKey());
        }
        return limits;
    }
}

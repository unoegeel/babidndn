package com.gdgoc.babi_order.ratelimit;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.servlet.http.HttpServletRequest;

import java.time.Clock;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * In-memory fixed-window rate limiter (per JVM instance).
 * Thread-safe, bounded via Caffeine. Not shared across horizontally scaled instances.
 */
public class RateLimitService {

    private final RateLimitProperties properties;
    private final ClientIpResolver clientIpResolver;
    private final Clock clock;

    private Cache<String, AtomicReference<WindowState>> buckets;

    public RateLimitService(
            RateLimitProperties properties,
            ClientIpResolver clientIpResolver,
            Clock clock
    ) {
        this.properties = properties;
        this.clientIpResolver = clientIpResolver;
        this.clock = clock;
    }

    public void initCache() {
        this.buckets = Caffeine.newBuilder()
                .maximumSize(Math.max(1L, properties.getCacheMaximumSize()))
                .expireAfterAccess(2, TimeUnit.HOURS)
                .build();
    }

    public void check(RateLimitPolicy policy, HttpServletRequest request) {
        if (!properties.isEnabled()) {
            return;
        }
        RateLimitProperties.PolicyLimits limits = properties.requirePolicy(policy);

        long retryAfter = 0L;
        boolean exceeded = false;

        if (policy.isClientBucketEnabled() && limits.getClientLimit() > 0) {
            String clientHash = RateLimitClientIdentity.hashIfValid(
                    request.getHeader(RateLimitClientIdentity.headerName())
            );
            if (clientHash != null) {
                long clientRetry = consume(
                        bucketKey(policy, "CLIENT", clientHash),
                        limits.getClientLimit(),
                        limits.getClientWindowSeconds()
                );
                if (clientRetry > 0) {
                    exceeded = true;
                    retryAfter = Math.max(retryAfter, clientRetry);
                }
            }
        }

        if (limits.getIpLimit() > 0) {
            String ip = clientIpResolver.resolve(request);
            long ipRetry = consume(
                    bucketKey(policy, "IP", ip),
                    limits.getIpLimit(),
                    limits.getIpWindowSeconds()
            );
            if (ipRetry > 0) {
                exceeded = true;
                retryAfter = Math.max(retryAfter, ipRetry);
            }
        }

        if (exceeded) {
            throw new RateLimitExceededException(retryAfter);
        }
    }

    /**
     * @return retry-after seconds if exceeded, otherwise 0
     */
    long consume(String key, int limit, int windowSeconds) {
        if (limit <= 0 || windowSeconds <= 0) {
            return 0L;
        }
        long nowMs = clock.millis();
        long windowMs = windowSeconds * 1000L;

        AtomicReference<WindowState> ref = buckets.get(key, ignored -> new AtomicReference<>(null));
        while (true) {
            WindowState current = ref.get();
            if (current == null || nowMs >= current.windowEndMs()) {
                WindowState next = new WindowState(nowMs + windowMs, 1);
                if (ref.compareAndSet(current, next)) {
                    return 0L;
                }
                continue;
            }
            if (current.count() >= limit) {
                long retryMs = current.windowEndMs() - nowMs;
                return Math.max(1L, (retryMs + 999L) / 1000L);
            }
            WindowState next = new WindowState(current.windowEndMs(), current.count() + 1);
            if (ref.compareAndSet(current, next)) {
                return 0L;
            }
        }
    }

    static String bucketKey(RateLimitPolicy policy, String identityType, String identity) {
        return policy.name() + ":" + identityType + ":" + identity;
    }

    record WindowState(long windowEndMs, int count) {
    }
}

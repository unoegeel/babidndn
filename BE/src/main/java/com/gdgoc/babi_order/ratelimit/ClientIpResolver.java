package com.gdgoc.babi_order.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.StringUtils;

import java.math.BigInteger;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;

/**
 * Resolves client IP without trusting arbitrary X-Forwarded-For.
 * Forwarded headers are used only when {@code request.getRemoteAddr()} is a configured trusted proxy.
 */
public class ClientIpResolver {

    private final List<TrustedCidr> trustedCidrs;

    public ClientIpResolver(RateLimitProperties properties) {
        this.trustedCidrs = parseTrusted(properties.getTrustedProxies());
    }

    public String resolve(HttpServletRequest request) {
        String remote = normalizeIp(request.getRemoteAddr());
        if (remote == null) {
            return "unknown";
        }
        if (!isTrustedProxy(remote)) {
            return remote;
        }

        String realIp = normalizeIp(request.getHeader("X-Real-IP"));
        if (realIp != null) {
            return realIp;
        }

        String forwarded = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwarded)) {
            String first = forwarded.split(",")[0].trim();
            String parsed = normalizeIp(first);
            if (parsed != null) {
                return parsed;
            }
        }
        return remote;
    }

    boolean isTrustedProxy(String ip) {
        if (trustedCidrs.isEmpty()) {
            return false;
        }
        byte[] address;
        try {
            address = InetAddress.getByName(ip).getAddress();
        } catch (UnknownHostException ex) {
            return false;
        }
        for (TrustedCidr cidr : trustedCidrs) {
            if (cidr.contains(address)) {
                return true;
            }
        }
        return false;
    }

    static String normalizeIp(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        String value = raw.trim();
        if (value.startsWith("[") && value.endsWith("]")) {
            value = value.substring(1, value.length() - 1);
        }
        int zone = value.indexOf('%');
        if (zone >= 0) {
            value = value.substring(0, zone);
        }
        try {
            return InetAddress.getByName(value).getHostAddress();
        } catch (UnknownHostException ex) {
            return null;
        }
    }

    private static List<TrustedCidr> parseTrusted(List<String> entries) {
        List<TrustedCidr> result = new ArrayList<>();
        if (entries == null) {
            return result;
        }
        for (String entry : entries) {
            if (!StringUtils.hasText(entry)) {
                continue;
            }
            TrustedCidr cidr = TrustedCidr.parse(entry.trim());
            if (cidr != null) {
                result.add(cidr);
            }
        }
        return result;
    }

    private record TrustedCidr(byte[] network, int prefixLength) {
        static TrustedCidr parse(String entry) {
            try {
                String ipPart = entry;
                int prefix = -1;
                int slash = entry.indexOf('/');
                if (slash >= 0) {
                    ipPart = entry.substring(0, slash);
                    prefix = Integer.parseInt(entry.substring(slash + 1));
                }
                byte[] address = InetAddress.getByName(ipPart).getAddress();
                if (prefix < 0) {
                    prefix = address.length * 8;
                }
                if (prefix < 0 || prefix > address.length * 8) {
                    return null;
                }
                return new TrustedCidr(address, prefix);
            } catch (Exception ex) {
                return null;
            }
        }

        boolean contains(byte[] candidate) {
            if (candidate.length != network.length) {
                return false;
            }
            if (prefixLength == 0) {
                return true;
            }
            BigInteger net = new BigInteger(1, network);
            BigInteger cand = new BigInteger(1, candidate);
            BigInteger mask = BigInteger.ONE.shiftLeft(network.length * 8 - prefixLength)
                    .subtract(BigInteger.ONE)
                    .not()
                    .and(BigInteger.ONE.shiftLeft(network.length * 8).subtract(BigInteger.ONE));
            return net.and(mask).equals(cand.and(mask));
        }
    }
}

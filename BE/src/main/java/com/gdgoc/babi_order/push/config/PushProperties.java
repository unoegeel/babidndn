package com.gdgoc.babi_order.push.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.push")
public class PushProperties {

    /** 푸시 발송 활성화 여부 */
    private boolean enabled = true;

    /** VAPID subject (mailto: 또는 https: URL) */
    private String subject = "mailto:admin@babidndn.shop";

    /** VAPID 공개키 (URL-safe Base64) */
    private String publicKey = "";

    /** VAPID 비밀키 (URL-safe Base64) */
    private String privateKey = "";

    public boolean isConfigured() {
        return publicKey != null && !publicKey.isBlank()
                && privateKey != null && !privateKey.isBlank();
    }
}

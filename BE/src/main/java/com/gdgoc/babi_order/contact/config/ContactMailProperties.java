package com.gdgoc.babi_order.contact.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.mail")
public class ContactMailProperties {

    /** 발신 주소 (Gmail SMTP 계정과 동일 권장) */
    private String from = "babidndn.hufs@gmail.com";

    /** 수신 주소 */
    private String to = "leegeonu02@gmail.com";
}
package com.gdgoc.babi_order.admin.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.admin")
public class AdminAccountProperties {

    private String loginId;
    private String password;
    private String developerLoginId;
    private String developerPassword;
}

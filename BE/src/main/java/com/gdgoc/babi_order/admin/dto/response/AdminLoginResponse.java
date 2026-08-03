package com.gdgoc.babi_order.admin.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AdminLoginResponse {

    private String accessToken;
    private String tokenType;
    private long expiresIn;
}

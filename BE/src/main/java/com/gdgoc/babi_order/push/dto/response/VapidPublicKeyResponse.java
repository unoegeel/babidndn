package com.gdgoc.babi_order.push.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Schema(description = "VAPID 공개키 응답")
public class VapidPublicKeyResponse {

    private String publicKey;
}

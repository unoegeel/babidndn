package com.gdgoc.babi_order.push.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Web Push 구독 등록 요청")
public class PushSubscribeRequest {

    @NotBlank(message = "endpoint는 필수입니다.")
    @Schema(description = "PushSubscription.endpoint")
    private String endpoint;

    @NotBlank(message = "p256dh는 필수입니다.")
    @Schema(description = "PushSubscription.getKey('p256dh') Base64")
    private String p256dh;

    @NotBlank(message = "auth는 필수입니다.")
    @Schema(description = "PushSubscription.getKey('auth') Base64")
    private String auth;
}

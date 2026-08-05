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
@Schema(description = "Push 구독과 주문 연결 요청")
public class PushLinkOrderRequest {

    @NotBlank(message = "endpoint는 필수입니다.")
    private String endpoint;

    @NotNull(message = "orderId는 필수입니다.")
    private Long orderId;
}

package com.gdgoc.babi_order.payment.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "결제 취소 요청")
public class PaymentCancelRequest {

    @NotBlank(message = "취소 사유는 필수입니다.")
    @Schema(description = "취소 사유", example = "고객 요청")
    private String cancelReason;
}

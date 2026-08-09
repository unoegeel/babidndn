package com.gdgoc.babi_order.contact.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "서비스 문의 작성 요청")
public class ContactInquiryRequest {

    @NotBlank
    @Size(max = 2000)
    @Schema(description = "문의 내용", example = "결제 후 주문이 안 보여요.")
    private String content;
}

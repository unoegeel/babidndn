package com.gdgoc.babi_order.order.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "주문 생성 요청")
public class OrderCreateRequest {

    @Valid
    @NotEmpty(message = "주문 상품은 하나 이상이어야 합니다.")
    @Schema(description = "주문 상품")
    private List<OrderItemRequest> items;
}

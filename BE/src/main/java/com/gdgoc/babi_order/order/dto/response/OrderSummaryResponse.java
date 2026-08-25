package com.gdgoc.babi_order.order.dto.response;

import com.gdgoc.babi_order.order.entity.Order;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@Schema(description = "주문 요약 정보")
public class OrderSummaryResponse {

    @Schema(description = "주문 ID", example = "1")
    private Long id;

    @Schema(description = "픽업 번호", example = "12")
    private Integer pickupNumber;

    @Schema(description = "주문 상태", example = "PREPARING")
    private String status;

    @Schema(description = "총 결제 금액", example = "8000")
    private Integer totalAmount;

    @Schema(description = "결제 상태 (결제 전이면 UNPAID)", example = "DONE")
    private String paymentStatus;

    @Schema(description = "주문 생성 시각")
    private LocalDateTime createdAt;

    @Schema(description = "대기열 진입 시각 (픽업번호 최초 할당 시점)")
    private LocalDateTime pickupAssignedAt;

    public static OrderSummaryResponse from(Order order, String paymentStatus) {
        return OrderSummaryResponse.builder()
                .id(order.getId())
                .pickupNumber(order.getPickupNumber())
                .status(order.getStatus().name())
                .totalAmount(order.getTotalAmount())
                .paymentStatus(paymentStatus)
                .createdAt(order.getCreatedAt())
                .pickupAssignedAt(order.getPickupAssignedAt())
                .build();
    }
}

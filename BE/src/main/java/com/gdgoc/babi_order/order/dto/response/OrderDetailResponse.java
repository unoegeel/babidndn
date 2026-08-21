package com.gdgoc.babi_order.order.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.gdgoc.babi_order.order.entity.Order;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@Schema(description = "주문 상세 정보")
public class OrderDetailResponse {

    @Schema(description = "주문 ID", example = "1")
    private Long id;

    @Schema(description = "토스 결제용 주문번호", example = "000001-a1b2c3d4")
    private String tossOrderId;

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

    @Schema(description = "주문 수정 시각")
    private LocalDateTime updatedAt;

    @Schema(description = "주문 상품 목록")
    private List<OrderItemResponse> items;

    @Schema(description = "내 앞 대기 주문 수 (진행 중이며 대기번호가 더 빠른 주문)", example = "2")
    private Integer waitingAheadCount;

    /**
     * 고객 주문 접근 raw token.
     * POST /api/orders 생성 응답에만 포함되며, 이후 GET 등에서는 null(미포함).
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @Schema(description = "주문 접근 토큰 (생성 시에만 반환)", example = "dGhpcy1pcy1hLXJhdy10b2tlbg")
    private String accessToken;

    public static OrderDetailResponse from(Order order, String paymentStatus, int waitingAheadCount) {
        return from(order, paymentStatus, waitingAheadCount, null);
    }

    public static OrderDetailResponse from(
            Order order,
            String paymentStatus,
            int waitingAheadCount,
            String accessToken
    ) {
        return OrderDetailResponse.builder()
                .id(order.getId())
                .tossOrderId(order.getTossOrderId())
                .pickupNumber(order.getPickupNumber())
                .status(order.getStatus().name())
                .totalAmount(order.getTotalAmount())
                .paymentStatus(paymentStatus)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .items(order.getItems().stream().map(OrderItemResponse::from).toList())
                .waitingAheadCount(waitingAheadCount)
                .accessToken(accessToken)
                .build();
    }
}

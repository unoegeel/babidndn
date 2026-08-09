package com.gdgoc.babi_order.store.dto.response;

import com.gdgoc.babi_order.store.entity.StoreReview;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@Schema(description = "매장 리뷰 응답")
public class StoreReviewResponse {

    private Long id;
    private String content;
    private LocalDateTime createdAt;

    public static StoreReviewResponse from(StoreReview review) {
        return StoreReviewResponse.builder()
                .id(review.getId())
                .content(review.getContent())
                .createdAt(review.getCreatedAt())
                .build();
    }
}

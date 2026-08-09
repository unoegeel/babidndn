package com.gdgoc.babi_order.store.dto.response;

import com.gdgoc.babi_order.store.entity.PopupAd;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@Schema(description = "팝업 광고 응답")
public class PopupAdResponse {

    private Long id;
    private String imageUrl;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private Boolean enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PopupAdResponse from(PopupAd ad) {
        return PopupAdResponse.builder()
                .id(ad.getId())
                .imageUrl(ad.getImageUrl())
                .startAt(ad.getStartAt())
                .endAt(ad.getEndAt())
                .enabled(ad.getEnabled())
                .createdAt(ad.getCreatedAt())
                .updatedAt(ad.getUpdatedAt())
                .build();
    }
}

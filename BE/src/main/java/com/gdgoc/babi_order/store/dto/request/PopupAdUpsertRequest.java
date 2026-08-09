package com.gdgoc.babi_order.store.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@Schema(description = "팝업 광고 생성/수정 요청")
public class PopupAdUpsertRequest {

    @NotBlank
    @Schema(description = "이미지 URL", example = "https://bucket.s3.ap-northeast-2.amazonaws.com/popup/xxx.jpg")
    private String imageUrl;

    @NotNull
    @Schema(description = "게시 시작 시각 (Asia/Seoul)", example = "2026-08-10T00:00:00")
    private LocalDateTime startAt;

    @NotNull
    @Schema(description = "게시 종료 시각 (Asia/Seoul)", example = "2026-08-17T23:59:59")
    private LocalDateTime endAt;

    @Schema(description = "사용 여부", example = "true")
    private Boolean enabled = true;
}

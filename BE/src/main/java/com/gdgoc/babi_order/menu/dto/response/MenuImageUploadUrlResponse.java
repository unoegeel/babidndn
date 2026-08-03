package com.gdgoc.babi_order.menu.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "메뉴 이미지 업로드용 Presigned URL 응답")
public class MenuImageUploadUrlResponse {

    @Schema(
            description = "이미지 파일을 PUT으로 업로드할 Presigned URL (5분간 유효, 요청한 Content-Type과 동일한 헤더로 PUT해야 함)",
            example = "https://babi-order-images.s3.ap-northeast-2.amazonaws.com/menu/550e8400-e29b-41d4-a716-446655440000.jpg?X-Amz-..."
    )
    private String uploadUrl;

    @Schema(
            description = "업로드 완료 후 메뉴 등록/수정 API의 imageUrl로 사용할 공개 URL",
            example = "https://babi-order-images.s3.ap-northeast-2.amazonaws.com/menu/550e8400-e29b-41d4-a716-446655440000.jpg"
    )
    private String imageUrl;
}

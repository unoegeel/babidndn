package com.gdgoc.babi_order.clientevent.dto;

import com.gdgoc.babi_order.clientevent.ClientEventType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@Schema(description = "Frontend User Event 리포트")
public class ClientEventReportRequest {

    @NotBlank
    @Size(max = 64)
    @Schema(description = "Frontend 생성 eventId (UUID)", example = "550e8400-e29b-41d4-a716-446655440000")
    private String eventId;

    @NotNull
    @Schema(description = "이벤트 유형")
    private ClientEventType eventType;

    @NotNull
    @Schema(description = "이벤트 발생 시각 (ISO-8601)")
    private Instant timestamp;

    @NotBlank
    @Size(max = 64)
    @Pattern(regexp = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
    @Schema(description = "익명 사용자 ID (client key)")
    private String anonymousId;

    @NotBlank
    @Size(max = 64)
    @Pattern(regexp = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
    @Schema(description = "브라우저 세션 ID")
    private String sessionId;

    @NotBlank
    @Size(max = 500)
    @Schema(description = "route pathname", example = "/user/cart")
    private String route;

    @Size(max = 64)
    @Pattern(regexp = "^[A-Za-z0-9_-]{1,64}$")
    @Schema(description = "연관 Backend API requestId")
    private String relatedRequestId;

    @Schema(description = "이벤트별 metadata (primitive 값만)")
    private Map<String, Object> metadata;
}

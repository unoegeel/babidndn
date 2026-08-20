package com.gdgoc.babi_order.clienterror.dto;

import com.gdgoc.babi_order.clienterror.ClientErrorSource;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@Schema(description = "Frontend 클라이언트 오류 리포트")
public class ClientErrorReportRequest {

    @NotNull
    @Schema(description = "오류 발생 시각 (ISO-8601)", example = "2026-08-19T06:00:00Z")
    private Instant timestamp;

    @NotNull
    @Schema(description = "오류 수집 source")
    private ClientErrorSource source;

    @NotBlank
    @Size(max = 200)
    @Schema(description = "Error.name", example = "TypeError")
    private String errorName;

    @NotBlank
    @Size(max = 2000)
    @Schema(description = "오류 메시지")
    private String message;

    @Size(max = 8000)
    @Schema(description = "Error.stack")
    private String stack;

    @Size(max = 8000)
    @Schema(description = "React componentStack")
    private String componentStack;

    @NotBlank
    @Size(max = 500)
    @Schema(description = "현재 route pathname", example = "/user/cart")
    private String route;

    /**
     * Frontend 오류와 연관된 이전 Backend API 요청의 requestId.
     * tracking 요청 자체의 requestId(X-Request-Id)와는 별개입니다.
     */
    @Size(max = 64)
    @Pattern(regexp = "^[A-Za-z0-9_-]{1,64}$")
    @Schema(description = "연관 Backend API requestId", example = "abc-123")
    private String relatedRequestId;

    @Size(max = 500)
    @Schema(description = "navigator.userAgent")
    private String userAgent;

    @Size(max = 100)
    @Schema(description = "브라우저 family", example = "Chrome")
    private String browser;

    @Size(max = 100)
    @Schema(description = "플랫폼", example = "iPhone")
    private String platform;
}

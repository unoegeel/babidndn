package com.gdgoc.babi_order.clienterror;

import com.gdgoc.babi_order.clienterror.dto.ClientErrorReportRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/client-errors")
@RequiredArgsConstructor
@Tag(name = "ClientError", description = "Frontend 클라이언트 오류 수집")
public class ClientErrorController {

    private final ClientErrorService clientErrorService;

    @PostMapping
    @Operation(summary = "Frontend 오류 리포트", description = "익명·관리자 모두 사용 가능. DB 저장 없이 structured log로 기록합니다.")
    public ResponseEntity<Void> report(
            @Valid @RequestBody ClientErrorReportRequest request,
            HttpServletRequest httpRequest
    ) {
        clientErrorService.report(httpRequest, request);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}

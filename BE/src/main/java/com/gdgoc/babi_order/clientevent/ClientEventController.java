package com.gdgoc.babi_order.clientevent;

import com.gdgoc.babi_order.clientevent.dto.ClientEventReportRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/client-events")
@RequiredArgsConstructor
@Tag(name = "ClientEvent", description = "Frontend User Event 수집")
public class ClientEventController {

    private final ClientEventService clientEventService;

    @PostMapping
    @Operation(summary = "User Event 리포트", description = "익명·관리자 모두 사용 가능. DB에 저장합니다.")
    public ResponseEntity<Void> report(@Valid @RequestBody ClientEventReportRequest request) {
        clientEventService.report(request);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}

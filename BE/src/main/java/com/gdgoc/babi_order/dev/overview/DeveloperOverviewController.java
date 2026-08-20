package com.gdgoc.babi_order.dev.overview;

import com.gdgoc.babi_order.dev.overview.dto.DeveloperOverviewResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dev/overview")
@RequiredArgsConstructor
@Tag(name = "DeveloperOverview", description = "Developer Console Dashboard Overview")
public class DeveloperOverviewController {

    private final DeveloperOverviewService developerOverviewService;

    @GetMapping
    @Operation(summary = "Dashboard Overview", description = "오류/요청/이벤트 KPI 및 Analytics funnel 요약")
    public DeveloperOverviewResponse overview() {
        return developerOverviewService.overview();
    }
}

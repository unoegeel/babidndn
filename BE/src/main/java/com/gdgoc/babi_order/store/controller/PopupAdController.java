package com.gdgoc.babi_order.store.controller;

import com.gdgoc.babi_order.store.dto.response.PopupAdResponse;
import com.gdgoc.babi_order.store.service.PopupAdService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/popup-ads")
@RequiredArgsConstructor
@Tag(name = "Popup Ads", description = "유저 팝업 광고 조회 API")
public class PopupAdController {

    private final PopupAdService popupAdService;

    @GetMapping
    @Operation(summary = "등록된 팝업 광고 전체 조회 (공지사항 갤러리)")
    public ResponseEntity<List<PopupAdResponse>> getAll() {
        return ResponseEntity.ok(popupAdService.getAll());
    }

    @GetMapping("/active")
    @Operation(summary = "현재 게시 중인 팝업 광고 조회")
    public ResponseEntity<List<PopupAdResponse>> getActive() {
        return ResponseEntity.ok(popupAdService.getActive());
    }
}

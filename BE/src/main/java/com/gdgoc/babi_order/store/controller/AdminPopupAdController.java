package com.gdgoc.babi_order.store.controller;

import com.gdgoc.babi_order.menu.dto.response.MenuImageUploadUrlResponse;
import com.gdgoc.babi_order.menu.service.MenuImageService;
import com.gdgoc.babi_order.store.dto.request.PopupAdImageUploadUrlRequest;
import com.gdgoc.babi_order.store.dto.request.PopupAdUpsertRequest;
import com.gdgoc.babi_order.store.dto.response.PopupAdResponse;
import com.gdgoc.babi_order.store.service.PopupAdService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/admin/popup-ads")
@RequiredArgsConstructor
@Tag(name = "Admin Popup Ads", description = "관리자 팝업 광고 관리 API")
public class AdminPopupAdController {

    private final PopupAdService popupAdService;
    private final MenuImageService menuImageService;

    @GetMapping
    @Operation(summary = "팝업 광고 목록 조회")
    public ResponseEntity<List<PopupAdResponse>> getAll() {
        return ResponseEntity.ok(popupAdService.getAll());
    }

    @PostMapping
    @Operation(summary = "팝업 광고 등록")
    public ResponseEntity<PopupAdResponse> create(@Valid @RequestBody PopupAdUpsertRequest request) {
        PopupAdResponse response = popupAdService.create(request);
        return ResponseEntity.created(URI.create("/api/admin/popup-ads/" + response.getId()))
                .body(response);
    }

    @PutMapping("/{id}")
    @Operation(summary = "팝업 광고 수정")
    public ResponseEntity<PopupAdResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody PopupAdUpsertRequest request) {
        return ResponseEntity.ok(popupAdService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "팝업 광고 삭제")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        popupAdService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/image-upload-url")
    @Operation(summary = "팝업 광고 이미지 업로드용 Presigned URL 발급")
    public ResponseEntity<MenuImageUploadUrlResponse> createImageUploadUrl(
            @Valid @RequestBody PopupAdImageUploadUrlRequest request) {
        return ResponseEntity.ok(menuImageService.createPopupUploadUrl(request.getContentType()));
    }
}

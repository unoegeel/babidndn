package com.gdgoc.babi_order.menu.controller;

import com.gdgoc.babi_order.menu.dto.request.CategoryOrderUpdateRequest;
import com.gdgoc.babi_order.menu.dto.request.CategoryUpsertRequest;
import com.gdgoc.babi_order.menu.dto.request.MenuImageUploadUrlRequest;
import com.gdgoc.babi_order.menu.dto.request.MenuOptionUpsertRequest;
import com.gdgoc.babi_order.menu.dto.request.MenuSaleStatusUpdateRequest;
import com.gdgoc.babi_order.menu.dto.request.MenuUpsertRequest;
import com.gdgoc.babi_order.menu.dto.response.CategoryMenuResponse;
import com.gdgoc.babi_order.menu.dto.response.CategoryResponse;
import com.gdgoc.babi_order.menu.dto.response.MenuDetailResponse;
import com.gdgoc.babi_order.menu.dto.response.MenuImageUploadUrlResponse;
import com.gdgoc.babi_order.menu.service.AdminMenuService;
import com.gdgoc.babi_order.menu.service.MenuImageService;
import com.gdgoc.babi_order.menu.service.MenuService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin Menu", description = "관리자 메뉴 및 카테고리 관리 API")
public class AdminMenuController {

    private final AdminMenuService adminMenuService;
    private final MenuService menuService;
    private final MenuImageService menuImageService;

    @PostMapping("/menus/image-upload-url")
    @Operation(summary = "메뉴 이미지 업로드용 Presigned URL 발급")
    public ResponseEntity<MenuImageUploadUrlResponse> createMenuImageUploadUrl(
            @Valid @RequestBody MenuImageUploadUrlRequest request) {
        return ResponseEntity.ok(menuImageService.createUploadUrl(request.getContentType()));
    }

    @GetMapping("/categories")
    @Operation(summary = "관리자 카테고리 목록 조회")
    public ResponseEntity<List<CategoryResponse>> getCategories() {
        return ResponseEntity.ok(adminMenuService.getCategories());
    }

    @PutMapping("/categories/order")
    @Operation(summary = "카테고리 표시 순서 변경")
    public ResponseEntity<List<CategoryResponse>> reorderCategories(
            @Valid @RequestBody CategoryOrderUpdateRequest request) {
        return ResponseEntity.ok(adminMenuService.reorderCategories(request.getCategoryIds()));
    }

    @PostMapping("/categories")
    @Operation(summary = "카테고리 등록")
    public ResponseEntity<CategoryResponse> createCategory(
            @Valid @RequestBody CategoryUpsertRequest request) {
        CategoryResponse response = adminMenuService.createCategory(request);
        return ResponseEntity.created(URI.create("/api/admin/categories/" + response.getId()))
                .body(response);
    }

    @PutMapping("/categories/{categoryId}")
    @Operation(summary = "카테고리 수정")
    public ResponseEntity<CategoryResponse> updateCategory(
            @PathVariable Long categoryId,
            @Valid @RequestBody CategoryUpsertRequest request) {
        return ResponseEntity.ok(adminMenuService.updateCategory(categoryId, request));
    }

    @DeleteMapping("/categories/{categoryId}")
    @Operation(summary = "카테고리 삭제")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long categoryId) {
        adminMenuService.deleteCategory(categoryId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/menus")
    @Operation(summary = "관리자 메뉴 목록 조회")
    public ResponseEntity<List<CategoryMenuResponse>> getMenus() {
        return ResponseEntity.ok(menuService.getMenus());
    }

    @GetMapping("/menus/{menuId}")
    @Operation(summary = "관리자 메뉴 상세 조회")
    public ResponseEntity<MenuDetailResponse> getMenu(@PathVariable Long menuId) {
        return ResponseEntity.ok(menuService.getMenu(menuId));
    }

    @PostMapping("/menus")
    @Operation(summary = "메뉴 등록")
    public ResponseEntity<MenuDetailResponse> createMenu(
            @Valid @RequestBody MenuUpsertRequest request) {
        MenuDetailResponse response = adminMenuService.createMenu(request);
        return ResponseEntity.created(URI.create("/api/admin/menus/" + response.getId()))
                .body(response);
    }

    @PutMapping("/menus/{menuId}")
    @Operation(summary = "메뉴 수정")
    public ResponseEntity<MenuDetailResponse> updateMenu(
            @PathVariable Long menuId,
            @Valid @RequestBody MenuUpsertRequest request) {
        return ResponseEntity.ok(adminMenuService.updateMenu(menuId, request));
    }

    @PatchMapping("/menus/{menuId}/sale-status")
    @Operation(summary = "메뉴 판매 상태 변경")
    public ResponseEntity<MenuDetailResponse> updateSaleStatus(
            @PathVariable Long menuId,
            @Valid @RequestBody MenuSaleStatusUpdateRequest request) {
        return ResponseEntity.ok(
                adminMenuService.updateSaleStatus(menuId, request.getSaleStatus()));
    }

    @DeleteMapping("/menus/{menuId}")
    @Operation(summary = "메뉴 삭제")
    public ResponseEntity<Void> deleteMenu(@PathVariable Long menuId) {
        adminMenuService.deleteMenu(menuId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/menus/{menuId}/options")
    @Operation(summary = "메뉴 옵션 등록")
    public ResponseEntity<MenuDetailResponse> createOption(
            @PathVariable Long menuId,
            @Valid @RequestBody MenuOptionUpsertRequest request) {
        return ResponseEntity.status(201).body(adminMenuService.createOption(menuId, request));
    }

    @PutMapping("/menus/{menuId}/options/{optionId}")
    @Operation(summary = "메뉴 옵션 수정")
    public ResponseEntity<MenuDetailResponse> updateOption(
            @PathVariable Long menuId,
            @PathVariable Long optionId,
            @Valid @RequestBody MenuOptionUpsertRequest request) {
        return ResponseEntity.ok(adminMenuService.updateOption(menuId, optionId, request));
    }

    @DeleteMapping("/menus/{menuId}/options/{optionId}")
    @Operation(summary = "메뉴 옵션 삭제")
    public ResponseEntity<Void> deleteOption(
            @PathVariable Long menuId, @PathVariable Long optionId) {
        adminMenuService.deleteOption(menuId, optionId);
        return ResponseEntity.noContent().build();
    }
}

package com.gdgoc.babi_order.menu.controller;

import com.gdgoc.babi_order.menu.dto.response.CategoryMenuResponse;
import com.gdgoc.babi_order.menu.dto.response.MenuDetailResponse;
import com.gdgoc.babi_order.menu.exception.MenuErrorResponse;
import com.gdgoc.babi_order.menu.service.MenuService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/menus")
@RequiredArgsConstructor
@Tag(name = "Menu", description = "메뉴 조회 API")
public class MenuController {

    private final MenuService menuService;

    @GetMapping
    @Operation(summary = "전체 메뉴 조회", description = "카테고리와 메뉴를 표시 순서대로 조회합니다.")
    public ResponseEntity<List<CategoryMenuResponse>> getMenus() {
        return ResponseEntity.ok(menuService.getMenus());
    }

    @GetMapping("/{id}")
    @Operation(summary = "메뉴 상세 조회", description = "메뉴의 상세 정보와 선택 가능한 옵션을 조회합니다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @ApiResponse(
            responseCode = "404",
            description = "메뉴를 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = MenuErrorResponse.class))
    )
    public ResponseEntity<MenuDetailResponse> getMenu(@PathVariable("id") Long id) {
        return ResponseEntity.ok(menuService.getMenu(id));
    }
}

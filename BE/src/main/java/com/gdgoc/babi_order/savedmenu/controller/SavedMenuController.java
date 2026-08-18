package com.gdgoc.babi_order.savedmenu.controller;

import com.gdgoc.babi_order.savedmenu.dto.request.SavedMenuCreateRequest;
import com.gdgoc.babi_order.savedmenu.dto.request.SavedMenuUpdateRequest;
import com.gdgoc.babi_order.savedmenu.dto.response.SavedMenuResponse;
import com.gdgoc.babi_order.savedmenu.service.SavedMenuService;
import com.gdgoc.babi_order.savedmenu.support.ClientKeys;
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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/saved-menus")
@RequiredArgsConstructor
@Tag(name = "SavedMenu", description = "나만의 메뉴 API")
public class SavedMenuController {

    private final SavedMenuService savedMenuService;

    @PostMapping
    @Operation(summary = "나만의 메뉴 등록")
    public ResponseEntity<SavedMenuResponse> create(
            @RequestHeader(value = ClientKeys.HEADER, required = false) String clientKey,
            @Valid @RequestBody SavedMenuCreateRequest request) {
        SavedMenuResponse response = savedMenuService.create(ClientKeys.require(clientKey), request);
        return ResponseEntity.created(URI.create("/api/saved-menus/" + response.getId())).body(response);
    }

    @GetMapping
    @Operation(summary = "나만의 메뉴 목록")
    public ResponseEntity<List<SavedMenuResponse>> getSavedMenus(
            @RequestHeader(value = ClientKeys.HEADER, required = false) String clientKey) {
        return ResponseEntity.ok(savedMenuService.getSavedMenus(ClientKeys.require(clientKey)));
    }

    @GetMapping("/{savedMenuId}")
    @Operation(summary = "나만의 메뉴 상세")
    public ResponseEntity<SavedMenuResponse> getSavedMenu(
            @RequestHeader(value = ClientKeys.HEADER, required = false) String clientKey,
            @PathVariable("savedMenuId") Long savedMenuId) {
        return ResponseEntity.ok(
                savedMenuService.getSavedMenu(ClientKeys.require(clientKey), savedMenuId));
    }

    @PutMapping("/{savedMenuId}")
    @Operation(summary = "나만의 메뉴 수정")
    public ResponseEntity<SavedMenuResponse> update(
            @RequestHeader(value = ClientKeys.HEADER, required = false) String clientKey,
            @PathVariable("savedMenuId") Long savedMenuId,
            @Valid @RequestBody SavedMenuUpdateRequest request) {
        return ResponseEntity.ok(
                savedMenuService.update(ClientKeys.require(clientKey), savedMenuId, request));
    }

    @DeleteMapping("/{savedMenuId}")
    @Operation(summary = "나만의 메뉴 삭제")
    public ResponseEntity<Void> delete(
            @RequestHeader(value = ClientKeys.HEADER, required = false) String clientKey,
            @PathVariable("savedMenuId") Long savedMenuId) {
        savedMenuService.delete(ClientKeys.require(clientKey), savedMenuId);
        return ResponseEntity.noContent().build();
    }
}

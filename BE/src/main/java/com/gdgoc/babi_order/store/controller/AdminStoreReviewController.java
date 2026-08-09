package com.gdgoc.babi_order.store.controller;

import com.gdgoc.babi_order.store.dto.response.StoreReviewResponse;
import com.gdgoc.babi_order.store.service.StoreReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/reviews")
@RequiredArgsConstructor
@Tag(name = "Admin Reviews", description = "관리자 매장 리뷰 조회 API")
public class AdminStoreReviewController {

    private final StoreReviewService storeReviewService;

    @GetMapping
    @Operation(summary = "리뷰(고객 의견) 목록 조회")
    public ResponseEntity<List<StoreReviewResponse>> getAll() {
        return ResponseEntity.ok(storeReviewService.getAll());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "리뷰 삭제")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        storeReviewService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

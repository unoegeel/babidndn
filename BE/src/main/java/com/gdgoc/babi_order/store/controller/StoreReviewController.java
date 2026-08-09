package com.gdgoc.babi_order.store.controller;

import com.gdgoc.babi_order.store.dto.request.StoreReviewCreateRequest;
import com.gdgoc.babi_order.store.dto.response.StoreReviewResponse;
import com.gdgoc.babi_order.store.service.StoreReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@Tag(name = "Reviews", description = "유저 매장 리뷰(고객 의견) 작성 API")
public class StoreReviewController {

    private final StoreReviewService storeReviewService;

    @PostMapping
    @Operation(summary = "리뷰(고객 의견) 작성")
    public ResponseEntity<StoreReviewResponse> create(
            @Valid @RequestBody StoreReviewCreateRequest request) {
        StoreReviewResponse response = storeReviewService.create(request);
        return ResponseEntity.created(URI.create("/api/reviews/" + response.getId()))
                .body(response);
    }
}

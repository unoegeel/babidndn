package com.gdgoc.babi_order.store.service;

import com.gdgoc.babi_order.store.dto.request.StoreReviewCreateRequest;
import com.gdgoc.babi_order.store.dto.response.StoreReviewResponse;
import com.gdgoc.babi_order.store.entity.StoreReview;
import com.gdgoc.babi_order.store.exception.PopupAdApiException;
import com.gdgoc.babi_order.store.repository.StoreReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StoreReviewService {

    private final StoreReviewRepository storeReviewRepository;

    public List<StoreReviewResponse> getAll() {
        return storeReviewRepository.findAllByOrderByCreatedAtDescIdDesc().stream()
                .map(StoreReviewResponse::from)
                .toList();
    }

    @Transactional
    public StoreReviewResponse create(StoreReviewCreateRequest request) {
        String content = request.getContent() != null ? request.getContent().trim() : "";
        if (content.isEmpty()) {
            throw new PopupAdApiException(
                    HttpStatus.BAD_REQUEST,
                    "EMPTY_CONTENT",
                    "의견을 입력해 주세요.");
        }
        StoreReview review = StoreReview.builder().content(content).build();
        return StoreReviewResponse.from(storeReviewRepository.save(review));
    }

    @Transactional
    public void delete(Long id) {
        StoreReview review = storeReviewRepository.findById(id)
                .orElseThrow(() -> new PopupAdApiException(
                        HttpStatus.NOT_FOUND,
                        "REVIEW_NOT_FOUND",
                        "리뷰를 찾을 수 없습니다. id=" + id));
        storeReviewRepository.delete(review);
    }
}

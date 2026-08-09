package com.gdgoc.babi_order.store.service;

import com.gdgoc.babi_order.store.dto.request.PopupAdUpsertRequest;
import com.gdgoc.babi_order.store.dto.response.PopupAdResponse;
import com.gdgoc.babi_order.store.entity.PopupAd;
import com.gdgoc.babi_order.store.exception.PopupAdApiException;
import com.gdgoc.babi_order.store.repository.PopupAdRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PopupAdService {

    private static final ZoneId STORE_ZONE = ZoneId.of("Asia/Seoul");

    private final PopupAdRepository popupAdRepository;

    public List<PopupAdResponse> getAll() {
        return popupAdRepository.findAllByOrderByStartAtDescIdDesc().stream()
                .map(PopupAdResponse::from)
                .toList();
    }

    public List<PopupAdResponse> getActive() {
        LocalDateTime now = LocalDateTime.now(STORE_ZONE);
        return popupAdRepository.findActiveAt(now).stream()
                .map(PopupAdResponse::from)
                .toList();
    }

    @Transactional
    public PopupAdResponse create(PopupAdUpsertRequest request) {
        validatePeriod(request.getStartAt(), request.getEndAt());
        PopupAd ad = PopupAd.builder()
                .imageUrl(request.getImageUrl().trim())
                .startAt(request.getStartAt())
                .endAt(request.getEndAt())
                .enabled(request.getEnabled())
                .build();
        return PopupAdResponse.from(popupAdRepository.save(ad));
    }

    @Transactional
    public PopupAdResponse update(Long id, PopupAdUpsertRequest request) {
        validatePeriod(request.getStartAt(), request.getEndAt());
        PopupAd ad = findOrThrow(id);
        ad.update(
                request.getImageUrl().trim(),
                request.getStartAt(),
                request.getEndAt(),
                request.getEnabled());
        return PopupAdResponse.from(ad);
    }

    @Transactional
    public void delete(Long id) {
        PopupAd ad = findOrThrow(id);
        popupAdRepository.delete(ad);
    }

    private PopupAd findOrThrow(Long id) {
        return popupAdRepository.findById(id)
                .orElseThrow(() -> new PopupAdApiException(
                        HttpStatus.NOT_FOUND,
                        "POPUP_AD_NOT_FOUND",
                        "팝업 광고를 찾을 수 없습니다. id=" + id));
    }

    private void validatePeriod(LocalDateTime startAt, LocalDateTime endAt) {
        if (startAt == null || endAt == null) {
            throw new PopupAdApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_PERIOD",
                    "게시 기간을 입력해 주세요.");
        }
        if (!endAt.isAfter(startAt)) {
            throw new PopupAdApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_PERIOD",
                    "게시 종료 시각은 시작 시각보다 이후여야 합니다.");
        }
    }
}

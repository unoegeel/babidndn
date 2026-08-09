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
public class PopupAdService {

    private static final ZoneId STORE_ZONE = ZoneId.of("Asia/Seoul");

    private final PopupAdRepository popupAdRepository;

    @Transactional
    public List<PopupAdResponse> getAll() {
        disableExpiredAds();
        return popupAdRepository.findAllByOrderByStartAtDescIdDesc().stream()
                .map(PopupAdResponse::from)
                .toList();
    }

    /** 공지사항 갤러리: 사용 중인 광고만 */
    @Transactional
    public List<PopupAdResponse> getEnabled() {
        disableExpiredAds();
        return popupAdRepository.findByEnabledTrueOrderByCreatedAtDescIdDesc().stream()
                .map(PopupAdResponse::from)
                .toList();
    }

    @Transactional
    public List<PopupAdResponse> getActive() {
        disableExpiredAds();
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

    /** 게시 종료가 지난 광고를 사용 안 함으로 전환 */
    private void disableExpiredAds() {
        LocalDateTime now = LocalDateTime.now(STORE_ZONE);
        List<PopupAd> expired = popupAdRepository.findByEnabledTrueAndEndAtBefore(now);
        for (PopupAd ad : expired) {
            ad.disable();
        }
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

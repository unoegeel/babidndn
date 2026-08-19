package com.gdgoc.babi_order.dev.error;

import com.gdgoc.babi_order.backenderror.entity.BackendError;
import com.gdgoc.babi_order.backenderror.repository.BackendErrorRepository;
import com.gdgoc.babi_order.clienterror.entity.ClientError;
import com.gdgoc.babi_order.clienterror.repository.ClientErrorRepository;
import com.gdgoc.babi_order.common.logging.ErrorLogSupport;
import com.gdgoc.babi_order.dev.error.dto.DeveloperErrorDetailResponse;
import com.gdgoc.babi_order.dev.error.dto.DeveloperErrorPageResponse;
import com.gdgoc.babi_order.dev.error.dto.DeveloperErrorSummaryResponse;
import com.gdgoc.babi_order.dev.error.exception.DeveloperErrorApiException;
import com.gdgoc.babi_order.dev.error.support.DeveloperErrorSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeveloperErrorService {

    private static final int MESSAGE_SUMMARY_LENGTH = 120;

    private final ClientErrorRepository clientErrorRepository;
    private final BackendErrorRepository backendErrorRepository;

    public DeveloperErrorPageResponse list(
            DeveloperErrorSource source,
            Integer status,
            Instant from,
            Instant to,
            String requestId,
            String search,
            int page,
            int size
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        boolean includeFrontend = source == null || source == DeveloperErrorSource.FRONTEND;
        boolean includeBackend = source == null || source == DeveloperErrorSource.BACKEND;
        if (status != null) {
            includeFrontend = false;
        }

        Specification<ClientError> clientSpec = DeveloperErrorSpecifications.clientErrors(from, to, requestId, search);
        Specification<BackendError> backendSpec = DeveloperErrorSpecifications.backendErrors(from, to, status, requestId, search);

        long totalFrontend = includeFrontend ? clientErrorRepository.count(clientSpec) : 0L;
        long totalBackend = includeBackend ? backendErrorRepository.count(backendSpec) : 0L;
        long totalElements = totalFrontend + totalBackend;

        if (totalElements == 0) {
            return emptyPage(safePage, safeSize);
        }

        int fetchSize = Math.min((safePage + 1) * safeSize + safeSize, 500);
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");

        List<DeveloperErrorSummaryResponse> merged = new ArrayList<>();
        if (includeFrontend) {
            clientErrorRepository.findAll(clientSpec, PageRequest.of(0, fetchSize, sort))
                    .forEach(error -> merged.add(toFrontendSummary(error)));
        }
        if (includeBackend) {
            backendErrorRepository.findAll(backendSpec, PageRequest.of(0, fetchSize, sort))
                    .forEach(error -> merged.add(toBackendSummary(error)));
        }

        merged.sort(Comparator.comparing(DeveloperErrorSummaryResponse::getCreatedAt).reversed());

        int fromIndex = Math.min(safePage * safeSize, merged.size());
        int toIndex = Math.min(fromIndex + safeSize, merged.size());
        List<DeveloperErrorSummaryResponse> content = merged.subList(fromIndex, toIndex);

        int totalPages = safeSize == 0 ? 0 : (int) Math.ceil((double) totalElements / safeSize);

        return DeveloperErrorPageResponse.builder()
                .content(content)
                .page(safePage)
                .size(safeSize)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .build();
    }

    public DeveloperErrorDetailResponse getDetail(String id) {
        DeveloperErrorId.Parsed parsed = DeveloperErrorId.parse(id);
        return switch (parsed.source()) {
            case FRONTEND -> clientErrorRepository.findById(parsed.numericId())
                    .map(this::toFrontendDetail)
                    .orElseThrow(this::notFound);
            case BACKEND -> backendErrorRepository.findById(parsed.numericId())
                    .map(this::toBackendDetail)
                    .orElseThrow(this::notFound);
        };
    }

    private DeveloperErrorSummaryResponse toFrontendSummary(ClientError error) {
        return DeveloperErrorSummaryResponse.builder()
                .id(DeveloperErrorId.frontendId(error.getId()))
                .source(DeveloperErrorSource.FRONTEND)
                .createdAt(error.getCreatedAt())
                .route(error.getRoute())
                .errorType(error.getErrorName())
                .messageSummary(ErrorLogSupport.messageSummary(error.getMessage(), MESSAGE_SUMMARY_LENGTH))
                .requestId(error.getTrackingRequestId())
                .relatedRequestId(error.getRelatedRequestId())
                .browser(error.getBrowser())
                .build();
    }

    private DeveloperErrorSummaryResponse toBackendSummary(BackendError error) {
        return DeveloperErrorSummaryResponse.builder()
                .id(DeveloperErrorId.backendId(error.getId()))
                .source(DeveloperErrorSource.BACKEND)
                .createdAt(error.getCreatedAt())
                .route(error.getPath())
                .method(error.getMethod())
                .status(error.getStatus())
                .errorType(ErrorLogSupport.simpleExceptionName(error.getExceptionClass()))
                .messageSummary(ErrorLogSupport.messageSummary(error.getMessage(), MESSAGE_SUMMARY_LENGTH))
                .requestId(error.getRequestId())
                .build();
    }

    private DeveloperErrorDetailResponse toFrontendDetail(ClientError error) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        putIfPresent(metadata, "clientSource", error.getSource() != null ? error.getSource().name() : null);
        putIfPresent(metadata, "platform", error.getPlatform());
        putIfPresent(metadata, "userAgent", error.getUserAgent());
        putIfPresent(metadata, "reportedAt", error.getReportedAt());

        String stack = joinStacks(error.getStack(), error.getComponentStack());

        return DeveloperErrorDetailResponse.builder()
                .id(DeveloperErrorId.frontendId(error.getId()))
                .source(DeveloperErrorSource.FRONTEND)
                .createdAt(error.getCreatedAt())
                .requestId(error.getTrackingRequestId())
                .relatedRequestId(error.getRelatedRequestId())
                .route(error.getRoute())
                .errorType(error.getErrorName())
                .message(error.getMessage())
                .stack(stack)
                .browser(error.getBrowser())
                .metadata(metadata.isEmpty() ? null : metadata)
                .build();
    }

    private DeveloperErrorDetailResponse toBackendDetail(BackendError error) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        putIfPresent(metadata, "exceptionClass", error.getExceptionClass());
        putIfPresent(metadata, "durationMs", error.getDurationMs());
        putIfPresent(metadata, "principal", error.getPrincipal());

        return DeveloperErrorDetailResponse.builder()
                .id(DeveloperErrorId.backendId(error.getId()))
                .source(DeveloperErrorSource.BACKEND)
                .createdAt(error.getCreatedAt())
                .requestId(error.getRequestId())
                .route(error.getPath())
                .method(error.getMethod())
                .path(error.getPath())
                .status(error.getStatus())
                .errorType(ErrorLogSupport.simpleExceptionName(error.getExceptionClass()))
                .message(error.getMessage())
                .stack(error.getStackTrace())
                .metadata(metadata.isEmpty() ? null : metadata)
                .build();
    }

    private static String joinStacks(String stack, String componentStack) {
        if (stack == null || stack.isBlank()) {
            return componentStack;
        }
        if (componentStack == null || componentStack.isBlank()) {
            return stack;
        }
        return stack + "\n\n--- component stack ---\n" + componentStack;
    }

    private static void putIfPresent(Map<String, Object> metadata, String key, Object value) {
        if (value != null) {
            metadata.put(key, value);
        }
    }

    private static DeveloperErrorPageResponse emptyPage(int page, int size) {
        return DeveloperErrorPageResponse.builder()
                .content(List.of())
                .page(page)
                .size(size)
                .totalElements(0)
                .totalPages(0)
                .build();
    }

    private DeveloperErrorApiException notFound() {
        return new DeveloperErrorApiException(HttpStatus.NOT_FOUND, "ERROR_NOT_FOUND", "오류를 찾을 수 없습니다.");
    }
}

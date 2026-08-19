package com.gdgoc.babi_order.clientevent;

import com.gdgoc.babi_order.clientevent.dto.ClientEventReportRequest;
import com.gdgoc.babi_order.clientevent.entity.ClientEvent;
import com.gdgoc.babi_order.clientevent.exception.ClientEventApiException;
import com.gdgoc.babi_order.clientevent.repository.ClientEventRepository;
import com.gdgoc.babi_order.clientevent.support.ClientEventMetadataValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class ClientEventService {

    private final ClientEventRepository clientEventRepository;

    @Transactional
    public void report(ClientEventReportRequest request) {
        if (clientEventRepository.existsByEventId(request.getEventId())) {
            return;
        }

        Map<String, Object> metadata = ClientEventMetadataValidator.validateAndNormalize(request.getMetadata());

        ClientEvent entity = new ClientEvent(
                request.getEventId(),
                request.getEventType(),
                request.getTimestamp(),
                request.getAnonymousId(),
                request.getSessionId(),
                request.getRoute(),
                blankToNull(request.getRelatedRequestId()),
                metadata
        );

        try {
            clientEventRepository.save(entity);
        } catch (DataIntegrityViolationException ex) {
            // 동일 eventId 동시 전송 — idempotent 처리
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    static ClientEventApiException invalidRequest(String message) {
        return new ClientEventApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", message);
    }
}

package com.gdgoc.babi_order.httprequest;

import com.gdgoc.babi_order.httprequest.repository.HttpRequestRecordRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RequestRecordServiceTest {

    @Mock
    private HttpRequestRecordRepository httpRequestRecordRepository;

    @InjectMocks
    private RequestRecordService requestRecordService;

    @Test
    void skipsSseStreamPath() {
        HttpServletRequest request = org.mockito.Mockito.mock(HttpServletRequest.class);
        HttpServletResponse response = org.mockito.Mockito.mock(HttpServletResponse.class);

        when(request.getRequestURI()).thenReturn("/api/orders/stream");

        requestRecordService.persistIfApplicable(request, response, System.nanoTime());

        verify(httpRequestRecordRepository, never()).save(any());
    }

    @Test
    void persistsNormalRequest() {
        HttpServletRequest request = org.mockito.Mockito.mock(HttpServletRequest.class);
        HttpServletResponse response = org.mockito.Mockito.mock(HttpServletResponse.class);

        MDC.put("requestId", "req-abc");
        when(request.getRequestURI()).thenReturn("/api/orders");
        when(request.getMethod()).thenReturn("POST");
        when(response.getStatus()).thenReturn(201);
        given(httpRequestRecordRepository.save(any())).willAnswer(invocation -> invocation.getArgument(0));

        requestRecordService.persistIfApplicable(request, response, System.nanoTime() - 2_000_000L);

        ArgumentCaptor<com.gdgoc.babi_order.httprequest.entity.HttpRequestRecord> captor =
                ArgumentCaptor.forClass(com.gdgoc.babi_order.httprequest.entity.HttpRequestRecord.class);
        verify(httpRequestRecordRepository).save(captor.capture());
        assertThat(captor.getValue().getRequestId()).isEqualTo("req-abc");
        assertThat(captor.getValue().getStatus()).isEqualTo(201);
        assertThat(captor.getValue().getDurationMs()).isGreaterThanOrEqualTo(0L);

        MDC.clear();
    }
}

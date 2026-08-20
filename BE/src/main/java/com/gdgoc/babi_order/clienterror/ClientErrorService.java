package com.gdgoc.babi_order.clienterror;

import com.gdgoc.babi_order.clienterror.dto.ClientErrorReportRequest;
import com.gdgoc.babi_order.clienterror.entity.ClientError;
import com.gdgoc.babi_order.clienterror.repository.ClientErrorRepository;
import com.gdgoc.babi_order.common.logging.FrontendErrorLogger;
import com.gdgoc.babi_order.common.request.RequestIdSupport;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ClientErrorService {

    private final ClientErrorRepository clientErrorRepository;

    @Transactional
    public void report(HttpServletRequest request, ClientErrorReportRequest payload) {
        FrontendErrorLogger.logClientError(request, payload);
        clientErrorRepository.save(new ClientError(
                trackingRequestId(request),
                blankToNull(payload.getRelatedRequestId()),
                payload.getSource(),
                payload.getErrorName(),
                payload.getMessage(),
                payload.getStack(),
                payload.getComponentStack(),
                payload.getRoute(),
                payload.getUserAgent(),
                payload.getBrowser(),
                payload.getPlatform(),
                payload.getTimestamp()
        ));
    }

    private static String trackingRequestId(HttpServletRequest request) {
        String fromMdc = MDC.get(RequestIdSupport.MDC_KEY);
        if (fromMdc != null) {
            return fromMdc;
        }
        return RequestIdSupport.resolve(request.getHeader(RequestIdSupport.HEADER_NAME));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}

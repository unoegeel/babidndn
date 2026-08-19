package com.gdgoc.babi_order.clienterror;

import com.gdgoc.babi_order.clienterror.dto.ClientErrorReportRequest;
import com.gdgoc.babi_order.common.logging.FrontendErrorLogger;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ClientErrorService {

    public void report(HttpServletRequest request, ClientErrorReportRequest payload) {
        FrontendErrorLogger.logClientError(request, payload);
    }
}

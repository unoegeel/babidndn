package com.gdgoc.babi_order.common.request;

import com.gdgoc.babi_order.httprequest.RequestRecordService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class RequestIdFilterTest {

    @Mock
    private RequestRecordService requestRecordService;

    private RequestIdFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RequestIdFilter(requestRecordService);
    }

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    void generatesRequestIdWhenHeaderMissing() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/menus");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, noopChain());

        assertThat(response.getHeader(RequestIdSupport.HEADER_NAME)).isNotBlank();
        assertThat(MDC.get(RequestIdSupport.MDC_KEY)).isNull();
        verify(requestRecordService).complete(any(), any(), anyLong());
    }

    @Test
    void reusesValidExternalRequestId() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/menus");
        request.addHeader(RequestIdSupport.HEADER_NAME, "client-request-id-01");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, noopChain());

        assertThat(response.getHeader(RequestIdSupport.HEADER_NAME)).isEqualTo("client-request-id-01");
        assertThat(MDC.get(RequestIdSupport.MDC_KEY)).isNull();
    }

    @Test
    void replacesInvalidRequestId() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/menus");
        request.addHeader(RequestIdSupport.HEADER_NAME, "invalid id with spaces");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, noopChain());

        assertThat(response.getHeader(RequestIdSupport.HEADER_NAME))
                .isNotEqualTo("invalid id with spaces")
                .matches("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");
        assertThat(MDC.get(RequestIdSupport.MDC_KEY)).isNull();
    }

    @Test
    void mdcDoesNotLeakBetweenRequests() throws ServletException, IOException {
        MockHttpServletRequest first = new MockHttpServletRequest("GET", "/api/menus");
        first.addHeader(RequestIdSupport.HEADER_NAME, "first-request-id");
        MockHttpServletResponse firstResponse = new MockHttpServletResponse();
        filter.doFilter(first, firstResponse, noopChain());
        assertThat(MDC.get(RequestIdSupport.MDC_KEY)).isNull();

        MockHttpServletRequest second = new MockHttpServletRequest("GET", "/api/menus");
        second.addHeader(RequestIdSupport.HEADER_NAME, "second-request-id");
        MockHttpServletResponse secondResponse = new MockHttpServletResponse();
        filter.doFilter(second, secondResponse, noopChain());

        assertThat(secondResponse.getHeader(RequestIdSupport.HEADER_NAME)).isEqualTo("second-request-id");
        assertThat(MDC.get(RequestIdSupport.MDC_KEY)).isNull();
    }

    private FilterChain noopChain() {
        return (req, res) -> ((MockHttpServletResponse) res).setStatus(200);
    }
}

package com.gdgoc.babi_order.testsupport;

import com.gdgoc.babi_order.backenderror.BackendErrorRecordService;
import com.gdgoc.babi_order.httprequest.RequestRecordService;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import static org.mockito.Mockito.mock;

/**
 * WebMvc slice 공통 mock.
 *
 * <p>{@code ApiExceptionHandler}는 {@code @RestControllerAdvice}라 WebMvcTest에 자동 포함되며
 * {@code BackendErrorRecordService}가 필요하다. {@code RequestIdFilterConfig}를 Import하는
 * 테스트는 {@code RequestRecordService}도 필요하다.
 */
@TestConfiguration
public class WebMvcSliceTestConfig {

    @Bean
    @Primary
    BackendErrorRecordService backendErrorRecordService() {
        return mock(BackendErrorRecordService.class);
    }

    @Bean
    @Primary
    RequestRecordService requestRecordService() {
        return mock(RequestRecordService.class);
    }
}

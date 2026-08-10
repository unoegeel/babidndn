package com.gdgoc.babi_order.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 도메인 API 예외의 공통 기반.
 * 도메인별 코드/메시지는 하위 타입 또는 생성자 인자로 유지합니다.
 */
@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

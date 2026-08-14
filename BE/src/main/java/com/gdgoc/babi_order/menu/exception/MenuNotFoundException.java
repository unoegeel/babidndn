package com.gdgoc.babi_order.menu.exception;

import com.gdgoc.babi_order.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public class MenuNotFoundException extends ApiException {

    public MenuNotFoundException(Long menuId) {
        super(HttpStatus.NOT_FOUND, "MENU_NOT_FOUND", "메뉴를 찾을 수 없습니다. id=" + menuId);
    }
}

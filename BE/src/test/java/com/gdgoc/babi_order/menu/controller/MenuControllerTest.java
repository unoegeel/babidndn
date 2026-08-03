package com.gdgoc.babi_order.menu.controller;

import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
import com.gdgoc.babi_order.menu.dto.response.CategoryMenuResponse;
import com.gdgoc.babi_order.menu.dto.response.MenuDetailResponse;
import com.gdgoc.babi_order.menu.exception.MenuExceptionHandler;
import com.gdgoc.babi_order.menu.exception.MenuNotFoundException;
import com.gdgoc.babi_order.menu.service.MenuService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MenuController.class)
@Import({SecurityConfig.class, CorsProperties.class, MenuExceptionHandler.class})
class MenuControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MenuService menuService;

    @Test
    void getMenusReturnsCategories() throws Exception {
        CategoryMenuResponse response = CategoryMenuResponse.builder()
                .categoryId(1L)
                .categoryName("밥류")
                .displayOrder(1)
                .menus(List.of())
                .build();
        given(menuService.getMenus()).willReturn(List.of(response));

        mockMvc.perform(get("/api/menus"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].categoryId").value(1))
                .andExpect(jsonPath("$[0].categoryName").value("밥류"))
                .andExpect(jsonPath("$[0].menus").isArray());
    }

    @Test
    void getMenuReturnsMenuDetail() throws Exception {
        MenuDetailResponse response = MenuDetailResponse.builder()
                .id(1L)
                .categoryId(1L)
                .categoryName("밥류")
                .name("바비 비빔밥")
                .basePrice(8000)
                .saleStatus("AVAILABLE")
                .options(List.of())
                .build();
        given(menuService.getMenu(1L)).willReturn(response);

        mockMvc.perform(get("/api/menus/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("바비 비빔밥"))
                .andExpect(jsonPath("$.saleStatus").value("AVAILABLE"))
                .andExpect(jsonPath("$.options").isArray());
    }

    @Test
    void getMenuReturnsNotFoundWhenMenuDoesNotExist() throws Exception {
        given(menuService.getMenu(999L)).willThrow(new MenuNotFoundException(999L));

        mockMvc.perform(get("/api/menus/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.code").value("MENU_NOT_FOUND"));
    }
}

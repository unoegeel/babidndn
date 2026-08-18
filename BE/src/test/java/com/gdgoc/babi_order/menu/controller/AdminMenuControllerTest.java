package com.gdgoc.babi_order.menu.controller;

import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
import com.gdgoc.babi_order.admin.security.AdminAuthenticationEntryPoint;
import com.gdgoc.babi_order.common.exception.ApiExceptionHandler;
import com.gdgoc.babi_order.menu.dto.response.CategoryResponse;
import com.gdgoc.babi_order.menu.dto.response.MenuDetailResponse;
import com.gdgoc.babi_order.menu.dto.response.MenuSummaryResponse;
import com.gdgoc.babi_order.menu.exception.MenuApiException;
import com.gdgoc.babi_order.menu.exception.MenuExceptionHandler;
import com.gdgoc.babi_order.menu.service.AdminMenuService;
import com.gdgoc.babi_order.menu.service.MenuImageService;
import com.gdgoc.babi_order.menu.service.MenuService;
import org.springframework.http.HttpStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminMenuController.class)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        MenuExceptionHandler.class,
        ApiExceptionHandler.class,
        AdminAuthenticationEntryPoint.class
})
@WithMockUser(roles = "ADMIN")
class AdminMenuControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminMenuService adminMenuService;

    @MockitoBean
    private MenuService menuService;

    @MockitoBean
    private MenuImageService menuImageService;

    @Test
    void createCategoryReturnsCreated() throws Exception {
        given(adminMenuService.createCategory(any())).willReturn(CategoryResponse.builder()
                .id(1L)
                .name("컵밥")
                .displayOrder(1)
                .build());

        mockMvc.perform(post("/api/admin/categories")
                        .contentType("application/json")
                        .content("""
                                {
                                  "name": "컵밥",
                                  "displayOrder": 1
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/admin/categories/1"))
                .andExpect(jsonPath("$.name").value("컵밥"));
    }

    @Test
    void reorderCategoriesReturnsUpdatedOrder() throws Exception {
        given(adminMenuService.reorderCategories(List.of(3L, 1L, 2L))).willReturn(List.of(
                CategoryResponse.builder().id(3L).name("음료").displayOrder(1).build(),
                CategoryResponse.builder().id(1L).name("밥류").displayOrder(2).build(),
                CategoryResponse.builder().id(2L).name("사이드").displayOrder(3).build()
        ));

        mockMvc.perform(put("/api/admin/categories/order")
                        .contentType("application/json")
                        .content("""
                                {
                                  "categoryIds": [3, 1, 2]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(3))
                .andExpect(jsonPath("$[0].displayOrder").value(1))
                .andExpect(jsonPath("$[1].id").value(1))
                .andExpect(jsonPath("$[2].id").value(2));
    }

    @Test
    void reorderCategoriesRejectsEmptyList() throws Exception {
        mockMvc.perform(put("/api/admin/categories/order")
                        .contentType("application/json")
                        .content("""
                                {
                                  "categoryIds": []
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void reorderCategoriesRejectsDuplicateIds() throws Exception {
        given(adminMenuService.reorderCategories(List.of(1L, 2L, 2L)))
                .willThrow(new MenuApiException(
                        HttpStatus.BAD_REQUEST,
                        "INVALID_REQUEST",
                        "카테고리 ID 목록에 중복된 값이 있습니다. id=2"
                ));

        mockMvc.perform(put("/api/admin/categories/order")
                        .contentType("application/json")
                        .content("""
                                {
                                  "categoryIds": [1, 2, 2]
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void reorderCategoriesRejectsUnknownId() throws Exception {
        given(adminMenuService.reorderCategories(List.of(1L, 2L, 999L)))
                .willThrow(new MenuApiException(
                        HttpStatus.NOT_FOUND,
                        "CATEGORY_NOT_FOUND",
                        "카테고리를 찾을 수 없습니다. id=999"
                ));

        mockMvc.perform(put("/api/admin/categories/order")
                        .contentType("application/json")
                        .content("""
                                {
                                  "categoryIds": [1, 2, 999]
                                }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CATEGORY_NOT_FOUND"));
    }

    @Test
    void reorderCategoriesRejectsMissingIds() throws Exception {
        given(adminMenuService.reorderCategories(List.of(1L, 3L)))
                .willThrow(new MenuApiException(
                        HttpStatus.BAD_REQUEST,
                        "INVALID_REQUEST",
                        "모든 카테고리 ID를 한 번씩 포함해야 합니다."
                ));

        mockMvc.perform(put("/api/admin/categories/order")
                        .contentType("application/json")
                        .content("""
                                {
                                  "categoryIds": [1, 3]
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void reorderMenusReturnsUpdatedOrder() throws Exception {
        given(adminMenuService.reorderMenus(any())).willReturn(List.of(
                MenuSummaryResponse.builder().id(3L).name("제육").displayOrder(1).build(),
                MenuSummaryResponse.builder().id(1L).name("삼겹소금").displayOrder(2).build(),
                MenuSummaryResponse.builder().id(2L).name("참치마요").displayOrder(3).build()
        ));

        mockMvc.perform(put("/api/admin/menus/order")
                        .contentType("application/json")
                        .content("""
                                {
                                  "categoryId": 1,
                                  "menuIds": [3, 1, 2]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(3))
                .andExpect(jsonPath("$[0].displayOrder").value(1))
                .andExpect(jsonPath("$[1].id").value(1))
                .andExpect(jsonPath("$[2].id").value(2));
    }

    @Test
    void reorderMenusRejectsEmptyList() throws Exception {
        mockMvc.perform(put("/api/admin/menus/order")
                        .contentType("application/json")
                        .content("""
                                {
                                  "categoryId": 1,
                                  "menuIds": []
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void reorderMenusRejectsDuplicateIds() throws Exception {
        given(adminMenuService.reorderMenus(any()))
                .willThrow(new MenuApiException(
                        HttpStatus.BAD_REQUEST,
                        "INVALID_REQUEST",
                        "메뉴 ID 목록에 중복된 값이 있습니다. id=2"
                ));

        mockMvc.perform(put("/api/admin/menus/order")
                        .contentType("application/json")
                        .content("""
                                {
                                  "categoryId": 1,
                                  "menuIds": [1, 2, 2]
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void reorderMenusRejectsUnknownMenuId() throws Exception {
        given(adminMenuService.reorderMenus(any()))
                .willThrow(new com.gdgoc.babi_order.menu.exception.MenuNotFoundException(999L));

        mockMvc.perform(put("/api/admin/menus/order")
                        .contentType("application/json")
                        .content("""
                                {
                                  "categoryId": 1,
                                  "menuIds": [1, 2, 999]
                                }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MENU_NOT_FOUND"));
    }

    @Test
    void reorderMenusRejectsUnknownCategoryId() throws Exception {
        given(adminMenuService.reorderMenus(any()))
                .willThrow(new MenuApiException(
                        HttpStatus.NOT_FOUND,
                        "CATEGORY_NOT_FOUND",
                        "카테고리를 찾을 수 없습니다. id=999"
                ));

        mockMvc.perform(put("/api/admin/menus/order")
                        .contentType("application/json")
                        .content("""
                                {
                                  "categoryId": 999,
                                  "menuIds": [1, 2]
                                }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CATEGORY_NOT_FOUND"));
    }

    @Test
    void createCategoryRejectsBlankName() throws Exception {
        mockMvc.perform(post("/api/admin/categories")
                        .contentType("application/json")
                        .content("""
                                {
                                  "name": " ",
                                  "displayOrder": 1
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void createMenuReturnsCreated() throws Exception {
        given(adminMenuService.createMenu(any())).willReturn(MenuDetailResponse.builder()
                .id(10L)
                .categoryId(1L)
                .categoryName("컵밥")
                .name("삼겹소금")
                .basePrice(3500)
                .displayOrder(1)
                .saleStatus("AVAILABLE")
                .options(List.of())
                .build());

        mockMvc.perform(post("/api/admin/menus")
                        .contentType("application/json")
                        .content("""
                                {
                                  "categoryId": 1,
                                  "name": "삼겹소금",
                                  "basePrice": 3500,
                                  "displayOrder": 1,
                                  "saleStatus": "AVAILABLE",
                                  "toppingEnabled": true,
                                  "badge": "NONE"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/admin/menus/10"))
                .andExpect(jsonPath("$.name").value("삼겹소금"));
    }

    @Test
    void updateSaleStatusReturnsUpdatedMenu() throws Exception {
        given(adminMenuService.updateSaleStatus(eq(10L), any()))
                .willReturn(MenuDetailResponse.builder()
                        .id(10L)
                        .categoryId(1L)
                        .categoryName("컵밥")
                        .name("삼겹소금")
                        .basePrice(3500)
                        .displayOrder(1)
                        .saleStatus("SOLDOUT")
                        .options(List.of())
                        .build());

        mockMvc.perform(patch("/api/admin/menus/10/sale-status")
                        .contentType("application/json")
                        .content("{\"saleStatus\":\"SOLDOUT\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saleStatus").value("SOLDOUT"));
    }

    @Test
    void deleteMenuReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/admin/menus/10"))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithAnonymousUser
    void adminApiRequiresAuthentication() throws Exception {
        mockMvc.perform(delete("/api/admin/menus/10"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }
}

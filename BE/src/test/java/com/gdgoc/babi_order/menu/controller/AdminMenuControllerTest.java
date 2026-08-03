package com.gdgoc.babi_order.menu.controller;

import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
import com.gdgoc.babi_order.admin.security.AdminAuthenticationEntryPoint;
import com.gdgoc.babi_order.menu.dto.response.CategoryResponse;
import com.gdgoc.babi_order.menu.dto.response.MenuDetailResponse;
import com.gdgoc.babi_order.menu.exception.MenuExceptionHandler;
import com.gdgoc.babi_order.menu.service.AdminMenuService;
import com.gdgoc.babi_order.menu.service.MenuImageService;
import com.gdgoc.babi_order.menu.service.MenuService;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminMenuController.class)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        MenuExceptionHandler.class,
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
                                  "toppingEnabled": true
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

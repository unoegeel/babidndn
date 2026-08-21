package com.gdgoc.babi_order.savedmenu.controller;

import com.gdgoc.babi_order.common.exception.ApiExceptionHandler;
import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
import com.gdgoc.babi_order.savedmenu.dto.response.SavedMenuResponse;
import com.gdgoc.babi_order.savedmenu.exception.SavedMenuApiException;
import com.gdgoc.babi_order.savedmenu.exception.SavedMenuExceptionHandler;
import com.gdgoc.babi_order.savedmenu.service.SavedMenuService;
import com.gdgoc.babi_order.testsupport.WebMvcSliceTestConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SavedMenuController.class)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        SavedMenuExceptionHandler.class,
        ApiExceptionHandler.class,
        WebMvcSliceTestConfig.class
})
class SavedMenuControllerTest {

    private static final String CLIENT_A = "11111111-1111-1111-1111-111111111111";
    private static final String CLIENT_B = "22222222-2222-2222-2222-222222222222";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SavedMenuService savedMenuService;

    @Test
    void createReturnsCreated() throws Exception {
        given(savedMenuService.create(eq(CLIENT_A), any())).willReturn(SavedMenuResponse.builder()
                .id(1L)
                .customName("내 최애 우동")
                .menuId(10L)
                .menuName("참치불닭비빔우동")
                .menuPrice(5500)
                .status("AVAILABLE")
                .options(List.of())
                .build());

        mockMvc.perform(post("/api/saved-menus")
                        .header("X-Client-Key", CLIENT_A)
                        .contentType("application/json")
                        .content("""
                                {
                                  "menuId": 10,
                                  "customName": "내 최애 우동",
                                  "options": [{"menuOptionId": 417, "quantity": 1}]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/saved-menus/1"))
                .andExpect(jsonPath("$.customName").value("내 최애 우동"))
                .andExpect(jsonPath("$.status").value("AVAILABLE"));
    }

    @Test
    void createRejectsMissingClientKey() throws Exception {
        mockMvc.perform(post("/api/saved-menus")
                        .contentType("application/json")
                        .content("""
                                {
                                  "menuId": 10,
                                  "customName": "내 최애 우동",
                                  "options": []
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MISSING_CLIENT_KEY"));
        verify(savedMenuService, never()).create(any(), any());
    }

    @Test
    void getSavedMenusUsesClientKey() throws Exception {
        given(savedMenuService.getSavedMenus(CLIENT_A)).willReturn(List.of());

        mockMvc.perform(get("/api/saved-menus").header("X-Client-Key", CLIENT_A))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getSavedMenuRejectsOtherClient() throws Exception {
        given(savedMenuService.getSavedMenu(CLIENT_B, 1L)).willThrow(new SavedMenuApiException(
                HttpStatus.NOT_FOUND, "SAVED_MENU_NOT_FOUND", "나만의 메뉴를 찾을 수 없습니다. id=1"));

        mockMvc.perform(get("/api/saved-menus/1").header("X-Client-Key", CLIENT_B))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SAVED_MENU_NOT_FOUND"));
    }

    @Test
    void updateReturnsOk() throws Exception {
        given(savedMenuService.update(eq(CLIENT_A), eq(1L), any())).willReturn(SavedMenuResponse.builder()
                .id(1L)
                .customName("내 최애 우동")
                .menuId(10L)
                .menuName("참치불닭비빔우동")
                .menuPrice(5500)
                .status("AVAILABLE")
                .options(List.of())
                .build());

        mockMvc.perform(put("/api/saved-menus/1")
                        .header("X-Client-Key", CLIENT_A)
                        .contentType("application/json")
                        .content("""
                                {
                                  "customName": "내 최애 우동",
                                  "options": [{"menuOptionId": 418, "quantity": 1}]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AVAILABLE"));
    }

    @Test
    void deleteReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/saved-menus/1").header("X-Client-Key", CLIENT_A))
                .andExpect(status().isNoContent());
        verify(savedMenuService).delete(CLIENT_A, 1L);
    }
}

package com.gdgoc.babi_order.menu.service;

import com.gdgoc.babi_order.menu.dto.response.CategoryMenuResponse;
import com.gdgoc.babi_order.menu.dto.response.MenuDetailResponse;
import com.gdgoc.babi_order.menu.entity.Category;
import com.gdgoc.babi_order.menu.entity.Menu;
import com.gdgoc.babi_order.menu.entity.MenuOption;
import com.gdgoc.babi_order.menu.entity.OptionGroupType;
import com.gdgoc.babi_order.menu.entity.SaleStatus;
import com.gdgoc.babi_order.menu.exception.MenuNotFoundException;
import com.gdgoc.babi_order.menu.repository.CategoryRepository;
import com.gdgoc.babi_order.menu.repository.MenuOptionRepository;
import com.gdgoc.babi_order.menu.repository.MenuRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class MenuServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private MenuRepository menuRepository;

    @Mock
    private MenuOptionRepository menuOptionRepository;

    @Mock
    private AdminMenuService adminMenuService;

    private MenuService menuService;

    @BeforeEach
    void setUp() {
        menuService = new MenuService(
                categoryRepository, menuRepository, menuOptionRepository, adminMenuService);
    }

    @Test
    void getMenusGroupsMenusByCategory() {
        Category category = category(1L, "밥류", 1);
        Menu menu = menu(1L, category);
        given(categoryRepository.findAllByOrderByDisplayOrderAscIdAsc()).willReturn(List.of(category));
        given(menuRepository.findAllByOrderByCategoryDisplayOrderAscDisplayOrderAscIdAsc())
                .willReturn(List.of(menu));

        List<CategoryMenuResponse> result = menuService.getMenus();

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getCategoryName()).isEqualTo("밥류");
        assertThat(result.getFirst().getMenus()).hasSize(1);
        assertThat(result.getFirst().getMenus().getFirst().getName()).isEqualTo("바비 비빔밥");
    }

    @Test
    void getMenuReturnsDetailWithOptions() {
        Category category = category(1L, "밥류", 1);
        Menu menu = menu(1L, category);
        MenuOption option = MenuOption.builder()
                .menu(menu)
                .groupType(OptionGroupType.SIZE)
                .name("곱빼기")
                .additionalPrice(1000)
                .maxQuantity(1)
                .defaultSelected(false)
                .displayOrder(1)
                .build();
        ReflectionTestUtils.setField(option, "id", 1L);
        given(menuRepository.findWithCategoryById(1L)).willReturn(Optional.of(menu));
        given(menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(1L))
                .willReturn(List.of(option));

        MenuDetailResponse result = menuService.getMenu(1L);

        assertThat(result.getName()).isEqualTo("바비 비빔밥");
        assertThat(result.getOptions()).hasSize(1);
        assertThat(result.getOptions().getFirst().getGroupType()).isEqualTo("SIZE");
    }

    @Test
    void getMenuThrowsExceptionWhenMenuDoesNotExist() {
        given(menuRepository.findWithCategoryById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> menuService.getMenu(999L))
                .isInstanceOf(MenuNotFoundException.class)
                .hasMessageContaining("999");
    }

    private Category category(Long id, String name, Integer displayOrder) {
        Category category = Category.builder()
                .name(name)
                .displayOrder(displayOrder)
                .build();
        ReflectionTestUtils.setField(category, "id", id);
        return category;
    }

    private Menu menu(Long id, Category category) {
        Menu menu = Menu.builder()
                .category(category)
                .name("바비 비빔밥")
                .description("신선한 재료로 만든 비빔밥")
                .basePrice(8000)
                .imageUrl("https://example.com/menu.jpg")
                .displayOrder(1)
                .saleStatus(SaleStatus.AVAILABLE)
                .build();
        ReflectionTestUtils.setField(menu, "id", id);
        return menu;
    }
}

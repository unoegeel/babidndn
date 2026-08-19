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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

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
        verify(adminMenuService, never()).ensureDefaultOptions(any());
    }

    @Test
    void getMenuHealsDefaultOptionsForCupbapCategory() {
        Category category = category(1L, "컵밥", 1);
        Menu menu = menu(1L, category);
        MenuOption option = MenuOption.builder()
                .menu(menu)
                .groupType(OptionGroupType.TOPPING_ADD)
                .name("계란후라이")
                .additionalPrice(700)
                .maxQuantity(3)
                .defaultSelected(false)
                .displayOrder(1)
                .build();
        ReflectionTestUtils.setField(option, "id", 1L);
        given(menuRepository.findWithCategoryById(1L)).willReturn(Optional.of(menu));
        given(menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(1L))
                .willReturn(List.of(option));

        MenuDetailResponse result = menuService.getMenu(1L);

        verify(adminMenuService).ensureDefaultOptions(menu);
        assertThat(result.isToppingEnabled()).isTrue();
    }

    @Test
    void getMenuDoesNotHealDefaultOptionsForNoodleCategory() {
        Category category = category(2L, "면", 2);
        Menu menu = Menu.builder()
                .category(category)
                .name("참치불닭비빔우동")
                .basePrice(5500)
                .displayOrder(3)
                .saleStatus(SaleStatus.AVAILABLE)
                .build();
        ReflectionTestUtils.setField(menu, "id", 11L);
        MenuOption option = MenuOption.builder()
                .menu(menu)
                .groupType(OptionGroupType.TOPPING_REMOVE)
                .name("불닭소스 제외")
                .additionalPrice(0)
                .maxQuantity(1)
                .defaultSelected(false)
                .displayOrder(1)
                .build();
        ReflectionTestUtils.setField(option, "id", 101L);
        given(menuRepository.findWithCategoryById(11L)).willReturn(Optional.of(menu));
        given(menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(11L))
                .willReturn(List.of(option));

        MenuDetailResponse result = menuService.getMenu(11L);

        verify(adminMenuService, never()).ensureDefaultOptions(any());
        assertThat(result.getName()).isEqualTo("참치불닭비빔우동");
        assertThat(result.isToppingEnabled()).isTrue();
        assertThat(result.getOptions()).extracting(optionResponse -> optionResponse.getName())
                .containsExactly("불닭소스 제외");
    }

    @Test
    void getMenuReportsToppingEnabledWhenOnlyToppingRemovesExist() {
        Category category = category(2L, "면", 2);
        Menu menu = Menu.builder()
                .category(category)
                .name("참치불닭비빔우동")
                .basePrice(5500)
                .displayOrder(3)
                .saleStatus(SaleStatus.AVAILABLE)
                .build();
        ReflectionTestUtils.setField(menu, "id", 11L);
        MenuOption sauce = MenuOption.builder()
                .menu(menu)
                .groupType(OptionGroupType.TOPPING_REMOVE)
                .name("불닭소스 제외")
                .additionalPrice(0)
                .maxQuantity(1)
                .defaultSelected(false)
                .displayOrder(1)
                .build();
        MenuOption seaweed = MenuOption.builder()
                .menu(menu)
                .groupType(OptionGroupType.TOPPING_REMOVE)
                .name("김가루 제외")
                .additionalPrice(0)
                .maxQuantity(1)
                .defaultSelected(false)
                .displayOrder(2)
                .build();
        MenuOption greenOnion = MenuOption.builder()
                .menu(menu)
                .groupType(OptionGroupType.TOPPING_REMOVE)
                .name("파 제외")
                .additionalPrice(0)
                .maxQuantity(1)
                .defaultSelected(false)
                .displayOrder(3)
                .build();
        ReflectionTestUtils.setField(sauce, "id", 101L);
        ReflectionTestUtils.setField(seaweed, "id", 102L);
        ReflectionTestUtils.setField(greenOnion, "id", 103L);
        given(menuRepository.findWithCategoryById(11L)).willReturn(Optional.of(menu));
        given(menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(11L))
                .willReturn(List.of(sauce, seaweed, greenOnion));

        MenuDetailResponse result = menuService.getMenu(11L);

        verify(adminMenuService, never()).ensureDefaultOptions(any());
        assertThat(result.isToppingEnabled()).isTrue();
        assertThat(result.getOptions()).extracting(optionResponse -> optionResponse.getName())
                .containsExactly("불닭소스 제외", "김가루 제외", "파 제외");
    }

    @Test
    void getMenuHealsNaengmomilLeftoverCupbapOptions() {
        Category category = category(3L, "세트", 3);
        Menu menu = Menu.builder()
                .category(category)
                .name("세트 냉모밀")
                .basePrice(8000)
                .displayOrder(1)
                .saleStatus(SaleStatus.AVAILABLE)
                .build();
        ReflectionTestUtils.setField(menu, "id", 12L);
        MenuOption size = MenuOption.builder()
                .menu(menu)
                .groupType(OptionGroupType.SIZE)
                .name("싱글")
                .additionalPrice(0)
                .maxQuantity(1)
                .defaultSelected(true)
                .displayOrder(1)
                .build();
        MenuOption packaging = MenuOption.builder()
                .menu(menu)
                .groupType(OptionGroupType.PACKAGING)
                .name("매장")
                .additionalPrice(0)
                .maxQuantity(1)
                .defaultSelected(true)
                .displayOrder(1)
                .build();
        given(menuRepository.findWithCategoryById(12L)).willReturn(Optional.of(menu));
        given(menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(12L))
                .willReturn(List.of(size), List.of(packaging));

        MenuDetailResponse result = menuService.getMenu(12L);

        verify(adminMenuService).healNaengmomilOptions(menu);
        verify(adminMenuService, never()).ensureDefaultOptions(any());
        assertThat(result.isToppingEnabled()).isTrue();
        assertThat(result.getOptions()).extracting(optionResponse -> optionResponse.getName())
                .containsExactly("매장");
    }

    @Test
    void getMenuDoesNotHealNaengmomilWithoutOptions() {
        Category category = category(2L, "우동", 2);
        Menu menu = Menu.builder()
                .category(category)
                .name("냉모밀")
                .basePrice(5500)
                .displayOrder(1)
                .saleStatus(SaleStatus.AVAILABLE)
                .build();
        ReflectionTestUtils.setField(menu, "id", 11L);
        given(menuRepository.findWithCategoryById(11L)).willReturn(Optional.of(menu));
        given(menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(11L))
                .willReturn(List.of());

        MenuDetailResponse result = menuService.getMenu(11L);

        verify(adminMenuService, never()).healNaengmomilOptions(any());
        verify(adminMenuService, never()).ensureDefaultOptions(any());
        assertThat(result.isToppingEnabled()).isFalse();
        assertThat(result.getOptions()).isEmpty();
    }

    @Test
    void getMenuReportsToppingEnabledWhenOnlyPackagingExists() {
        Category category = category(2L, "우동", 2);
        Menu menu = Menu.builder()
                .category(category)
                .name("냉모밀 + 삼겹소금")
                .basePrice(5500)
                .displayOrder(1)
                .saleStatus(SaleStatus.AVAILABLE)
                .build();
        ReflectionTestUtils.setField(menu, "id", 11L);
        MenuOption store = MenuOption.builder()
                .menu(menu)
                .groupType(OptionGroupType.PACKAGING)
                .name("매장")
                .additionalPrice(0)
                .maxQuantity(1)
                .defaultSelected(true)
                .displayOrder(1)
                .build();
        MenuOption takeout = MenuOption.builder()
                .menu(menu)
                .groupType(OptionGroupType.PACKAGING)
                .name("포장")
                .additionalPrice(0)
                .maxQuantity(1)
                .defaultSelected(false)
                .displayOrder(2)
                .build();
        given(menuRepository.findWithCategoryById(11L)).willReturn(Optional.of(menu));
        given(menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(11L))
                .willReturn(List.of(store, takeout));

        MenuDetailResponse result = menuService.getMenu(11L);

        verify(adminMenuService).healNaengmomilOptions(menu);
        assertThat(result.isToppingEnabled()).isTrue();
        assertThat(result.getOptions()).extracting(optionResponse -> optionResponse.getName())
                .containsExactly("매장", "포장");
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

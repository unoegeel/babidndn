package com.gdgoc.babi_order.menu.service;

import com.gdgoc.babi_order.menu.dto.request.CategoryUpsertRequest;
import com.gdgoc.babi_order.menu.dto.request.MenuOptionUpsertRequest;
import com.gdgoc.babi_order.menu.dto.request.MenuUpsertRequest;
import com.gdgoc.babi_order.menu.dto.response.CategoryResponse;
import com.gdgoc.babi_order.menu.dto.response.MenuDetailResponse;
import com.gdgoc.babi_order.menu.entity.Category;
import com.gdgoc.babi_order.menu.entity.Menu;
import com.gdgoc.babi_order.menu.entity.MenuOption;
import com.gdgoc.babi_order.menu.entity.OptionGroupType;
import com.gdgoc.babi_order.menu.entity.SaleStatus;
import com.gdgoc.babi_order.menu.exception.MenuApiException;
import com.gdgoc.babi_order.menu.repository.CategoryRepository;
import com.gdgoc.babi_order.menu.repository.MenuOptionRepository;
import com.gdgoc.babi_order.menu.repository.MenuRepository;
import com.gdgoc.babi_order.order.repository.OrderItemOptionRepository;
import com.gdgoc.babi_order.order.repository.OrderItemRepository;
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
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdminMenuServiceTest {

    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private MenuRepository menuRepository;
    @Mock
    private MenuOptionRepository menuOptionRepository;
    @Mock
    private OrderItemRepository orderItemRepository;
    @Mock
    private OrderItemOptionRepository orderItemOptionRepository;

    private AdminMenuService adminMenuService;

    @BeforeEach
    void setUp() {
        adminMenuService = new AdminMenuService(
                categoryRepository,
                menuRepository,
                menuOptionRepository,
                orderItemRepository,
                orderItemOptionRepository
        );
    }

    @Test
    void createCategoryPersistsTrimmedName() {
        given(categoryRepository.existsByName("컵밥")).willReturn(false);
        given(categoryRepository.save(any())).willAnswer(invocation -> {
            Category category = invocation.getArgument(0);
            ReflectionTestUtils.setField(category, "id", 1L);
            return category;
        });

        CategoryResponse result = adminMenuService.createCategory(
                new CategoryUpsertRequest(" 컵밥 ", 1));

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("컵밥");
    }

    @Test
    void createCategoryRejectsDuplicateName() {
        given(categoryRepository.existsByName("컵밥")).willReturn(true);

        assertThatThrownBy(() -> adminMenuService.createCategory(
                new CategoryUpsertRequest("컵밥", 1)))
                .isInstanceOf(MenuApiException.class)
                .extracting("code")
                .isEqualTo("DUPLICATE_CATEGORY_NAME");
    }

    @Test
    void deleteCategoryRejectsCategoryContainingMenus() {
        Category category = category(1L);
        given(categoryRepository.findById(1L)).willReturn(Optional.of(category));
        given(menuRepository.existsByCategoryId(1L)).willReturn(true);

        assertThatThrownBy(() -> adminMenuService.deleteCategory(1L))
                .isInstanceOf(MenuApiException.class)
                .extracting("code")
                .isEqualTo("CATEGORY_NOT_EMPTY");
    }

    @Test
    void createMenuUsesExistingCategory() {
        Category category = category(1L);
        given(categoryRepository.findById(1L)).willReturn(Optional.of(category));
        given(menuRepository.existsByCategoryIdAndName(1L, "삼겹소금")).willReturn(false);
        given(menuRepository.save(any())).willAnswer(invocation -> {
            Menu menu = invocation.getArgument(0);
            ReflectionTestUtils.setField(menu, "id", 10L);
            return menu;
        });
        given(menuOptionRepository.findAllByMenuIdAndGroupTypeIn(any(), any()))
                .willReturn(List.of());
        given(menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(10L))
                .willReturn(List.of());

        MenuDetailResponse result = adminMenuService.createMenu(menuRequest());

        assertThat(result.getId()).isEqualTo(10L);
        assertThat(result.getCategoryId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("삼겹소금");
    }

    @Test
    void createMenuWithToppingEnabledCreatesSixDefaultToppings() {
        Category category = category(1L);
        given(categoryRepository.findById(1L)).willReturn(Optional.of(category));
        given(menuRepository.existsByCategoryIdAndName(1L, "삼겹소금")).willReturn(false);
        given(menuRepository.save(any())).willAnswer(invocation -> {
            Menu menu = invocation.getArgument(0);
            ReflectionTestUtils.setField(menu, "id", 10L);
            return menu;
        });
        given(menuOptionRepository.findAllByMenuIdAndGroupTypeIn(10L, List.of(
                OptionGroupType.TOPPING_ADD, OptionGroupType.TOPPING_REMOVE)))
                .willReturn(List.of());
        given(menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(10L))
                .willReturn(List.of());

        adminMenuService.createMenu(new MenuUpsertRequest(
                1L, "삼겹소금", null, 3500, null, 1,
                SaleStatus.AVAILABLE, true));

        org.mockito.ArgumentCaptor<List<MenuOption>> captor =
                org.mockito.ArgumentCaptor.forClass(List.class);
        verify(menuOptionRepository).saveAll(captor.capture());
        assertThat(captor.getValue())
                .hasSize(6)
                .extracting(MenuOption::getName)
                .containsExactly(
                        "계란후라이", "밥 추가", "고기 추가",
                        "모짜렐라치즈", "체다치즈", "스팸");
    }

    @Test
    void updateMenuWithToppingDisabledRemovesOnlyToppingOptions() {
        Category category = category(1L);
        Menu menu = menu(10L, category);
        MenuOption topping = option(100L, menu);
        given(menuRepository.findWithCategoryById(10L)).willReturn(Optional.of(menu));
        given(categoryRepository.findById(1L)).willReturn(Optional.of(category));
        given(menuRepository.existsByCategoryIdAndNameAndIdNot(1L, "삼겹소금", 10L))
                .willReturn(false);
        given(menuOptionRepository.findAllByMenuIdAndGroupTypeIn(10L, List.of(
                OptionGroupType.TOPPING_ADD, OptionGroupType.TOPPING_REMOVE)))
                .willReturn(List.of(topping));
        given(menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(10L))
                .willReturn(List.of());

        adminMenuService.updateMenu(10L, menuRequest());

        verify(orderItemOptionRepository).detachMenuOptions(List.of(100L));
        verify(menuOptionRepository).deleteAll(List.of(topping));
    }

    @Test
    void updateSaleStatusChangesPersistentEntity() {
        Menu menu = menu(10L, category(1L));
        given(menuRepository.findWithCategoryById(10L)).willReturn(Optional.of(menu));
        given(menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(10L))
                .willReturn(List.of());

        MenuDetailResponse result = adminMenuService.updateSaleStatus(10L, SaleStatus.SOLDOUT);

        assertThat(menu.getSaleStatus()).isEqualTo(SaleStatus.SOLDOUT);
        assertThat(result.getSaleStatus()).isEqualTo("SOLDOUT");
    }

    @Test
    void deleteMenuDetachesOrderSnapshotsBeforeDeletingMenuAndOptions() {
        Menu menu = menu(10L, category(1L));
        given(menuRepository.findWithCategoryById(10L)).willReturn(Optional.of(menu));

        adminMenuService.deleteMenu(10L);

        verify(orderItemOptionRepository).detachMenuOptionsByMenu(10L);
        verify(orderItemRepository).detachMenu(10L);
        verify(menuOptionRepository).deleteAllByMenuId(10L);
        verify(menuRepository).delete(menu);
    }

    @Test
    void deleteOptionDetachesOrderSnapshotBeforeDeletingOption() {
        Menu menu = menu(10L, category(1L));
        MenuOption option = option(100L, menu);
        given(menuRepository.findWithCategoryById(10L)).willReturn(Optional.of(menu));
        given(menuOptionRepository.findById(100L)).willReturn(Optional.of(option));

        adminMenuService.deleteOption(10L, 100L);

        verify(orderItemOptionRepository).detachMenuOption(100L);
        verify(menuOptionRepository).delete(option);
    }

    @Test
    void updateOptionRejectsOptionFromAnotherMenu() {
        Menu requestedMenu = menu(10L, category(1L));
        Menu anotherMenu = menu(20L, category(1L));
        MenuOption option = option(100L, anotherMenu);
        given(menuRepository.findWithCategoryById(10L)).willReturn(Optional.of(requestedMenu));
        given(menuOptionRepository.findById(100L)).willReturn(Optional.of(option));

        assertThatThrownBy(() -> adminMenuService.updateOption(
                10L, 100L, optionRequest()))
                .isInstanceOf(MenuApiException.class)
                .extracting("code")
                .isEqualTo("INVALID_MENU_OPTION");
    }

    private Category category(Long id) {
        Category category = Category.builder().name("컵밥").displayOrder(1).build();
        ReflectionTestUtils.setField(category, "id", id);
        return category;
    }

    private Menu menu(Long id, Category category) {
        Menu menu = Menu.builder()
                .category(category)
                .name("삼겹소금")
                .basePrice(3500)
                .displayOrder(1)
                .saleStatus(SaleStatus.AVAILABLE)
                .build();
        ReflectionTestUtils.setField(menu, "id", id);
        return menu;
    }

    private MenuOption option(Long id, Menu menu) {
        MenuOption option = MenuOption.builder()
                .menu(menu)
                .groupType(OptionGroupType.TOPPING_ADD)
                .name("계란후라이")
                .additionalPrice(700)
                .maxQuantity(3)
                .displayOrder(1)
                .build();
        ReflectionTestUtils.setField(option, "id", id);
        return option;
    }

    private MenuUpsertRequest menuRequest() {
        return new MenuUpsertRequest(
                1L, "삼겹소금", null, 3500, null, 1,
                SaleStatus.AVAILABLE, false);
    }

    private MenuOptionUpsertRequest optionRequest() {
        return new MenuOptionUpsertRequest(
                OptionGroupType.TOPPING_ADD, "계란후라이", 700, 3, false, 1);
    }
}

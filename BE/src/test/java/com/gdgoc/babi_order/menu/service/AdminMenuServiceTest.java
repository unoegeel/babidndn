package com.gdgoc.babi_order.menu.service;

import com.gdgoc.babi_order.menu.dto.request.CategoryUpsertRequest;
import com.gdgoc.babi_order.menu.dto.request.MenuOptionUpsertRequest;
import com.gdgoc.babi_order.menu.dto.request.MenuOrderUpdateRequest;
import com.gdgoc.babi_order.menu.dto.request.MenuUpsertRequest;
import com.gdgoc.babi_order.menu.dto.response.CategoryResponse;
import com.gdgoc.babi_order.menu.dto.response.MenuDetailResponse;
import com.gdgoc.babi_order.menu.dto.response.MenuSummaryResponse;
import com.gdgoc.babi_order.menu.entity.Category;
import com.gdgoc.babi_order.menu.entity.Menu;
import com.gdgoc.babi_order.menu.entity.MenuBadge;
import com.gdgoc.babi_order.menu.entity.MenuOption;
import com.gdgoc.babi_order.menu.entity.OptionGroupType;
import com.gdgoc.babi_order.menu.entity.SaleStatus;
import com.gdgoc.babi_order.menu.exception.MenuApiException;
import com.gdgoc.babi_order.menu.repository.CategoryRepository;
import com.gdgoc.babi_order.menu.repository.MenuOptionRepository;
import com.gdgoc.babi_order.menu.repository.MenuRepository;
import com.gdgoc.babi_order.order.repository.OrderItemOptionRepository;
import com.gdgoc.babi_order.order.repository.OrderItemRepository;
import com.gdgoc.babi_order.savedmenu.repository.SavedMenuOptionRepository;
import com.gdgoc.babi_order.savedmenu.repository.SavedMenuRepository;
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
    @Mock
    private SavedMenuRepository savedMenuRepository;
    @Mock
    private SavedMenuOptionRepository savedMenuOptionRepository;

    private AdminMenuService adminMenuService;

    @BeforeEach
    void setUp() {
        adminMenuService = new AdminMenuService(
                categoryRepository,
                menuRepository,
                menuOptionRepository,
                orderItemRepository,
                orderItemOptionRepository,
                savedMenuRepository,
                savedMenuOptionRepository
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
    void reorderCategoriesAssignsSequentialDisplayOrder() {
        Category first = category(1L, "밥류", 1);
        Category second = category(2L, "사이드", 2);
        Category third = category(3L, "음료", 3);
        given(categoryRepository.findAll()).willReturn(List.of(first, second, third));
        given(categoryRepository.saveAll(any())).willAnswer(invocation -> invocation.getArgument(0));

        List<CategoryResponse> result = adminMenuService.reorderCategories(List.of(3L, 1L, 2L));

        assertThat(result).extracting(CategoryResponse::getId).containsExactly(3L, 1L, 2L);
        assertThat(result).extracting(CategoryResponse::getDisplayOrder).containsExactly(1, 2, 3);
        assertThat(third.getDisplayOrder()).isEqualTo(1);
        assertThat(first.getDisplayOrder()).isEqualTo(2);
        assertThat(second.getDisplayOrder()).isEqualTo(3);
        verify(categoryRepository).saveAll(List.of(third, first, second));
    }

    @Test
    void reorderCategoriesRejectsDuplicateIds() {
        assertThatThrownBy(() -> adminMenuService.reorderCategories(List.of(1L, 2L, 2L)))
                .isInstanceOf(MenuApiException.class)
                .extracting("code")
                .isEqualTo("INVALID_REQUEST");
        verify(categoryRepository, never()).findAll();
        verify(categoryRepository, never()).saveAll(any());
    }

    @Test
    void reorderCategoriesRejectsUnknownId() {
        given(categoryRepository.findAll()).willReturn(List.of(
                category(1L, "밥류", 1),
                category(2L, "사이드", 2)
        ));

        assertThatThrownBy(() -> adminMenuService.reorderCategories(List.of(1L, 2L, 999L)))
                .isInstanceOf(MenuApiException.class)
                .extracting("code")
                .isEqualTo("CATEGORY_NOT_FOUND");
        verify(categoryRepository, never()).saveAll(any());
    }

    @Test
    void reorderCategoriesRejectsMissingIds() {
        given(categoryRepository.findAll()).willReturn(List.of(
                category(1L, "밥류", 1),
                category(2L, "사이드", 2),
                category(3L, "음료", 3)
        ));

        assertThatThrownBy(() -> adminMenuService.reorderCategories(List.of(1L, 3L)))
                .isInstanceOf(MenuApiException.class)
                .extracting("code")
                .isEqualTo("INVALID_REQUEST");
        verify(categoryRepository, never()).saveAll(any());
    }

    @Test
    void reorderMenusAssignsSequentialDisplayOrder() {
        Category category = category(1L, "컵밥", 1);
        Menu first = menu(1L, category, "삼겹소금", 1, MenuBadge.POPULAR);
        Menu second = menu(2L, category, "참치마요", 2, MenuBadge.NONE);
        Menu third = menu(3L, category, "제육", 3, MenuBadge.BEST);
        given(categoryRepository.findById(1L)).willReturn(Optional.of(category));
        given(menuRepository.findAllByCategoryIdOrderByDisplayOrderAscIdAsc(1L))
                .willReturn(List.of(first, second, third));
        given(menuRepository.saveAll(any())).willAnswer(invocation -> invocation.getArgument(0));

        List<MenuSummaryResponse> result = adminMenuService.reorderMenus(
                new MenuOrderUpdateRequest(1L, List.of(3L, 1L, 2L)));

        assertThat(result).extracting(MenuSummaryResponse::getId).containsExactly(3L, 1L, 2L);
        assertThat(result).extracting(MenuSummaryResponse::getDisplayOrder).containsExactly(1, 2, 3);
        assertThat(third.getDisplayOrder()).isEqualTo(1);
        assertThat(first.getDisplayOrder()).isEqualTo(2);
        assertThat(second.getDisplayOrder()).isEqualTo(3);
        assertThat(first.getBadge()).isEqualTo(MenuBadge.POPULAR);
        assertThat(second.getBadge()).isEqualTo(MenuBadge.NONE);
        assertThat(third.getBadge()).isEqualTo(MenuBadge.BEST);
        verify(menuRepository).saveAll(List.of(third, first, second));
    }

    @Test
    void reorderMenusRejectsDuplicateIds() {
        assertThatThrownBy(() -> adminMenuService.reorderMenus(
                new MenuOrderUpdateRequest(1L, List.of(1L, 2L, 2L))))
                .isInstanceOf(MenuApiException.class)
                .extracting("code")
                .isEqualTo("INVALID_REQUEST");
        verify(categoryRepository, never()).findById(any());
        verify(menuRepository, never()).saveAll(any());
    }

    @Test
    void reorderMenusRejectsUnknownMenuId() {
        Category category = category(1L, "컵밥", 1);
        given(categoryRepository.findById(1L)).willReturn(Optional.of(category));
        given(menuRepository.findAllByCategoryIdOrderByDisplayOrderAscIdAsc(1L))
                .willReturn(List.of(menu(1L, category, "삼겹소금", 1), menu(2L, category, "참치마요", 2)));

        assertThatThrownBy(() -> adminMenuService.reorderMenus(
                new MenuOrderUpdateRequest(1L, List.of(1L, 2L, 999L))))
                .isInstanceOf(com.gdgoc.babi_order.menu.exception.MenuNotFoundException.class)
                .extracting("code")
                .isEqualTo("MENU_NOT_FOUND");
        verify(menuRepository, never()).saveAll(any());
    }

    @Test
    void reorderMenusRejectsMissingMenuIds() {
        Category category = category(1L, "컵밥", 1);
        given(categoryRepository.findById(1L)).willReturn(Optional.of(category));
        given(menuRepository.findAllByCategoryIdOrderByDisplayOrderAscIdAsc(1L))
                .willReturn(List.of(
                        menu(1L, category, "삼겹소금", 1),
                        menu(2L, category, "참치마요", 2),
                        menu(3L, category, "제육", 3)));

        assertThatThrownBy(() -> adminMenuService.reorderMenus(
                new MenuOrderUpdateRequest(1L, List.of(1L, 3L))))
                .isInstanceOf(MenuApiException.class)
                .extracting("code")
                .isEqualTo("INVALID_REQUEST");
        verify(menuRepository, never()).saveAll(any());
    }

    @Test
    void reorderMenusRejectsUnknownCategoryId() {
        given(categoryRepository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> adminMenuService.reorderMenus(
                new MenuOrderUpdateRequest(999L, List.of(1L, 2L))))
                .isInstanceOf(MenuApiException.class)
                .extracting("code")
                .isEqualTo("CATEGORY_NOT_FOUND");
        verify(menuRepository, never()).saveAll(any());
    }

    @Test
    void reorderMenusRejectsMenuFromOtherCategory() {
        Category cupbob = category(1L, "컵밥", 1);
        given(categoryRepository.findById(1L)).willReturn(Optional.of(cupbob));
        given(menuRepository.findAllByCategoryIdOrderByDisplayOrderAscIdAsc(1L))
                .willReturn(List.of(menu(1L, cupbob, "삼겹소금", 1), menu(2L, cupbob, "참치마요", 2)));

        assertThatThrownBy(() -> adminMenuService.reorderMenus(
                new MenuOrderUpdateRequest(1L, List.of(1L, 10L))))
                .isInstanceOf(com.gdgoc.babi_order.menu.exception.MenuNotFoundException.class)
                .extracting("code")
                .isEqualTo("MENU_NOT_FOUND");
        verify(menuRepository, never()).saveAll(any());
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
    void createMenuPersistsBadge() {
        Category category = category(1L);
        given(categoryRepository.findById(1L)).willReturn(Optional.of(category));
        given(menuRepository.existsByCategoryIdAndName(1L, "인기메뉴")).willReturn(false);
        given(menuRepository.save(any())).willAnswer(invocation -> {
            Menu menu = invocation.getArgument(0);
            ReflectionTestUtils.setField(menu, "id", 10L);
            return menu;
        });
        given(menuOptionRepository.findAllByMenuIdAndGroupTypeIn(any(), any()))
                .willReturn(List.of());
        given(menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(10L))
                .willReturn(List.of());

        MenuDetailResponse result = adminMenuService.createMenu(new MenuUpsertRequest(
                1L, "인기메뉴", null, 3500, null, 1,
                SaleStatus.AVAILABLE, false, MenuBadge.POPULAR));

        assertThat(result.getBadge()).isEqualTo("POPULAR");
    }

    @Test
    void updateMenuChangesBadge() {
        Category category = category(1L);
        Menu menu = menu(10L, category, "삼겹소금", 1, MenuBadge.POPULAR);
        given(menuRepository.findWithCategoryById(10L)).willReturn(Optional.of(menu));
        given(categoryRepository.findById(1L)).willReturn(Optional.of(category));
        given(menuRepository.existsByCategoryIdAndNameAndIdNot(1L, "삼겹소금", 10L))
                .willReturn(false);
        given(menuOptionRepository.findAllByMenuIdAndGroupTypeIn(any(), any()))
                .willReturn(List.of());
        given(menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(10L))
                .willReturn(List.of());

        MenuDetailResponse popularToBest = adminMenuService.updateMenu(10L, new MenuUpsertRequest(
                1L, "삼겹소금", null, 3500, null, 1,
                SaleStatus.AVAILABLE, false, MenuBadge.BEST));
        assertThat(popularToBest.getBadge()).isEqualTo("BEST");

        MenuDetailResponse bestToRecommended = adminMenuService.updateMenu(10L, new MenuUpsertRequest(
                1L, "삼겹소금", null, 3500, null, 1,
                SaleStatus.AVAILABLE, false, MenuBadge.RECOMMENDED));
        assertThat(bestToRecommended.getBadge()).isEqualTo("RECOMMENDED");

        MenuDetailResponse recommendedToNone = adminMenuService.updateMenu(10L, new MenuUpsertRequest(
                1L, "삼겹소금", null, 3500, null, 1,
                SaleStatus.AVAILABLE, false, MenuBadge.NONE));
        assertThat(recommendedToNone.getBadge()).isEqualTo("NONE");
    }

    @Test
    void menuSummaryResponseIncludesBadge() {
        Category category = category(1L);
        Menu menu = menu(1L, category, "삼겹소금", 1, MenuBadge.RECOMMENDED);

        MenuSummaryResponse response = MenuSummaryResponse.from(menu);

        assertThat(response.getBadge()).isEqualTo("RECOMMENDED");
    }

    @Test
    void createMenuWithToppingEnabledCreatesDefaultSizesAndToppings() {
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
        given(menuOptionRepository.findAllByMenuIdAndGroupTypeIn(10L, List.of(OptionGroupType.SIZE)))
                .willReturn(List.of());
        given(menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(10L))
                .willReturn(List.of());

        adminMenuService.createMenu(new MenuUpsertRequest(
                1L, "삼겹소금", null, 3500, null, 1,
                SaleStatus.AVAILABLE, true, MenuBadge.NONE));

        org.mockito.ArgumentCaptor<List<MenuOption>> captor =
                org.mockito.ArgumentCaptor.forClass(List.class);
        verify(menuOptionRepository, org.mockito.Mockito.times(2)).saveAll(captor.capture());
        List<MenuOption> toppingsAndRemoves = captor.getAllValues().get(0);
        assertThat(toppingsAndRemoves)
                .extracting(MenuOption::getName)
                .containsExactly(
                        "계란후라이", "밥 추가",
                        "삼겹소금 추가", "삼겹양념 추가", "참치마요 추가",
                        "모짜렐라치즈", "체다치즈", "스팸",
                        "김치 제외", "고추장 소스 제외")
                .doesNotContain("고기 추가");
        assertThat(toppingsAndRemoves)
                .filteredOn(option -> option.getGroupType() == OptionGroupType.TOPPING_ADD)
                .extracting(
                        MenuOption::getName,
                        MenuOption::getAdditionalPrice,
                        MenuOption::getDisplayOrder,
                        MenuOption::getMaxQuantity)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("계란후라이", 700, 1, 3),
                        org.assertj.core.groups.Tuple.tuple("밥 추가", 1000, 2, 3),
                        org.assertj.core.groups.Tuple.tuple("삼겹소금 추가", 1200, 3, 3),
                        org.assertj.core.groups.Tuple.tuple("삼겹양념 추가", 1200, 4, 3),
                        org.assertj.core.groups.Tuple.tuple("참치마요 추가", 1200, 5, 3),
                        org.assertj.core.groups.Tuple.tuple("모짜렐라치즈", 1000, 6, 3),
                        org.assertj.core.groups.Tuple.tuple("체다치즈", 500, 7, 3),
                        org.assertj.core.groups.Tuple.tuple("스팸", 700, 8, 3));
        assertThat(captor.getAllValues().get(1))
                .hasSize(3)
                .extracting(MenuOption::getName, MenuOption::getAdditionalPrice)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("싱글", 0),
                        org.assertj.core.groups.Tuple.tuple("더블", 1000),
                        org.assertj.core.groups.Tuple.tuple("점보", 2000));
    }

    @Test
    void ensureDefaultOptionsAddsMissingNewToppingsWithoutRecreatingMeatAdd() {
        Menu menu = menu(10L, category(1L));
        MenuOption egg = MenuOption.builder()
                .menu(menu)
                .groupType(OptionGroupType.TOPPING_ADD)
                .name("계란후라이")
                .additionalPrice(1)
                .maxQuantity(3)
                .displayOrder(1)
                .build();
        MenuOption meat = MenuOption.builder()
                .menu(menu)
                .groupType(OptionGroupType.TOPPING_ADD)
                .name("고기 추가")
                .additionalPrice(1000)
                .maxQuantity(3)
                .displayOrder(3)
                .build();
        ReflectionTestUtils.setField(meat, "id", 77L);
        given(menuOptionRepository.findAllByMenuIdAndGroupTypeIn(10L, List.of(OptionGroupType.SIZE)))
                .willReturn(List.of(
                        MenuOption.builder().menu(menu).groupType(OptionGroupType.SIZE)
                                .name("싱글").additionalPrice(0).maxQuantity(1).displayOrder(1).build(),
                        MenuOption.builder().menu(menu).groupType(OptionGroupType.SIZE)
                                .name("더블").additionalPrice(1000).maxQuantity(1).displayOrder(2).build(),
                        MenuOption.builder().menu(menu).groupType(OptionGroupType.SIZE)
                                .name("점보").additionalPrice(2000).maxQuantity(1).displayOrder(3).build()
                ));
        given(menuOptionRepository.findAllByMenuIdAndGroupTypeIn(10L, List.of(
                OptionGroupType.TOPPING_ADD, OptionGroupType.TOPPING_REMOVE)))
                .willReturn(List.of(egg, meat));

        adminMenuService.ensureDefaultOptions(menu);

        org.mockito.ArgumentCaptor<List<MenuOption>> captor =
                org.mockito.ArgumentCaptor.forClass(List.class);
        verify(menuOptionRepository).saveAll(captor.capture());
        assertThat(captor.getValue())
                .extracting(MenuOption::getName, MenuOption::getAdditionalPrice, MenuOption::getDisplayOrder)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("밥 추가", 1000, 2),
                        org.assertj.core.groups.Tuple.tuple("삼겹소금 추가", 1200, 3),
                        org.assertj.core.groups.Tuple.tuple("삼겹양념 추가", 1200, 4),
                        org.assertj.core.groups.Tuple.tuple("참치마요 추가", 1200, 5),
                        org.assertj.core.groups.Tuple.tuple("모짜렐라치즈", 1000, 6),
                        org.assertj.core.groups.Tuple.tuple("체다치즈", 500, 7),
                        org.assertj.core.groups.Tuple.tuple("스팸", 700, 8),
                        org.assertj.core.groups.Tuple.tuple("김치 제외", 0, 1),
                        org.assertj.core.groups.Tuple.tuple("고추장 소스 제외", 0, 2));
        assertThat(captor.getValue()).extracting(MenuOption::getName).doesNotContain("고기 추가");
        assertThat(egg.getAdditionalPrice()).isEqualTo(1);
        verify(menuOptionRepository, never()).deleteAll(any());
        verify(menuOptionRepository, never()).delete(any());
    }

    @Test
    void defaultToppingAddNamesExcludeMeatAddAndIncludeNewToppings() {
        assertThat(AdminMenuService.isDefaultToppingAddName("고기 추가")).isFalse();
        assertThat(AdminMenuService.isDefaultToppingAddName("삼겹소금 추가")).isTrue();
        assertThat(AdminMenuService.isDefaultToppingAddName("삼겹양념 추가")).isTrue();
        assertThat(AdminMenuService.isDefaultToppingAddName("참치마요 추가")).isTrue();
        assertThat(AdminMenuService.isDefaultToppingAddName("밥 추가")).isTrue();
    }

    @Test
    void ensureDefaultOptionsReclassifiesRiceAddFromSizeToToppingAdd() {
        Menu menu = menu(10L, category(1L));
        MenuOption riceAsSize = MenuOption.builder()
                .menu(menu)
                .groupType(OptionGroupType.SIZE)
                .name("밥 추가")
                .additionalPrice(1000)
                .maxQuantity(1)
                .displayOrder(2)
                .build();
        ReflectionTestUtils.setField(riceAsSize, "id", 50L);

        given(menuOptionRepository.findAllByMenuIdAndGroupTypeIn(10L, List.of(OptionGroupType.SIZE)))
                .willReturn(List.of(riceAsSize), List.of());
        given(menuOptionRepository.findAllByMenuIdAndGroupTypeIn(10L, List.of(OptionGroupType.TOPPING_ADD)))
                .willReturn(List.of());
        given(menuOptionRepository.findAllByMenuIdAndGroupTypeIn(10L, List.of(
                OptionGroupType.TOPPING_ADD, OptionGroupType.TOPPING_REMOVE)))
                .willReturn(List.of(riceAsSize));

        adminMenuService.ensureDefaultOptions(menu);

        assertThat(riceAsSize.getGroupType()).isEqualTo(OptionGroupType.TOPPING_ADD);
        assertThat(riceAsSize.getMaxQuantity()).isEqualTo(3);
        assertThat(riceAsSize.getDisplayOrder()).isEqualTo(2);
    }

    @Test
    void ensureDefaultOptionsDoesNotAddCupbapDefaultsForNoodleCategory() {
        Menu menu = menu(11L, category(2L, "우동", 2));

        adminMenuService.ensureDefaultOptions(menu);

        verify(menuOptionRepository, never()).saveAll(any());
        verify(menuOptionRepository, never()).deleteAll(any());
        verify(menuOptionRepository, never()).findAllByMenuIdAndGroupTypeIn(any(), any());
    }

    @Test
    void createMenuWithToppingEnabledOnNoodleCategoryDoesNotCreateDefaultOptions() {
        Category category = category(2L, "면", 2);
        given(categoryRepository.findById(2L)).willReturn(Optional.of(category));
        given(menuRepository.existsByCategoryIdAndName(2L, "삼겹소금")).willReturn(false);
        given(menuRepository.save(any())).willAnswer(invocation -> {
            Menu menu = invocation.getArgument(0);
            ReflectionTestUtils.setField(menu, "id", 11L);
            return menu;
        });
        given(menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(11L))
                .willReturn(List.of());

        adminMenuService.createMenu(new MenuUpsertRequest(
                2L, "삼겹소금", null, 5500, null, 1,
                SaleStatus.AVAILABLE, true, MenuBadge.NONE));

        verify(menuOptionRepository, never()).saveAll(any());
    }

    @Test
    void updateMenuWithToppingEnabledOnNoodleKeepsCustomToppingRemoves() {
        Category category = category(2L, "면", 2);
        Menu menu = menu(11L, category, "참치불닭비빔우동", 3);
        MenuOption remove = noodleToppingRemove(101L, menu);
        given(menuRepository.findWithCategoryById(11L)).willReturn(Optional.of(menu));
        given(categoryRepository.findById(2L)).willReturn(Optional.of(category));
        given(menuRepository.existsByCategoryIdAndNameAndIdNot(2L, "참치불닭비빔우동", 11L))
                .willReturn(false);
        given(menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(11L))
                .willReturn(List.of(remove));

        MenuDetailResponse result = adminMenuService.updateMenu(11L, new MenuUpsertRequest(
                2L, "참치불닭비빔우동", null, 5500, null, 3,
                SaleStatus.AVAILABLE, true, MenuBadge.NONE));

        verify(menuOptionRepository, never()).deleteAll(any());
        verify(menuOptionRepository, never()).saveAll(any());
        assertThat(result.isToppingEnabled()).isTrue();
        assertThat(result.getOptions())
                .extracting(option -> option.getName())
                .containsExactly("불닭소스 제외");
    }

    @Test
    void updateMenuWithToppingDisabledOnNoodleDoesNotDeleteCustomToppingRemoves() {
        Category category = category(2L, "면", 2);
        Menu menu = menu(11L, category, "참치불닭비빔우동", 3);
        MenuOption remove = noodleToppingRemove(101L, menu);
        given(menuRepository.findWithCategoryById(11L)).willReturn(Optional.of(menu));
        given(categoryRepository.findById(2L)).willReturn(Optional.of(category));
        given(menuRepository.existsByCategoryIdAndNameAndIdNot(2L, "참치불닭비빔우동", 11L))
                .willReturn(false);
        given(menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(11L))
                .willReturn(List.of(remove));

        MenuDetailResponse result = adminMenuService.updateMenu(11L, new MenuUpsertRequest(
                2L, "참치불닭비빔우동", null, 5500, null, 3,
                SaleStatus.AVAILABLE, false, MenuBadge.NONE));

        verify(menuOptionRepository, never()).deleteAll(any());
        verify(orderItemOptionRepository, never()).detachMenuOptions(any());
        assertThat(result.isToppingEnabled()).isTrue();
        assertThat(result.getOptions())
                .extracting(option -> option.getName())
                .containsExactly("불닭소스 제외");
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
        verify(savedMenuOptionRepository).detachMenuOptionsByMenu(10L);
        verify(savedMenuRepository).detachMenu(10L);
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
        return category(id, "컵밥", 1);
    }

    private Category category(Long id, String name, int displayOrder) {
        Category category = Category.builder().name(name).displayOrder(displayOrder).build();
        ReflectionTestUtils.setField(category, "id", id);
        return category;
    }

    private Menu menu(Long id, Category category) {
        return menu(id, category, "삼겹소금", 1, MenuBadge.NONE);
    }

    private Menu menu(Long id, Category category, String name, int displayOrder) {
        return menu(id, category, name, displayOrder, MenuBadge.NONE);
    }

    private Menu menu(Long id, Category category, String name, int displayOrder, MenuBadge badge) {
        Menu menu = Menu.builder()
                .category(category)
                .name(name)
                .basePrice(3500)
                .displayOrder(displayOrder)
                .saleStatus(SaleStatus.AVAILABLE)
                .badge(badge)
                .build();
        ReflectionTestUtils.setField(menu, "id", id);
        return menu;
    }

    private MenuOption noodleToppingRemove(Long id, Menu menu) {
        MenuOption option = MenuOption.builder()
                .menu(menu)
                .groupType(OptionGroupType.TOPPING_REMOVE)
                .name("불닭소스 제외")
                .additionalPrice(0)
                .maxQuantity(1)
                .displayOrder(1)
                .build();
        ReflectionTestUtils.setField(option, "id", id);
        return option;
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
                SaleStatus.AVAILABLE, false, MenuBadge.NONE);
    }

    private MenuOptionUpsertRequest optionRequest() {
        return new MenuOptionUpsertRequest(
                OptionGroupType.TOPPING_ADD, "계란후라이", 700, 3, false, 1);
    }
}

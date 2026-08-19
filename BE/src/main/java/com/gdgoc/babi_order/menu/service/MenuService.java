package com.gdgoc.babi_order.menu.service;

import com.gdgoc.babi_order.menu.dto.response.CategoryMenuResponse;
import com.gdgoc.babi_order.menu.dto.response.MenuDetailResponse;
import com.gdgoc.babi_order.menu.dto.response.MenuSummaryResponse;
import com.gdgoc.babi_order.menu.entity.Category;
import com.gdgoc.babi_order.menu.entity.Menu;
import com.gdgoc.babi_order.menu.entity.MenuOption;
import com.gdgoc.babi_order.menu.entity.OptionGroupType;
import com.gdgoc.babi_order.menu.exception.MenuNotFoundException;
import com.gdgoc.babi_order.menu.repository.CategoryRepository;
import com.gdgoc.babi_order.menu.repository.MenuOptionRepository;
import com.gdgoc.babi_order.menu.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MenuService {

    private final CategoryRepository categoryRepository;
    private final MenuRepository menuRepository;
    private final MenuOptionRepository menuOptionRepository;
    private final AdminMenuService adminMenuService;

    public List<CategoryMenuResponse> getMenus() {
        List<Category> categories = categoryRepository.findAllByOrderByDisplayOrderAscIdAsc();
        List<Menu> menus = menuRepository.findAllByOrderByCategoryDisplayOrderAscDisplayOrderAscIdAsc();

        Map<Long, List<MenuSummaryResponse>> menusByCategoryId = menus.stream()
                .collect(Collectors.groupingBy(
                        menu -> menu.getCategory().getId(),
                        Collectors.mapping(MenuSummaryResponse::from, Collectors.toList())
                ));

        return categories.stream()
                .map(category -> CategoryMenuResponse.builder()
                        .categoryId(category.getId())
                        .categoryName(category.getName())
                        .displayOrder(category.getDisplayOrder())
                        .menus(menusByCategoryId.getOrDefault(category.getId(), List.of()))
                        .build())
                .toList();
    }

    /**
     * 메뉴 상세 조회.
     * 컵밥/세트 토핑 가능 메뉴에 사이즈/토핑제외가 누락된 경우 기본값을 보강한 뒤 반환합니다.
     * SIZE 로 잘못 저장된 '밥 추가' 등도 함께 교정합니다.
     * 냉모밀 단품은 PACKAGING만 남기고, 냉모밀 세트는 컵밥 옵션+PACKAGING을 맞춥니다.
     * 참치불닭비빔우동은 전용 토핑 제외 + PACKAGING을 맞춥니다.
     */
    @Transactional
    public MenuDetailResponse getMenu(Long menuId) {
        Menu menu = menuRepository.findWithCategoryById(menuId)
                .orElseThrow(() -> new MenuNotFoundException(menuId));
        List<MenuOption> options = menuOptionRepository
                .findAllByMenuIdOrderByDisplayOrderAscIdAsc(menuId);

        if (AdminMenuService.isNaengmomilStandalone(menu)) {
            boolean hasManagedOptions = options.stream().anyMatch(option ->
                    option.getGroupType() == OptionGroupType.SIZE
                            || option.getGroupType() == OptionGroupType.TOPPING_ADD
                            || option.getGroupType() == OptionGroupType.TOPPING_REMOVE
                            || option.getGroupType() == OptionGroupType.PACKAGING);
            if (hasManagedOptions) {
                adminMenuService.healNaengmomilOptions(menu);
                options = menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(menuId);
            }
        } else if (AdminMenuService.isBibimUdonMenu(menu)) {
            boolean hasManagedOptions = options.stream().anyMatch(option ->
                    option.getGroupType() == OptionGroupType.SIZE
                            || option.getGroupType() == OptionGroupType.TOPPING_ADD
                            || option.getGroupType() == OptionGroupType.TOPPING_REMOVE
                            || option.getGroupType() == OptionGroupType.PACKAGING);
            if (hasManagedOptions) {
                adminMenuService.healBibimUdonOptions(menu);
                options = menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(menuId);
            }
        } else if (AdminMenuService.isNaengmomilSet(menu)) {
            boolean hasManagedOptions = options.stream().anyMatch(option ->
                    option.getGroupType() == OptionGroupType.SIZE
                            || option.getGroupType() == OptionGroupType.TOPPING_ADD
                            || option.getGroupType() == OptionGroupType.TOPPING_REMOVE
                            || option.getGroupType() == OptionGroupType.PACKAGING);
            if (hasManagedOptions) {
                adminMenuService.ensureDefaultOptions(menu);
                options = menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(menuId);
            }
        } else {
            boolean toppingEnabled = options.stream().anyMatch(option ->
                    option.getGroupType() == OptionGroupType.TOPPING_ADD
                            || option.getGroupType() == OptionGroupType.TOPPING_REMOVE);
            boolean hasMisplacedToppingInSize = options.stream().anyMatch(option ->
                    option.getGroupType() == OptionGroupType.SIZE
                            && AdminMenuService.isDefaultToppingAddName(option.getName()));
            if (AdminMenuService.usesDefaultSizeAndToppingOptions(menu)
                    && (toppingEnabled || hasMisplacedToppingInSize)) {
                adminMenuService.ensureDefaultOptions(menu);
                options = menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(menuId);
            }
        }

        return MenuDetailResponse.of(menu, options);
    }
}

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
     * toppingEnabled=true 인 컵밥/세트/냉모밀/참치불닭만 옵션을 보강합니다.
     * toppingEnabled=false 이면 옵션을 다시 만들지 않습니다.
     */
    @Transactional
    public MenuDetailResponse getMenu(Long menuId) {
        Menu menu = menuRepository.findWithCategoryById(menuId)
                .orElseThrow(() -> new MenuNotFoundException(menuId));
        List<MenuOption> options = menuOptionRepository
                .findAllByMenuIdOrderByDisplayOrderAscIdAsc(menuId);

        if (!menu.isToppingEnabled()) {
            return MenuDetailResponse.of(menu, options);
        }

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
            boolean hasToppingOptions = options.stream().anyMatch(option ->
                    option.getGroupType() == OptionGroupType.TOPPING_ADD
                            || option.getGroupType() == OptionGroupType.TOPPING_REMOVE);
            boolean hasMisplacedToppingInSize = options.stream().anyMatch(option ->
                    option.getGroupType() == OptionGroupType.SIZE
                            && AdminMenuService.isDefaultToppingAddName(option.getName()));
            if (AdminMenuService.usesDefaultSizeAndToppingOptions(menu)
                    && (hasToppingOptions || hasMisplacedToppingInSize)) {
                adminMenuService.ensureDefaultOptions(menu);
                options = menuOptionRepository.findAllByMenuIdOrderByDisplayOrderAscIdAsc(menuId);
            }
        }

        return MenuDetailResponse.of(menu, options);
    }
}

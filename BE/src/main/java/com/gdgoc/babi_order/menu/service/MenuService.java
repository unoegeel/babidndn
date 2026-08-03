package com.gdgoc.babi_order.menu.service;

import com.gdgoc.babi_order.menu.dto.response.CategoryMenuResponse;
import com.gdgoc.babi_order.menu.dto.response.MenuDetailResponse;
import com.gdgoc.babi_order.menu.dto.response.MenuSummaryResponse;
import com.gdgoc.babi_order.menu.entity.Category;
import com.gdgoc.babi_order.menu.entity.Menu;
import com.gdgoc.babi_order.menu.entity.MenuOption;
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

    public MenuDetailResponse getMenu(Long menuId) {
        Menu menu = menuRepository.findWithCategoryById(menuId)
                .orElseThrow(() -> new MenuNotFoundException(menuId));
        List<MenuOption> options = menuOptionRepository
                .findAllByMenuIdOrderByDisplayOrderAscIdAsc(menuId);

        return MenuDetailResponse.of(menu, options);
    }
}

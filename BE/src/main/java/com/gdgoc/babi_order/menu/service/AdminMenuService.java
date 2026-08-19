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
import com.gdgoc.babi_order.menu.entity.MenuOption;
import com.gdgoc.babi_order.menu.entity.OptionGroupType;
import com.gdgoc.babi_order.menu.entity.SaleStatus;
import com.gdgoc.babi_order.menu.exception.MenuApiException;
import com.gdgoc.babi_order.menu.exception.MenuNotFoundException;
import com.gdgoc.babi_order.menu.repository.CategoryRepository;
import com.gdgoc.babi_order.menu.repository.MenuOptionRepository;
import com.gdgoc.babi_order.menu.repository.MenuRepository;
import com.gdgoc.babi_order.order.repository.OrderItemOptionRepository;
import com.gdgoc.babi_order.order.repository.OrderItemRepository;
import com.gdgoc.babi_order.savedmenu.repository.SavedMenuOptionRepository;
import com.gdgoc.babi_order.savedmenu.repository.SavedMenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminMenuService {

    private static final List<OptionGroupType> TOPPING_GROUP_TYPES =
            List.of(OptionGroupType.TOPPING_ADD, OptionGroupType.TOPPING_REMOVE);
    private static final List<OptionGroupType> CUPBAP_OPTION_GROUP_TYPES = List.of(
            OptionGroupType.SIZE, OptionGroupType.TOPPING_ADD, OptionGroupType.TOPPING_REMOVE);
    private static final List<OptionGroupType> PACKAGING_GROUP_TYPES =
            List.of(OptionGroupType.PACKAGING);
    private static final List<OptionGroupType> NAENGMOMIL_OFF_GROUP_TYPES = List.of(
            OptionGroupType.SIZE,
            OptionGroupType.TOPPING_ADD,
            OptionGroupType.TOPPING_REMOVE,
            OptionGroupType.PACKAGING);
    private static final String NAENGMOMIL_NAME_MARKER = "냉모밀";
    private static final String BIBIM_UDON_MENU_NAME = "참치불닭비빔우동";
    private static final Set<String> SALT_PORK_MENU_NAMES = Set.of(
            "삼겹소금",
            "삼겹소금+바비우동",
            "삼겹소금+김치우동",
            "삼겹소금+냉모밀"
    );
    private static final String SESAME_OIL_REMOVE_NAME = "참기름 제외";
    private static final String PACKAGING_STORE_NAME = "매장";
    private static final String PACKAGING_TAKEOUT_NAME = "포장";
    private static final List<DefaultOption> DEFAULT_SIZES = List.of(
            new DefaultOption("싱글", 0, 1, true),
            new DefaultOption("더블", 1000, 2, false),
            new DefaultOption("점보", 2000, 3, false)
    );
    private static final List<DefaultOption> DEFAULT_TOPPINGS = List.of(
            new DefaultOption("계란후라이", 700, 1, false),
            new DefaultOption("햄구이", 700, 2, false),
            new DefaultOption("밥 추가", 1000, 3, false),
            new DefaultOption("삼겹소금 추가", 1200, 4, false),
            new DefaultOption("삼겹양념 추가", 1200, 5, false),
            new DefaultOption("참치마요 추가", 1200, 6, false),
            new DefaultOption("모짜렐라치즈", 1000, 7, false),
            new DefaultOption("체다치즈", 500, 8, false)
    );
    private static final List<DefaultOption> DEFAULT_TOPPING_REMOVES = List.of(
            new DefaultOption("김치 제외", 0, 1, false),
            new DefaultOption("고추장 소스 제외", 0, 2, false)
    );
    private static final List<DefaultOption> DEFAULT_PACKAGING = List.of(
            new DefaultOption(PACKAGING_STORE_NAME, 0, 1, true),
            new DefaultOption(PACKAGING_TAKEOUT_NAME, 0, 2, false)
    );
    private static final List<DefaultOption> BIBIM_UDON_TOPPING_REMOVES = List.of(
            new DefaultOption("불닭소스 제외", 0, 1, false),
            new DefaultOption("김가루 제외", 0, 2, false),
            new DefaultOption("파 제외", 0, 3, false)
    );
    private static final Map<String, DefaultOption> DEFAULT_TOPPING_ADD_BY_NAME = DEFAULT_TOPPINGS.stream()
            .collect(Collectors.toMap(DefaultOption::name, Function.identity()));
    private static final Set<String> DEFAULT_OPTION_CATEGORY_NAMES = Set.of("컵밥", "세트");
    private static final String LEGACY_SPAM_TOPPING_NAME = "스팸";
    private static final String HAM_GRILL_TOPPING_NAME = "햄구이";

    private final CategoryRepository categoryRepository;
    private final MenuRepository menuRepository;
    private final MenuOptionRepository menuOptionRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderItemOptionRepository orderItemOptionRepository;
    private final SavedMenuRepository savedMenuRepository;
    private final SavedMenuOptionRepository savedMenuOptionRepository;

    public List<CategoryResponse> getCategories() {
        return categoryRepository.findAllByOrderByDisplayOrderAscIdAsc().stream()
                .map(CategoryResponse::from)
                .toList();
    }

    @Transactional
    public CategoryResponse createCategory(CategoryUpsertRequest request) {
        String name = request.getName().trim();
        validateCategoryNameAvailable(name, null);
        Category saved = categoryRepository.save(Category.builder()
                .name(name)
                .displayOrder(request.getDisplayOrder())
                .build());
        return CategoryResponse.from(saved);
    }

    @Transactional
    public CategoryResponse updateCategory(Long categoryId, CategoryUpsertRequest request) {
        Category category = findCategory(categoryId);
        String name = request.getName().trim();
        validateCategoryNameAvailable(name, categoryId);
        category.update(name, request.getDisplayOrder());
        return CategoryResponse.from(category);
    }

    @Transactional
    public void deleteCategory(Long categoryId) {
        Category category = findCategory(categoryId);
        if (menuRepository.existsByCategoryId(categoryId)) {
            throw conflict(
                    "CATEGORY_NOT_EMPTY",
                    "메뉴가 존재하는 카테고리는 삭제할 수 없습니다. categoryId=" + categoryId
            );
        }
        categoryRepository.delete(category);
    }

    @Transactional
    public List<CategoryResponse> reorderCategories(List<Long> categoryIds) {
        validateCategoryOrderIds(categoryIds);
        List<Category> existing = categoryRepository.findAll();
        validateCategoryOrderPermutation(categoryIds, existing);

        Map<Long, Category> byId = existing.stream()
                .collect(Collectors.toMap(Category::getId, Function.identity()));
        List<Category> ordered = new ArrayList<>(categoryIds.size());
        for (int i = 0; i < categoryIds.size(); i++) {
            Category category = byId.get(categoryIds.get(i));
            category.update(category.getName(), i + 1);
            ordered.add(category);
        }
        categoryRepository.saveAll(ordered);
        return ordered.stream().map(CategoryResponse::from).toList();
    }

    @Transactional
    public List<MenuSummaryResponse> reorderMenus(MenuOrderUpdateRequest request) {
        List<Long> menuIds = request.getMenuIds();
        validateMenuOrderIds(menuIds);
        Category category = findCategory(request.getCategoryId());

        List<Menu> existing = menuRepository
                .findAllByCategoryIdOrderByDisplayOrderAscIdAsc(category.getId());
        validateMenuOrderPermutation(menuIds, existing);

        Map<Long, Menu> byId = existing.stream()
                .collect(Collectors.toMap(Menu::getId, Function.identity()));
        List<Menu> ordered = new ArrayList<>(menuIds.size());
        for (int i = 0; i < menuIds.size(); i++) {
            Menu menu = byId.get(menuIds.get(i));
            menu.changeDisplayOrder(i + 1);
            ordered.add(menu);
        }
        menuRepository.saveAll(ordered);
        return ordered.stream().map(MenuSummaryResponse::from).toList();
    }

    @Transactional
    public MenuDetailResponse createMenu(MenuUpsertRequest request) {
        Category category = findCategory(request.getCategoryId());
        String name = request.getName().trim();
        validateMenuNameAvailable(category.getId(), name, null);
        Menu saved = menuRepository.save(Menu.builder()
                .category(category)
                .name(name)
                .description(request.getDescription())
                .basePrice(request.getBasePrice())
                .imageUrl(request.getImageUrl())
                .displayOrder(request.getDisplayOrder())
                .saleStatus(request.getSaleStatus())
                .badge(request.getBadge())
                .build());
        syncSizeAndToppingOptions(saved, request.getToppingEnabled());
        return detail(saved);
    }

    @Transactional
    public MenuDetailResponse updateMenu(Long menuId, MenuUpsertRequest request) {
        Menu menu = findMenu(menuId);
        Category category = findCategory(request.getCategoryId());
        String name = request.getName().trim();
        validateMenuNameAvailable(category.getId(), name, menuId);
        menu.update(
                category,
                name,
                request.getDescription(),
                request.getBasePrice(),
                request.getImageUrl(),
                request.getDisplayOrder(),
                request.getSaleStatus(),
                request.getBadge()
        );
        syncSizeAndToppingOptions(menu, request.getToppingEnabled());
        return detail(menu);
    }

    @Transactional
    public MenuDetailResponse updateSaleStatus(Long menuId, SaleStatus saleStatus) {
        Menu menu = findMenu(menuId);
        menu.changeSaleStatus(saleStatus);
        return detail(menu);
    }

    @Transactional
    public void deleteMenu(Long menuId) {
        Menu menu = findMenu(menuId);
        orderItemOptionRepository.detachMenuOptionsByMenu(menuId);
        orderItemRepository.detachMenu(menuId);
        savedMenuOptionRepository.detachMenuOptionsByMenu(menuId);
        savedMenuRepository.detachMenu(menuId);
        menuOptionRepository.deleteAllByMenuId(menuId);
        menuRepository.delete(menu);
    }

    @Transactional
    public MenuDetailResponse createOption(Long menuId, MenuOptionUpsertRequest request) {
        Menu menu = findMenu(menuId);
        String name = request.getName().trim();
        validateOptionNameAvailable(menuId, name, null);
        menuOptionRepository.save(MenuOption.builder()
                .menu(menu)
                .groupType(request.getGroupType())
                .name(name)
                .additionalPrice(request.getAdditionalPrice())
                .maxQuantity(request.getMaxQuantity())
                .defaultSelected(request.isDefaultSelected())
                .displayOrder(request.getDisplayOrder())
                .build());
        return detail(menu);
    }

    @Transactional
    public MenuDetailResponse updateOption(
            Long menuId, Long optionId, MenuOptionUpsertRequest request) {
        Menu menu = findMenu(menuId);
        MenuOption option = findOption(optionId);
        validateOptionBelongsToMenu(menuId, option);
        String name = request.getName().trim();
        validateOptionNameAvailable(menuId, name, optionId);
        option.update(
                request.getGroupType(),
                name,
                request.getAdditionalPrice(),
                request.getMaxQuantity(),
                request.isDefaultSelected(),
                request.getDisplayOrder()
        );
        return detail(menu);
    }

    @Transactional
    public void deleteOption(Long menuId, Long optionId) {
        findMenu(menuId);
        MenuOption option = findOption(optionId);
        validateOptionBelongsToMenu(menuId, option);
        orderItemOptionRepository.detachMenuOption(optionId);
        savedMenuOptionRepository.detachMenuOption(optionId);
        menuOptionRepository.delete(option);
    }

    private MenuDetailResponse detail(Menu menu) {
        List<MenuOption> options = menuOptionRepository
                .findAllByMenuIdOrderByDisplayOrderAscIdAsc(menu.getId());
        return MenuDetailResponse.of(menu, options);
    }

    private void syncSizeAndToppingOptions(Menu menu, boolean toppingEnabled) {
        if (isNaengmomilStandalone(menu)) {
            syncNaengmomilPackaging(menu, toppingEnabled);
            return;
        }
        if (isBibimUdonMenu(menu)) {
            syncBibimUdonOptions(menu, toppingEnabled);
            return;
        }

        if (!usesDefaultSizeAndToppingOptions(menu)) {
            deleteOptionsOfTypes(menu, PACKAGING_GROUP_TYPES);
            return;
        }

        if (!toppingEnabled) {
            List<MenuOption> currentToppings = menuOptionRepository
                    .findAllByMenuIdAndGroupTypeIn(menu.getId(), TOPPING_GROUP_TYPES);
            if (!currentToppings.isEmpty()) {
                List<Long> optionIds = currentToppings.stream().map(MenuOption::getId).toList();
                orderItemOptionRepository.detachMenuOptions(optionIds);
                savedMenuOptionRepository.detachMenuOptions(optionIds);
                menuOptionRepository.deleteAll(currentToppings);
            }
            deleteOptionsOfTypes(menu, PACKAGING_GROUP_TYPES);
            if (isNaengmomilSet(menu)) {
                deleteOptionsOfTypes(menu, List.of(OptionGroupType.SIZE));
            }
            return;
        }

        // 과거 데이터: '밥 추가' 등이 SIZE 로 저장된 경우 TOPPING_ADD 로 교정
        reclassifyMisplacedToppingsFromSize(menu);

        List<MenuOption> currentToppings = menuOptionRepository
                .findAllByMenuIdAndGroupTypeIn(menu.getId(), TOPPING_GROUP_TYPES);
        renameLegacySpamTopping(currentToppings);

        Set<String> existingToppingNames = currentToppings.stream()
                .map(MenuOption::getName)
                .collect(Collectors.toSet());

        ArrayList<MenuOption> missingToppingOptions = new ArrayList<>();
        DEFAULT_TOPPINGS.stream()
                .filter(topping -> !existingToppingNames.contains(topping.name()))
                .map(topping -> MenuOption.builder()
                        .menu(menu)
                        .groupType(OptionGroupType.TOPPING_ADD)
                        .name(topping.name())
                        .additionalPrice(topping.additionalPrice())
                        .maxQuantity(3)
                        .defaultSelected(topping.defaultSelected())
                        .displayOrder(topping.displayOrder())
                        .build())
                .forEach(missingToppingOptions::add);
        DEFAULT_TOPPING_REMOVES.stream()
                .filter(remove -> !existingToppingNames.contains(remove.name()))
                .map(remove -> MenuOption.builder()
                        .menu(menu)
                        .groupType(OptionGroupType.TOPPING_REMOVE)
                        .name(remove.name())
                        .additionalPrice(remove.additionalPrice())
                        .maxQuantity(1)
                        .defaultSelected(remove.defaultSelected())
                        .displayOrder(remove.displayOrder())
                        .build())
                .forEach(missingToppingOptions::add);
        if (isSaltPorkMenu(menu) && !existingToppingNames.contains(SESAME_OIL_REMOVE_NAME)) {
            missingToppingOptions.add(MenuOption.builder()
                    .menu(menu)
                    .groupType(OptionGroupType.TOPPING_REMOVE)
                    .name(SESAME_OIL_REMOVE_NAME)
                    .additionalPrice(0)
                    .maxQuantity(1)
                    .defaultSelected(false)
                    .displayOrder(3)
                    .build());
        }
        if (!missingToppingOptions.isEmpty()) {
            menuOptionRepository.saveAll(missingToppingOptions);
        }

        if (!isSaltPorkMenu(menu)) {
            deleteNamedOptions(currentToppings.stream()
                    .filter(option -> option.getGroupType() == OptionGroupType.TOPPING_REMOVE)
                    .filter(option -> SESAME_OIL_REMOVE_NAME.equals(option.getName()))
                    .toList());
        }

        List<MenuOption> currentSizes = menuOptionRepository
                .findAllByMenuIdAndGroupTypeIn(menu.getId(), List.of(OptionGroupType.SIZE));
        Set<String> existingSizeNames = currentSizes.stream()
                .map(MenuOption::getName)
                .collect(Collectors.toSet());
        List<MenuOption> missingSizes = DEFAULT_SIZES.stream()
                .filter(size -> !existingSizeNames.contains(size.name()))
                .map(size -> MenuOption.builder()
                        .menu(menu)
                        .groupType(OptionGroupType.SIZE)
                        .name(size.name())
                        .additionalPrice(size.additionalPrice())
                        .maxQuantity(1)
                        .defaultSelected(size.defaultSelected())
                        .displayOrder(size.displayOrder())
                        .build())
                .toList();
        if (!missingSizes.isEmpty()) {
            menuOptionRepository.saveAll(missingSizes);
        }

        if (isNaengmomilSet(menu)) {
            ensurePackagingOptions(menu);
        } else {
            deleteOptionsOfTypes(menu, PACKAGING_GROUP_TYPES);
        }
    }

    private void syncNaengmomilPackaging(Menu menu, boolean toppingEnabled) {
        if (!toppingEnabled) {
            deleteOptionsOfTypes(menu, NAENGMOMIL_OFF_GROUP_TYPES);
            return;
        }

        deleteOptionsOfTypes(menu, CUPBAP_OPTION_GROUP_TYPES);
        ensurePackagingOptions(menu);
    }

    private void syncBibimUdonOptions(Menu menu, boolean toppingEnabled) {
        if (!toppingEnabled) {
            deleteOptionsOfTypes(menu, NAENGMOMIL_OFF_GROUP_TYPES);
            return;
        }

        deleteOptionsOfTypes(menu, List.of(OptionGroupType.SIZE, OptionGroupType.TOPPING_ADD));

        List<MenuOption> currentRemoves = menuOptionRepository
                .findAllByMenuIdAndGroupTypeIn(menu.getId(), List.of(OptionGroupType.TOPPING_REMOVE));
        Set<String> canonicalRemoveNames = BIBIM_UDON_TOPPING_REMOVES.stream()
                .map(DefaultOption::name)
                .collect(Collectors.toSet());
        deleteNamedOptions(currentRemoves.stream()
                .filter(option -> !canonicalRemoveNames.contains(option.getName()))
                .toList());

        Set<String> existingRemoveNames = menuOptionRepository
                .findAllByMenuIdAndGroupTypeIn(menu.getId(), List.of(OptionGroupType.TOPPING_REMOVE))
                .stream()
                .map(MenuOption::getName)
                .collect(Collectors.toSet());
        List<MenuOption> missingRemoves = BIBIM_UDON_TOPPING_REMOVES.stream()
                .filter(remove -> !existingRemoveNames.contains(remove.name()))
                .map(remove -> MenuOption.builder()
                        .menu(menu)
                        .groupType(OptionGroupType.TOPPING_REMOVE)
                        .name(remove.name())
                        .additionalPrice(remove.additionalPrice())
                        .maxQuantity(1)
                        .defaultSelected(remove.defaultSelected())
                        .displayOrder(remove.displayOrder())
                        .build())
                .toList();
        if (!missingRemoves.isEmpty()) {
            menuOptionRepository.saveAll(missingRemoves);
        }

        ensurePackagingOptions(menu);
    }

    private void ensurePackagingOptions(Menu menu) {
        List<MenuOption> currentPackaging = menuOptionRepository
                .findAllByMenuIdAndGroupTypeIn(menu.getId(), PACKAGING_GROUP_TYPES);
        Map<String, MenuOption> packagingByName = currentPackaging.stream()
                .collect(Collectors.toMap(MenuOption::getName, Function.identity(), (left, right) -> left));

        ArrayList<MenuOption> missingPackaging = new ArrayList<>();
        for (DefaultOption packaging : DEFAULT_PACKAGING) {
            MenuOption existing = packagingByName.get(packaging.name());
            if (existing == null) {
                missingPackaging.add(MenuOption.builder()
                        .menu(menu)
                        .groupType(OptionGroupType.PACKAGING)
                        .name(packaging.name())
                        .additionalPrice(packaging.additionalPrice())
                        .maxQuantity(1)
                        .defaultSelected(packaging.defaultSelected())
                        .displayOrder(packaging.displayOrder())
                        .build());
                continue;
            }
            existing.update(
                    OptionGroupType.PACKAGING,
                    packaging.name(),
                    packaging.additionalPrice(),
                    1,
                    packaging.defaultSelected(),
                    packaging.displayOrder()
            );
        }
        if (!missingPackaging.isEmpty()) {
            menuOptionRepository.saveAll(missingPackaging);
        }
    }

    private void deleteNamedOptions(List<MenuOption> options) {
        if (options == null || options.isEmpty()) {
            return;
        }
        List<Long> optionIds = options.stream().map(MenuOption::getId).toList();
        orderItemOptionRepository.detachMenuOptions(optionIds);
        savedMenuOptionRepository.detachMenuOptions(optionIds);
        menuOptionRepository.deleteAll(options);
    }

    private void deleteOptionsOfTypes(Menu menu, List<OptionGroupType> groupTypes) {
        if (menu.getId() == null) {
            return;
        }
        List<MenuOption> current = menuOptionRepository
                .findAllByMenuIdAndGroupTypeIn(menu.getId(), groupTypes);
        if (current.isEmpty()) {
            return;
        }
        List<Long> optionIds = current.stream().map(MenuOption::getId).toList();
        orderItemOptionRepository.detachMenuOptions(optionIds);
        savedMenuOptionRepository.detachMenuOptions(optionIds);
        menuOptionRepository.deleteAll(current);
    }

    /**
     * 라이브 메뉴 옵션의 과거 명칭 '스팸'을 '햄구이'로 교정합니다.
     * 주문 snapshot은 건드리지 않습니다. 이미 '햄구이'가 있으면 중복 생성만 막습니다.
     */
    private void renameLegacySpamTopping(List<MenuOption> currentToppings) {
        MenuOption spam = currentToppings.stream()
                .filter(option -> option.getGroupType() == OptionGroupType.TOPPING_ADD)
                .filter(option -> LEGACY_SPAM_TOPPING_NAME.equals(option.getName()))
                .findFirst()
                .orElse(null);
        if (spam == null) {
            return;
        }
        boolean hamGrillExists = currentToppings.stream()
                .anyMatch(option -> option.getGroupType() == OptionGroupType.TOPPING_ADD
                        && HAM_GRILL_TOPPING_NAME.equals(option.getName()));
        if (hamGrillExists) {
            return;
        }
        DefaultOption def = DEFAULT_TOPPING_ADD_BY_NAME.get(HAM_GRILL_TOPPING_NAME);
        spam.update(
                OptionGroupType.TOPPING_ADD,
                def.name(),
                spam.getAdditionalPrice(),
                spam.getMaxQuantity(),
                def.defaultSelected(),
                def.displayOrder()
        );
    }

    /**
     * SIZE 그룹에 잘못 들어간 기본 토핑(밥 추가 등)을 TOPPING_ADD 로 옮깁니다.
     * 이미 같은 이름의 TOPPING_ADD 가 있으면 SIZE 쪽 중복 행만 삭제합니다.
     */
    private void reclassifyMisplacedToppingsFromSize(Menu menu) {
        List<MenuOption> currentSizes = menuOptionRepository
                .findAllByMenuIdAndGroupTypeIn(menu.getId(), List.of(OptionGroupType.SIZE));
        List<MenuOption> misplaced = currentSizes.stream()
                .filter(option -> DEFAULT_TOPPING_ADD_BY_NAME.containsKey(option.getName()))
                .toList();
        if (misplaced.isEmpty()) {
            return;
        }

        Set<String> existingToppingAddNames = menuOptionRepository
                .findAllByMenuIdAndGroupTypeIn(menu.getId(), List.of(OptionGroupType.TOPPING_ADD))
                .stream()
                .map(MenuOption::getName)
                .collect(Collectors.toSet());

        List<MenuOption> toDelete = new ArrayList<>();
        for (MenuOption option : misplaced) {
            DefaultOption def = DEFAULT_TOPPING_ADD_BY_NAME.get(option.getName());
            if (existingToppingAddNames.contains(option.getName())) {
                toDelete.add(option);
                continue;
            }
            option.update(
                    OptionGroupType.TOPPING_ADD,
                    def.name(),
                    def.additionalPrice(),
                    3,
                    def.defaultSelected(),
                    def.displayOrder()
            );
            existingToppingAddNames.add(option.getName());
        }

        if (!toDelete.isEmpty()) {
            List<Long> optionIds = toDelete.stream().map(MenuOption::getId).toList();
            orderItemOptionRepository.detachMenuOptions(optionIds);
            savedMenuOptionRepository.detachMenuOptions(optionIds);
            menuOptionRepository.deleteAll(toDelete);
        }
    }

    /**
     * 토핑 가능 메뉴에 누락된 기본 사이즈/토핑추가/토핑제외 옵션을 보강합니다.
     * 냉모밀 단품이면 PACKAGING만, 냉모밀 세트면 컵밥 옵션+PACKAGING을 맞춥니다.
     * (기존 메뉴 상세 조회 시 자동 보정용)
     */
    @Transactional
    public void ensureDefaultOptions(Menu menu) {
        syncSizeAndToppingOptions(menu, true);
    }

    /**
     * 참치불닭비빔우동은 현재 옵션으로 토핑 가능 여부를 추론해 제외 토핑+PACKAGING을 맞춥니다.
     */
    @Transactional
    public void healBibimUdonOptions(Menu menu) {
        if (!isBibimUdonMenu(menu) || menu.getId() == null) {
            return;
        }
        List<MenuOption> options = menuOptionRepository
                .findAllByMenuIdOrderByDisplayOrderAscIdAsc(menu.getId());
        boolean toppingEnabled = options.stream().anyMatch(option ->
                option.getGroupType() == OptionGroupType.TOPPING_ADD
                        || option.getGroupType() == OptionGroupType.TOPPING_REMOVE
                        || option.getGroupType() == OptionGroupType.PACKAGING);
        syncBibimUdonOptions(menu, toppingEnabled);
    }

    /**
     * 냉모밀 단품은 현재 옵션으로 토핑 가능 여부를 추론해 PACKAGING만 맞춥니다.
     * SIZE/토핑만 남은 과거 데이터와 PACKAGING 누락을 상세 조회 시 교정합니다.
     */
    @Transactional
    public void healNaengmomilOptions(Menu menu) {
        if (!isNaengmomilStandalone(menu) || menu.getId() == null) {
            return;
        }
        List<MenuOption> options = menuOptionRepository
                .findAllByMenuIdOrderByDisplayOrderAscIdAsc(menu.getId());
        boolean toppingEnabled = options.stream().anyMatch(option ->
                option.getGroupType() == OptionGroupType.TOPPING_ADD
                        || option.getGroupType() == OptionGroupType.TOPPING_REMOVE
                        || option.getGroupType() == OptionGroupType.PACKAGING);
        syncNaengmomilPackaging(menu, toppingEnabled);
    }

    /** SIZE 에 잘못 들어간 기본 토핑명인지 (밥 추가 등) */
    public static boolean isDefaultToppingAddName(String name) {
        return DEFAULT_TOPPING_ADD_BY_NAME.containsKey(name);
    }

    /** 메뉴명에 냉모밀이 포함되면 카테고리와 관계없이 냉모밀로 취급한다. */
    public static boolean isNaengmomilMenu(Menu menu) {
        return menu != null && menu.getName() != null && menu.getName().contains(NAENGMOMIL_NAME_MARKER);
    }

    /** 우동 등 컵밥/세트가 아닌 냉모밀 단품 */
    public static boolean isNaengmomilStandalone(Menu menu) {
        return isNaengmomilMenu(menu) && !usesDefaultSizeAndToppingOptions(menu);
    }

    /** 컵밥/세트 카테고리의 냉모밀 포함 메뉴 */
    public static boolean isNaengmomilSet(Menu menu) {
        return isNaengmomilMenu(menu) && usesDefaultSizeAndToppingOptions(menu);
    }

    public static boolean isBibimUdonMenu(Menu menu) {
        return menu != null && BIBIM_UDON_MENU_NAME.equals(menu.getName());
    }

    /** 삼겹소금 계열만 참기름 제외 대상. 이름 부분 일치가 아니라 정확한 메뉴명으로 판별한다. */
    public static boolean isSaltPorkMenu(Menu menu) {
        return menu != null && menu.getName() != null && SALT_PORK_MENU_NAMES.contains(menu.getName());
    }

    /** 컵밥/세트만 기본 사이즈·토핑 보강 대상인지 */
    public static boolean usesDefaultSizeAndToppingOptions(Menu menu) {
        if (menu == null || menu.getCategory() == null || menu.getCategory().getName() == null) {
            return false;
        }
        return DEFAULT_OPTION_CATEGORY_NAMES.contains(menu.getCategory().getName());
    }

    private Category findCategory(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new MenuApiException(
                        HttpStatus.NOT_FOUND,
                        "CATEGORY_NOT_FOUND",
                        "카테고리를 찾을 수 없습니다. id=" + categoryId
                ));
    }

    private Menu findMenu(Long menuId) {
        return menuRepository.findWithCategoryById(menuId)
                .orElseThrow(() -> new MenuNotFoundException(menuId));
    }

    private MenuOption findOption(Long optionId) {
        return menuOptionRepository.findById(optionId)
                .orElseThrow(() -> new MenuApiException(
                        HttpStatus.NOT_FOUND,
                        "MENU_OPTION_NOT_FOUND",
                        "메뉴 옵션을 찾을 수 없습니다. id=" + optionId
                ));
    }

    private void validateCategoryOrderIds(List<Long> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            throw invalidRequest("카테고리 ID 목록은 필수입니다.");
        }
        Set<Long> unique = new HashSet<>();
        for (Long categoryId : categoryIds) {
            if (categoryId == null) {
                throw invalidRequest("카테고리 ID 목록에 null이 포함되어 있습니다.");
            }
            if (!unique.add(categoryId)) {
                throw invalidRequest("카테고리 ID 목록에 중복된 값이 있습니다. id=" + categoryId);
            }
        }
    }

    private void validateCategoryOrderPermutation(List<Long> categoryIds, List<Category> existing) {
        Set<Long> existingIds = existing.stream().map(Category::getId).collect(Collectors.toSet());
        for (Long categoryId : categoryIds) {
            if (!existingIds.contains(categoryId)) {
                throw new MenuApiException(
                        HttpStatus.NOT_FOUND,
                        "CATEGORY_NOT_FOUND",
                        "카테고리를 찾을 수 없습니다. id=" + categoryId
                );
            }
        }
        if (existingIds.size() != categoryIds.size()) {
            throw invalidRequest("모든 카테고리 ID를 한 번씩 포함해야 합니다.");
        }
    }

    private void validateMenuOrderIds(List<Long> menuIds) {
        if (menuIds == null || menuIds.isEmpty()) {
            throw invalidRequest("메뉴 ID 목록은 필수입니다.");
        }
        Set<Long> unique = new HashSet<>();
        for (Long menuId : menuIds) {
            if (menuId == null) {
                throw invalidRequest("메뉴 ID 목록에 null이 포함되어 있습니다.");
            }
            if (!unique.add(menuId)) {
                throw invalidRequest("메뉴 ID 목록에 중복된 값이 있습니다. id=" + menuId);
            }
        }
    }

    private void validateMenuOrderPermutation(List<Long> menuIds, List<Menu> existing) {
        Set<Long> existingIds = existing.stream().map(Menu::getId).collect(Collectors.toSet());
        for (Long menuId : menuIds) {
            if (!existingIds.contains(menuId)) {
                throw new MenuNotFoundException(menuId);
            }
        }
        if (existingIds.size() != menuIds.size()) {
            throw invalidRequest("해당 카테고리의 모든 메뉴 ID를 한 번씩 포함해야 합니다.");
        }
    }

    private MenuApiException invalidRequest(String message) {
        return new MenuApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", message);
    }

    private void validateCategoryNameAvailable(String name, Long categoryId) {
        boolean duplicated = categoryId == null
                ? categoryRepository.existsByName(name)
                : categoryRepository.existsByNameAndIdNot(name, categoryId);
        if (duplicated) {
            throw conflict("DUPLICATE_CATEGORY_NAME", "이미 사용 중인 카테고리명입니다. name=" + name);
        }
    }

    private void validateMenuNameAvailable(Long categoryId, String name, Long menuId) {
        boolean duplicated = menuId == null
                ? menuRepository.existsByCategoryIdAndName(categoryId, name)
                : menuRepository.existsByCategoryIdAndNameAndIdNot(categoryId, name, menuId);
        if (duplicated) {
            throw conflict("DUPLICATE_MENU_NAME", "카테고리 내에 같은 메뉴명이 존재합니다. name=" + name);
        }
    }

    private void validateOptionNameAvailable(Long menuId, String name, Long optionId) {
        boolean duplicated = optionId == null
                ? menuOptionRepository.existsByMenuIdAndName(menuId, name)
                : menuOptionRepository.existsByMenuIdAndNameAndIdNot(menuId, name, optionId);
        if (duplicated) {
            throw conflict("DUPLICATE_MENU_OPTION_NAME", "메뉴 내에 같은 옵션명이 존재합니다. name=" + name);
        }
    }

    private void validateOptionBelongsToMenu(Long menuId, MenuOption option) {
        if (!option.getMenu().getId().equals(menuId)) {
            throw new MenuApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_MENU_OPTION",
                    "해당 메뉴에 속하지 않는 옵션입니다. optionId=" + option.getId()
            );
        }
    }

    private MenuApiException conflict(String code, String message) {
        return new MenuApiException(HttpStatus.CONFLICT, code, message);
    }

    private record DefaultOption(
            String name, int additionalPrice, int displayOrder, boolean defaultSelected) {
    }
}

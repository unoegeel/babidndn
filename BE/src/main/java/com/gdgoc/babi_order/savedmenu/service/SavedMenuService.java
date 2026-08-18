package com.gdgoc.babi_order.savedmenu.service;

import com.gdgoc.babi_order.menu.entity.Menu;
import com.gdgoc.babi_order.menu.entity.MenuOption;
import com.gdgoc.babi_order.menu.entity.SaleStatus;
import com.gdgoc.babi_order.menu.exception.MenuNotFoundException;
import com.gdgoc.babi_order.menu.repository.MenuOptionRepository;
import com.gdgoc.babi_order.menu.repository.MenuRepository;
import com.gdgoc.babi_order.savedmenu.dto.request.SavedMenuCreateRequest;
import com.gdgoc.babi_order.savedmenu.dto.request.SavedMenuOptionRequest;
import com.gdgoc.babi_order.savedmenu.dto.request.SavedMenuUpdateRequest;
import com.gdgoc.babi_order.savedmenu.dto.response.SavedMenuResponse;
import com.gdgoc.babi_order.savedmenu.entity.SavedMenu;
import com.gdgoc.babi_order.savedmenu.entity.SavedMenuOption;
import com.gdgoc.babi_order.savedmenu.entity.SavedMenuStatus;
import com.gdgoc.babi_order.savedmenu.exception.SavedMenuApiException;
import com.gdgoc.babi_order.savedmenu.repository.SavedMenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SavedMenuService {

    private final SavedMenuRepository savedMenuRepository;
    private final MenuRepository menuRepository;
    private final MenuOptionRepository menuOptionRepository;

    public List<SavedMenuResponse> getSavedMenus(String clientKey) {
        return savedMenuRepository.findAllByClientKeyOrderByCreatedAtDescIdDesc(clientKey).stream()
                .map(saved -> SavedMenuResponse.of(saved, resolveStatus(saved)))
                .toList();
    }

    public SavedMenuResponse getSavedMenu(String clientKey, Long savedMenuId) {
        SavedMenu saved = findOwned(clientKey, savedMenuId);
        return SavedMenuResponse.of(saved, resolveStatus(saved));
    }

    @Transactional
    public SavedMenuResponse create(String clientKey, SavedMenuCreateRequest request) {
        Menu menu = requireOrderableMenu(request.getMenuId());
        List<SavedMenuOption> options = buildOptions(menu, request.getOptions());

        SavedMenu saved = new SavedMenu(
                clientKey,
                menu,
                request.getCustomName().trim(),
                menu.getName(),
                menu.getImageUrl(),
                menu.getBasePrice()
        );
        options.forEach(saved::addOption);
        SavedMenu persisted = savedMenuRepository.save(saved);
        return SavedMenuResponse.of(persisted, resolveStatus(persisted));
    }

    @Transactional
    public SavedMenuResponse update(String clientKey, Long savedMenuId, SavedMenuUpdateRequest request) {
        SavedMenu saved = findOwned(clientKey, savedMenuId);
        saved.changeCustomName(request.getCustomName().trim());

        if (isRenameOnly(saved, request.getOptions())) {
            return SavedMenuResponse.of(saved, resolveStatus(saved));
        }

        if (saved.getMenu() == null) {
            throw new SavedMenuApiException(
                    HttpStatus.CONFLICT,
                    "MENU_DISCONTINUED",
                    "판매가 종료된 메뉴는 옵션을 수정할 수 없습니다."
            );
        }
        Menu menu = requireOrderableMenu(saved.getMenu().getId());
        saved.refreshMenuSnapshot(menu);
        saved.replaceOptions(buildOptions(menu, request.getOptions()));
        return SavedMenuResponse.of(saved, resolveStatus(saved));
    }

    @Transactional
    public void delete(String clientKey, Long savedMenuId) {
        SavedMenu saved = findOwned(clientKey, savedMenuId);
        savedMenuRepository.delete(saved);
    }

    SavedMenuStatus resolveStatus(SavedMenu saved) {
        Menu menu = saved.getMenu();
        if (menu == null) {
            return SavedMenuStatus.DISCONTINUED;
        }
        if (menu.getSaleStatus() == SaleStatus.SOLDOUT) {
            return SavedMenuStatus.SOLDOUT;
        }
        if (hasStaleOptions(saved, menu)) {
            return SavedMenuStatus.OPTIONS_STALE;
        }
        return SavedMenuStatus.AVAILABLE;
    }

    private boolean hasStaleOptions(SavedMenu saved, Menu menu) {
        for (SavedMenuOption savedOption : saved.getOptions()) {
            MenuOption live = savedOption.getMenuOption();
            if (live == null) {
                return true;
            }
            if (live.getMenu() == null || !live.getMenu().getId().equals(menu.getId())) {
                return true;
            }
            if (!Objects.equals(live.getGroupType(), savedOption.getOptionGroupSnapshot())) {
                return true;
            }
            if (savedOption.getQuantity() > live.getMaxQuantity()) {
                return true;
            }
        }
        return false;
    }

    private SavedMenu findOwned(String clientKey, Long savedMenuId) {
        SavedMenu saved = savedMenuRepository.findWithDetailsById(savedMenuId)
                .orElseThrow(() -> notFound(savedMenuId));
        if (!saved.getClientKey().equals(clientKey)) {
            throw notFound(savedMenuId);
        }
        return saved;
    }

    private Menu requireOrderableMenu(Long menuId) {
        Menu menu = menuRepository.findById(menuId)
                .orElseThrow(() -> new MenuNotFoundException(menuId));
        if (menu.getSaleStatus() == SaleStatus.SOLDOUT) {
            throw new SavedMenuApiException(
                    HttpStatus.CONFLICT,
                    "MENU_SOLD_OUT",
                    "품절된 메뉴는 저장할 수 없습니다. menuId=" + menu.getId()
            );
        }
        return menu;
    }

    private List<SavedMenuOption> buildOptions(Menu menu, List<SavedMenuOptionRequest> optionRequests) {
        List<SavedMenuOptionRequest> requests = optionRequests == null ? List.of() : optionRequests;
        Set<Long> selectedOptionIds = new HashSet<>();
        List<SavedMenuOption> options = new ArrayList<>();
        for (SavedMenuOptionRequest optionRequest : requests) {
            if (!selectedOptionIds.add(optionRequest.getMenuOptionId())) {
                throw new SavedMenuApiException(
                        HttpStatus.BAD_REQUEST,
                        "DUPLICATE_MENU_OPTION",
                        "같은 메뉴 옵션을 중복해서 선택할 수 없습니다. menuOptionId="
                                + optionRequest.getMenuOptionId()
                );
            }
            MenuOption menuOption = menuOptionRepository.findById(optionRequest.getMenuOptionId())
                    .orElseThrow(() -> new SavedMenuApiException(
                            HttpStatus.NOT_FOUND,
                            "MENU_OPTION_NOT_FOUND",
                            "메뉴 옵션을 찾을 수 없습니다. id=" + optionRequest.getMenuOptionId()
                    ));
            validateOption(menu, menuOption, optionRequest.getQuantity());
            options.add(new SavedMenuOption(menuOption, optionRequest.getQuantity()));
        }
        return options;
    }

    private void validateOption(Menu menu, MenuOption option, Integer quantity) {
        if (!option.getMenu().getId().equals(menu.getId())) {
            throw new SavedMenuApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_MENU_OPTION",
                    "해당 메뉴에 속하지 않는 옵션입니다. menuOptionId=" + option.getId()
            );
        }
        if (quantity > option.getMaxQuantity()) {
            throw new SavedMenuApiException(
                    HttpStatus.BAD_REQUEST,
                    "OPTION_QUANTITY_EXCEEDED",
                    "옵션 최대 수량을 초과했습니다. menuOptionId=" + option.getId()
            );
        }
    }

    private boolean isRenameOnly(SavedMenu saved, List<SavedMenuOptionRequest> optionRequests) {
        Map<Long, Integer> savedQuantities = new HashMap<>();
        for (SavedMenuOption savedOption : saved.getOptions()) {
            if (savedOption.getMenuOption() != null) {
                Long optionId = savedOption.getMenuOption().getId();
                savedQuantities.merge(optionId, savedOption.getQuantity(), Integer::sum);
            }
        }

        Map<Long, Integer> requestedQuantities = new HashMap<>();
        List<SavedMenuOptionRequest> requests = optionRequests == null ? List.of() : optionRequests;
        for (SavedMenuOptionRequest optionRequest : requests) {
            requestedQuantities.merge(
                    optionRequest.getMenuOptionId(),
                    optionRequest.getQuantity(),
                    Integer::sum
            );
        }
        return savedQuantities.equals(requestedQuantities);
    }

    private SavedMenuApiException notFound(Long savedMenuId) {
        return new SavedMenuApiException(
                HttpStatus.NOT_FOUND,
                "SAVED_MENU_NOT_FOUND",
                "나만의 메뉴를 찾을 수 없습니다. id=" + savedMenuId
        );
    }
}

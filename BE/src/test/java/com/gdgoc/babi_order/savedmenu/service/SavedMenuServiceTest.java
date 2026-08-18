package com.gdgoc.babi_order.savedmenu.service;

import com.gdgoc.babi_order.menu.entity.Category;
import com.gdgoc.babi_order.menu.entity.Menu;
import com.gdgoc.babi_order.menu.entity.MenuOption;
import com.gdgoc.babi_order.menu.entity.OptionGroupType;
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
import com.gdgoc.babi_order.savedmenu.exception.SavedMenuApiException;
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
class SavedMenuServiceTest {

    private static final String CLIENT_A = "11111111-1111-1111-1111-111111111111";
    private static final String CLIENT_B = "22222222-2222-2222-2222-222222222222";

    @Mock
    private SavedMenuRepository savedMenuRepository;
    @Mock
    private MenuRepository menuRepository;
    @Mock
    private MenuOptionRepository menuOptionRepository;

    private SavedMenuService savedMenuService;

    @BeforeEach
    void setUp() {
        savedMenuService = new SavedMenuService(
                savedMenuRepository, menuRepository, menuOptionRepository);
    }

    @Test
    void createPersistsSnapshotAndReturnsAvailable() {
        Menu menu = menu(10L, "참치불닭비빔우동", SaleStatus.AVAILABLE);
        MenuOption option = option(417L, menu, "불닭소스 제외", OptionGroupType.TOPPING_REMOVE, 0, 1);
        given(menuRepository.findById(10L)).willReturn(Optional.of(menu));
        given(menuOptionRepository.findById(417L)).willReturn(Optional.of(option));
        given(savedMenuRepository.save(any())).willAnswer(invocation -> {
            SavedMenu saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 1L);
            return saved;
        });

        SavedMenuResponse result = savedMenuService.create(CLIENT_A, new SavedMenuCreateRequest(
                10L, "내 최애 우동", List.of(new SavedMenuOptionRequest(417L, 1))));

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getCustomName()).isEqualTo("내 최애 우동");
        assertThat(result.getMenuId()).isEqualTo(10L);
        assertThat(result.getMenuName()).isEqualTo("참치불닭비빔우동");
        assertThat(result.getMenuPrice()).isEqualTo(5500);
        assertThat(result.getStatus()).isEqualTo("AVAILABLE");
        assertThat(result.getOptions()).extracting(optionResponse -> optionResponse.getName())
                .containsExactly("불닭소스 제외");
    }

    @Test
    void createAllowsSameComboWithDifferentCustomName() {
        Menu menu = menu(10L, "참치불닭비빔우동", SaleStatus.AVAILABLE);
        MenuOption option = option(417L, menu, "불닭소스 제외", OptionGroupType.TOPPING_REMOVE, 0, 1);
        given(menuRepository.findById(10L)).willReturn(Optional.of(menu));
        given(menuOptionRepository.findById(417L)).willReturn(Optional.of(option));
        given(savedMenuRepository.save(any())).willAnswer(invocation -> {
            SavedMenu saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", saved.getCustomName().contains("시험") ? 2L : 1L);
            return saved;
        });

        SavedMenuResponse first = savedMenuService.create(CLIENT_A, new SavedMenuCreateRequest(
                10L, "내 최애 우동", List.of(new SavedMenuOptionRequest(417L, 1))));
        SavedMenuResponse second = savedMenuService.create(CLIENT_A, new SavedMenuCreateRequest(
                10L, "시험 끝나고 먹는 우동", List.of(new SavedMenuOptionRequest(417L, 1))));

        assertThat(first.getId()).isNotEqualTo(second.getId());
        assertThat(first.getCustomName()).isEqualTo("내 최애 우동");
        assertThat(second.getCustomName()).isEqualTo("시험 끝나고 먹는 우동");
    }

    @Test
    void createRejectsSoldOutMenu() {
        Menu menu = menu(10L, "참치불닭비빔우동", SaleStatus.SOLDOUT);
        given(menuRepository.findById(10L)).willReturn(Optional.of(menu));

        assertThatThrownBy(() -> savedMenuService.create(CLIENT_A, new SavedMenuCreateRequest(
                10L, "내 최애 우동", List.of())))
                .isInstanceOf(SavedMenuApiException.class)
                .extracting("code")
                .isEqualTo("MENU_SOLD_OUT");
        verify(savedMenuRepository, never()).save(any());
    }

    @Test
    void createRejectsMissingMenu() {
        given(menuRepository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> savedMenuService.create(CLIENT_A, new SavedMenuCreateRequest(
                999L, "없는 메뉴", List.of())))
                .isInstanceOf(MenuNotFoundException.class);
    }

    @Test
    void createRejectsOptionFromAnotherMenu() {
        Menu menu = menu(10L, "참치불닭비빔우동", SaleStatus.AVAILABLE);
        Menu other = menu(11L, "바비우동", SaleStatus.AVAILABLE);
        MenuOption option = option(50L, other, "계란후라이", OptionGroupType.TOPPING_ADD, 700, 3);
        given(menuRepository.findById(10L)).willReturn(Optional.of(menu));
        given(menuOptionRepository.findById(50L)).willReturn(Optional.of(option));

        assertThatThrownBy(() -> savedMenuService.create(CLIENT_A, new SavedMenuCreateRequest(
                10L, "내 최애 우동", List.of(new SavedMenuOptionRequest(50L, 1)))))
                .isInstanceOf(SavedMenuApiException.class)
                .extracting("code")
                .isEqualTo("INVALID_MENU_OPTION");
    }

    @Test
    void createRejectsQuantityOverMax() {
        Menu menu = menu(10L, "삼겹소금", SaleStatus.AVAILABLE);
        MenuOption option = option(7L, menu, "계란후라이", OptionGroupType.TOPPING_ADD, 700, 3);
        given(menuRepository.findById(10L)).willReturn(Optional.of(menu));
        given(menuOptionRepository.findById(7L)).willReturn(Optional.of(option));

        assertThatThrownBy(() -> savedMenuService.create(CLIENT_A, new SavedMenuCreateRequest(
                10L, "계란 많이", List.of(new SavedMenuOptionRequest(7L, 4)))))
                .isInstanceOf(SavedMenuApiException.class)
                .extracting("code")
                .isEqualTo("OPTION_QUANTITY_EXCEEDED");
    }

    @Test
    void getSavedMenusReturnsOnlyCurrentClient() {
        Menu menu = menu(10L, "참치불닭비빔우동", SaleStatus.AVAILABLE);
        MenuOption option = option(417L, menu, "불닭소스 제외", OptionGroupType.TOPPING_REMOVE, 0, 1);
        SavedMenu owned = savedMenu(1L, CLIENT_A, menu, "내 최애 우동", option, 1);
        given(savedMenuRepository.findAllByClientKeyOrderByCreatedAtDescIdDesc(CLIENT_A))
                .willReturn(List.of(owned));

        List<SavedMenuResponse> result = savedMenuService.getSavedMenus(CLIENT_A);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getCustomName()).isEqualTo("내 최애 우동");
        verify(savedMenuRepository, never()).findAllByClientKeyOrderByCreatedAtDescIdDesc(CLIENT_B);
    }

    @Test
    void getSavedMenuRejectsOtherClient() {
        Menu menu = menu(10L, "참치불닭비빔우동", SaleStatus.AVAILABLE);
        SavedMenu owned = savedMenu(1L, CLIENT_A, menu, "내 최애 우동", null, 1);
        given(savedMenuRepository.findWithDetailsById(1L)).willReturn(Optional.of(owned));

        assertThatThrownBy(() -> savedMenuService.getSavedMenu(CLIENT_B, 1L))
                .isInstanceOf(SavedMenuApiException.class)
                .extracting("code")
                .isEqualTo("SAVED_MENU_NOT_FOUND");
    }

    @Test
    void deleteRejectsOtherClient() {
        Menu menu = menu(10L, "참치불닭비빔우동", SaleStatus.AVAILABLE);
        SavedMenu owned = savedMenu(1L, CLIENT_A, menu, "내 최애 우동", null, 1);
        given(savedMenuRepository.findWithDetailsById(1L)).willReturn(Optional.of(owned));

        assertThatThrownBy(() -> savedMenuService.delete(CLIENT_B, 1L))
                .isInstanceOf(SavedMenuApiException.class)
                .extracting("code")
                .isEqualTo("SAVED_MENU_NOT_FOUND");
        verify(savedMenuRepository, never()).delete(any());
    }

    @Test
    void deleteRemovesOwnedSavedMenu() {
        Menu menu = menu(10L, "참치불닭비빔우동", SaleStatus.AVAILABLE);
        SavedMenu owned = savedMenu(1L, CLIENT_A, menu, "내 최애 우동", null, 1);
        given(savedMenuRepository.findWithDetailsById(1L)).willReturn(Optional.of(owned));

        savedMenuService.delete(CLIENT_A, 1L);

        verify(savedMenuRepository).delete(owned);
    }

    @Test
    void priceChangeKeepsAvailable() {
        Menu menu = menu(10L, "삼겹소금", SaleStatus.AVAILABLE);
        MenuOption option = option(7L, menu, "계란후라이", OptionGroupType.TOPPING_ADD, 900, 3);
        SavedMenu saved = savedMenu(1L, CLIENT_A, menu, "계란 우동", option, 1);
        given(savedMenuRepository.findAllByClientKeyOrderByCreatedAtDescIdDesc(CLIENT_A))
                .willReturn(List.of(saved));

        SavedMenuResponse result = savedMenuService.getSavedMenus(CLIENT_A).getFirst();

        assertThat(result.getStatus()).isEqualTo("AVAILABLE");
        assertThat(result.getOptions().getFirst().getAdditionalPrice()).isEqualTo(700);
    }

    @Test
    void missingLiveOptionIsOptionsStale() {
        Menu menu = menu(10L, "참치불닭비빔우동", SaleStatus.AVAILABLE);
        SavedMenu saved = savedMenu(1L, CLIENT_A, menu, "내 최애 우동", null, 1);
        SavedMenuOption stale = new SavedMenuOption(
                option(417L, menu, "불닭소스 제외", OptionGroupType.TOPPING_REMOVE, 0, 1), 1);
        ReflectionTestUtils.setField(stale, "menuOption", null);
        saved.addOption(stale);
        given(savedMenuRepository.findAllByClientKeyOrderByCreatedAtDescIdDesc(CLIENT_A))
                .willReturn(List.of(saved));

        assertThat(savedMenuService.getSavedMenus(CLIENT_A).getFirst().getStatus())
                .isEqualTo("OPTIONS_STALE");
    }

    @Test
    void groupTypeChangeIsOptionsStale() {
        Menu menu = menu(10L, "삼겹소금", SaleStatus.AVAILABLE);
        MenuOption option = option(7L, menu, "계란후라이", OptionGroupType.TOPPING_ADD, 700, 3);
        SavedMenu saved = savedMenu(1L, CLIENT_A, menu, "계란", option, 1);
        option.update(OptionGroupType.TOPPING_REMOVE, "계란후라이", 700, 3, false, 1);
        given(savedMenuRepository.findAllByClientKeyOrderByCreatedAtDescIdDesc(CLIENT_A))
                .willReturn(List.of(saved));

        assertThat(savedMenuService.getSavedMenus(CLIENT_A).getFirst().getStatus())
                .isEqualTo("OPTIONS_STALE");
    }

    @Test
    void quantityOverCurrentMaxIsOptionsStale() {
        Menu menu = menu(10L, "삼겹소금", SaleStatus.AVAILABLE);
        MenuOption option = option(7L, menu, "계란후라이", OptionGroupType.TOPPING_ADD, 700, 1);
        SavedMenu saved = savedMenu(1L, CLIENT_A, menu, "계란", option, 3);
        given(savedMenuRepository.findAllByClientKeyOrderByCreatedAtDescIdDesc(CLIENT_A))
                .willReturn(List.of(saved));

        assertThat(savedMenuService.getSavedMenus(CLIENT_A).getFirst().getStatus())
                .isEqualTo("OPTIONS_STALE");
    }

    @Test
    void soldOutMenuIsSoldOutEvenIfOptionsStale() {
        Menu menu = menu(10L, "참치불닭비빔우동", SaleStatus.SOLDOUT);
        SavedMenu saved = savedMenu(1L, CLIENT_A, menu, "내 최애 우동", null, 1);
        given(savedMenuRepository.findAllByClientKeyOrderByCreatedAtDescIdDesc(CLIENT_A))
                .willReturn(List.of(saved));

        assertThat(savedMenuService.getSavedMenus(CLIENT_A).getFirst().getStatus())
                .isEqualTo("SOLDOUT");
    }

    @Test
    void detachedMenuIsDiscontinued() {
        SavedMenu saved = savedMenu(1L, CLIENT_A, null, "내 최애 우동", null, 1);
        given(savedMenuRepository.findAllByClientKeyOrderByCreatedAtDescIdDesc(CLIENT_A))
                .willReturn(List.of(saved));

        SavedMenuResponse result = savedMenuService.getSavedMenus(CLIENT_A).getFirst();
        assertThat(result.getStatus()).isEqualTo("DISCONTINUED");
        assertThat(result.getMenuId()).isNull();
        assertThat(result.getMenuName()).isEqualTo("참치불닭비빔우동");
    }

    @Test
    void updateRebuildsOptionSnapshot() {
        Menu menu = menu(10L, "참치불닭비빔우동", SaleStatus.AVAILABLE);
        MenuOption sauce = option(417L, menu, "불닭소스 제외", OptionGroupType.TOPPING_REMOVE, 0, 1);
        MenuOption seaweed = option(418L, menu, "김가루 제외", OptionGroupType.TOPPING_REMOVE, 0, 1);
        SavedMenu saved = savedMenu(1L, CLIENT_A, menu, "내 최애 우동", sauce, 1);
        given(savedMenuRepository.findWithDetailsById(1L)).willReturn(Optional.of(saved));
        given(menuRepository.findById(10L)).willReturn(Optional.of(menu));
        given(menuOptionRepository.findById(418L)).willReturn(Optional.of(seaweed));

        SavedMenuResponse result = savedMenuService.update(CLIENT_A, 1L, new SavedMenuUpdateRequest(
                "내 최애 우동", List.of(new SavedMenuOptionRequest(418L, 1))));

        assertThat(result.getStatus()).isEqualTo("AVAILABLE");
        assertThat(result.getOptions()).extracting(optionResponse -> optionResponse.getName())
                .containsExactly("김가루 제외");
        assertThat(result.getCustomName()).isEqualTo("내 최애 우동");
    }

    @Test
    void updateRejectsDiscontinuedMenuWhenOptionsChange() {
        SavedMenu saved = savedMenu(1L, CLIENT_A, null, "내 최애 우동", null, 1);
        given(savedMenuRepository.findWithDetailsById(1L)).willReturn(Optional.of(saved));

        assertThatThrownBy(() -> savedMenuService.update(CLIENT_A, 1L, new SavedMenuUpdateRequest(
                "내 최애 우동", List.of(new SavedMenuOptionRequest(417L, 1)))))
                .isInstanceOf(SavedMenuApiException.class)
                .extracting("code")
                .isEqualTo("MENU_DISCONTINUED");
    }

    @Test
    void renameOnlyUpdatesCustomNameOnDiscontinuedMenu() {
        SavedMenu saved = savedMenu(1L, CLIENT_A, null, "내 최애 우동", null, 1);
        given(savedMenuRepository.findWithDetailsById(1L)).willReturn(Optional.of(saved));

        SavedMenuResponse result = savedMenuService.update(CLIENT_A, 1L, new SavedMenuUpdateRequest(
                "새 이름", List.of()));

        assertThat(result.getCustomName()).isEqualTo("새 이름");
        assertThat(result.getStatus()).isEqualTo("DISCONTINUED");
        verify(menuRepository, never()).findById(any());
    }

    @Test
    void renameOnlyUpdatesCustomNameOnSoldOutMenu() {
        Menu menu = menu(10L, "참치불닭비빔우동", SaleStatus.SOLDOUT);
        MenuOption sauce = option(417L, menu, "불닭소스 제외", OptionGroupType.TOPPING_REMOVE, 0, 1);
        SavedMenu saved = savedMenu(1L, CLIENT_A, menu, "내 최애 우동", sauce, 1);
        given(savedMenuRepository.findWithDetailsById(1L)).willReturn(Optional.of(saved));

        SavedMenuResponse result = savedMenuService.update(CLIENT_A, 1L, new SavedMenuUpdateRequest(
                "시험 끝나고 먹는 우동", List.of(new SavedMenuOptionRequest(417L, 1))));

        assertThat(result.getCustomName()).isEqualTo("시험 끝나고 먹는 우동");
        assertThat(result.getStatus()).isEqualTo("SOLDOUT");
        verify(menuRepository, never()).findById(any());
    }

    private Category category() {
        Category category = Category.builder().name("면").displayOrder(2).build();
        ReflectionTestUtils.setField(category, "id", 2L);
        return category;
    }

    private Menu menu(Long id, String name, SaleStatus saleStatus) {
        Menu menu = Menu.builder()
                .category(category())
                .name(name)
                .basePrice(5500)
                .imageUrl("https://example.com/menu.jpg")
                .displayOrder(3)
                .saleStatus(saleStatus)
                .build();
        ReflectionTestUtils.setField(menu, "id", id);
        return menu;
    }

    private MenuOption option(
            Long id, Menu menu, String name, OptionGroupType groupType, int price, int maxQuantity) {
        MenuOption option = MenuOption.builder()
                .menu(menu)
                .groupType(groupType)
                .name(name)
                .additionalPrice(price)
                .maxQuantity(maxQuantity)
                .displayOrder(1)
                .build();
        ReflectionTestUtils.setField(option, "id", id);
        return option;
    }

    private SavedMenu savedMenu(
            Long id, String clientKey, Menu menu, String customName, MenuOption liveOption, int quantity) {
        String menuName = menu == null ? "참치불닭비빔우동" : menu.getName();
        String imageUrl = menu == null ? "https://example.com/menu.jpg" : menu.getImageUrl();
        Integer price = menu == null ? 5500 : menu.getBasePrice();
        SavedMenu saved = new SavedMenu(clientKey, menu, customName, menuName, imageUrl, price);
        ReflectionTestUtils.setField(saved, "id", id);
        if (liveOption != null) {
            SavedMenuOption option = new SavedMenuOption(liveOption, quantity);
            if (liveOption.getGroupType() == OptionGroupType.TOPPING_ADD
                    && liveOption.getName().equals("계란후라이")) {
                ReflectionTestUtils.setField(option, "optionGroupSnapshot", OptionGroupType.TOPPING_ADD);
                ReflectionTestUtils.setField(option, "additionalPriceSnapshot", 700);
            }
            saved.addOption(option);
        }
        return saved;
    }
}

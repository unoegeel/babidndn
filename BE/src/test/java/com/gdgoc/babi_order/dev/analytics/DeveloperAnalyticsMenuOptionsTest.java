package com.gdgoc.babi_order.dev.analytics;

import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsMenuOptionsResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class DeveloperAnalyticsMenuOptionsTest {

    private static final Instant FROM = Instant.parse("2026-08-19T00:00:00Z");
    private static final Instant TO = Instant.parse("2026-08-19T23:59:59Z");

    @Mock
    private AnalyticsQueryRepository queryRepository;

    @InjectMocks
    private DeveloperAnalyticsService analyticsService;

    @Test
    void menuOptionsCalculatesSelectionRateFromMenuOptionOpenDenominator() {
        long menuId = 1L;
        given(queryRepository.countMenuEngagedUsers(menuId, FROM, TO)).willReturn(100L);
        given(queryRepository.menuOptionSelections(menuId, FROM, TO)).willReturn(List.of(
                new AnalyticsQueryRepository.MenuOptionSelectionRow(10L, "참기름 제외", "TOPPING_REMOVE", 71L, 0),
                new AnalyticsQueryRepository.MenuOptionSelectionRow(11L, "김가루 제외", "TOPPING_REMOVE", 47L, 0)
        ));
        given(queryRepository.resolveMenuName(menuId)).willReturn("삼겹소금");

        AnalyticsMenuOptionsResponse response = analyticsService.menuOptions(menuId, FROM, TO);

        assertThat(response.getEngagedUsers()).isEqualTo(100);
        assertThat(response.getMenuName()).isEqualTo("삼겹소금");
        assertThat(response.getOptions()).hasSize(2);
        assertThat(response.getOptions().get(0).getSelectionRate()).isEqualTo(71.0);
        assertThat(response.getOptions().get(1).getSelectionRate()).isEqualTo(47.0);
    }

    @Test
    void menuOptionsReturnsEmptyOptionsWhenNoSelections() {
        long menuId = 2L;
        given(queryRepository.countMenuEngagedUsers(menuId, FROM, TO)).willReturn(10L);
        given(queryRepository.menuOptionSelections(menuId, FROM, TO)).willReturn(List.of());
        given(queryRepository.resolveMenuName(menuId)).willReturn("참치마요");

        AnalyticsMenuOptionsResponse response = analyticsService.menuOptions(menuId, FROM, TO);

        assertThat(response.getEngagedUsers()).isEqualTo(10);
        assertThat(response.getOptions()).isEmpty();
    }

    @Test
    void menuOptionsReturnsZeroRateWhenDenominatorIsZero() {
        long menuId = 3L;
        given(queryRepository.countMenuEngagedUsers(menuId, FROM, TO)).willReturn(0L);
        given(queryRepository.menuOptionSelections(menuId, FROM, TO)).willReturn(List.of());
        given(queryRepository.resolveMenuName(menuId)).willReturn("치킨마요");

        AnalyticsMenuOptionsResponse response = analyticsService.menuOptions(menuId, FROM, TO);

        assertThat(response.getEngagedUsers()).isZero();
        assertThat(response.getOptions()).isEmpty();
    }

    @Test
    void menuOptionsUsesDistinctSelectedUsersFromRepository() {
        long menuId = 4L;
        given(queryRepository.countMenuEngagedUsers(eq(menuId), eq(FROM), eq(TO))).willReturn(1L);
        given(queryRepository.menuOptionSelections(menuId, FROM, TO)).willReturn(List.of(
                new AnalyticsQueryRepository.MenuOptionSelectionRow(20L, "참기름 제외", "TOPPING_REMOVE", 1L, 0)
        ));
        given(queryRepository.resolveMenuName(menuId)).willReturn("삼겹소금");

        AnalyticsMenuOptionsResponse response = analyticsService.menuOptions(menuId, FROM, TO);

        assertThat(response.getOptions().getFirst().getSelectedUsers()).isEqualTo(1);
        assertThat(response.getOptions().getFirst().getSelectionRate()).isEqualTo(100.0);
    }
}

package com.gdgoc.babi_order.order.service;

import com.gdgoc.babi_order.menu.entity.Category;
import com.gdgoc.babi_order.menu.entity.Menu;
import com.gdgoc.babi_order.menu.entity.MenuOption;
import com.gdgoc.babi_order.menu.entity.OptionGroupType;
import com.gdgoc.babi_order.menu.entity.SaleStatus;
import com.gdgoc.babi_order.menu.repository.MenuOptionRepository;
import com.gdgoc.babi_order.menu.repository.MenuRepository;
import com.gdgoc.babi_order.order.dto.request.OrderCreateRequest;
import com.gdgoc.babi_order.order.dto.request.OrderItemOptionRequest;
import com.gdgoc.babi_order.order.dto.request.OrderItemRequest;
import com.gdgoc.babi_order.order.dto.response.OrderDetailResponse;
import com.gdgoc.babi_order.order.dto.response.OrderItemOptionResponse;
import com.gdgoc.babi_order.order.dto.response.OrderSummaryResponse;
import com.gdgoc.babi_order.order.dto.response.WaitingCountResponse;
import com.gdgoc.babi_order.order.entity.Order;
import com.gdgoc.babi_order.order.entity.OrderItemOption;
import com.gdgoc.babi_order.order.entity.OrderStatus;
import com.gdgoc.babi_order.order.exception.OrderApiException;
import com.gdgoc.babi_order.order.exception.OrderNotFoundException;
import com.gdgoc.babi_order.order.repository.OrderRepository;
import com.gdgoc.babi_order.order.security.OrderAccessGuard;
import com.gdgoc.babi_order.order.security.OrderAccessTokens;
import com.gdgoc.babi_order.payment.entity.Payment;
import com.gdgoc.babi_order.payment.entity.PaymentStatus;
import com.gdgoc.babi_order.payment.repository.PaymentRepository;
import com.gdgoc.babi_order.push.service.PushNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private MenuRepository menuRepository;

    @Mock
    private MenuOptionRepository menuOptionRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private OrderEventService orderEventService;

    @Mock
    private PushNotificationService pushNotificationService;

    @Mock
    private OrderAccessGuard orderAccessGuard;

    @Mock
    private PickupNumberLock pickupNumberLock;

    private OrderService orderService;

    @BeforeEach
    void setUp() {
        lenient().when(pickupNumberLock.executeExclusive(any())).thenAnswer(invocation -> {
            java.util.function.Supplier<?> supplier = invocation.getArgument(0);
            return supplier.get();
        });
        lenient().when(orderRepository.countActiveAheadInQueue(any(), any(), any()))
                .thenReturn(0L);
        orderService = new OrderService(
                orderRepository,
                menuRepository,
                menuOptionRepository,
                paymentRepository,
                orderEventService,
                pushNotificationService,
                orderAccessGuard,
                pickupNumberLock
        );
    }

    @Test
    void createOrderCalculatesAmountFromServerPrices() {
        Menu menu = menu(1L, SaleStatus.AVAILABLE);
        MenuOption option = option(1L, menu, 1000, 2);
        given(menuRepository.findById(1L)).willReturn(Optional.of(menu));
        given(menuOptionRepository.findById(1L)).willReturn(Optional.of(option));
        given(orderRepository.save(any())).willAnswer(invocation -> {
            Object order = invocation.getArgument(0);
            ReflectionTestUtils.setField(order, "id", 1L);
            return order;
        });
        OrderCreateRequest request = OrderCreateRequest.builder()
                .items(List.of(OrderItemRequest.builder()
                        .menuId(1L)
                        .quantity(2)
                        .options(List.of(OrderItemOptionRequest.builder()
                                .menuOptionId(1L)
                                .quantity(1)
                                .build()))
                        .build()))
                .build();

        OrderDetailResponse result = orderService.createOrder(request);

        assertThat(result.getPickupNumber()).isEqualTo(0);
        assertThat(result.getTotalAmount()).isEqualTo(18000);
        assertThat(result.getPaymentStatus()).isEqualTo("UNPAID");
        assertThat(result.getAccessToken()).isNotBlank();
        assertThat(result.getItems().getFirst().getMenuName()).isEqualTo("바비 비빔밥");
        assertThat(result.getItems().getFirst().getOptions().getFirst().getAdditionalPrice())
                .isEqualTo(1000);
        assertThat(result.getItems().getFirst().getOptions().getFirst().getGroupType())
                .isEqualTo("SIZE");
        verify(orderEventService, org.mockito.Mockito.never()).publish(any(), any());
    }

    @Test
    void createOrderRejectsOptionFromAnotherMenu() {
        Menu orderedMenu = menu(1L, SaleStatus.AVAILABLE);
        Menu anotherMenu = menu(2L, SaleStatus.AVAILABLE);
        MenuOption option = option(1L, anotherMenu, 1000, 1);
        given(menuRepository.findById(1L)).willReturn(Optional.of(orderedMenu));
        given(menuOptionRepository.findById(1L)).willReturn(Optional.of(option));

        assertThatThrownBy(() -> orderService.createOrder(request(1L, 1L, 1)))
                .isInstanceOf(OrderApiException.class)
                .extracting("code")
                .isEqualTo("INVALID_MENU_OPTION");
    }

    @Test
    void createOrderPreservesSizeAddAndRemoveOptionSnapshots() {
        Menu menu = menu(1L, SaleStatus.AVAILABLE);
        MenuOption size = option(1L, menu, OptionGroupType.SIZE, "더블", 1000, 1, 1);
        MenuOption toppingAdd = option(
                2L, menu, OptionGroupType.TOPPING_ADD, "계란후라이", 700, 3, 1);
        MenuOption toppingRemove = option(
                3L, menu, OptionGroupType.TOPPING_REMOVE, "김가루 제외", 0, 1, 1);
        given(menuRepository.findById(1L)).willReturn(Optional.of(menu));
        given(menuOptionRepository.findById(1L)).willReturn(Optional.of(size));
        given(menuOptionRepository.findById(2L)).willReturn(Optional.of(toppingAdd));
        given(menuOptionRepository.findById(3L)).willReturn(Optional.of(toppingRemove));
        given(orderRepository.save(any())).willAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            ReflectionTestUtils.setField(order, "id", 1L);
            return order;
        });
        OrderCreateRequest request = OrderCreateRequest.builder()
                .items(List.of(OrderItemRequest.builder()
                        .menuId(1L)
                        .quantity(1)
                        .options(List.of(
                                optionRequest(1L, 1),
                                optionRequest(2L, 2),
                                optionRequest(3L, 1)
                        ))
                        .build()))
                .build();

        OrderDetailResponse result = orderService.createOrder(request);

        assertThat(result.getItems().getFirst().getOptions())
                .extracting(
                        option -> option.getGroupType(),
                        option -> option.getName(),
                        option -> option.getAdditionalPrice(),
                        option -> option.getQuantity(),
                        option -> option.getDisplayOrder())
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("SIZE", "더블", 1000, 1, 1),
                        org.assertj.core.groups.Tuple.tuple(
                                "TOPPING_ADD", "계란후라이", 700, 2, 1),
                        org.assertj.core.groups.Tuple.tuple(
                                "TOPPING_REMOVE", "김가루 제외", 0, 1, 1)
                );
    }

    @Test
    void createOrderIncludesMenuOptionDisplayOrderForToppingRemoves() {
        Menu menu = menu(1L, SaleStatus.AVAILABLE);
        MenuOption buldak = option(
                11L, menu, OptionGroupType.TOPPING_REMOVE, "불닭소스 제외", 0, 1, 1);
        MenuOption seaweed = option(
                12L, menu, OptionGroupType.TOPPING_REMOVE, "김가루 제외", 0, 1, 2);
        MenuOption greenOnion = option(
                13L, menu, OptionGroupType.TOPPING_REMOVE, "파 제외", 0, 1, 3);
        given(menuRepository.findById(1L)).willReturn(Optional.of(menu));
        given(menuOptionRepository.findById(11L)).willReturn(Optional.of(buldak));
        given(menuOptionRepository.findById(12L)).willReturn(Optional.of(seaweed));
        given(menuOptionRepository.findById(13L)).willReturn(Optional.of(greenOnion));
        given(orderRepository.save(any())).willAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            ReflectionTestUtils.setField(order, "id", 1L);
            return order;
        });
        OrderCreateRequest request = OrderCreateRequest.builder()
                .items(List.of(OrderItemRequest.builder()
                        .menuId(1L)
                        .quantity(1)
                        .options(List.of(
                                optionRequest(13L, 1),
                                optionRequest(11L, 1),
                                optionRequest(12L, 1)
                        ))
                        .build()))
                .build();

        OrderDetailResponse result = orderService.createOrder(request);

        assertThat(result.getItems().getFirst().getOptions())
                .extracting(
                        option -> option.getName(),
                        option -> option.getDisplayOrder())
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("파 제외", 3),
                        org.assertj.core.groups.Tuple.tuple("불닭소스 제외", 1),
                        org.assertj.core.groups.Tuple.tuple("김가루 제외", 2)
                );
    }

    @Test
    void orderItemOptionResponseFallsBackDisplayOrderWhenMenuOptionMissing() {
        Menu menu = menu(1L, SaleStatus.AVAILABLE);
        MenuOption menuOption = option(
                10L, menu, OptionGroupType.TOPPING_REMOVE, "불닭소스 제외", 0, 1, 1);
        OrderItemOption itemOption = new OrderItemOption(menuOption, 1);
        ReflectionTestUtils.setField(itemOption, "id", 50L);
        ReflectionTestUtils.setField(itemOption, "menuOption", null);

        OrderItemOptionResponse response = OrderItemOptionResponse.from(itemOption);

        assertThat(response.getMenuOptionId()).isNull();
        assertThat(response.getName()).isEqualTo("불닭소스 제외");
        assertThat(response.getGroupType()).isEqualTo("TOPPING_REMOVE");
        assertThat(response.getDisplayOrder()).isEqualTo(1);
    }

    @Test
    void createOrderRejectsSoldOutMenu() {
        Menu menu = menu(1L, SaleStatus.SOLDOUT);
        given(menuRepository.findById(1L)).willReturn(Optional.of(menu));

        assertThatThrownBy(() -> orderService.createOrder(OrderCreateRequest.builder()
                        .items(List.of(OrderItemRequest.builder()
                                .menuId(1L)
                                .quantity(1)
                                .options(List.of())
                                .build()))
                        .build()))
                .isInstanceOf(OrderApiException.class)
                .extracting("code")
                .isEqualTo("MENU_SOLD_OUT");
    }

    @Test
    void activateAfterPaymentAssignsPickupNumberFromOneWhenNoOrdersToday() {
        Order unpaid = order(1L, Order.UNASSIGNED_PICKUP_NUMBER);
        given(orderRepository.findById(1L)).willReturn(Optional.of(unpaid));
        givenNoPaidOrdersToday();

        OrderDetailResponse result = orderService.activateAfterPayment(1L);

        assertThat(result.getPickupNumber()).isEqualTo(1);
        assertThat(result.getPaymentStatus()).isEqualTo("DONE");
        verify(orderEventService).publish("ORDER_CREATED", result);
    }

    @Test
    void activateAfterPaymentResetsPickupNumberToOneAfter99() {
        Order unpaid = order(100L, Order.UNASSIGNED_PICKUP_NUMBER);
        given(orderRepository.findById(100L)).willReturn(Optional.of(unpaid));
        givenLatestPickupNumber(99);

        OrderDetailResponse result = orderService.activateAfterPayment(100L);

        assertThat(result.getPickupNumber()).isEqualTo(1);
        verify(orderEventService).publish("ORDER_CREATED", result);
    }

    @Test
    void activateAfterPaymentContinuesFromLatestPaidPickupNumber() {
        Order unpaid = order(11L, Order.UNASSIGNED_PICKUP_NUMBER);
        given(orderRepository.findById(11L)).willReturn(Optional.of(unpaid));
        givenLatestPickupNumber(7);

        OrderDetailResponse result = orderService.activateAfterPayment(11L);

        assertThat(result.getPickupNumber()).isEqualTo(8);
    }

    @Test
    void abandonUnpaidOrderDeletesTemporaryOrder() {
        Order unpaid = order(1L, Order.UNASSIGNED_PICKUP_NUMBER);
        given(orderRepository.findById(1L)).willReturn(Optional.of(unpaid));
        given(paymentRepository.findByOrder_Id(1L)).willReturn(Optional.empty());

        orderService.abandonUnpaidOrder(1L, "token");

        verify(orderAccessGuard).requireCustomerOrderAccess(unpaid, "token");
        verify(orderRepository).delete(unpaid);
    }

    @Test
    void abandonUnpaidOrderRejectsPaidOrder() {
        Order paid = order(1L, 3);
        given(orderRepository.findById(1L)).willReturn(Optional.of(paid));
        given(paymentRepository.findByOrder_Id(1L))
                .willReturn(Optional.of(payment(paid, PaymentStatus.DONE)));

        assertThatThrownBy(() -> orderService.abandonUnpaidOrder(1L, "token"))
                .isInstanceOf(OrderApiException.class)
                .extracting("code")
                .isEqualTo("ORDER_ALREADY_PAID");
    }

    @Test
    void getOrderThrowsExceptionWhenOrderDoesNotExist() {
        given(orderRepository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.getOrder(999L, "token"))
                .isInstanceOf(OrderNotFoundException.class);
    }

    @Test
    void getOrderReturnsUnpaidWhenNoPaymentExists() {
        Order order = order(1L, 1);
        given(orderRepository.findById(1L)).willReturn(Optional.of(order));
        given(paymentRepository.findByOrder_Id(1L)).willReturn(Optional.empty());

        OrderDetailResponse result = orderService.getOrder(1L, "token");

        assertThat(result.getPaymentStatus()).isEqualTo("UNPAID");
        assertThat(result.getAccessToken()).isNull();
        verify(orderAccessGuard).requireCustomerOrderAccess(order, "token");
    }

    @Test
    void getOrderReturnsDoneWhenPaymentIsCompleted() {
        Order order = order(1L, 1);
        Payment payment = payment(order, PaymentStatus.DONE);
        given(orderRepository.findById(1L)).willReturn(Optional.of(order));
        given(paymentRepository.findByOrder_Id(1L)).willReturn(Optional.of(payment));

        OrderDetailResponse result = orderService.getOrder(1L, "token");

        assertThat(result.getPaymentStatus()).isEqualTo("DONE");
        assertThat(result.getAccessToken()).isNull();
    }

    @Test
    void createOrderStoresHashNotRawToken() {
        Menu menu = menu(1L, SaleStatus.AVAILABLE);
        given(menuRepository.findById(1L)).willReturn(Optional.of(menu));
        given(orderRepository.save(any())).willAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            ReflectionTestUtils.setField(order, "id", 1L);
            return order;
        });
        OrderCreateRequest request = OrderCreateRequest.builder()
                .items(List.of(OrderItemRequest.builder()
                        .menuId(1L)
                        .quantity(1)
                        .options(List.of())
                        .build()))
                .build();

        OrderDetailResponse result = orderService.createOrder(request);

        assertThat(result.getAccessToken()).isNotBlank();
        verify(orderRepository, org.mockito.Mockito.atLeastOnce()).save(org.mockito.ArgumentMatchers.argThat(order -> {
            String hash = ((Order) order).getAccessTokenHash();
            return hash != null
                    && hash.length() == 64
                    && !hash.equals(result.getAccessToken())
                    && OrderAccessTokens.matches(result.getAccessToken(), hash);
        }));
    }

    @Test
    void getOrdersExcludesUnpaidOrders() {
        Order paidOrder = order(1L, 1);
        Order unpaidOrder = order(2L, 0);
        Payment payment = payment(paidOrder, PaymentStatus.DONE);
        given(orderRepository.findAllForAdminQueue())
                .willReturn(List.of(paidOrder, unpaidOrder));
        given(paymentRepository.findByOrder_IdIn(List.of(1L, 2L))).willReturn(List.of(payment));

        List<OrderSummaryResponse> result = orderService.getOrders();

        assertThat(result)
                .extracting(OrderSummaryResponse::getId, OrderSummaryResponse::getPaymentStatus)
                .containsExactly(org.assertj.core.groups.Tuple.tuple(1L, "DONE"));
    }

    @Test
    void getWaitingCountCountsPaidPreparingAndReadyOrders() {
        given(orderRepository.countByStatusInAndPaid(
                List.of(OrderStatus.PREPARING, OrderStatus.READY),
                PaymentStatus.DONE)).willReturn(2L);

        WaitingCountResponse result = orderService.getWaitingCount();

        assertThat(result.getWaitingCount()).isEqualTo(2L);
    }

    @Test
    void updateStatusChangesPreparingOrderToReadyAndPublishesEvent() {
        Order order = order(1L, 1);
        given(orderRepository.findById(1L)).willReturn(Optional.of(order));
        given(paymentRepository.findByOrder_Id(1L)).willReturn(Optional.empty());

        OrderDetailResponse result = orderService.updateStatus(1L, OrderStatus.READY);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.READY);
        assertThat(result.getStatus()).isEqualTo("READY");
        verify(orderEventService).publish("ORDER_STATUS_CHANGED", result);
        verify(pushNotificationService).notifyOrderReady(eq(1L), eq(1));
    }

    @Test
    void callCustomerTransitionsPreparingToReady() {
        Order order = order(1L, 1);
        given(orderRepository.findById(1L)).willReturn(Optional.of(order));
        given(paymentRepository.findByOrder_Id(1L)).willReturn(Optional.empty());

        OrderDetailResponse result = orderService.callCustomer(1L);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.READY);
        assertThat(result.getStatus()).isEqualTo("READY");
        verify(orderRepository).saveAndFlush(order);
        verify(orderEventService).publish("ORDER_STATUS_CHANGED", result);
        verify(pushNotificationService).notifyOrderReady(eq(1L), eq(1));
    }

    @Test
    void callCustomerRecallsReadyOrderByTouchingUpdatedAt() {
        Order order = order(1L, 7);
        order.changeStatus(OrderStatus.READY);
        LocalDateTime before = LocalDateTime.of(2026, 8, 10, 12, 0, 0);
        ReflectionTestUtils.setField(order, "updatedAt", before);
        given(orderRepository.findById(1L)).willReturn(Optional.of(order));
        given(paymentRepository.findByOrder_Id(1L)).willReturn(Optional.empty());

        OrderDetailResponse result = orderService.callCustomer(1L);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.READY);
        assertThat(order.getUpdatedAt()).isAfter(before);
        assertThat(result.getStatus()).isEqualTo("READY");
        verify(orderRepository).saveAndFlush(order);
        verify(pushNotificationService).notifyOrderReady(eq(1L), eq(7));
    }

    @Test
    void callCustomerRejectsCompletedOrder() {
        Order order = order(1L, 1);
        order.changeStatus(OrderStatus.COMPLETED);
        given(orderRepository.findById(1L)).willReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.callCustomer(1L))
                .isInstanceOf(OrderApiException.class)
                .extracting("code")
                .isEqualTo("INVALID_ORDER_STATUS_TRANSITION");
    }

    @Test
    void updateStatusRejectsSkippingReadyStatus() {
        Order order = order(1L, 1);
        given(orderRepository.findById(1L)).willReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateStatus(1L, OrderStatus.COMPLETED))
                .isInstanceOf(OrderApiException.class)
                .extracting("code")
                .isEqualTo("INVALID_ORDER_STATUS_TRANSITION");
    }

    @Test
    void updateStatusRejectsChangingCompletedOrder() {
        Order order = order(1L, 1);
        order.changeStatus(OrderStatus.COMPLETED);
        given(orderRepository.findById(1L)).willReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateStatus(1L, OrderStatus.READY))
                .isInstanceOf(OrderApiException.class)
                .extracting("code")
                .isEqualTo("INVALID_ORDER_STATUS_TRANSITION");
    }

    @Test
    void activateAfterPaymentSkipsPickupNumbersStillActive() {
        Order unpaid = order(12L, Order.UNASSIGNED_PICKUP_NUMBER);
        given(orderRepository.findById(12L)).willReturn(Optional.of(unpaid));
        given(orderRepository.findMaxAssignedPickupNumber(any(LocalDateTime.class), any(LocalDateTime.class)))
                .willReturn(3);
        given(orderRepository.findActivePickupNumbers(any(), any(LocalDateTime.class), any(LocalDateTime.class)))
                .willReturn(List.of(4));

        OrderDetailResponse result = orderService.activateAfterPayment(12L);

        assertThat(result.getPickupNumber()).isEqualTo(5);
    }

    private void givenNoPaidOrdersToday() {
        given(orderRepository.findMaxAssignedPickupNumber(any(LocalDateTime.class), any(LocalDateTime.class)))
                .willReturn(0);
        given(orderRepository.findActivePickupNumbers(any(), any(LocalDateTime.class), any(LocalDateTime.class)))
                .willReturn(List.of());
    }

    private void givenLatestPickupNumber(int pickupNumber) {
        given(orderRepository.findMaxAssignedPickupNumber(any(LocalDateTime.class), any(LocalDateTime.class)))
                .willReturn(pickupNumber);
        given(orderRepository.findActivePickupNumbers(any(), any(LocalDateTime.class), any(LocalDateTime.class)))
                .willReturn(List.of());
    }

    private Order order(Long id, Integer pickupNumber) {
        Order order = new Order(pickupNumber);
        ReflectionTestUtils.setField(order, "id", id);
        ReflectionTestUtils.setField(order, "totalAmount", 8000);
        return order;
    }

    private Payment payment(Order order, PaymentStatus status) {
        Payment payment = Payment.builder()
                .order(order)
                .tossOrderId(order.getTossOrderId())
                .paymentKey("payKey-" + order.getId())
                .amount(order.getTotalAmount())
                .status(status)
                .approvedAt(java.time.LocalDateTime.now())
                .build();
        ReflectionTestUtils.setField(payment, "id", order.getId() * 100);
        return payment;
    }

    private OrderCreateRequest request(Long menuId, Long optionId, Integer optionQuantity) {
        return OrderCreateRequest.builder()
                .items(List.of(OrderItemRequest.builder()
                        .menuId(menuId)
                        .quantity(1)
                        .options(List.of(OrderItemOptionRequest.builder()
                                .menuOptionId(optionId)
                                .quantity(optionQuantity)
                                .build()))
                        .build()))
                .build();
    }

    private OrderItemOptionRequest optionRequest(Long optionId, Integer quantity) {
        return OrderItemOptionRequest.builder()
                .menuOptionId(optionId)
                .quantity(quantity)
                .build();
    }

    private Menu menu(Long id, SaleStatus status) {
        Category category = Category.builder().name("밥류").displayOrder(1).build();
        ReflectionTestUtils.setField(category, "id", id);
        Menu menu = Menu.builder()
                .category(category)
                .name("바비 비빔밥")
                .basePrice(8000)
                .displayOrder(1)
                .saleStatus(status)
                .build();
        ReflectionTestUtils.setField(menu, "id", id);
        return menu;
    }

    private MenuOption option(Long id, Menu menu, Integer price, Integer maxQuantity) {
        return option(id, menu, OptionGroupType.SIZE, "곱빼기", price, maxQuantity, 1);
    }

    private MenuOption option(Long id, Menu menu, OptionGroupType groupType, String name,
                              Integer price, Integer maxQuantity) {
        return option(id, menu, groupType, name, price, maxQuantity, 1);
    }

    private MenuOption option(Long id, Menu menu, OptionGroupType groupType, String name,
                              Integer price, Integer maxQuantity, Integer displayOrder) {
        MenuOption option = MenuOption.builder()
                .menu(menu)
                .groupType(groupType)
                .name(name)
                .additionalPrice(price)
                .maxQuantity(maxQuantity)
                .displayOrder(displayOrder)
                .build();
        ReflectionTestUtils.setField(option, "id", id);
        return option;
    }
}

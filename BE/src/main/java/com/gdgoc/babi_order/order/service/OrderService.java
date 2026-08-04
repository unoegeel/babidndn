package com.gdgoc.babi_order.order.service;

import com.gdgoc.babi_order.menu.entity.Menu;
import com.gdgoc.babi_order.menu.entity.MenuOption;
import com.gdgoc.babi_order.menu.entity.SaleStatus;
import com.gdgoc.babi_order.menu.exception.MenuNotFoundException;
import com.gdgoc.babi_order.menu.repository.MenuOptionRepository;
import com.gdgoc.babi_order.menu.repository.MenuRepository;
import com.gdgoc.babi_order.order.dto.request.OrderCreateRequest;
import com.gdgoc.babi_order.order.dto.request.OrderItemOptionRequest;
import com.gdgoc.babi_order.order.dto.request.OrderItemRequest;
import com.gdgoc.babi_order.order.dto.response.OrderDetailResponse;
import com.gdgoc.babi_order.order.dto.response.OrderSummaryResponse;
import com.gdgoc.babi_order.order.entity.Order;
import com.gdgoc.babi_order.order.entity.OrderItem;
import com.gdgoc.babi_order.order.entity.OrderItemOption;
import com.gdgoc.babi_order.order.entity.OrderStatus;
import com.gdgoc.babi_order.order.exception.OrderApiException;
import com.gdgoc.babi_order.order.exception.OrderNotFoundException;
import com.gdgoc.babi_order.order.repository.OrderRepository;
import com.gdgoc.babi_order.payment.entity.Payment;
import com.gdgoc.babi_order.payment.entity.PaymentStatus;
import com.gdgoc.babi_order.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private static final String UNPAID = "UNPAID";
    private static final int MAX_PICKUP_NUMBER = 99;
    private static final ZoneId STORE_ZONE = ZoneId.of("Asia/Seoul");

    private final OrderRepository orderRepository;
    private final MenuRepository menuRepository;
    private final MenuOptionRepository menuOptionRepository;
    private final PaymentRepository paymentRepository;
    private final OrderEventService orderEventService;

    @Transactional
    public OrderDetailResponse createOrder(OrderCreateRequest request) {
        int pickupNumber = nextPickupNumber();
        Order order = new Order(pickupNumber);

        for (OrderItemRequest itemRequest : request.getItems()) {
            order.addItem(createOrderItem(itemRequest));
        }

        Order saved = orderRepository.save(order);
        OrderDetailResponse response = toDetailResponse(saved, UNPAID);
        publishAfterCommit("ORDER_CREATED", response);
        return response;
    }

    public List<OrderSummaryResponse> getOrders() {
        List<Order> orders = orderRepository.findAllByOrderByCreatedAtDescIdDesc();
        Map<Long, PaymentStatus> paymentStatusByOrderId = paymentStatusByOrderId(
                orders.stream().map(Order::getId).toList());

        return orders.stream()
                .map(order -> OrderSummaryResponse.from(order, toPaymentStatusName(
                        paymentStatusByOrderId.get(order.getId()))))
                .toList();
    }

    public OrderDetailResponse getOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));
        PaymentStatus paymentStatus = paymentRepository.findByOrder_Id(orderId)
                .map(Payment::getStatus)
                .orElse(null);
        return toDetailResponse(order, toPaymentStatusName(paymentStatus));
    }

    @Transactional(readOnly = false)
    public OrderDetailResponse updateStatus(Long orderId, OrderStatus nextStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));
        validateStatusTransition(order.getStatus(), nextStatus);
        order.changeStatus(nextStatus);

        PaymentStatus paymentStatus = paymentRepository.findByOrder_Id(orderId)
                .map(Payment::getStatus)
                .orElse(null);
        OrderDetailResponse response = toDetailResponse(order, toPaymentStatusName(paymentStatus));
        publishAfterCommit("ORDER_STATUS_CHANGED", response);
        return response;
    }

    /**
     * 픽업 완료: PREPARING/READY 주문을 COMPLETED 로 변경합니다.
     * (일반 status API 와 달리 PREPARING 에서 COMPLETED 로 바로 전환을 허용)
     */
    @Transactional(readOnly = false)
    public OrderDetailResponse completeOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        OrderStatus current = order.getStatus();
        if (current == OrderStatus.COMPLETED) {
            PaymentStatus paymentStatus = paymentRepository.findByOrder_Id(orderId)
                    .map(Payment::getStatus)
                    .orElse(null);
            return toDetailResponse(order, toPaymentStatusName(paymentStatus));
        }
        if (current != OrderStatus.PREPARING && current != OrderStatus.READY) {
            throw new OrderApiException(
                    HttpStatus.CONFLICT,
                    "INVALID_ORDER_STATUS_TRANSITION",
                    "픽업 완료할 수 없는 주문 상태입니다. 현재 상태=" + current
            );
        }

        order.changeStatus(OrderStatus.COMPLETED);
        orderRepository.saveAndFlush(order);

        PaymentStatus paymentStatus = paymentRepository.findByOrder_Id(orderId)
                .map(Payment::getStatus)
                .orElse(null);
        OrderDetailResponse response = toDetailResponse(order, toPaymentStatusName(paymentStatus));
        publishAfterCommit("ORDER_STATUS_CHANGED", response);
        return response;
    }

    /**
     * 픽업번호는 당일 기준 1~99 순환.
     * 당일 주문이 없거나(일자 변경), 직전 번호가 99면 1부터 다시 시작합니다.
     */
    private int nextPickupNumber() {
        LocalDate today = LocalDate.now(STORE_ZONE);
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();

        return orderRepository
                .findFirstByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDescIdDesc(
                        startOfDay, endOfDay)
                .map(Order::getPickupNumber)
                .map(last -> last >= MAX_PICKUP_NUMBER ? 1 : last + 1)
                .orElse(1);
    }

    /** 결제 완료된 진행 중 주문 중, 나보다 먼저 생성된 주문 수를 계산합니다. */
    private OrderDetailResponse toDetailResponse(Order order, String paymentStatus) {
        int waitingAheadCount = 0;
        if (order.getStatus() == OrderStatus.PREPARING) {
            waitingAheadCount = (int) orderRepository.countByStatusInAndIdLessThanAndPaid(
                    List.of(OrderStatus.PREPARING, OrderStatus.READY),
                    order.getId(),
                    PaymentStatus.DONE);
        }
        return OrderDetailResponse.from(order, paymentStatus, waitingAheadCount);
    }

    private void publishAfterCommit(String eventName, OrderDetailResponse response) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()
                || !TransactionSynchronizationManager.isSynchronizationActive()) {
            orderEventService.publish(eventName, response);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                orderEventService.publish(eventName, response);
            }
        });
    }

    private void validateStatusTransition(OrderStatus currentStatus, OrderStatus nextStatus) {
        if (currentStatus == nextStatus) {
            return;
        }
        boolean valid = switch (currentStatus) {
            case PREPARING -> nextStatus == OrderStatus.READY
                    || nextStatus == OrderStatus.CANCELED;
            case READY -> nextStatus == OrderStatus.COMPLETED
                    || nextStatus == OrderStatus.CANCELED;
            case COMPLETED, CANCELED -> false;
        };
        if (!valid) {
            throw new OrderApiException(
                    HttpStatus.CONFLICT,
                    "INVALID_ORDER_STATUS_TRANSITION",
                    "변경할 수 없는 주문 상태입니다. " + currentStatus + " -> " + nextStatus
            );
        }
    }

    private Map<Long, PaymentStatus> paymentStatusByOrderId(List<Long> orderIds) {
        return paymentRepository.findByOrder_IdIn(orderIds).stream()
                .collect(Collectors.toMap(payment -> payment.getOrder().getId(), Payment::getStatus));
    }

    private String toPaymentStatusName(PaymentStatus status) {
        return status == null ? UNPAID : status.name();
    }

    private OrderItem createOrderItem(OrderItemRequest request) {
        Menu menu = menuRepository.findById(request.getMenuId())
                .orElseThrow(() -> new MenuNotFoundException(request.getMenuId()));
        if (menu.getSaleStatus() == SaleStatus.SOLDOUT) {
            throw new OrderApiException(
                    HttpStatus.CONFLICT,
                    "MENU_SOLD_OUT",
                    "품절된 메뉴는 주문할 수 없습니다. menuId=" + menu.getId()
            );
        }

        OrderItem orderItem = new OrderItem(menu, request.getQuantity());
        List<OrderItemOptionRequest> optionRequests = request.getOptions() == null
                ? List.of() : request.getOptions();
        Set<Long> selectedOptionIds = new HashSet<>();

        for (OrderItemOptionRequest optionRequest : optionRequests) {
            if (!selectedOptionIds.add(optionRequest.getMenuOptionId())) {
                throw new OrderApiException(
                        HttpStatus.BAD_REQUEST,
                        "DUPLICATE_MENU_OPTION",
                        "같은 메뉴 옵션을 중복해서 선택할 수 없습니다. menuOptionId="
                                + optionRequest.getMenuOptionId()
                );
            }
            MenuOption menuOption = menuOptionRepository.findById(optionRequest.getMenuOptionId())
                    .orElseThrow(() -> new OrderApiException(
                            HttpStatus.NOT_FOUND,
                            "MENU_OPTION_NOT_FOUND",
                            "메뉴 옵션을 찾을 수 없습니다. id=" + optionRequest.getMenuOptionId()
                    ));
            validateOption(menu, menuOption, optionRequest.getQuantity());
            orderItem.addOption(new OrderItemOption(menuOption, optionRequest.getQuantity()));
        }
        return orderItem;
    }

    private void validateOption(Menu menu, MenuOption option, Integer quantity) {
        if (!option.getMenu().getId().equals(menu.getId())) {
            throw new OrderApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_MENU_OPTION",
                    "해당 메뉴에 속하지 않는 옵션입니다. menuOptionId=" + option.getId()
            );
        }
        if (quantity > option.getMaxQuantity()) {
            throw new OrderApiException(
                    HttpStatus.BAD_REQUEST,
                    "OPTION_QUANTITY_EXCEEDED",
                    "옵션 최대 수량을 초과했습니다. menuOptionId=" + option.getId()
            );
        }
    }
}

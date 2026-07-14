package com.babidndn.cart; import jakarta.validation.constraints.*; public record CartItemRequest(@NotNull Long menuId,@Positive int quantity,String optionSummary,@PositiveOrZero int optionPrice) {}

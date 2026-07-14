package com.babidndn.menu;
import jakarta.validation.constraints.*;
public record MenuRequest(@NotBlank String name, @PositiveOrZero int price, @NotNull Long categoryId, String description, String imageUrl, boolean soldOut) {}

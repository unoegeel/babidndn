package com.babidndn.payment; import jakarta.validation.constraints.*; public record PaymentRequest(@NotBlank String method,@Positive int amount,String pgTransactionId) {}

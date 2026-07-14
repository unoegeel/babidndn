package com.babidndn.payment; public interface PaymentGateway { Payment request(PaymentRequest request); Payment confirm(PaymentRequest request); }

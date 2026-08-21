package com.gdgoc.babi_order.payment.reconciliation;

import com.gdgoc.babi_order.common.exception.ApiException;
import com.gdgoc.babi_order.payment.reconciliation.dto.PaymentReconciliationResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class PaymentReconciliationServiceTest {

    @Mock
    private PaymentReconciliationQueryRepository queryRepository;

    @InjectMocks
    private PaymentReconciliationService service;

    @Test
    void aggregatesAllIssueTypesAndDefaultsPeriodTo7d() {
        given(queryRepository.findPaymentDoneOrderNotActivated(any())).willReturn(List.of(
                new ReconciliationIssueRow(
                        ReconciliationIssueType.PAYMENT_DONE_ORDER_NOT_ACTIVATED,
                        1L, 10L, 3500, 3500, 0, null,
                        LocalDateTime.of(2026, 8, 10, 12, 0)
                )
        ));
        given(queryRepository.findOrderActivatedWithoutValidPayment(any())).willReturn(List.of());
        given(queryRepository.findPaymentAmountMismatch(any())).willReturn(List.of());
        given(queryRepository.findMultipleValidPayments(any())).willReturn(List.of());

        PaymentReconciliationResponse response = service.reconcile(null);

        assertThat(response.getPeriod()).isEqualTo("7d");
        assertThat(response.getIssueCount()).isEqualTo(1);
        assertThat(response.getIssues().getFirst().getType())
                .isEqualTo(ReconciliationIssueType.PAYMENT_DONE_ORDER_NOT_ACTIVATED);
        assertThat(response.getIssues().getFirst().getSeverity())
                .isEqualTo(ReconciliationSeverity.CRITICAL);
    }

    @Test
    void rejectsUnknownPeriod() {
        assertThatThrownBy(() -> service.reconcile("90d"))
                .isInstanceOf(ApiException.class)
                .extracting("code")
                .isEqualTo("INVALID_REQUEST");
    }

    @Test
    void resolveFromUsesInclusiveRollingWindow() {
        LocalDate today = LocalDate.of(2026, 8, 20);
        assertThat(PaymentReconciliationService.resolveFrom("1d", today))
                .isEqualTo(LocalDateTime.of(2026, 8, 20, 0, 0));
        assertThat(PaymentReconciliationService.resolveFrom("7d", today))
                .isEqualTo(LocalDateTime.of(2026, 8, 14, 0, 0));
        assertThat(PaymentReconciliationService.resolveFrom("30d", today))
                .isEqualTo(LocalDateTime.of(2026, 7, 22, 0, 0));
    }
}

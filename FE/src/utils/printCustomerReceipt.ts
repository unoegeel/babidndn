import type { ReceiptViewModel } from "../types/receipt";

/**
 * 고객용 전자영수증 프린터 출력 진입점 (스텁).
 *
 * 향후 연결 예정:
 *   ReceiptViewModel
 *     → CustomerReceiptPrinterFormatter
 *     → window.Android.printCustomerReceipt(...)
 *
 * 이번 단계에서는 Android bridge를 호출하지 않는다.
 * (주방 주문서 printKitchenTicket 과는 완전히 분리)
 */
export function handlePrintCustomerReceipt(receipt: ReceiptViewModel): void {
  // 프린터 연동 전: 출력 대상 영수증이 준비됐는지 확인만 한다.
  if (!receipt?.tossOrderId) {
    window.alert("출력할 영수증 정보가 없습니다.");
    return;
  }

  window.alert(
    "영수증 출력이 준비되었습니다.\n(실제 프린터 연동은 다음 단계에서 연결됩니다)",
  );
}

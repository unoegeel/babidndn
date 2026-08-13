import type { ReceiptViewModel } from "../types/receipt";

/**
 * 고객용 실물 영수증 출력.
 *
 * ReceiptViewModel → JSON → window.Android.printCustomerReceipt
 * (주방 printKitchenTicket 과는 완전히 분리)
 */
export function handlePrintCustomerReceipt(receipt: ReceiptViewModel): void {
  if (!receipt?.tossOrderId) {
    window.alert("출력할 영수증 정보가 없습니다.");
    return;
  }

  const bridge = window.Android?.printCustomerReceipt;
  if (typeof bridge !== "function") {
    window.alert(
      "영수증 프린터에 연결되지 않았습니다.\n관리자 프린터 앱(Android)에서 다시 시도해 주세요.",
    );
    return;
  }

  bridge.call(window.Android, JSON.stringify(receipt));
}

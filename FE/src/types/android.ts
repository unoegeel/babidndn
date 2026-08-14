/**
 * Android WebView bridge (BabidndnPrinter) 타입.
 * 런타임 계약: printKitchenTicket / printCustomerReceipt — 함수명·인자 변경 금지.
 */
export {};

declare global {
  interface Window {
    Android?: {
      printKitchenTicket: (orderJson: string) => void;
      printCustomerReceipt?: (receiptJson: string) => void;
      downloadFile?: (
        filename: string,
        mimeType: string,
        base64Data: string,
      ) => void;
    };
  }
}

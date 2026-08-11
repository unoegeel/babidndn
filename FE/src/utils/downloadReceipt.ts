import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function captureScale(): number {
  return Math.min(3, typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2);
}

async function captureReceiptElement(element: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: captureScale(),
    useCORS: true,
    logging: false,
  });
}

/** ReceiptTemplate DOM → PNG 다운로드 */
export async function downloadReceiptPng(
  element: HTMLElement,
  orderId: number | string,
): Promise<void> {
  const canvas = await captureReceiptElement(element);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG 생성 실패"))), "image/png");
  });
  triggerDownload(blob, `babidndn-receipt-${orderId}.png`);
}

/** ReceiptTemplate DOM → PDF 다운로드 (세로형, 내용 맞춤) */
export async function downloadReceiptPdf(
  element: HTMLElement,
  orderId: number | string,
): Promise<void> {
  const canvas = await captureReceiptElement(element);
  const imgData = canvas.toDataURL("image/png");
  const scale = captureScale();
  const cssWidthPx = canvas.width / scale;
  const cssHeightPx = canvas.height / scale;

  const pxToMm = (px: number) => (px * 25.4) / 96;
  const marginMm = 4;
  const widthMm = pxToMm(cssWidthPx);
  const heightMm = pxToMm(cssHeightPx);
  const pageWidth = Math.max(widthMm + marginMm * 2, 70);
  const pageHeight = heightMm + marginMm * 2;

  const pdf = new jsPDF({
    orientation: pageHeight >= pageWidth ? "portrait" : "landscape",
    unit: "mm",
    format: [pageWidth, pageHeight],
  });

  pdf.addImage(imgData, "PNG", marginMm, marginMm, widthMm, heightMm);
  pdf.save(`babidndn-receipt-${orderId}.pdf`);
}

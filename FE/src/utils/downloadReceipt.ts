import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  // iOS/WebView: 즉시 revoke 시 다운로드가 끊길 수 있음
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1500);
}

function captureScale(): number {
  return Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2);
}

/** orderedAt → YYYY-MM-DD_HH-mm (파일명용, 괄호 없음) */
function formatOrderedAtForFilename(orderedAt: string): string {
  const match = orderedAt.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) {
    return "unknown";
  }
  return `${match[1]}-${match[2]}-${match[3]}_${match[4]}-${match[5]}`;
}

export type ReceiptDownloadMeta = {
  pickupNumber: number | string;
  orderedAt: string;
};

/** 바비든든_전자영수증_{픽업번호}_{YYYY-MM-DD_HH-mm}.{ext} */
export function buildReceiptDownloadFilename(
  meta: ReceiptDownloadMeta,
  ext: "png" | "pdf",
): string {
  const pickup = String(meta.pickupNumber).trim() || "0";
  const when = formatOrderedAtForFilename(meta.orderedAt);
  return `바비든든_전자영수증_${pickup}_${when}.${ext}`;
}

/**
 * 스크롤/overflow 부모와 분리해 전체 높이로 캡처.
 * ReceiptTemplate 은 html2canvas 호환을 위해 hex/rgba 인라인 색상을 사용한다.
 */
async function captureReceiptElement(element: HTMLElement): Promise<HTMLCanvasElement> {
  const width = Math.ceil(Math.max(element.scrollWidth, element.offsetWidth, 1));
  const height = Math.ceil(Math.max(element.scrollHeight, element.offsetHeight, 1));

  const host = document.createElement("div");
  host.setAttribute("data-receipt-capture-host", "true");
  host.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${width}px`,
    "background:#ffffff",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = `${width}px`;
  clone.style.maxWidth = "none";
  clone.style.margin = "0";
  clone.style.backgroundColor = "#ffffff";
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    const canvas = await html2canvas(clone, {
      backgroundColor: "#ffffff",
      scale: captureScale(),
      useCORS: true,
      logging: false,
      width,
      height: Math.ceil(Math.max(clone.scrollHeight, height)),
      windowWidth: width,
      windowHeight: Math.ceil(Math.max(clone.scrollHeight, height)),
      scrollX: 0,
      scrollY: 0,
    });

    if (!canvas.width || !canvas.height) {
      throw new Error(
        `html2canvas empty canvas: ${canvas.width}x${canvas.height} (element ${width}x${height})`,
      );
    }

    return canvas;
  } finally {
    host.remove();
  }
}

/** ReceiptTemplate DOM → PNG 다운로드 */
export async function downloadReceiptPng(
  element: HTMLElement,
  meta: ReceiptDownloadMeta,
): Promise<void> {
  let canvas: HTMLCanvasElement;
  try {
    canvas = await captureReceiptElement(element);
  } catch (err) {
    console.error("Failed to download receipt (html2canvas/PNG capture):", err);
    throw err;
  }

  let blob: Blob;
  try {
    blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))),
        "image/png",
      );
    });
  } catch (err) {
    console.error("Failed to download receipt (PNG toBlob):", err);
    throw err;
  }

  try {
    triggerDownload(blob, buildReceiptDownloadFilename(meta, "png"));
  } catch (err) {
    console.error("Failed to download receipt (PNG triggerDownload):", err);
    throw err;
  }
}

/** ReceiptTemplate DOM → PDF 다운로드 (세로형, 내용 맞춤) */
export async function downloadReceiptPdf(
  element: HTMLElement,
  meta: ReceiptDownloadMeta,
): Promise<void> {
  let canvas: HTMLCanvasElement;
  try {
    canvas = await captureReceiptElement(element);
  } catch (err) {
    console.error("Failed to download receipt (html2canvas/PDF capture):", err);
    throw err;
  }

  let imgData: string;
  try {
    imgData = canvas.toDataURL("image/png");
    if (!imgData.startsWith("data:image/png")) {
      throw new Error("canvas.toDataURL did not return PNG data URL");
    }
  } catch (err) {
    console.error("Failed to download receipt (PDF toDataURL):", err);
    throw err;
  }

  try {
    const scale = captureScale();
    const cssWidthPx = canvas.width / scale;
    const cssHeightPx = canvas.height / scale;

    const pxToMm = (px: number) => (px * 25.4) / 96;
    const marginMm = 4;
    const widthMm = pxToMm(cssWidthPx);
    const heightMm = pxToMm(cssHeightPx);
    const pageWidth = Math.max(widthMm + marginMm * 2, 70);
    const pageHeight = Math.max(heightMm + marginMm * 2, 50);

    if (![pageWidth, pageHeight, widthMm, heightMm].every((n) => Number.isFinite(n) && n > 0)) {
      throw new Error(
        `Invalid PDF page size: page=${pageWidth}x${pageHeight} img=${widthMm}x${heightMm}`,
      );
    }

    const pdf = new jsPDF({
      orientation: pageHeight >= pageWidth ? "portrait" : "landscape",
      unit: "mm",
      format: [pageWidth, pageHeight],
    });

    const filename = buildReceiptDownloadFilename(meta, "pdf");
    pdf.addImage(imgData, "PNG", marginMm, marginMm, widthMm, heightMm);
    pdf.save(filename);
  } catch (err) {
    console.error("Failed to download receipt (jsPDF):", err);
    throw err;
  }
}

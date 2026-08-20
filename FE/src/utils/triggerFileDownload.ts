/** UTF-8 문자열 → standard base64 (한글 포함. btoa(raw) 금지) */
export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("FileReader did not return data URL"));
        return;
      }
      const comma = result.indexOf(",");
      if (comma < 0) {
        reject(new Error("Invalid data URL from FileReader"));
        return;
      }
      resolve(result.slice(comma + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

function triggerBrowserDownload(blob: Blob, filename: string) {
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

export type FileDownloadResult = {
  filename: string;
  /** Android WebView downloadFile 브릿지 사용 여부 */
  usedNativeBridge: boolean;
};

/**
 * Blob 파일 다운로드 — Android WebView는 downloadFile 브릿지 우선, 그 외 `<a download>`.
 */
export async function triggerFileDownload(
  blob: Blob,
  filename: string,
  mimeType: string,
): Promise<FileDownloadResult> {
  const downloadFile = window.Android?.downloadFile;
  if (typeof downloadFile === "function") {
    try {
      const base64 = await blobToBase64(blob);
      downloadFile.call(window.Android, filename, mimeType, base64);
      return { filename, usedNativeBridge: true };
    } catch (err) {
      console.warn("Native downloadFile failed, falling back to browser download:", err);
    }
  }

  triggerBrowserDownload(blob, filename);
  return { filename, usedNativeBridge: false };
}

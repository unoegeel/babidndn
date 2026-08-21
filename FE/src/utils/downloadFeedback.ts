import type { FileDownloadResult } from "./triggerFileDownload";

/**
 * 다운로드 trigger 성공 후 사용자 안내.
 * 일반 브라우저는 OS 저장 경로를 알 수 없으므로 가짜 절대경로를 표시하지 않는다.
 */
export function notifyFileDownloadStarted(result: FileDownloadResult): void {
  const lines = ["파일 다운로드를 시작했습니다.", `파일: ${result.filename}`];

  if (result.usedNativeBridge) {
    lines.push("앱에서 저장한 위치 또는 기기의 파일 앱에서 확인해 주세요.");
  } else {
    lines.push("브라우저의 다운로드 목록 또는 기본 다운로드 위치에서 확인해 주세요.");
  }

  alert(lines.join("\n"));
}

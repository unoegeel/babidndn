export function formatErrorTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const HTTP_STATUS_LABELS: Record<number, string> = {
  200: "성공",
  201: "생성됨",
  204: "내용 없음",
  400: "잘못된 요청",
  401: "인증 필요",
  403: "권한 없음",
  404: "찾을 수 없음",
  409: "충돌",
  422: "처리 불가",
  500: "서버 오류",
  502: "게이트웨이 오류",
  503: "서비스 불가",
};

export function formatHttpStatus(status: number): string {
  const label = HTTP_STATUS_LABELS[status];
  return label ? `${status} · ${label}` : String(status);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  const remainSec = Math.round(seconds % 60);
  return `${minutes}m ${remainSec}s`;
}

export function durationSpeedClass(ms: number): string {
  if (ms < 200) return "text-emerald-400";
  if (ms < 1000) return "text-amber-300";
  return "text-rose-300";
}

export function statusBadgeClass(status: number): string {
  if (status >= 500) return "bg-rose-500/15 text-rose-300";
  if (status >= 400) return "bg-amber-500/15 text-amber-300";
  return "bg-emerald-500/15 text-emerald-300";
}

export function sourceBadgeClass(source: "FRONTEND" | "BACKEND"): string {
  return source === "FRONTEND"
    ? "bg-sky-500/15 text-sky-300"
    : "bg-rose-500/15 text-rose-300";
}

export async function copyText(value: string): Promise<boolean> {
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function statusLabel(status?: number | null): string {
  if (status == null) return "-";
  return formatHttpStatus(status);
}

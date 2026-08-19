export function formatErrorTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
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
  return String(status);
}

/**
 * 서버(Asia/Seoul) 시각 문자열 파싱·포맷
 *
 * 백엔드는 오프셋 없는 LocalDateTime("2026-08-06T11:20:00")을 내려주며,
 * 값은 매장 기준(Asia/Seoul) 벽시계입니다.
 */

const SEOUL = "Asia/Seoul";

function hasTimezone(iso: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso.trim());
}

/** 나이브 시각을 Asia/Seoul 오프셋이 있는 ISO로 정규화 */
function toSeoulInstantInput(iso: string): string {
  const trimmed = iso.trim();
  if (hasTimezone(trimmed)) {
    return trimmed;
  }
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  return `${normalized}+09:00`;
}

export function parseServerDate(iso: string): Date {
  return new Date(toSeoulInstantInput(iso));
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function partsInSeoul(iso: string): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
} | null {
  const d = parseServerDate(iso);
  if (Number.isNaN(d.getTime())) return null;

  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const bag = Object.fromEntries(
    fmt.formatToParts(d).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  );
  return {
    year: bag.year,
    month: bag.month,
    day: bag.day,
    hour: bag.hour,
    minute: bag.minute,
  };
}

/** "14:48" (주문 보드) */
export function formatServerTime(iso: string): string {
  const p = partsInSeoul(iso);
  if (!p) return iso;
  return `${p.hour}:${p.minute}`;
}

/** "2026.07.09 14:48" (결제 내역) */
export function formatServerDateTime(iso: string): string {
  const p = partsInSeoul(iso);
  if (!p) return iso;
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`;
}

/** "2026-07-09 14:48" (유저 주문 현황) */
export function formatServerDateTimeDash(iso: string): string {
  const p = partsInSeoul(iso);
  if (!p) return iso;
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

export { pad2 };

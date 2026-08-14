/**
 * 서버(Asia/Seoul) LocalDateTime 단일 진입점
 *
 * 역할 구분:
 * - formatServer*: 표시용. 오프셋 없는 벽시계 숫자를 TZ 변환 없이 재조립.
 * - serverInstantMs: 비교/필터용. 오프셋 없는 값은 서울(+09:00) instant, 이미 offset/Z면 그대로.
 * - seoulDateKey / seoulDayBoundsMs: 서울 달력일·일 경계(ms).
 *
 * 백엔드는 오프셋 없는 벽시계 문자열을 내려줍니다. (예: "2026-08-06T11:20:00")
 * 표시 시 UTC로 오해해 Z/+09:00을 붙이면 9시간이 어긋나므로 format* 은 숫자만 사용합니다.
 */

const SEOUL = "Asia/Seoul";

type ServerDateParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
};

function parseWallClock(iso: string): ServerDateParts | null {
  const trimmed = iso.trim();
  // 오프셋/Z가 있어도 앞의 벽시계 숫자만 사용 (서버 LocalDateTime 표시 기준)
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/,
  );
  if (!match) return null;
  return {
    year: match[1],
    month: match[2],
    day: match[3],
    hour: match[4],
    minute: match[5],
  };
}

/** 이미 타임존 오프셋 또는 Z가 붙은 ISO인지 */
function hasExplicitOffset(iso: string): boolean {
  return /[zZ]$/.test(iso) || /[+-]\d{2}:\d{2}$/.test(iso) || /[+-]\d{4}$/.test(iso);
}

/**
 * 서버 시각 문자열 → epoch ms (비교/필터용).
 * - 오프셋/Z 있음: 기존 ISO 의미 유지 (이중 +09:00 금지)
 * - 오프셋 없음: Asia/Seoul 벽시계로 해석
 */
export function serverInstantMs(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return NaN;

  if (hasExplicitOffset(trimmed)) {
    return Date.parse(trimmed);
  }

  const normalized = trimmed.includes("T")
    ? trimmed
    : trimmed.replace(" ", "T");

  // 날짜만
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return Date.parse(`${normalized}T00:00:00.000+09:00`);
  }

  // YYYY-MM-DDTHH:mm[:ss[.SSS]]
  const match = normalized.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/,
  );
  if (!match) return NaN;

  const date = match[1];
  const hour = match[2];
  const minute = match[3];
  const second = match[4] ?? "00";
  const msPart = match[5];
  const frac = msPart !== undefined ? `.${msPart.padEnd(3, "0")}` : "";
  return Date.parse(`${date}T${hour}:${minute}:${second}${frac}+09:00`);
}

/** Asia/Seoul 기준 YYYY-MM-DD */
export function seoulDateKey(now: Date | number = Date.now()): string {
  const d = typeof now === "number" ? new Date(now) : now;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** 서울 달력일 00:00:00.000 ~ 23:59:59.999 (포함) epoch ms */
export function seoulDayBoundsMs(
  dateStr: string,
): { startMs: number; endMs: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const startMs = Date.parse(`${dateStr}T00:00:00.000+09:00`);
  const endMs = Date.parse(`${dateStr}T23:59:59.999+09:00`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  return { startMs, endMs };
}

/** "14:48" (주문 보드) */
export function formatServerTime(iso: string): string {
  const p = parseWallClock(iso);
  if (!p) return iso;
  return `${p.hour}:${p.minute}`;
}

/** "2026.07.09 14:48" (결제 내역) */
export function formatServerDateTime(iso: string): string {
  const p = parseWallClock(iso);
  if (!p) return iso;
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`;
}

/** "2026-07-09 14:48" (유저 주문 현황) */
export function formatServerDateTimeDash(iso: string): string {
  const p = parseWallClock(iso);
  if (!p) return iso;
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

const SEOUL_WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const EN_WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};
const DAY_MS = 24 * 60 * 60 * 1000;

/** 서울 달력일 요일 인덱스 (일=0 … 토=6) */
export function seoulWeekdayIndex(dateStr: string): number | null {
  const bounds = seoulDayBoundsMs(dateStr);
  if (!bounds) return null;
  const noon = new Date(bounds.startMs + 12 * 60 * 60 * 1000);
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: SEOUL,
    weekday: "short",
  }).format(noon);
  return EN_WEEKDAY_INDEX[short] ?? null;
}

/** 서울 달력일 요일 한글 한 글자 */
export function seoulWeekdayLabel(dateStr: string): string | null {
  const index = seoulWeekdayIndex(dateStr);
  if (index === null) return null;
  return SEOUL_WEEKDAY_LABELS[index];
}

/** "2026-08-13 (목)" */
export function formatSeoulDateWithWeekday(dateStr: string): string {
  const weekday = seoulWeekdayLabel(dateStr);
  return weekday ? `${dateStr} (${weekday})` : dateStr;
}

/** 해당 서울 날짜가 속한 주의 월요일 (월~일) */
export function seoulMondayOf(dateStr: string): string | null {
  const bounds = seoulDayBoundsMs(dateStr);
  const index = seoulWeekdayIndex(dateStr);
  if (!bounds || index === null) return null;
  const daysFromMonday = index === 0 ? 6 : index - 1;
  return seoulDateKey(bounds.startMs - daysFromMonday * DAY_MS);
}

/** 해당 서울 날짜가 속한 주의 일요일 (월~일) */
export function seoulSundayOf(dateStr: string): string | null {
  const monday = seoulMondayOf(dateStr);
  const bounds = monday ? seoulDayBoundsMs(monday) : null;
  if (!bounds) return null;
  return seoulDateKey(bounds.startMs + 6 * DAY_MS);
}

/** 서울 달력일 기준 일 가감. last3(오늘 포함 3일)과 같은 포함 기간 계산용 */
export function addSeoulCalendarDays(dateStr: string, days: number): string | null {
  const bounds = seoulDayBoundsMs(dateStr);
  if (!bounds) return null;
  return seoulDateKey(bounds.startMs + days * DAY_MS);
}

/** 서울 달력일 기준 월 가감 (말일 overflow는 해당 월 말일로 클램프) */
export function addSeoulCalendarMonths(dateStr: string, months: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  const utc = Date.UTC(year, month - 1 + months, 1);
  const next = new Date(utc);
  const nextYear = next.getUTCFullYear();
  const nextMonth = next.getUTCMonth();
  const lastDay = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDay);
  return `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}

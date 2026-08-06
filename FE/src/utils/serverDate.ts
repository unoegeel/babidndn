/**
 * 서버(Asia/Seoul) LocalDateTime 표시 유틸
 *
 * 백엔드는 오프셋 없는 벽시계 문자열을 내려줍니다. (예: "2026-08-06T11:20:00")
 * 이미 매장 시각이므로 Date/타임존 변환 없이 숫자만 다시 포맷합니다.
 * (UTC로 오해해 Z/+09:00을 붙이면 9시간이 어긋납니다.)
 */

type ServerDateParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
};

function parseWallClock(iso: string): ServerDateParts | null {
  const trimmed = iso.trim();
  // 오프셋/Z가 있어도 앞의 벽시계 숫자만 사용 (서버 LocalDateTime 기준)
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

/** @deprecated 표시용으로는 formatServer* 사용. 비교가 필요할 때만 사용 */
export function parseServerDate(iso: string): Date {
  const parts = parseWallClock(iso);
  if (!parts) return new Date(NaN);
  // 벽시계를 Asia/Seoul로 해석
  return new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00+09:00`,
  );
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

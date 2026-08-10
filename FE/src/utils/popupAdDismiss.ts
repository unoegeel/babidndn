import { seoulDateKey } from "./serverDate";

const TODAY_KEY = "babi_popup_dismissed_today"; // { [id: string]: "YYYY-MM-DD" }
const SESSION_CLOSED_KEY = "babi_popup_session_closed";

function readTodayMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TODAY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function writeTodayMap(map: Record<string, string>) {
  localStorage.setItem(TODAY_KEY, JSON.stringify(map));
}

/** 자정이 지나면 자동으로 무효 — 오늘 날짜와 다르면 숨김 해제 */
export function isPopupDismissedToday(id: number): boolean {
  if (typeof window === "undefined") return false;
  const today = seoulDateKey();
  const map = readTodayMap();
  return map[String(id)] === today;
}

export function dismissPopupToday(id: number) {
  if (typeof window === "undefined") return;
  const map = readTodayMap();
  map[String(id)] = seoulDateKey();
  writeTodayMap(map);
}

export function isPopupClosedThisSession(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_CLOSED_KEY) === "1";
}

export function closePopupThisSession() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_CLOSED_KEY, "1");
}

export function shouldShowPopupAd(id: number): boolean {
  return !isPopupDismissedToday(id);
}

export function filterShowablePopupAds<T extends { id: number }>(ads: T[]): T[] {
  if (isPopupClosedThisSession()) return [];
  return ads.filter((ad) => shouldShowPopupAd(ad.id));
}

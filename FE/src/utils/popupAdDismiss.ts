const FOREVER_KEY = "babi_popup_dismissed_forever";
const SESSION_KEY = "babi_popup_dismissed_session";

function readIds(storage: Storage, key: string): number[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

function writeIds(storage: Storage, key: string, ids: number[]) {
  storage.setItem(key, JSON.stringify([...new Set(ids)]));
}

export function isPopupDismissedForever(id: number): boolean {
  if (typeof window === "undefined") return false;
  return readIds(localStorage, FOREVER_KEY).includes(id);
}

export function isPopupDismissedThisSession(id: number): boolean {
  if (typeof window === "undefined") return false;
  return readIds(sessionStorage, SESSION_KEY).includes(id);
}

export function dismissPopupForever(id: number) {
  if (typeof window === "undefined") return;
  const ids = readIds(localStorage, FOREVER_KEY);
  ids.push(id);
  writeIds(localStorage, FOREVER_KEY, ids);
}

export function dismissPopupThisSession(id: number) {
  if (typeof window === "undefined") return;
  const ids = readIds(sessionStorage, SESSION_KEY);
  ids.push(id);
  writeIds(sessionStorage, SESSION_KEY, ids);
}

export function shouldShowPopupAd(id: number): boolean {
  return !isPopupDismissedForever(id) && !isPopupDismissedThisSession(id);
}

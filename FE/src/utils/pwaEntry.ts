const ENTRY_KEY = "babi_pwa_entry";

export type PwaEntry = "user" | "admin";

/** 유저/관리자 화면 방문 시 PWA 시작 경로 기억 */
export function rememberPwaEntry(entry: PwaEntry) {
  try {
    localStorage.setItem(ENTRY_KEY, entry);
  } catch {
    // 저장소 불가 시 무시
  }
}

export function readPwaEntry(): PwaEntry {
  try {
    const value = localStorage.getItem(ENTRY_KEY);
    if (value === "admin" || value === "user") return value;
  } catch {
    // ignore
  }
  return "user";
}

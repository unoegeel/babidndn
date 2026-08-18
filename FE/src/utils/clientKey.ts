const STORAGE_KEY = "babi_client_key";

function createUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** 브라우저별 익명 식별자. 없으면 생성해 localStorage에 저장한다. */
export function getClientKey(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && existing.trim()) {
      return existing.trim();
    }
  } catch {
    // 저장소 불가 시 세션 동안만 유지
  }

  const created = createUuid();
  try {
    localStorage.setItem(STORAGE_KEY, created);
  } catch {
    // ignore
  }
  return created;
}

export const CLIENT_KEY_HEADER = "X-Client-Key";

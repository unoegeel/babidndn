const STORAGE_KEY = "babi_order_access_tokens";

type TokenMap = Record<string, string>;

function readMap(): TokenMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: TokenMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string" && value.trim()) {
        out[key] = value.trim();
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeMap(map: TokenMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

export const ORDER_ACCESS_TOKEN_HEADER = "X-Order-Access-Token";

export function getOrderAccessToken(orderId: string | number): string | null {
  const token = readMap()[String(orderId)];
  return token && token.trim() ? token.trim() : null;
}

export function saveOrderAccessToken(orderId: string | number, rawToken: string): void {
  if (!rawToken || !rawToken.trim()) return;
  const map = readMap();
  map[String(orderId)] = rawToken.trim();
  writeMap(map);
}

export function removeOrderAccessToken(orderId: string | number): void {
  const map = readMap();
  delete map[String(orderId)];
  writeMap(map);
}

/** API 요청용 헤더. 토큰이 없으면 빈 객체 (fake token 생성 금지). */
export function orderAccessTokenHeaders(
  orderId: string | number,
): Record<string, string> {
  const token = getOrderAccessToken(orderId);
  if (!token) return {};
  return { [ORDER_ACCESS_TOKEN_HEADER]: token };
}

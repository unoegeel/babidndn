/** pathname에서 숫자 ID 등을 일반화해 route template로 변환 */

const NUMERIC_SEGMENT = /^\d+$/;

export function sanitizeRoute(pathname: string): string {
  const raw = pathname.split("?")[0]?.split("#")[0] ?? "/";
  const segments = raw.split("/").filter(Boolean);
  const sanitized = segments.map((segment) =>
    NUMERIC_SEGMENT.test(segment) ? ":id" : segment,
  );
  return sanitized.length === 0 ? "/" : `/${sanitized.join("/")}`;
}

const SENSITIVE_PATTERNS = [
  /Bearer\s+\S+/gi,
  /password\s*[:=]\s*\S+/gi,
  /token\s*[:=]\s*\S+/gi,
  /authorization\s*[:=]\s*\S+/gi,
];

export function sanitizeText(value: string, maxLength: number): string {
  let text = value.replace(/\0/g, "").trim();
  for (const pattern of SENSITIVE_PATTERNS) {
    text = text.replace(pattern, "[redacted]");
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}…`;
}

export function sanitizeOptionalText(
  value: string | undefined,
  maxLength: number,
): string | undefined {
  if (value == null || value.trim() === "") {
    return undefined;
  }
  return sanitizeText(value, maxLength);
}

const VALID_REQUEST_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function sanitizeRelatedRequestId(value: string | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!VALID_REQUEST_ID.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

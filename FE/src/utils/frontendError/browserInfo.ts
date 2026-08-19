/** navigator 기반 browser/platform 추정 (외부 UA parser 없음) */

export interface BrowserInfo {
  browser?: string;
  platform?: string;
  userAgent?: string;
}

export function detectBrowserInfo(): BrowserInfo {
  if (typeof navigator === "undefined") {
    return {};
  }

  const userAgent = navigator.userAgent ?? "";
  const platform = navigator.platform || undefined;

  let browser: string | undefined;
  if (/Edg\//i.test(userAgent)) {
    browser = "Edge";
  } else if (/CriOS/i.test(userAgent)) {
    browser = "Chrome iOS";
  } else if (/Chrome/i.test(userAgent) && !/Chromium/i.test(userAgent)) {
    browser = "Chrome";
  } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
    browser = "Safari";
  } else if (/Firefox/i.test(userAgent)) {
    browser = "Firefox";
  }

  return {
    browser,
    platform,
    userAgent,
  };
}

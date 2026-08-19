import { adminApi } from "../../api/client";
import type {
  AnalyticsFunnel,
  AnalyticsMenus,
  AnalyticsOptions,
  AnalyticsOverview,
} from "../../types/developerAnalytics";

function buildQuery(from: string, to: string): string {
  const params = new URLSearchParams({ from, to });
  return `?${params.toString()}`;
}

export const developerAnalyticsService = {
  overview(from: string, to: string): Promise<AnalyticsOverview> {
    return adminApi.get<AnalyticsOverview>(`/api/dev/analytics/overview${buildQuery(from, to)}`);
  },

  funnel(from: string, to: string): Promise<AnalyticsFunnel> {
    return adminApi.get<AnalyticsFunnel>(`/api/dev/analytics/funnel${buildQuery(from, to)}`);
  },

  menus(from: string, to: string): Promise<AnalyticsMenus> {
    return adminApi.get<AnalyticsMenus>(`/api/dev/analytics/menus${buildQuery(from, to)}`);
  },

  options(from: string, to: string): Promise<AnalyticsOptions> {
    return adminApi.get<AnalyticsOptions>(`/api/dev/analytics/options${buildQuery(from, to)}`);
  },
};

/** Asia/Seoul 기준 오늘 00:00:00 ISO UTC */
export function seoulTodayStart(): string {
  const now = new Date();
  const seoulOffset = 9 * 60; // +09:00
  const localMs = now.getTime() + (seoulOffset - now.getTimezoneOffset()) * 60 * 1000;
  const local = new Date(localMs);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  const d = String(local.getUTCDate()).padStart(2, "0");
  // 한국 자정 = UTC -9시간
  return new Date(`${y}-${m}-${d}T00:00:00+09:00`).toISOString();
}

export function seoulNow(): string {
  return new Date().toISOString();
}

export function daysAgoUtc(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

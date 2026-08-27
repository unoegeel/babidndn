import { adminApi } from "../../api/client";
import type {
  ControlCenterFunnel,
  ControlCenterInsights,
  ControlCenterMenus,
  ControlCenterOperations,
  ControlCenterOverview,
  ControlCenterPayments,
  ControlCenterPerformance,
  ControlCenterReliability,
  ControlCenterSales,
} from "../../types/developerAnalytics";

function buildQuery(from: string, to: string): string {
  const params = new URLSearchParams({ from, to });
  return `?${params.toString()}`;
}

export const developerAnalyticsService = {
  overview(from: string, to: string): Promise<ControlCenterOverview> {
    return adminApi.get(`/api/dev/analytics/overview${buildQuery(from, to)}`);
  },
  sales(from: string, to: string): Promise<ControlCenterSales> {
    return adminApi.get(`/api/dev/analytics/sales${buildQuery(from, to)}`);
  },
  funnel(from: string, to: string): Promise<ControlCenterFunnel> {
    return adminApi.get(`/api/dev/analytics/funnel${buildQuery(from, to)}`);
  },
  menus(from: string, to: string): Promise<ControlCenterMenus> {
    return adminApi.get(`/api/dev/analytics/menus${buildQuery(from, to)}`);
  },
  payments(from: string, to: string): Promise<ControlCenterPayments> {
    return adminApi.get(`/api/dev/analytics/payments${buildQuery(from, to)}`);
  },
  operations(from: string, to: string): Promise<ControlCenterOperations> {
    return adminApi.get(`/api/dev/analytics/operations${buildQuery(from, to)}`);
  },
  performance(from: string, to: string): Promise<ControlCenterPerformance> {
    return adminApi.get(`/api/dev/analytics/performance${buildQuery(from, to)}`);
  },
  reliability(from: string, to: string): Promise<ControlCenterReliability> {
    return adminApi.get(`/api/dev/analytics/reliability${buildQuery(from, to)}`);
  },
  insights(from: string, to: string): Promise<ControlCenterInsights> {
    return adminApi.get(`/api/dev/analytics/insights${buildQuery(from, to)}`);
  },
};

/** Asia/Seoul 기준 오늘 00:00:00 ISO UTC */
export function seoulTodayStart(): string {
  const now = new Date();
  const seoulOffset = 9 * 60;
  const localMs = now.getTime() + (seoulOffset - now.getTimezoneOffset()) * 60 * 1000;
  const local = new Date(localMs);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  const d = String(local.getUTCDate()).padStart(2, "0");
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

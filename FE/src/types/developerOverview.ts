import type { AnalyticsOverview } from "./developerAnalytics";

export interface OverviewErrorsMetrics {
  last24h: number;
  serverErrors: number;
  frontendErrors: number;
  lastOccurredAt: string | null;
}

export interface OverviewRequestsMetrics {
  today: number;
  success: number;
  clientErrors: number;
  serverErrors: number;
  averageDurationMs: number;
}

export interface OverviewEventsMetrics {
  today: number;
  uniqueSessions: number;
  topEvent: string | null;
}

export interface DeveloperOverview {
  errors: OverviewErrorsMetrics;
  requests: OverviewRequestsMetrics;
  events: OverviewEventsMetrics;
  funnel: AnalyticsOverview;
}

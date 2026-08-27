export interface AnalyticsPeriod {
  from: string;
  to: string;
}

/** Legacy behavior overview embedded in /api/dev/overview */
export interface AnalyticsOverview {
  period: AnalyticsPeriod;
  uniqueVisitors: number;
  menuViews: number;
  cartAdds: number;
  checkoutViews: number;
  paymentStarts: number;
  paymentSuccesses: number;
  ordersCreated: number;
  ordersCompleted: number;
}

export type PeriodPreset = "today" | "7d" | "30d" | "custom";

export type AnalyticsTab =
  | "overview"
  | "sales"
  | "funnel"
  | "menus"
  | "payments"
  | "operations"
  | "performance"
  | "reliability"
  | "insights";

export interface ControlCenterOverview {
  period: AnalyticsPeriod;
  paidOrders: number;
  revenue: number;
  averageOrderValue: number | null;
  averageItemsPerOrder: number | null;
  paymentSuccessRate: number | null;
  avgProcessingSeconds: number | null;
  p50ProcessingSeconds: number | null;
  p95ProcessingSeconds: number | null;
  processingSampleCount: number;
  apiRequestCount: number;
  apiP95LatencyMs: number | null;
  status5xxCount: number;
  status5xxRate: number | null;
  clientErrorCount: number;
  backendErrorCount: number;
  reconciliationOpenCount: number;
  uniqueVisitors: number;
  menuViews: number;
  paymentStarts: number;
  paymentSuccessEvents: number;
}

export interface ControlCenterSales {
  period: AnalyticsPeriod;
  paidOrders: number;
  revenue: number;
  averageOrderValue: number | null;
  averageItemsPerOrder: number | null;
  byHour: { hour: number; paidOrders: number; revenue: number }[];
  byMenu: {
    menuId: number | null;
    menuName: string;
    paidQuantity: number;
    paidRevenue: number;
    paidOrderCount: number;
  }[];
}

export interface FunnelAggregateStep {
  eventType: string;
  label: string;
  eventCount: number;
  uniqueCount: number;
  stepConversion: number | null;
  dropOffRate: number | null;
}

export interface ControlCenterFunnel {
  period: AnalyticsPeriod;
  aggregateByAnonymous: FunnelAggregateStep[];
  sequentialBySession: FunnelAggregateStep[];
  largestDropOffStage: string | null;
  metricNote: string;
}

export interface MenuPerformanceItem {
  menuId: number | null;
  menuName: string;
  views: number;
  cartAdds: number;
  paidQuantity: number;
  paidRevenue: number;
  paidOrderCount: number;
  viewToCartRate: number | null;
  viewToPurchaseRate: number | null;
}

export interface ControlCenterMenus {
  period: AnalyticsPeriod;
  minViewsForConversion: number;
  menus: MenuPerformanceItem[];
}

export interface ControlCenterPayments {
  period: AnalyticsPeriod;
  paymentStartEvents: number;
  paymentSuccessEvents: number;
  paymentFailEvents: number;
  donePayments: number;
  canceledPayments: number;
  partialCanceledPayments: number;
  behaviorSuccessRate: number | null;
  transactionalDoneShare: number | null;
  reconciliationOpenCount: number;
  reconciliationResolvedCount: number;
}

export interface ControlCenterOperations {
  period: AnalyticsPeriod;
  preparingCountToday: number;
  readyCountToday: number;
  activeQueueSizeToday: number;
  avgProcessingSeconds: number | null;
  p50ProcessingSeconds: number | null;
  p95ProcessingSeconds: number | null;
  processingSampleCount: number;
  slowProcessingCount: number;
  queueEntriesByHour: { hour: number; count: number; avgSeconds?: number | null }[];
  processingAvgByHour: { hour: number; count: number; avgSeconds?: number | null }[];
}

export interface ControlCenterPerformance {
  period: AnalyticsPeriod;
  totalRequests: number;
  status2xx: number;
  status4xx: number;
  status5xx: number;
  rate4xx: number | null;
  rate5xx: number | null;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  p99LatencyMs: number | null;
  byHour: { hour: number; requests: number }[];
  topEndpoints: {
    path: string;
    requests: number;
    avgMs: number;
    p95Ms: number;
    status5xx: number;
  }[];
}

export interface ControlCenterReliability {
  period: AnalyticsPeriod;
  clientErrorCount: number;
  backendErrorCount: number;
  apiRequestCount: number;
  clientErrorPer1kRequests: number | null;
  backendErrorPer1kRequests: number | null;
  topClientSources: { name: string; count: number }[];
  topClientRoutes: { name: string; count: number }[];
  topBackendExceptions: { name: string; count: number }[];
  topBackendPaths: { name: string; count: number }[];
}

export interface InsightItem {
  type: string;
  severity: string;
  title: string;
  description: string;
  metric: string;
  evidence: Record<string, unknown>;
  generatedAt: string;
}

export interface ControlCenterInsights {
  period: AnalyticsPeriod;
  insights: InsightItem[];
}

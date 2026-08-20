export interface AnalyticsPeriod {
  from: string;
  to: string;
}

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

export interface FunnelStep {
  eventType: string;
  label: string;
  uniqueUsers: number;
  conversionRate: number;
  stepConversion: number;
}

export interface AnalyticsFunnel {
  period: AnalyticsPeriod;
  steps: FunnelStep[];
}

export interface MenuAnalyticsItem {
  menuId: number;
  menuName: string;
  views: number;
  uniqueViewers: number;
  cartAdds: number;
}

export interface AnalyticsMenus {
  period: AnalyticsPeriod;
  topMenusByViews: MenuAnalyticsItem[];
  topMenusByCartAdds: MenuAnalyticsItem[];
}

export interface OptionAnalyticsItem {
  optionId: number;
  optionName: string;
  optionGroup: string | null;
  menuId: number;
  selectionCount: number;
  uniqueUsers: number;
}

export interface AnalyticsOptions {
  period: AnalyticsPeriod;
  topOptions: OptionAnalyticsItem[];
}

export interface MenuOptionAnalyticsItem {
  optionId: number;
  optionName: string;
  optionGroup: string | null;
  selectedUsers: number;
  selectionRate: number;
  additionalPrice: number | null;
}

export interface AnalyticsMenuOptions {
  period: AnalyticsPeriod;
  menuId: number;
  menuName: string;
  engagedUsers: number;
  options: MenuOptionAnalyticsItem[];
}

export type PeriodPreset = "today" | "7d" | "30d" | "custom";

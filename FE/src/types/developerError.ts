export type DeveloperErrorSource = "FRONTEND" | "BACKEND";

export interface DeveloperErrorSummary {
  id: string;
  source: DeveloperErrorSource;
  createdAt: string;
  route?: string;
  method?: string;
  status?: number | null;
  errorType?: string;
  messageSummary?: string;
  requestId?: string;
  relatedRequestId?: string;
  browser?: string;
}

export interface DeveloperErrorDetail extends DeveloperErrorSummary {
  path?: string;
  message?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

export interface DeveloperErrorPage {
  content: DeveloperErrorSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface DeveloperErrorQuery {
  source?: DeveloperErrorSource | "";
  status?: string;
  from?: string;
  to?: string;
  requestId?: string;
  search?: string;
  page?: number;
  size?: number;
}

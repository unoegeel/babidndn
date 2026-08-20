export interface DeveloperRequestSummary {
  id: number;
  requestId: string;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
}

export interface DeveloperRequestDetail extends DeveloperRequestSummary {
  userAgent?: string;
}

export interface DeveloperRequestPage {
  content: DeveloperRequestSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface DeveloperRequestQuery {
  requestId?: string;
  method?: string;
  status?: string;
  path?: string;
  from?: string;
  to?: string;
  minDuration?: string;
  maxDuration?: string;
  page?: number;
  size?: number;
}

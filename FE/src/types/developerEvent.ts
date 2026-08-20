import type { ClientEventType } from "./clientEvent";

export interface DeveloperEventSummary {
  id: number;
  eventId: string;
  eventType: ClientEventType;
  occurredAt: string;
  anonymousId: string;
  sessionId: string;
  route: string;
  relatedRequestId?: string;
}

export interface DeveloperEventDetail extends DeveloperEventSummary {
  metadata?: Record<string, unknown>;
}

export interface DeveloperEventPage {
  content: DeveloperEventSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface DeveloperEventQuery {
  eventType?: ClientEventType | "";
  from?: string;
  to?: string;
  route?: string;
  anonymousId?: string;
  sessionId?: string;
  relatedRequestId?: string;
  page?: number;
  size?: number;
}

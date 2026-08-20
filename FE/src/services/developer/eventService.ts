import { adminApi } from "../../api/client";
import type {
  DeveloperEventDetail,
  DeveloperEventPage,
  DeveloperEventQuery,
} from "../../types/developerEvent";

function buildQuery(params: DeveloperEventQuery): string {
  const searchParams = new URLSearchParams();
  if (params.eventType) searchParams.set("eventType", params.eventType);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.route) searchParams.set("route", params.route);
  if (params.anonymousId) searchParams.set("anonymousId", params.anonymousId);
  if (params.sessionId) searchParams.set("sessionId", params.sessionId);
  if (params.relatedRequestId) searchParams.set("relatedRequestId", params.relatedRequestId);
  searchParams.set("page", String(params.page ?? 0));
  searchParams.set("size", String(params.size ?? 50));
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const developerEventService = {
  list(params: DeveloperEventQuery = {}): Promise<DeveloperEventPage> {
    return adminApi.get<DeveloperEventPage>(`/api/dev/events${buildQuery(params)}`);
  },

  detail(id: number): Promise<DeveloperEventDetail> {
    return adminApi.get<DeveloperEventDetail>(`/api/dev/events/${id}`);
  },
};

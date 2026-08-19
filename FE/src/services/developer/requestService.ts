import { adminApi } from "../../api/client";
import type {
  DeveloperRequestDetail,
  DeveloperRequestPage,
  DeveloperRequestQuery,
} from "../../types/developerRequest";

function buildQuery(params: DeveloperRequestQuery): string {
  const searchParams = new URLSearchParams();
  if (params.requestId) searchParams.set("requestId", params.requestId);
  if (params.method) searchParams.set("method", params.method);
  if (params.status) searchParams.set("status", params.status);
  if (params.path) searchParams.set("path", params.path);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.minDuration) searchParams.set("minDuration", params.minDuration);
  if (params.maxDuration) searchParams.set("maxDuration", params.maxDuration);
  searchParams.set("page", String(params.page ?? 0));
  searchParams.set("size", String(params.size ?? 50));
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const developerRequestService = {
  list(params: DeveloperRequestQuery = {}): Promise<DeveloperRequestPage> {
    return adminApi.get<DeveloperRequestPage>(`/api/dev/requests${buildQuery(params)}`);
  },

  detail(id: number): Promise<DeveloperRequestDetail> {
    return adminApi.get<DeveloperRequestDetail>(`/api/dev/requests/${id}`);
  },
};

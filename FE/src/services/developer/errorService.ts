import { adminApi } from "../../api/client";
import type {
  DeveloperErrorDetail,
  DeveloperErrorPage,
  DeveloperErrorQuery,
} from "../../types/developerError";

function buildQuery(params: DeveloperErrorQuery): string {
  const searchParams = new URLSearchParams();
  if (params.source) searchParams.set("source", params.source);
  if (params.status) searchParams.set("status", params.status);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.requestId) searchParams.set("requestId", params.requestId);
  if (params.search) searchParams.set("search", params.search);
  searchParams.set("page", String(params.page ?? 0));
  searchParams.set("size", String(params.size ?? 50));
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const developerErrorService = {
  list(params: DeveloperErrorQuery = {}): Promise<DeveloperErrorPage> {
    return adminApi.get<DeveloperErrorPage>(`/api/dev/errors${buildQuery(params)}`);
  },

  detail(id: string): Promise<DeveloperErrorDetail> {
    return adminApi.get<DeveloperErrorDetail>(`/api/dev/errors/${encodeURIComponent(id)}`);
  },
};

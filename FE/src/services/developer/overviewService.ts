import { adminApi } from "../../api/client";
import type { DeveloperOverview } from "../../types/developerOverview";

export const developerOverviewService = {
  get(): Promise<DeveloperOverview> {
    return adminApi.get<DeveloperOverview>("/api/dev/overview");
  },
};

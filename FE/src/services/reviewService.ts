import { api } from "../api/client";

export interface StoreReview {
  id: number;
  content: string;
  createdAt: string;
}

export const reviewService = {
  create(content: string): Promise<StoreReview> {
    return api.post<StoreReview>("/api/reviews", { content });
  },
};

export const adminReviewService = {
  getAll(): Promise<StoreReview[]> {
    return api.get<StoreReview[]>("/api/admin/reviews");
  },

  delete(id: number): Promise<void> {
    return api.delete<void>(`/api/admin/reviews/${id}`);
  },
};

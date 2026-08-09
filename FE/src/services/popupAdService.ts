import { api } from "../api/client";

export interface PopupAd {
  id: number;
  imageUrl: string;
  startAt: string;
  endAt: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PopupAdUpsertRequest {
  imageUrl: string;
  startAt: string;
  endAt: string;
  enabled?: boolean;
}

export interface PopupAdImageUploadUrlResponse {
  uploadUrl: string;
  imageUrl: string;
}

/** 관리자 팝업 광고 API */
export const adminPopupAdService = {
  getAll(): Promise<PopupAd[]> {
    return api.get<PopupAd[]>("/api/admin/popup-ads");
  },

  create(body: PopupAdUpsertRequest): Promise<PopupAd> {
    return api.post<PopupAd>("/api/admin/popup-ads", body);
  },

  update(id: number, body: PopupAdUpsertRequest): Promise<PopupAd> {
    return api.put<PopupAd>(`/api/admin/popup-ads/${id}`, body);
  },

  delete(id: number): Promise<void> {
    return api.delete<void>(`/api/admin/popup-ads/${id}`);
  },

  createImageUploadUrl(contentType: string): Promise<PopupAdImageUploadUrlResponse> {
    return api.post<PopupAdImageUploadUrlResponse>("/api/admin/popup-ads/image-upload-url", {
      contentType,
    });
  },
};

/** 유저 팝업 광고 API */
export const popupAdService = {
  getActive(): Promise<PopupAd[]> {
    return api.get<PopupAd[]>("/api/popup-ads/active");
  },

  /** 공지사항용: 사용 중인 광고만 */
  getAll(): Promise<PopupAd[]> {
    return api.get<PopupAd[]>("/api/popup-ads");
  },
};

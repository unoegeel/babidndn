import { api } from "../../api/client";
import { CLIENT_KEY_HEADER, getClientKey } from "../../utils/clientKey";
import type {
  SavedMenuCreateRequest,
  SavedMenuResponse,
  SavedMenuUpdateRequest,
} from "../../types/api";

function clientKeyHeaders(): Record<string, string> {
  return { [CLIENT_KEY_HEADER]: getClientKey() };
}

export const savedMenuService = {
  list(): Promise<SavedMenuResponse[]> {
    return api.get<SavedMenuResponse[]>("/api/saved-menus", {
      headers: clientKeyHeaders(),
    });
  },

  get(id: number): Promise<SavedMenuResponse> {
    return api.get<SavedMenuResponse>(`/api/saved-menus/${id}`, {
      headers: clientKeyHeaders(),
    });
  },

  create(body: SavedMenuCreateRequest): Promise<SavedMenuResponse> {
    return api.post<SavedMenuResponse>("/api/saved-menus", body, {
      headers: clientKeyHeaders(),
    });
  },

  update(id: number, body: SavedMenuUpdateRequest): Promise<SavedMenuResponse> {
    return api.put<SavedMenuResponse>(`/api/saved-menus/${id}`, body, {
      headers: clientKeyHeaders(),
    });
  },

  remove(id: number): Promise<void> {
    return api.delete<void>(`/api/saved-menus/${id}`, {
      headers: clientKeyHeaders(),
    });
  },
};

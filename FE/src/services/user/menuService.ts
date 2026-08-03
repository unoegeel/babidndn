import type { MenuCategory, MenuDetail } from "../../types/user";
import { api } from "../../api/client";

/**
 * 학생용 메뉴 관련 API 서비스
 */
export const menuService = {
  /**
   * 전체 메뉴 및 카테고리 목록 조회
   * GET /api/menus
   */
  async getCategories(): Promise<MenuCategory[]> {
    return api.get<MenuCategory[]>("/api/menus");
  },

  /**
   * 메뉴 상세 및 옵션 조회
   * GET /api/menus/{id}
   */
  async getMenuDetail(id: number): Promise<MenuDetail> {
    return api.get<MenuDetail>(`/api/menus/${id}`);
  },
};

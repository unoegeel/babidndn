import type { MenuCategory, MenuDetail } from "../../types/user";
import { MOCK_CATEGORIES, MOCK_MENU_DETAILS } from "../../constants/userMockData";
import { api } from "../../api/client";

// VITE_API_BASE_URL 이 설정돼 있으면 실제 서버를, 없으면 mock 데이터를 사용합니다.
const USE_API = Boolean(import.meta.env.VITE_API_BASE_URL);

/**
 * 학생용 메뉴 관련 API 서비스
 */
export const menuService = {
  /**
   * 전체 메뉴 및 카테고리 목록 조회
   * GET /api/menus
   */
  async getCategories(): Promise<MenuCategory[]> {
    if (USE_API) {
      return api.get<MenuCategory[]>("/api/menus");
    }
    // 네트워크 딜레이 시뮬레이션 (약 100ms)
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_CATEGORIES;
  },

  /**
   * 메뉴 상세 및 옵션 조회
   * GET /api/menus/{id}
   */
  async getMenuDetail(id: number): Promise<MenuDetail> {
    if (USE_API) {
      return api.get<MenuDetail>(`/api/menus/${id}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    const menuDetail = MOCK_MENU_DETAILS[id];
    if (!menuDetail) {
      throw new Error("MENU_NOT_FOUND");
    }
    return menuDetail;
  },
};

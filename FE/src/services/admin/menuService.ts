import { adminApi } from "../../api/client";
import type { MenuCategory, MenuDetail, MenuOption, SaleStatus } from "../../types/user";
import type {
  CategoryResponse,
  CategoryUpsertRequest,
  MenuOptionUpsertRequest,
  MenuUpsertRequest,
} from "../../types/api";

export interface MenuImageUploadUrlResponse {
  uploadUrl: string;
  imageUrl: string;
}

/**
 * 관리자 메뉴/카테고리 API 서비스 (Bearer 토큰 필요)
 */
export const adminMenuService = {
  /**
   * 관리자 카테고리 목록 조회
   * GET /api/admin/categories
   */
  getCategories(): Promise<CategoryResponse[]> {
    return adminApi.get<CategoryResponse[]>("/api/admin/categories");
  },

  /**
   * 카테고리 등록
   * POST /api/admin/categories
   */
  createCategory(body: CategoryUpsertRequest): Promise<CategoryResponse> {
    return adminApi.post<CategoryResponse>("/api/admin/categories", body);
  },

  /**
   * 카테고리 수정
   * PUT /api/admin/categories/{categoryId}
   */
  updateCategory(
    categoryId: number | string,
    body: CategoryUpsertRequest,
  ): Promise<CategoryResponse> {
    return adminApi.put<CategoryResponse>(`/api/admin/categories/${categoryId}`, body);
  },

  /**
   * 카테고리 삭제
   * DELETE /api/admin/categories/{categoryId}
   */
  deleteCategory(categoryId: number | string): Promise<void> {
    return adminApi.delete<void>(`/api/admin/categories/${categoryId}`);
  },

  /**
   * 관리자 메뉴 목록 조회 (카테고리별 그룹)
   * GET /api/admin/menus
   */
  getMenus(): Promise<MenuCategory[]> {
    return adminApi.get<MenuCategory[]>("/api/admin/menus");
  },

  /**
   * 관리자 메뉴 상세 조회 (옵션·토핑 여부 포함)
   * GET /api/admin/menus/{menuId}
   */
  getMenu(menuId: number | string): Promise<MenuDetail & { toppingEnabled: boolean }> {
    return adminApi.get(`/api/admin/menus/${menuId}`);
  },

  /**
   * 메뉴 등록
   * POST /api/admin/menus
   */
  createMenu(body: MenuUpsertRequest): Promise<MenuDetail> {
    return adminApi.post<MenuDetail>("/api/admin/menus", body);
  },

  /**
   * 메뉴 수정
   * PUT /api/admin/menus/{menuId}
   */
  updateMenu(menuId: number | string, body: MenuUpsertRequest): Promise<MenuDetail> {
    return adminApi.put<MenuDetail>(`/api/admin/menus/${menuId}`, body);
  },

  /**
   * 메뉴 삭제
   * DELETE /api/admin/menus/{menuId}
   */
  deleteMenu(menuId: number | string): Promise<void> {
    return adminApi.delete<void>(`/api/admin/menus/${menuId}`);
  },

  /**
   * 메뉴 판매 상태 변경
   * PATCH /api/admin/menus/{menuId}/sale-status
   */
  updateSaleStatus(menuId: number | string, saleStatus: SaleStatus): Promise<MenuDetail> {
    return adminApi.patch<MenuDetail>(`/api/admin/menus/${menuId}/sale-status`, { saleStatus });
  },

  /**
   * 메뉴 이미지 업로드용 Presigned URL 발급
   * POST /api/admin/menus/image-upload-url
   */
  createImageUploadUrl(contentType: string): Promise<MenuImageUploadUrlResponse> {
    return adminApi.post<MenuImageUploadUrlResponse>("/api/admin/menus/image-upload-url", {
      contentType,
    });
  },

  /**
   * 메뉴 옵션 등록
   * POST /api/admin/menus/{menuId}/options
   */
  createOption(
    menuId: number | string,
    body: MenuOptionUpsertRequest,
  ): Promise<MenuOption> {
    return adminApi.post<MenuOption>(`/api/admin/menus/${menuId}/options`, body);
  },

  /**
   * 메뉴 옵션 수정
   * PUT /api/admin/menus/{menuId}/options/{optionId}
   */
  updateOption(
    menuId: number | string,
    optionId: number | string,
    body: MenuOptionUpsertRequest,
  ): Promise<MenuOption> {
    return adminApi.put<MenuOption>(`/api/admin/menus/${menuId}/options/${optionId}`, body);
  },

  /**
   * 메뉴 옵션 삭제
   * DELETE /api/admin/menus/{menuId}/options/{optionId}
   */
  deleteOption(menuId: number | string, optionId: number | string): Promise<void> {
    return adminApi.delete<void>(`/api/admin/menus/${menuId}/options/${optionId}`);
  },
};

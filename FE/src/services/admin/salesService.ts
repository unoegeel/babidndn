import { adminApi } from "../../api/client";
import type { DailySalesResponse, MenuSalesResponse } from "../../types/api";

/**
 * 관리자 매출 분석 API (Bearer 토큰 필요)
 */
export const adminSalesService = {
  /**
   * 날짜별 매출
   * GET /api/admin/sales/daily
   */
  getDailySales(from: string, to: string): Promise<DailySalesResponse[]> {
    const query = new URLSearchParams({ from, to });
    return adminApi.get<DailySalesResponse[]>(`/api/admin/sales/daily?${query}`);
  },

  /**
   * 메뉴별 매출
   * GET /api/admin/sales/by-menu
   */
  getMenuSales(from: string, to: string): Promise<MenuSalesResponse[]> {
    const query = new URLSearchParams({ from, to });
    return adminApi.get<MenuSalesResponse[]>(`/api/admin/sales/by-menu?${query}`);
  },
};

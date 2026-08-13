import { adminApi } from "../../api/client";
import type {
  DailySalesResponse,
  MenuSalesResponse,
  MonthlySalesResponse,
  WeeklySalesResponse,
  YearlySalesResponse,
} from "../../types/api";

function dateQuery(from: string, to: string): string {
  return new URLSearchParams({ from, to }).toString();
}

/**
 * 관리자 매출 분석 API (Bearer 토큰 필요)
 */
export const adminSalesService = {
  /**
   * GET /api/admin/sales/daily
   */
  getDailySales(from: string, to: string): Promise<DailySalesResponse[]> {
    return adminApi.get<DailySalesResponse[]>(
      `/api/admin/sales/daily?${dateQuery(from, to)}`,
    );
  },

  /**
   * GET /api/admin/sales/weekly
   */
  getWeeklySales(from: string, to: string): Promise<WeeklySalesResponse[]> {
    return adminApi.get<WeeklySalesResponse[]>(
      `/api/admin/sales/weekly?${dateQuery(from, to)}`,
    );
  },

  /**
   * GET /api/admin/sales/monthly
   */
  getMonthlySales(): Promise<MonthlySalesResponse[]> {
    return adminApi.get<MonthlySalesResponse[]>("/api/admin/sales/monthly");
  },

  /**
   * GET /api/admin/sales/yearly
   */
  getYearlySales(): Promise<YearlySalesResponse[]> {
    return adminApi.get<YearlySalesResponse[]>("/api/admin/sales/yearly");
  },

  /**
   * GET /api/admin/sales/by-menu
   * from/to 생략 시 전체 기간
   */
  getMenuSales(from?: string, to?: string): Promise<MenuSalesResponse[]> {
    if (!from || !to) {
      return adminApi.get<MenuSalesResponse[]>("/api/admin/sales/by-menu");
    }
    return adminApi.get<MenuSalesResponse[]>(
      `/api/admin/sales/by-menu?${dateQuery(from, to)}`,
    );
  },
};

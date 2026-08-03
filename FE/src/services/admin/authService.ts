import { api } from "../../api/client";
import type { AdminLoginRequest, AdminLoginResponse } from "../../types/api";

/**
 * 관리자 인증 API 서비스
 */
export const authService = {
  /**
   * 관리자 로그인
   * POST /api/admin/auth/login
   */
  login(body: AdminLoginRequest): Promise<AdminLoginResponse> {
    return api.post<AdminLoginResponse>("/api/admin/auth/login", body);
  },
};

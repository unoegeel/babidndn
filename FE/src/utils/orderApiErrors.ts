import { ApiError } from "../api/client";

/** 서버가 주문 부재/접근 불가를 명시한 404 (ORDER_NOT_FOUND). */
export function isOrderNotFoundError(error: unknown): boolean {
  return error instanceof ApiError
    && error.status === 404
    && error.code === "ORDER_NOT_FOUND";
}

/** Developer Analytics insight UI labels (enum/metric keys unchanged) */

export const INSIGHT_SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: "심각",
  WARNING: "주의",
  INFO: "정보",
};

export function insightSeverityLabelKo(severity: string): string {
  return INSIGHT_SEVERITY_LABELS[severity] ?? severity;
}

function num(evidence: Record<string, unknown>, key: string): number | null {
  const v = evidence[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
}

function str(evidence: Record<string, unknown>, key: string): string | null {
  const v = evidence[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

/**
 * Primary evidence line for Insights UI.
 * Uses metric key + evidence values; does not change backend data.
 */
export function formatInsightEvidenceSummary(
  metric: string | null | undefined,
  evidence: Record<string, unknown> | null | undefined,
): string | null {
  if (!metric) return null;
  const e = evidence ?? {};

  switch (metric) {
    case "backend_error_per_1k": {
      const per1k = num(e, "per1kRequests");
      if (per1k == null) return "요청 1,000건당 서버 오류";
      return `요청 1,000건당 서버 오류 ${fmt(per1k)}건`;
    }
    case "client_error_per_1k": {
      const per1k = num(e, "per1kRequests");
      if (per1k == null) return "요청 1,000건당 클라이언트 오류";
      return `요청 1,000건당 클라이언트 오류 ${fmt(per1k)}건`;
    }
    case "reconciliation_open": {
      const open = num(e, "openCount");
      if (open == null) return "미해결 결제 정합성 이슈";
      return `미해결 결제 정합성 이슈 ${fmt(open)}건`;
    }
    case "paid_orders_by_hour": {
      const share = num(e, "peakSharePercent");
      const range = str(e, "peakRange");
      if (share != null && range) return `피크 ${range} · 전체의 ${fmt(share)}%`;
      if (share != null) return `피크 시간대 주문 비중 ${fmt(share)}%`;
      return "주문 시간대 집중";
    }
    case "anonymous_funnel": {
      const drop = num(e, "dropOffPercent");
      if (drop == null) return "퍼널 이탈";
      return `메뉴 조회 → 장바구니 이탈 ${fmt(drop)}%`;
    }
    case "menu_view_to_purchase": {
      const rate = num(e, "viewToPurchasePercent");
      if (rate == null) return "조회 → 구매 전환";
      return `조회 → 구매 전환 ${fmt(rate)}%`;
    }
    case "payment_behavior_fail_rate": {
      const rate = num(e, "failRatePercent");
      if (rate == null) return "결제 행동 실패율";
      return `결제 행동 실패율 ${fmt(rate)}%`;
    }
    case "http_p95_ms": {
      const p95 = num(e, "p95Ms");
      if (p95 == null) return "API p95 지연";
      return `API p95 ${fmt(p95)}ms`;
    }
    case "http_5xx_rate": {
      const rate = num(e, "ratePercent");
      if (rate == null) return "5xx 비율";
      return `5xx 비율 ${fmt(rate)}%`;
    }
    case "processing_seconds": {
      const hourAvg = num(e, "hourAvgSeconds");
      const hour = num(e, "hour");
      if (hourAvg != null && hour != null) {
        return `${String(hour).padStart(2, "0")}시 평균 처리 ${fmt(hourAvg)}초`;
      }
      if (hourAvg != null) return `평균 처리시간 ${fmt(hourAvg)}초`;
      return "주문 처리시간 이상";
    }
    case "slow_processing_count": {
      const slow = num(e, "slowOrders");
      if (slow == null) return "느린 처리 주문";
      return `느린 처리 주문 ${fmt(slow)}건`;
    }
    default:
      return null;
  }
}

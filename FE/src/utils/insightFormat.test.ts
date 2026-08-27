import { describe, expect, it } from "vitest";
import {
  formatInsightEvidenceSummary,
  insightSeverityLabelKo,
} from "./insightFormat";

describe("insightSeverityLabelKo", () => {
  it("maps known severities", () => {
    expect(insightSeverityLabelKo("CRITICAL")).toBe("심각");
    expect(insightSeverityLabelKo("WARNING")).toBe("주의");
    expect(insightSeverityLabelKo("INFO")).toBe("정보");
  });

  it("passes through unknown severity", () => {
    expect(insightSeverityLabelKo("OTHER")).toBe("OTHER");
  });
});

describe("formatInsightEvidenceSummary", () => {
  it("formats backend_error_per_1k without exposing raw key", () => {
    expect(
      formatInsightEvidenceSummary("backend_error_per_1k", { per1kRequests: 5 }),
    ).toBe("요청 1,000건당 서버 오류 5건");
  });

  it("formats reconciliation_open", () => {
    expect(
      formatInsightEvidenceSummary("reconciliation_open", { openCount: 15 }),
    ).toBe("미해결 결제 정합성 이슈 15건");
  });

  it("formats client_error_per_1k", () => {
    expect(
      formatInsightEvidenceSummary("client_error_per_1k", { per1kRequests: 12.5 }),
    ).toBe("요청 1,000건당 클라이언트 오류 12.5건");
  });

  it("returns null for unknown metric", () => {
    expect(formatInsightEvidenceSummary("unknown_metric", {})).toBeNull();
  });
});

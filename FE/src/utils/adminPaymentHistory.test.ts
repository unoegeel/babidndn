import { describe, expect, it } from "vitest";
import { serverInstantMs } from "./serverDate";

/** Mirrors Admin payment-history sort/filter contract used by PaymentHistoryPage */
function filterAndSortPayments(
  payments: { id: string; paidAtMs: number }[],
  period: "all" | "today",
  todayStartMs: number,
) {
  return [...payments]
    .filter((p) => (period === "today" ? p.paidAtMs >= todayStartMs : true))
    .sort((a, b) => b.paidAtMs - a.paidAtMs);
}

describe("admin payment history ordering contract", () => {
  it("전체 기간 shows all days with newest approved first", () => {
    const today = "2026-08-25T14:21:00";
    const morning = "2026-08-25T11:45:00";
    const yesterday = "2026-08-04T12:16:00";
    const rows = [
      { id: "morning", paidAtMs: serverInstantMs(morning) },
      { id: "today", paidAtMs: serverInstantMs(today) },
      { id: "yesterday", paidAtMs: serverInstantMs(yesterday) },
    ];

    const filtered = filterAndSortPayments(rows, "all", serverInstantMs("2026-08-25T00:00:00"));
    expect(filtered.map((p) => p.id)).toEqual(["today", "morning", "yesterday"]);
  });

  it("오늘 filter keeps only today and still DESC", () => {
    const todayStart = serverInstantMs("2026-08-25T00:00:00");
    const rows = [
      { id: "old", paidAtMs: serverInstantMs("2026-08-04T12:16:00") },
      { id: "a", paidAtMs: serverInstantMs("2026-08-25T11:45:00") },
      { id: "b", paidAtMs: serverInstantMs("2026-08-25T14:21:00") },
    ];

    const filtered = filterAndSortPayments(rows, "today", todayStart);
    expect(filtered.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("sort does not mutate the source array", () => {
    const source = [
      { id: "a", paidAtMs: 1 },
      { id: "b", paidAtMs: 2 },
    ];
    const snapshot = source.map((p) => p.id);
    filterAndSortPayments(source, "all", 0);
    expect(source.map((p) => p.id)).toEqual(snapshot);
  });
});

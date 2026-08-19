import { describe, expect, it, vi } from "vitest";
import {
  formatErrorTime,
  formatHttpStatus,
  formatDuration,
  durationSpeedClass,
  sourceBadgeClass,
  statusLabel,
  copyText,
} from "./developerErrorFormat";

describe("developerErrorFormat", () => {
  it("formats error time", () => {
    expect(formatErrorTime("2026-08-19T06:42:00.000Z")).toMatch(/2026/);
  });

  it("returns source badge classes", () => {
    expect(sourceBadgeClass("FRONTEND")).toContain("sky");
    expect(sourceBadgeClass("BACKEND")).toContain("rose");
  });

  it("formats status label with Korean description", () => {
    expect(statusLabel(null)).toBe("-");
    expect(statusLabel(500)).toBe("500 · 서버 오류");
    expect(statusLabel(200)).toBe("200 · 성공");
  });

  it("formats http status", () => {
    expect(formatHttpStatus(404)).toBe("404 · 찾을 수 없음");
    expect(formatHttpStatus(418)).toBe("418");
  });

  it("formats duration", () => {
    expect(formatDuration(184)).toBe("184 ms");
    expect(formatDuration(1200)).toBe("1.2 s");
  });

  it("returns duration speed class", () => {
    expect(durationSpeedClass(100)).toContain("emerald");
    expect(durationSpeedClass(500)).toContain("amber");
    expect(durationSpeedClass(2000)).toContain("rose");
  });

  it("copies text when clipboard is available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyText("req-123")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("req-123");
  });
});

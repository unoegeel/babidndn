import { describe, expect, it, vi } from "vitest";
import {
  formatErrorTime,
  sourceBadgeClass,
  statusLabel,
  copyText,
} from "./developerErrorFormat";

describe("developerErrorFormat", () => {
  it("formats error time", () => {
    expect(formatErrorTime("2026-08-19T06:42:00.000Z")).toMatch(/08\. 19\./);
  });

  it("returns source badge classes", () => {
    expect(sourceBadgeClass("FRONTEND")).toContain("sky");
    expect(sourceBadgeClass("BACKEND")).toContain("rose");
  });

  it("formats status label", () => {
    expect(statusLabel(null)).toBe("-");
    expect(statusLabel(500)).toBe("500");
  });

  it("copies text when clipboard is available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyText("req-123")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("req-123");
  });
});

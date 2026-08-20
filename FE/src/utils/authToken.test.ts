import { describe, expect, it } from "vitest";
import { parseJwtPayload, resolveAuthRole } from "./authToken";

function encodePayload(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const base64 = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `header.${base64}.signature`;
}

describe("parseJwtPayload", () => {
  it("parses role claim", () => {
    const token = encodePayload({ sub: "dev", role: "DEVELOPER", exp: 9999999999 });
    expect(parseJwtPayload(token)).toEqual({
      sub: "dev",
      role: "DEVELOPER",
      exp: 9999999999,
    });
  });

  it("returns null for malformed token", () => {
    expect(parseJwtPayload("not-a-jwt")).toBeNull();
  });
});

describe("resolveAuthRole", () => {
  it("returns ADMIN for admin token", () => {
    const token = encodePayload({ sub: "owner", role: "ADMIN" });
    expect(resolveAuthRole(token)).toBe("ADMIN");
  });

  it("returns DEVELOPER for developer token", () => {
    const token = encodePayload({ sub: "dev", role: "DEVELOPER" });
    expect(resolveAuthRole(token)).toBe("DEVELOPER");
  });

  it("returns null for unsupported role", () => {
    const token = encodePayload({ sub: "user", role: "USER" });
    expect(resolveAuthRole(token)).toBeNull();
  });
});

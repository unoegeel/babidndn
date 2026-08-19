import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAuthRole,
  isAdminSignedIn,
  isDeveloperSignedIn,
  isStaffSignedIn,
  signInAdmin,
  signOutAdmin,
} from "../constants/adminAccount";

const TOKEN_KEY = "gdgoc-admin-token";
const storage = new Map<string, string>();

function makeToken(role: "ADMIN" | "DEVELOPER"): string {
  const payload = btoa(JSON.stringify({ sub: "test", role }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${payload}.signature`;
}

describe("adminAccount role guards", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => storage.clear(),
    });
  });

  it("detects admin session", () => {
    signInAdmin(makeToken("ADMIN"));
    expect(isAdminSignedIn()).toBe(true);
    expect(isDeveloperSignedIn()).toBe(false);
    expect(getAuthRole()).toBe("ADMIN");
  });

  it("detects developer session", () => {
    signInAdmin(makeToken("DEVELOPER"));
    expect(isDeveloperSignedIn()).toBe(true);
    expect(isAdminSignedIn()).toBe(false);
    expect(getAuthRole()).toBe("DEVELOPER");
  });

  it("clears session on sign out", () => {
    signInAdmin(makeToken("ADMIN"));
    signOutAdmin();
    expect(isStaffSignedIn()).toBe(false);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});

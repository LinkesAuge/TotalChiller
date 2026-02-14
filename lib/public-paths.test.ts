import { describe, it, expect } from "vitest";
import { isPublicPath } from "./public-paths";

describe("isPublicPath", () => {
  describe("known public paths return true", () => {
    it.each([
      "/home",
      "/auth/login",
      "/about",
      "/contact",
      "/privacy-policy",
      "/profile",
      "/settings",
      "/not-authorized",
    ])("returns true for %s", (pathname) => {
      expect(isPublicPath(pathname)).toBe(true);
    });
  });

  describe("static/asset paths return true", () => {
    it.each(["/_next/static/chunk.js", "/sitemap.xml", "/robots.txt", "/assets/ui/logo.png"])(
      "returns true for %s",
      (pathname) => {
        expect(isPublicPath(pathname)).toBe(true);
      },
    );
  });

  describe("extension-based paths return true", () => {
    it.each(["/something.xml", "/data.json", "/favicon.ico", "/robots.txt"])("returns true for %s", (pathname) => {
      expect(isPublicPath(pathname)).toBe(true);
    });
  });

  describe("protected paths return false", () => {
    it.each([
      "/dashboard",
      "/forum",
      "/messages",
      "/events",
      "/members",
      "/charts",
      "/data-table",
      "/data-import",
      "/news",
      "/admin",
      "/admin/users",
      "/admin/data-import",
    ])("returns false for %s", (pathname) => {
      expect(isPublicPath(pathname)).toBe(false);
    });
  });

  describe("root and empty", () => {
    it("returns false for root path /", () => {
      expect(isPublicPath("/")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isPublicPath("")).toBe(false);
    });
  });

  describe("subpaths work correctly", () => {
    it("returns true for /home/something (subpath of /home)", () => {
      expect(isPublicPath("/home/something")).toBe(true);
    });

    it("returns false for /dashboard/home (starts with /dashboard, not /home)", () => {
      expect(isPublicPath("/dashboard/home")).toBe(false);
    });
  });
});

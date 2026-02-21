import { describe, it, expect } from "vitest";
import { ADMIN_SECTIONS } from "./admin-sections";

describe("ADMIN_SECTIONS", () => {
  it("contains expected sections", () => {
    const keys = ADMIN_SECTIONS.map((s) => s.labelKey);
    expect(keys).toContain("users");
    expect(keys).toContain("clans");
    expect(keys).toContain("approvals");
    expect(keys).toContain("forum");
    expect(keys).toContain("logs");
    expect(keys).toContain("designSystem");
  });

  it("has 6 sections", () => {
    expect(ADMIN_SECTIONS).toHaveLength(6);
  });

  it("each section has labelKey and href", () => {
    for (const section of ADMIN_SECTIONS) {
      expect(section.labelKey).toBeTruthy();
      expect(section.href).toBeTruthy();
    }
  });

  it("designSystem section has no tab (separate page)", () => {
    const ds = ADMIN_SECTIONS.find((s) => s.labelKey === "designSystem");
    expect(ds).toBeDefined();
    expect(ds!.tab).toBeUndefined();
    expect(ds!.href).toBe("/design-system");
  });

  it("tab sections have matching tab values", () => {
    const tabSections = ADMIN_SECTIONS.filter((s) => s.tab);
    for (const section of tabSections) {
      expect(section.tab).toBe(section.labelKey);
    }
  });
});

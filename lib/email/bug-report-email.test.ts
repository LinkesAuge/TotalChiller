import { describe, it, expect } from "vitest";
import { buildBugReportEmail } from "./bug-report-email";

describe("buildBugReportEmail", () => {
  const baseData = {
    title: "Button broken",
    description: "The submit button does not work.",
    reporterName: "TestUser",
    categoryName: "UI Bug",
    pageUrl: "https://example.com/page",
    reportUrl: "https://example.com/admin/bugs/1",
  };

  it("returns valid HTML containing the title", () => {
    const html = buildBugReportEmail(baseData);
    expect(html).toContain("Button broken");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });

  it("includes the reporter name", () => {
    const html = buildBugReportEmail(baseData);
    expect(html).toContain("TestUser");
  });

  it("includes the category when provided", () => {
    const html = buildBugReportEmail(baseData);
    expect(html).toContain("UI Bug");
  });

  it("omits category span when categoryName is null", () => {
    const html = buildBugReportEmail({ ...baseData, categoryName: null });
    expect(html).not.toContain("middot");
  });

  it("includes the page URL when provided", () => {
    const html = buildBugReportEmail(baseData);
    expect(html).toContain("https://example.com/page");
  });

  it("omits page URL paragraph when pageUrl is null", () => {
    const html = buildBugReportEmail({ ...baseData, pageUrl: null });
    expect(html).not.toContain("Page:");
  });

  it("includes the report URL as a link", () => {
    const html = buildBugReportEmail(baseData);
    expect(html).toContain('href="https://example.com/admin/bugs/1"');
    expect(html).toContain("View Report");
  });

  it("truncates long descriptions at 500 characters with ellipsis", () => {
    const longDesc = "x".repeat(600);
    const html = buildBugReportEmail({ ...baseData, description: longDesc });
    expect(html).toContain("x".repeat(500) + "…");
    expect(html).not.toContain("x".repeat(501));
  });

  it("does not truncate descriptions at exactly 500 characters", () => {
    const exactDesc = "y".repeat(500);
    const html = buildBugReportEmail({ ...baseData, description: exactDesc });
    expect(html).toContain(exactDesc);
    expect(html).not.toContain("…");
  });

  it("escapes HTML special characters to prevent XSS", () => {
    const html = buildBugReportEmail({
      ...baseData,
      title: '<script>alert("xss")</script>',
      description: "Test & <b>bold</b>",
      reporterName: 'User "evil"',
    });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&amp;");
    expect(html).toContain("&lt;b&gt;");
    expect(html).toContain("&quot;evil&quot;");
  });
});

// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "./sanitize-html";

describe("sanitizeHtml", () => {
  it("allows safe HTML tags", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("allows anchor tags with safe attributes", () => {
    const input = '<a href="https://example.com" target="_blank" rel="noopener">link</a>';
    expect(sanitizeHtml(input)).toContain('href="https://example.com"');
  });

  it("allows image tags", () => {
    const input = '<img src="/photo.png" alt="Photo" width="100" height="100">';
    const result = sanitizeHtml(input);
    expect(result).toContain("src=");
    expect(result).toContain("alt=");
  });

  it("allows SVG elements", () => {
    const input = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"></circle></svg>';
    const result = sanitizeHtml(input);
    expect(result).toContain("<svg");
    expect(result).toContain("<circle");
  });

  it("strips script tags", () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<script");
    expect(result).toContain("<p>Hello</p>");
  });

  it("strips event handler attributes", () => {
    const input = '<div onclick="alert(1)">click me</div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onclick");
  });

  it("strips iframe tags", () => {
    const input = '<iframe src="https://evil.com"></iframe>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<iframe");
  });

  it("allows table markup", () => {
    const input = "<table><thead><tr><th>Col</th></tr></thead><tbody><tr><td>Val</td></tr></tbody></table>";
    const result = sanitizeHtml(input);
    expect(result).toContain("<table>");
    expect(result).toContain("<th>Col</th>");
    expect(result).toContain("<td>Val</td>");
  });

  it("allows code and pre blocks", () => {
    const input = "<pre><code>const x = 1;</code></pre>";
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("allows blockquote and hr", () => {
    const input = "<blockquote>Quote</blockquote><hr>";
    const result = sanitizeHtml(input);
    expect(result).toContain("<blockquote>");
    expect(result).toContain("<hr>");
  });

  it("handles empty string", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("strips javascript: protocol from href", () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("javascript:");
  });
});

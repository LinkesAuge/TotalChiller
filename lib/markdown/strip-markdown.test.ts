import { describe, it, expect } from "vitest";
import { stripMarkdown } from "./strip-markdown";

describe("stripMarkdown", () => {
  it("returns plain text unchanged", () => {
    expect(stripMarkdown("Hello world")).toBe("Hello world");
  });

  it("strips headings", () => {
    expect(stripMarkdown("## Title\nBody text")).toBe("Title Body text");
    expect(stripMarkdown("# H1\n## H2\n### H3")).toBe("H1 H2 H3");
  });

  it("strips bold markers", () => {
    expect(stripMarkdown("This is **bold** text")).toBe("This is bold text");
    expect(stripMarkdown("This is __bold__ text")).toBe("This is bold text");
  });

  it("strips italic markers", () => {
    expect(stripMarkdown("This is *italic* text")).toBe("This is italic text");
    expect(stripMarkdown("This is _italic_ text")).toBe("This is italic text");
  });

  it("strips strikethrough markers", () => {
    expect(stripMarkdown("This is ~~removed~~ text")).toBe("This is removed text");
  });

  it("strips inline code backticks", () => {
    expect(stripMarkdown("Use `npm install` to install")).toBe("Use npm install to install");
  });

  it("strips fenced code blocks", () => {
    expect(stripMarkdown("Before\n```js\nconsole.log('hi')\n```\nAfter")).toBe("Before After");
  });

  it("strips image markdown, keeping alt text", () => {
    expect(stripMarkdown("See ![screenshot](https://example.com/img.png) here")).toBe("See screenshot here");
  });

  it("strips link markdown, keeping link text", () => {
    expect(stripMarkdown("Visit [our site](https://example.com) now")).toBe("Visit our site now");
  });

  it("strips unordered list bullets", () => {
    expect(stripMarkdown("- Item one\n- Item two")).toBe("Item one Item two");
    expect(stripMarkdown("* Bullet\n+ Plus")).toBe("Bullet Plus");
  });

  it("strips ordered list numbers", () => {
    expect(stripMarkdown("1. First\n2. Second\n3. Third")).toBe("First Second Third");
  });

  it("strips blockquotes", () => {
    expect(stripMarkdown("> Quoted text\n> More")).toBe("Quoted text More");
  });

  it("strips horizontal rules", () => {
    expect(stripMarkdown("Above\n---\nBelow")).toBe("Above Below");
  });

  it("collapses multiple newlines and spaces", () => {
    expect(stripMarkdown("Line one\n\n\nLine two   spaced")).toBe("Line one Line two spaced");
  });

  it("handles an empty string", () => {
    expect(stripMarkdown("")).toBe("");
  });

  it("handles a complex mixed-markdown string", () => {
    const input =
      "## Bug Report\n\n**Steps:**\n1. Open the page\n2. Click `Submit`\n\n> Error shown\n\n![error](img.png)";
    const result = stripMarkdown(input);
    expect(result).not.toContain("##");
    expect(result).not.toContain("**");
    expect(result).not.toContain("`");
    expect(result).not.toContain(">");
    expect(result).not.toContain("![");
    expect(result).toContain("Bug Report");
    expect(result).toContain("Submit");
    expect(result).toContain("error");
  });
});

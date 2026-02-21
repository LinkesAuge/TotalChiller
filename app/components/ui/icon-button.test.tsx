// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import IconButton from "./icon-button";

describe("IconButton", () => {
  it("renders with aria-label and children", () => {
    render(<IconButton ariaLabel="Delete item">🗑️</IconButton>);
    const btn = screen.getByRole("button", { name: "Delete item" });
    expect(btn).toBeTruthy();
    expect(btn.textContent).toBe("🗑️");
  });

  it("defaults to type=button", () => {
    render(<IconButton ariaLabel="X">X</IconButton>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("uses ariaLabel as title when no title prop is given", () => {
    render(<IconButton ariaLabel="Edit">✏️</IconButton>);
    expect(screen.getByRole("button")).toHaveAttribute("title", "Edit");
  });

  it("prefers explicit title over ariaLabel", () => {
    render(
      <IconButton ariaLabel="Edit" title="Edit this item">
        ✏️
      </IconButton>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("title", "Edit this item");
  });

  it("fires onClick", () => {
    const handler = vi.fn();
    render(
      <IconButton ariaLabel="Click" onClick={handler}>
        👆
      </IconButton>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("is disabled when disabled=true", () => {
    render(
      <IconButton ariaLabel="Disabled" disabled>
        ❌
      </IconButton>,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies variant class for non-default variants", () => {
    const { rerender } = render(
      <IconButton ariaLabel="A" variant="primary">
        P
      </IconButton>,
    );
    expect(screen.getByRole("button").className).toContain("primary");

    rerender(
      <IconButton ariaLabel="A" variant="danger">
        D
      </IconButton>,
    );
    expect(screen.getByRole("button").className).toContain("danger");

    rerender(
      <IconButton ariaLabel="A" variant="active">
        A
      </IconButton>,
    );
    expect(screen.getByRole("button").className).toContain("active");
  });

  it("does not apply extra variant class for default variant", () => {
    render(
      <IconButton ariaLabel="A" variant="default">
        D
      </IconButton>,
    );
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("button");
    expect(cls).toContain("icon-button");
    expect(cls).not.toContain("primary");
    expect(cls).not.toContain("danger");
  });

  it("appends className prop", () => {
    render(
      <IconButton ariaLabel="A" className="extra-class">
        E
      </IconButton>,
    );
    expect(screen.getByRole("button").className).toContain("extra-class");
  });

  it("supports type=submit", () => {
    render(
      <IconButton ariaLabel="Submit" type="submit">
        ✓
      </IconButton>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});

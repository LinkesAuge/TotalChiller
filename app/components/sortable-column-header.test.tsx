// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import SortableColumnHeader from "./sortable-column-header";

describe("SortableColumnHeader", () => {
  const onToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders label text", () => {
    render(
      <SortableColumnHeader label="Name" sortKey="name" activeSortKey="name" direction="asc" onToggle={onToggle} />,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("calls onToggle with sortKey when clicked", () => {
    render(
      <SortableColumnHeader label="Name" sortKey="name" activeSortKey="date" direction="asc" onToggle={onToggle} />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith("name");
  });

  it("shows ascending indicator when active and asc", () => {
    render(
      <SortableColumnHeader label="Name" sortKey="name" activeSortKey="name" direction="asc" onToggle={onToggle} />,
    );
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).not.toHaveClass("is-desc");
  });

  it("shows descending indicator when active and desc", () => {
    render(
      <SortableColumnHeader label="Name" sortKey="name" activeSortKey="name" direction="desc" onToggle={onToggle} />,
    );
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("is-desc");
  });

  it("does not show indicator when not active", () => {
    render(
      <SortableColumnHeader label="Name" sortKey="name" activeSortKey="date" direction="asc" onToggle={onToggle} />,
    );
    expect(document.querySelector("svg")).not.toBeInTheDocument();
  });

  it("sets aria-sort correctly", () => {
    const { rerender } = render(
      <SortableColumnHeader label="Name" sortKey="name" activeSortKey="name" direction="asc" onToggle={onToggle} />,
    );
    expect(screen.getByRole("columnheader")).toHaveAttribute("aria-sort", "ascending");

    rerender(
      <SortableColumnHeader label="Name" sortKey="name" activeSortKey="name" direction="desc" onToggle={onToggle} />,
    );
    expect(screen.getByRole("columnheader")).toHaveAttribute("aria-sort", "descending");

    rerender(
      <SortableColumnHeader label="Name" sortKey="name" activeSortKey="date" direction="asc" onToggle={onToggle} />,
    );
    expect(screen.getByRole("columnheader")).toHaveAttribute("aria-sort", "none");
  });
});

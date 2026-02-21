// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));

vi.mock("./ui/radix-select", () => ({
  __esModule: true,
  default: ({ value, onValueChange, options, ariaLabel }: any) => {
    const React = require("react");
    return React.createElement(
      "select",
      { value, onChange: (e: any) => onValueChange(e.target.value), "aria-label": ariaLabel },
      options?.map((o: any) => React.createElement("option", { key: o.value, value: o.value }, o.label)),
    );
  },
}));

vi.mock("@/lib/hooks/use-pagination", () => ({}));

import PaginationBar from "./pagination-bar";

function makePagination(overrides: any = {}): any {
  return {
    page: 1,
    pageSize: 25,
    totalPages: 4,
    totalItems: 100,
    startIndex: 0,
    endIndex: 25,
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    goNext: vi.fn(),
    goPrev: vi.fn(),
    clampPageValue: vi.fn((v: string) => Number(v)),
    ...overrides,
  };
}

describe("PaginationBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders showing X-Y of Z text", () => {
    render(<PaginationBar pagination={makePagination()} />);
    expect(screen.getByText(/showing/)).toBeInTheDocument();
    expect(screen.getByText(/showing/).textContent).toContain("100");
  });

  it("renders page size selector in full mode", () => {
    render(<PaginationBar pagination={makePagination()} />);
    expect(screen.getByRole("combobox", { name: "pageSize" })).toBeInTheDocument();
  });

  it("hides page size selector in compact mode", () => {
    render(<PaginationBar pagination={makePagination()} compact />);
    expect(screen.queryByRole("combobox", { name: "pageSize" })).not.toBeInTheDocument();
  });

  it("renders page jump input in full mode", () => {
    render(<PaginationBar pagination={makePagination()} />);
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
  });

  it("hides page jump input in compact mode", () => {
    render(<PaginationBar pagination={makePagination()} compact />);
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("calls goNext on next button click", () => {
    const pagination = makePagination();
    render(<PaginationBar pagination={pagination} />);
    fireEvent.click(screen.getByLabelText("nextPage"));
    expect(pagination.goNext).toHaveBeenCalledOnce();
  });

  it("calls goPrev on prev button click", () => {
    const pagination = makePagination({ page: 2 });
    render(<PaginationBar pagination={pagination} />);
    fireEvent.click(screen.getByLabelText("previousPage"));
    expect(pagination.goPrev).toHaveBeenCalledOnce();
  });

  it("disables prev button on page 1", () => {
    render(<PaginationBar pagination={makePagination({ page: 1 })} />);
    expect(screen.getByLabelText("previousPage")).toBeDisabled();
  });

  it("disables next button on last page", () => {
    render(<PaginationBar pagination={makePagination({ page: 4, totalPages: 4 })} />);
    expect(screen.getByLabelText("nextPage")).toBeDisabled();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoadingSkeleton, ErrorBanner } from "./cms-shared";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));

describe("LoadingSkeleton", () => {
  it("renders default 3 rows", () => {
    const { container } = render(<LoadingSkeleton />);
    expect(container.querySelectorAll(".cms-skeleton-row")).toHaveLength(3);
  });

  it("renders custom number of rows", () => {
    const { container } = render(<LoadingSkeleton rows={5} />);
    expect(container.querySelectorAll(".cms-skeleton-row")).toHaveLength(5);
  });
});

describe("ErrorBanner", () => {
  it("renders message text", () => {
    render(<ErrorBanner message="Something went wrong" />);
    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });

  it("renders retry button when onRetry provided", () => {
    render(<ErrorBanner message="Error" onRetry={() => {}} />);
    expect(screen.getByRole("button", { name: "retry" })).toBeTruthy();
  });

  it("hides retry button when onRetry not provided", () => {
    render(<ErrorBanner message="Error" />);
    expect(screen.queryByRole("button", { name: "retry" })).toBeNull();
  });

  it("calls onRetry when retry button clicked", () => {
    const onRetry = vi.fn();
    render(<ErrorBanner message="Error" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthInfoCard from "./auth-info-card";

describe("AuthInfoCard", () => {
  it("renders title text", () => {
    render(<AuthInfoCard title="Help">Content</AuthInfoCard>);
    expect(screen.getByText("Help")).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(<AuthInfoCard title="T">Child text here</AuthInfoCard>);
    expect(screen.getByText("Child text here")).toBeInTheDocument();
  });

  it("has details element closed by default", () => {
    const { container } = render(<AuthInfoCard title="T">C</AuthInfoCard>);
    const details = container.querySelector("details");
    expect(details).not.toHaveAttribute("open");
  });

  it("has details element open when defaultOpen=true", () => {
    const { container } = render(
      <AuthInfoCard title="T" defaultOpen>
        C
      </AuthInfoCard>,
    );
    const details = container.querySelector("details");
    expect(details).toHaveAttribute("open");
  });

  it("applies custom className", () => {
    const { container } = render(
      <AuthInfoCard title="T" className="custom-cls">
        C
      </AuthInfoCard>,
    );
    const section = container.querySelector("section");
    expect(section).toHaveClass("custom-cls");
    expect(section).toHaveClass("auth-info-card");
  });

  it("applies custom bodyClassName", () => {
    const { container } = render(
      <AuthInfoCard title="T" bodyClassName="body-cls">
        C
      </AuthInfoCard>,
    );
    const body = container.querySelector(".card-body");
    expect(body).toHaveClass("body-cls");
  });

  it("shows chevron indicator", () => {
    const { container } = render(<AuthInfoCard title="T">C</AuthInfoCard>);
    const chevron = container.querySelector(".auth-info-summary-chevron");
    expect(chevron).toBeInTheDocument();
    expect(chevron).toHaveTextContent("▾");
  });
});

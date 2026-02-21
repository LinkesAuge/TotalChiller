// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

import PageSkeleton from "./page-skeleton";
import type { PageSkeletonVariant } from "./page-skeleton";

describe("PageSkeleton", () => {
  it("renders skeleton elements with default variant", () => {
    const { container } = render(<PageSkeleton />);
    const skeletons = container.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it.each<PageSkeletonVariant>([
    "default",
    "dashboard",
    "list",
    "table",
    "detail",
    "article",
    "auth",
    "form",
    "messages",
    "admin",
  ])("renders skeleton elements for variant '%s'", (variant) => {
    const { container } = render(<PageSkeleton variant={variant} />);
    const skeletons = container.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("wraps content in content-inner container", () => {
    const { container } = render(<PageSkeleton />);
    expect(container.querySelector(".content-inner")).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import TableScroll from "./table-scroll";

const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.ResizeObserver = class {
    observe = mockObserve;
    disconnect = mockDisconnect;
    unobserve = vi.fn();
    constructor(_cb: ResizeObserverCallback) {}
  } as any;
});

describe("TableScroll", () => {
  it("renders children inside scroll container", () => {
    render(
      <TableScroll>
        <table data-testid="table">
          <tbody>
            <tr>
              <td>Cell</td>
            </tr>
          </tbody>
        </table>
      </TableScroll>,
    );
    expect(screen.getByTestId("table")).toBeInTheDocument();
  });

  it("applies custom className to bottom scroll container", () => {
    const { container } = render(
      <TableScroll className="custom">
        <div>Content</div>
      </TableScroll>,
    );
    const bottomScroll = container.querySelector(".table-scroll.custom");
    expect(bottomScroll).toBeInTheDocument();
  });

  it("renders a top scroll div", () => {
    const { container } = render(
      <TableScroll>
        <div>Content</div>
      </TableScroll>,
    );
    const topScroll = container.querySelector(".top-scroll");
    expect(topScroll).toBeInTheDocument();
  });

  it("sets up ResizeObserver on mount", () => {
    render(
      <TableScroll>
        <div>Content</div>
      </TableScroll>,
    );
    expect(mockObserve).toHaveBeenCalled();
  });

  it("disconnects ResizeObserver on unmount", () => {
    const { unmount } = render(
      <TableScroll>
        <div>Content</div>
      </TableScroll>,
    );
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("hides top scroll when content does not overflow", () => {
    const { container } = render(
      <TableScroll>
        <div>Content</div>
      </TableScroll>,
    );
    const topScroll = container.querySelector(".top-scroll");
    expect(topScroll?.className).toContain("is-hidden");
  });

  it("syncs bottom scrollLeft when top is scrolled", () => {
    const { container } = render(
      <TableScroll>
        <div>Content</div>
      </TableScroll>,
    );
    const topScroll = container.querySelector(".top-scroll") as HTMLDivElement;
    const bottomScroll = container.querySelector(".table-scroll:not(.top-scroll)") as HTMLDivElement;

    Object.defineProperty(topScroll, "scrollLeft", { value: 100, writable: true });
    fireEvent.scroll(topScroll);
    expect(bottomScroll.scrollLeft).toBe(100);
  });

  it("syncs top scrollLeft when bottom is scrolled", () => {
    const { container } = render(
      <TableScroll>
        <div>Content</div>
      </TableScroll>,
    );
    const topScroll = container.querySelector(".top-scroll") as HTMLDivElement;
    const bottomScroll = container.querySelector(".table-scroll:not(.top-scroll)") as HTMLDivElement;

    Object.defineProperty(bottomScroll, "scrollLeft", { value: 75, writable: true });
    fireEvent.scroll(bottomScroll);
    expect(topScroll.scrollLeft).toBe(75);
  });

  it("removes resize event listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(
      <TableScroll>
        <div>Content</div>
      </TableScroll>,
    );
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    removeSpy.mockRestore();
  });

  it("works without className prop", () => {
    const { container } = render(
      <TableScroll>
        <div>Content</div>
      </TableScroll>,
    );
    const bottomScroll = container.querySelectorAll(".table-scroll");
    expect(bottomScroll.length).toBeGreaterThanOrEqual(2);
  });

  it("shows top scroll when content overflows", () => {
    let resizeCb: ResizeObserverCallback | null = null;
    global.ResizeObserver = class {
      observe = mockObserve;
      disconnect = mockDisconnect;
      unobserve = vi.fn();
      constructor(cb: ResizeObserverCallback) {
        resizeCb = cb;
      }
    } as any;

    const { container } = render(
      <TableScroll>
        <div style={{ width: "2000px" }}>Wide content</div>
      </TableScroll>,
    );

    const bottomScroll = container.querySelector(".table-scroll:not(.top-scroll)") as HTMLDivElement;
    Object.defineProperty(bottomScroll, "scrollWidth", { value: 2000, configurable: true });
    Object.defineProperty(bottomScroll, "clientWidth", { value: 500, configurable: true });

    if (resizeCb) {
      resizeCb([], {} as ResizeObserver);
    }

    const topScroll = container.querySelector(".top-scroll");
    expect(topScroll).toBeInTheDocument();
  });
});

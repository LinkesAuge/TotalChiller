import { vi } from "vitest";

/**
 * Usage:
 * ```ts
 * vi.mock("next/image", () => nextImageMock());
 * ```
 */
export function nextImageMock() {
  return {
    __esModule: true,
    default: vi.fn(
      ({
        src,
        alt,
        fill,
        priority,
        unoptimized,
        loader,
        quality,
        placeholder,
        blurDataURL,
        onLoadingComplete,
        ...props
      }: Record<string, unknown>) => {
        const React = require("react");
        return React.createElement("img", { src, alt, ...props });
      },
    ),
  };
}

/**
 * Usage:
 * ```ts
 * vi.mock("next/link", () => nextLinkMock());
 * ```
 */
export function nextLinkMock() {
  return {
    __esModule: true,
    default: vi.fn(({ children, href, ...props }: Record<string, unknown>) => {
      const React = require("react");
      return React.createElement("a", { href, ...props }, children);
    }),
  };
}

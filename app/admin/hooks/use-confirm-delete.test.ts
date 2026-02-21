// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useConfirmDelete } from "./use-confirm-delete";

describe("useConfirmDelete", () => {
  it("starts in closed state with empty input", () => {
    const { result } = renderHook(() => useConfirmDelete());

    expect(result.current.step).toBe("closed");
    expect(result.current.inputValue).toBe("");
  });

  it("opens to confirm step", () => {
    const { result } = renderHook(() => useConfirmDelete());

    act(() => {
      result.current.openConfirm();
    });

    expect(result.current.step).toBe("confirm");
  });

  it("proceeds from confirm to input step and resets input", () => {
    const { result } = renderHook(() => useConfirmDelete());

    act(() => {
      result.current.openConfirm();
    });

    act(() => {
      result.current.setInputValue("leftover");
    });

    act(() => {
      result.current.proceedToInput();
    });

    expect(result.current.step).toBe("input");
    expect(result.current.inputValue).toBe("");
  });

  it("tracks input value changes", () => {
    const { result } = renderHook(() => useConfirmDelete());

    act(() => {
      result.current.openConfirm();
    });
    act(() => {
      result.current.proceedToInput();
    });
    act(() => {
      result.current.setInputValue("DELETE");
    });

    expect(result.current.inputValue).toBe("DELETE");
  });

  it("isConfirmed returns true when input matches phrase", () => {
    const { result } = renderHook(() => useConfirmDelete());

    act(() => {
      result.current.openConfirm();
    });
    act(() => {
      result.current.proceedToInput();
    });
    act(() => {
      result.current.setInputValue("DELETE");
    });

    expect(result.current.isConfirmed("DELETE")).toBe(true);
    expect(result.current.isConfirmed("delete")).toBe(false);
  });

  it("isConfirmed trims whitespace", () => {
    const { result } = renderHook(() => useConfirmDelete());

    act(() => {
      result.current.setInputValue("  DELETE  ");
    });

    expect(result.current.isConfirmed("DELETE")).toBe(true);
  });

  it("close resets to initial state", () => {
    const { result } = renderHook(() => useConfirmDelete());

    act(() => {
      result.current.openConfirm();
    });
    act(() => {
      result.current.proceedToInput();
    });
    act(() => {
      result.current.setInputValue("something");
    });
    act(() => {
      result.current.close();
    });

    expect(result.current.step).toBe("closed");
    expect(result.current.inputValue).toBe("");
  });

  it("full confirm flow: open -> confirm -> input -> type phrase -> verified", () => {
    const { result } = renderHook(() => useConfirmDelete());

    expect(result.current.step).toBe("closed");

    act(() => result.current.openConfirm());
    expect(result.current.step).toBe("confirm");

    act(() => result.current.proceedToInput());
    expect(result.current.step).toBe("input");
    expect(result.current.inputValue).toBe("");

    act(() => result.current.setInputValue("CONFIRM"));
    expect(result.current.isConfirmed("CONFIRM")).toBe(true);

    act(() => result.current.close());
    expect(result.current.step).toBe("closed");
    expect(result.current.inputValue).toBe("");
  });
});

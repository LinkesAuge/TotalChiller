// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider, useToast } from "./toast-provider";

function TestConsumer() {
  const { pushToast } = useToast();
  return <button onClick={() => pushToast("Test message")}>Push</button>;
}

function EmptyPushConsumer() {
  const { pushToast } = useToast();
  return <button onClick={() => pushToast("   ")}>PushEmpty</button>;
}

describe("ToastProvider", () => {
  it("renders children", () => {
    render(
      <ToastProvider>
        <span data-testid="child">Hello</span>
      </ToastProvider>,
    );
    expect(screen.getByTestId("child")).toBeDefined();
  });

  it("pushToast adds a toast to the stack", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Push"));
    expect(screen.getByText("Test message")).toBeDefined();
  });

  it("toast displays the message text", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Push"));
    const toastStack = screen.getByRole("status");
    expect(toastStack.textContent).toContain("Test message");
  });

  it("useToast throws when used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow("useToast must be used within ToastProvider.");
    spy.mockRestore();
  });

  it("toast auto-dismisses after timeout", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Push"));
    expect(screen.getByText("Test message")).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText("Test message")).toBeNull();
    vi.useRealTimers();
  });

  it("ignores empty message pushes", () => {
    render(
      <ToastProvider>
        <EmptyPushConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("PushEmpty"));
    const toastStack = screen.getByRole("status");
    expect(toastStack.children.length).toBe(0);
  });
});

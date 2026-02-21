// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SidebarProvider, useSidebar } from "./sidebar-context";

function TestConsumer() {
  const { isOpen, toggle, width } = useSidebar();
  return (
    <div>
      <span data-testid="is-open">{String(isOpen)}</span>
      <span data-testid="width">{width}</span>
      <button onClick={toggle}>Toggle</button>
    </div>
  );
}

describe("SidebarProvider + useSidebar", () => {
  it("provides default open state (isOpen=true, width=240)", () => {
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>,
    );
    expect(screen.getByTestId("is-open").textContent).toBe("true");
    expect(screen.getByTestId("width").textContent).toBe("240");
  });

  it("toggles to collapsed state (isOpen=false, width=60)", () => {
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>,
    );
    fireEvent.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("is-open").textContent).toBe("false");
    expect(screen.getByTestId("width").textContent).toBe("60");
  });

  it("toggles back to expanded state", () => {
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>,
    );
    fireEvent.click(screen.getByText("Toggle"));
    fireEvent.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("is-open").textContent).toBe("true");
    expect(screen.getByTestId("width").textContent).toBe("240");
  });

  it("returns defaults when used outside provider", () => {
    render(<TestConsumer />);
    expect(screen.getByTestId("is-open").textContent).toBe("true");
    expect(screen.getByTestId("width").textContent).toBe("240");
  });
});

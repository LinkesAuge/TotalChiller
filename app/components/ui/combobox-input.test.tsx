// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ComboboxInput from "./combobox-input";

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe("ComboboxInput", () => {
  const options = ["Apple", "Banana", "Cherry"];

  it("renders an input with combobox role", () => {
    render(<ComboboxInput value="" onChange={() => {}} options={options} />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("shows aria-expanded=false when dropdown is closed", () => {
    render(<ComboboxInput value="" onChange={() => {}} options={options} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the dropdown on focus when there are options", () => {
    render(<ComboboxInput value="" onChange={() => {}} options={options} />);
    fireEvent.focus(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("filters options based on value", () => {
    render(<ComboboxInput value="ban" onChange={() => {}} options={options} />);
    fireEvent.focus(screen.getByRole("combobox"));
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByText("Banana")).toBeTruthy();
  });

  it("calls onChange when typing", () => {
    const handler = vi.fn();
    render(<ComboboxInput value="" onChange={handler} options={options} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ch" } });
    expect(handler).toHaveBeenCalledWith("ch");
  });

  it("selects an option via mouseDown", () => {
    const handler = vi.fn();
    render(<ComboboxInput value="" onChange={handler} options={options} />);
    fireEvent.focus(screen.getByRole("combobox"));
    fireEvent.mouseDown(screen.getByText("Cherry"));
    expect(handler).toHaveBeenCalledWith("Cherry");
  });

  it("navigates options with ArrowDown/ArrowUp keys", () => {
    render(<ComboboxInput value="" onChange={() => {}} options={options} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    const highlighted = screen.getAllByRole("option");
    expect(highlighted[0]).toHaveAttribute("aria-selected", "true");
  });

  it("selects highlighted option with Enter", () => {
    const handler = vi.fn();
    render(<ComboboxInput value="" onChange={handler} options={options} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(handler).toHaveBeenCalledWith("Apple");
  });

  it("closes dropdown on Escape", () => {
    render(<ComboboxInput value="" onChange={() => {}} options={options} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    expect(screen.getByRole("listbox")).toBeTruthy();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes dropdown on blur outside wrapper", () => {
    render(<ComboboxInput value="" onChange={() => {}} options={options} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    expect(screen.getByRole("listbox")).toBeTruthy();

    fireEvent.blur(input.closest("[role=group]")!, { relatedTarget: document.body });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("does not open dropdown when there are no options", () => {
    render(<ComboboxInput value="" onChange={() => {}} options={[]} />);
    fireEvent.focus(screen.getByRole("combobox"));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("applies id and placeholder props", () => {
    render(<ComboboxInput value="" onChange={() => {}} options={options} id="combo-1" placeholder="Type..." />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("id", "combo-1");
    expect(input).toHaveAttribute("placeholder", "Type...");
  });

  it("opens dropdown on ArrowDown when closed", () => {
    render(<ComboboxInput value="" onChange={() => {}} options={options} />);
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeTruthy();
  });

  it("wraps highlight index with ArrowUp from top", () => {
    render(<ComboboxInput value="" onChange={() => {}} options={options} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    const opts = screen.getAllByRole("option");
    expect(opts[opts.length - 1]).toHaveAttribute("aria-selected", "true");
  });
});

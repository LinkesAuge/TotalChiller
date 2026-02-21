// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SearchInput from "./search-input";

describe("SearchInput", () => {
  it("renders a labeled input", () => {
    render(<SearchInput id="s1" label="Search" value="" onChange={() => {}} />);
    expect(screen.getByLabelText("Search")).toBeTruthy();
  });

  it("displays the current value", () => {
    render(<SearchInput id="s1" label="Search" value="hello" onChange={() => {}} />);
    expect(screen.getByDisplayValue("hello")).toBeTruthy();
  });

  it("calls onChange with the new value on input", () => {
    const handler = vi.fn();
    render(<SearchInput id="s1" label="Search" value="" onChange={handler} />);
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "new" } });
    expect(handler).toHaveBeenCalledWith("new");
  });

  it("renders with a placeholder", () => {
    render(<SearchInput id="s1" label="Search" value="" onChange={() => {}} placeholder="Type here..." />);
    expect(screen.getByPlaceholderText("Type here...")).toBeTruthy();
  });

  it("applies inputClassName to the input", () => {
    render(<SearchInput id="s1" label="Search" value="" onChange={() => {}} inputClassName="custom-class" />);
    expect(screen.getByLabelText("Search").className).toBe("custom-class");
  });

  it("associates label with input via htmlFor/id", () => {
    render(<SearchInput id="my-search" label="Find" value="" onChange={() => {}} />);
    const input = screen.getByLabelText("Find");
    expect(input).toHaveAttribute("id", "my-search");
  });
});

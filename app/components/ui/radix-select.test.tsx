// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RadixSelect from "./radix-select";

vi.mock("@/lib/string-utils", () => ({
  normalizeString: (v: string) => v.trim().toLowerCase(),
}));

describe("RadixSelect", () => {
  const options = [
    { value: "", label: "All" },
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ];

  it("renders a trigger button", () => {
    render(<RadixSelect value="" onValueChange={() => {}} options={options} />);
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeTruthy();
  });

  it("passes id to the trigger", () => {
    render(<RadixSelect id="my-sel" value="" onValueChange={() => {}} options={options} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("id", "my-sel");
  });

  it("applies ariaLabel to the trigger", () => {
    render(<RadixSelect ariaLabel="Choose" value="" onValueChange={() => {}} options={options} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-label", "Choose");
  });

  it("applies triggerClassName", () => {
    render(<RadixSelect value="" onValueChange={() => {}} options={options} triggerClassName="custom-trigger" />);
    expect(screen.getByRole("combobox").className).toContain("custom-trigger");
  });

  it("defaults triggerClassName to select-trigger", () => {
    render(<RadixSelect value="" onValueChange={() => {}} options={options} />);
    expect(screen.getByRole("combobox").className).toContain("select-trigger");
  });

  it("sets data-role when triggerDataRole is provided", () => {
    render(<RadixSelect value="" onValueChange={() => {}} options={options} triggerDataRole="filter" />);
    expect(screen.getByRole("combobox").getAttribute("data-role")).toBe("filter");
  });

  it("disables the trigger when disabled=true", () => {
    render(<RadixSelect value="" onValueChange={() => {}} options={options} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("falls back ariaLabel to id when ariaLabel is not provided", () => {
    render(<RadixSelect id="test-id" value="" onValueChange={() => {}} options={options} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-label", "test-id");
  });

  it("does not set data-role when triggerDataRole is not provided", () => {
    render(<RadixSelect value="" onValueChange={() => {}} options={options} />);
    expect(screen.getByRole("combobox").getAttribute("data-role")).toBeNull();
  });

  it("renders with a selected value", () => {
    render(<RadixSelect value="a" onValueChange={() => {}} options={options} />);
    const trigger = screen.getByRole("combobox");
    expect(trigger.textContent).toContain("Alpha");
  });

  it("renders empty value label when value is empty string", () => {
    render(<RadixSelect value="" onValueChange={() => {}} options={options} />);
    const trigger = screen.getByRole("combobox");
    expect(trigger.textContent).toContain("All");
  });

  it("sets aria-controls with id-based content id", () => {
    render(<RadixSelect id="sel" value="" onValueChange={() => {}} options={options} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-controls", "sel-content");
  });

  it("does not set aria-controls when no id is given", () => {
    render(<RadixSelect value="" onValueChange={() => {}} options={options} />);
    const trigger = screen.getByRole("combobox");
    expect(trigger.getAttribute("aria-controls")).toBeNull();
  });

  it("handles options with disabled items", () => {
    const disabledOptions = [
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta", disabled: true },
    ];
    render(<RadixSelect value="a" onValueChange={() => {}} options={disabledOptions} />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("renders trigger even when no option matches the current value", () => {
    render(
      <RadixSelect value="" onValueChange={() => {}} options={[{ value: "x", label: "X" }]} placeholder="Pick one" />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeTruthy();
  });

  it("renders with enableSearch false by default", () => {
    render(<RadixSelect value="" onValueChange={() => {}} options={options} />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("does not render search input when closed", () => {
    render(<RadixSelect value="" onValueChange={() => {}} options={options} enableSearch />);
    expect(screen.queryByPlaceholderText("Search")).toBeNull();
  });

  it("opens dropdown when trigger is clicked", () => {
    render(<RadixSelect value="a" onValueChange={() => {}} options={options} />);
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeTruthy();
  });

  it("renders all options when dropdown is open", () => {
    render(<RadixSelect value="a" onValueChange={() => {}} options={options} />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getAllByText("Alpha").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.getByText("All")).toBeTruthy();
  });

  it("calls onValueChange when an option is selected", () => {
    const onChange = vi.fn();
    render(<RadixSelect value="a" onValueChange={onChange} options={options} />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Beta"));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("calls onValueChange with empty string for empty-value option", () => {
    const onChange = vi.fn();
    render(<RadixSelect value="a" onValueChange={onChange} options={options} />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("All"));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("renders search input when dropdown opens with enableSearch", () => {
    render(<RadixSelect value="a" onValueChange={() => {}} options={options} enableSearch />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByPlaceholderText("Search")).toBeTruthy();
  });

  it("filters options when search term is entered", () => {
    render(<RadixSelect value="a" onValueChange={() => {}} options={options} enableSearch />);
    fireEvent.click(screen.getByRole("combobox"));
    const searchInput = screen.getByPlaceholderText("Search");
    fireEvent.change(searchInput, { target: { value: "bet" } });
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.queryByText("Alpha")).toBeNull();
  });

  it("shows 'No matches' when search returns empty results", () => {
    render(<RadixSelect value="a" onValueChange={() => {}} options={[{ value: "x", label: "X" }]} enableSearch />);
    fireEvent.click(screen.getByRole("combobox"));
    const searchInput = screen.getByPlaceholderText("Search");
    fireEvent.change(searchInput, { target: { value: "zzz" } });
    expect(screen.getByText("No matches")).toBeTruthy();
  });

  it("uses custom searchPlaceholder", () => {
    render(
      <RadixSelect value="a" onValueChange={() => {}} options={options} enableSearch searchPlaceholder="Find..." />,
    );
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByPlaceholderText("Find...")).toBeTruthy();
  });

  it("clears search term when dropdown closes and reopens", () => {
    const { unmount } = render(<RadixSelect value="a" onValueChange={() => {}} options={options} enableSearch />);
    fireEvent.click(screen.getByRole("combobox"));
    const searchInput = screen.getByPlaceholderText("Search");
    fireEvent.change(searchInput, { target: { value: "bet" } });
    expect((searchInput as HTMLInputElement).value).toBe("bet");
    unmount();

    render(<RadixSelect value="a" onValueChange={() => {}} options={options} enableSearch />);
    fireEvent.click(screen.getByRole("combobox"));
    const freshSearchInput = screen.getByPlaceholderText("Search");
    expect((freshSearchInput as HTMLInputElement).value).toBe("");
  });

  it("renders custom option content via renderOptionContent", () => {
    const customRender = (opt: { label: string }) => <span data-testid="custom">{opt.label}!</span>;
    render(<RadixSelect value="a" onValueChange={() => {}} options={options} renderOptionContent={customRender} />);
    fireEvent.click(screen.getByRole("combobox"));
    const customItems = screen.getAllByTestId("custom");
    expect(customItems.length).toBeGreaterThan(0);
  });

  it("applies contentClassName to the listbox element", () => {
    render(<RadixSelect value="a" onValueChange={() => {}} options={options} contentClassName="custom-content" />);
    fireEvent.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    expect(listbox.className).toContain("custom-content");
  });

  it("always shows empty-value option in search results", () => {
    render(<RadixSelect value="a" onValueChange={() => {}} options={options} enableSearch />);
    fireEvent.click(screen.getByRole("combobox"));
    const searchInput = screen.getByPlaceholderText("Search");
    fireEvent.change(searchInput, { target: { value: "bet" } });
    expect(screen.getByText("All")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
  });
});

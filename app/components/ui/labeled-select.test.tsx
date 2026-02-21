// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LabeledSelect from "./labeled-select";

vi.mock("./radix-select", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("select", {
      "data-testid": "radix-select",
      id: props.id,
      "aria-label": props.ariaLabel,
      value: props.value,
      disabled: props.disabled,
      onChange: (e: any) => props.onValueChange(e.target.value),
    });
  },
}));

describe("LabeledSelect", () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ];

  it("renders a label associated with the select", () => {
    render(<LabeledSelect id="my-select" label="Pick one" value="a" onValueChange={() => {}} options={options} />);
    expect(screen.getByText("Pick one")).toBeTruthy();
    expect(screen.getByText("Pick one").tagName).toBe("LABEL");
    expect(screen.getByText("Pick one")).toHaveAttribute("for", "my-select");
  });

  it("renders the RadixSelect with correct props", () => {
    render(<LabeledSelect id="sel" label="Label" value="b" onValueChange={() => {}} options={options} />);
    const select = screen.getByTestId("radix-select");
    expect(select).toHaveAttribute("id", "sel");
    expect(select).toHaveAttribute("aria-label", "Label");
  });

  it("uses ariaLabel prop when provided", () => {
    render(
      <LabeledSelect
        id="sel"
        label="Label"
        ariaLabel="Custom aria"
        value="a"
        onValueChange={() => {}}
        options={options}
      />,
    );
    expect(screen.getByTestId("radix-select")).toHaveAttribute("aria-label", "Custom aria");
  });

  it("passes disabled prop", () => {
    render(<LabeledSelect id="sel" label="Label" value="a" onValueChange={() => {}} options={options} disabled />);
    expect(screen.getByTestId("radix-select")).toBeDisabled();
  });
});

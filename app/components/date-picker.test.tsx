// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DatePicker from "./date-picker";

let lastFlatpickrProps: any = null;

vi.mock("react-flatpickr", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    lastFlatpickrProps = props;
    return React.createElement("input", {
      "data-testid": "flatpickr",
      value: props.value || "",
      className: props.className,
      readOnly: true,
    });
  },
}));
vi.mock("flatpickr/dist/flatpickr.min.css", () => ({}));

describe("DatePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastFlatpickrProps = null;
  });

  it("renders the flatpickr input", () => {
    render(<DatePicker value="2026-01-15" onChange={vi.fn()} />);
    expect(screen.getByTestId("flatpickr")).toBeInTheDocument();
  });

  it("passes value to flatpickr", () => {
    render(<DatePicker value="2026-06-20" onChange={vi.fn()} />);
    expect(lastFlatpickrProps.value).toBe("2026-06-20");
  });

  it("configures date-only format when enableTime is false", () => {
    render(<DatePicker value="" onChange={vi.fn()} />);
    expect(lastFlatpickrProps.options.enableTime).toBeFalsy();
    expect(lastFlatpickrProps.options.dateFormat).toBe("Y-m-d");
    expect(lastFlatpickrProps.options.altFormat).toBe("d.m.Y");
  });

  it("configures datetime format when enableTime is true", () => {
    render(<DatePicker value="" onChange={vi.fn()} enableTime />);
    expect(lastFlatpickrProps.options.enableTime).toBe(true);
    expect(lastFlatpickrProps.options.time_24hr).toBe(true);
    expect(lastFlatpickrProps.options.dateFormat).toBe("Y-m-d\\TH:i");
    expect(lastFlatpickrProps.options.altFormat).toBe("d.m.Y, H:i");
  });

  it("calls onChange with local ISO string when date selected", () => {
    const onChange = vi.fn();
    render(<DatePicker value="" onChange={onChange} enableTime />);
    const date = new Date(2026, 5, 15, 14, 30);
    lastFlatpickrProps.onChange([date]);
    expect(onChange).toHaveBeenCalledWith("2026-06-15T14:30");
  });

  it("calls onChange with date-only string when enableTime is off", () => {
    const onChange = vi.fn();
    render(<DatePicker value="" onChange={onChange} />);
    const date = new Date(2026, 0, 1, 10, 0);
    lastFlatpickrProps.onChange([date]);
    expect(onChange).toHaveBeenCalledWith("2026-01-01");
  });

  it("does not call onChange when dates array is empty", () => {
    const onChange = vi.fn();
    render(<DatePicker value="" onChange={onChange} />);
    lastFlatpickrProps.onChange([]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("applies date-picker-input className", () => {
    render(<DatePicker value="" onChange={vi.fn()} />);
    expect(lastFlatpickrProps.className).toBe("date-picker-input");
  });
});

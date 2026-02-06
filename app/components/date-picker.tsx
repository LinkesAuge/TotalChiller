"use client";

import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";

interface DatePickerProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly enableTime?: boolean;
}

/**
 * Themed Flatpickr date (or datetime) picker.
 * When enableTime is true, the picker includes time selection.
 */
function DatePicker({ value, onChange, enableTime = false }: DatePickerProps): JSX.Element {
  const dateFormat = enableTime ? "Y-m-d H:i" : "Y-m-d";
  const altFormat = enableTime ? "d.m.Y, H:i" : "d.m.Y";

  return (
    <Flatpickr
      className="date-picker-input"
      value={value}
      options={{
        dateFormat,
        altInput: true,
        altFormat,
        altInputClass: "date-picker-input",
        allowInput: true,
        enableTime,
        time_24hr: enableTime,
      }}
      onChange={(_dates, dateStr) => onChange(dateStr)}
    />
  );
}

export default DatePicker;

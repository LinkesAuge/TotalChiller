"use client";

import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";

interface DatePickerProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly enableTime?: boolean;
}

/**
 * Build an unambiguous local "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD" string
 * from the Date object Flatpickr gives us.  Avoids the space-separated
 * dateStr ("2026-02-11 18:00") which some browsers parse as UTC.
 */
function toLocalString(date: Date, withTime: boolean): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  if (!withTime) return `${yyyy}-${mm}-${dd}`;
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/**
 * Themed Flatpickr date (or datetime) picker.
 * When enableTime is true, the picker includes time selection.
 */
function DatePicker({ value, onChange, enableTime = false }: DatePickerProps): JSX.Element {
  /* Use T-separated format so Flatpickr's internal value matches
     the "YYYY-MM-DDTHH:mm" strings we produce in onChange. */
  const dateFormat = enableTime ? "Y-m-d\\TH:i" : "Y-m-d";
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
      onChange={(dates) => {
        if (dates[0]) {
          onChange(toLocalString(dates[0], enableTime));
        }
      }}
    />
  );
}

export default DatePicker;

"use client";

import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";

interface DatePickerProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

function DatePicker({ value, onChange }: DatePickerProps): JSX.Element {
  return (
    <Flatpickr
      className="date-picker-input"
      value={value}
      options={{
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d.m.Y",
        altInputClass: "date-picker-input",
        allowInput: true,
      }}
      onChange={(_dates, dateStr) => onChange(dateStr)}
    />
  );
}

export default DatePicker;

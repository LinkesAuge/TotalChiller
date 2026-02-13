"use client";

import { type ReactNode } from "react";
import RadixSelect, { type SelectOption } from "./radix-select";

interface LabeledSelectProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly options: readonly SelectOption[];
  readonly ariaLabel?: string;
  readonly enableSearch?: boolean;
  readonly searchPlaceholder?: string;
  readonly renderOptionContent?: (option: SelectOption) => ReactNode;
  readonly triggerClassName?: string;
  readonly triggerDataRole?: string;
  readonly disabled?: boolean;
}

/**
 * Renders a standardized labeled select control.
 */
function LabeledSelect({
  id,
  label,
  value,
  onValueChange,
  options,
  ariaLabel,
  enableSearch,
  searchPlaceholder,
  renderOptionContent,
  triggerClassName,
  triggerDataRole,
  disabled,
}: LabeledSelectProps): JSX.Element {
  return (
    <>
      <label htmlFor={id} className="text-muted">
        {label}
      </label>
      <RadixSelect
        id={id}
        ariaLabel={ariaLabel ?? label}
        value={value}
        onValueChange={onValueChange}
        options={options}
        enableSearch={enableSearch}
        searchPlaceholder={searchPlaceholder}
        renderOptionContent={renderOptionContent}
        triggerClassName={triggerClassName}
        triggerDataRole={triggerDataRole}
        disabled={disabled}
      />
    </>
  );
}

export default LabeledSelect;

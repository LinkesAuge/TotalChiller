import { type ReactNode } from "react";
import * as Select from "@radix-ui/react-select";

interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

interface RadixSelectProps {
  readonly id?: string;
  readonly ariaLabel?: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly placeholder?: string;
  readonly options: readonly SelectOption[];
  readonly disabled?: boolean;
  readonly renderOptionContent?: (option: SelectOption) => ReactNode;
  readonly triggerClassName?: string;
  readonly triggerDataRole?: string;
}

export default function RadixSelect({
  id,
  ariaLabel,
  value,
  onValueChange,
  placeholder,
  options,
  disabled = false,
  renderOptionContent,
  triggerClassName,
  triggerDataRole,
}: RadixSelectProps): ReactNode {
  const emptyValue = "__empty__";
  const normalizedValue = value === "" ? emptyValue : value;
  return (
    <Select.Root
      value={normalizedValue}
      onValueChange={(nextValue) => onValueChange(nextValue === emptyValue ? "" : nextValue)}
      disabled={disabled}
    >
      <Select.Trigger
        id={id}
        className={triggerClassName ?? "select-trigger"}
        aria-label={ariaLabel ?? id}
        data-role={triggerDataRole}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="select-icon">
          <svg aria-hidden="true" width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path
              d="M1 1L6 6L11 1"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="select-content" position="popper" sideOffset={6}>
          <Select.Viewport className="select-viewport">
            {options.map((option) => {
              const optionValue = option.value === "" ? emptyValue : option.value;
              return (
              <Select.Item
                key={optionValue}
                value={optionValue}
                className="select-item"
                disabled={option.disabled}
              >
                <Select.ItemText>
                  {renderOptionContent ? renderOptionContent(option) : option.label}
                </Select.ItemText>
                <Select.ItemIndicator className="select-item-indicator">
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M4 8.5L7 11.5L12 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Select.ItemIndicator>
              </Select.Item>
            );
            })}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

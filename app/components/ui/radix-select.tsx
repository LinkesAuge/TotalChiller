import { type ReactNode, useMemo, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { normalizeString } from "@/lib/string-utils";

export interface SelectOption {
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
  readonly contentClassName?: string;
  readonly enableSearch?: boolean;
  readonly searchPlaceholder?: string;
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
  contentClassName,
  enableSearch = false,
  searchPlaceholder = "Search",
}: RadixSelectProps): ReactNode {
  const emptyValue = "__empty__";
  const normalizedValue = value === "" ? emptyValue : value;
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const filteredOptions = useMemo(() => {
    if (!enableSearch) {
      return options;
    }
    const query = normalizeString(searchTerm);
    if (!query) {
      return options;
    }
    return options.filter((option) => {
      if (option.value === "") {
        return true;
      }
      const label = option.label.toLowerCase();
      const valueString = option.value.toLowerCase();
      return label.includes(query) || valueString.includes(query);
    });
  }, [enableSearch, options, searchTerm]);
  return (
    <Select.Root
      value={normalizedValue}
      onValueChange={(nextValue) => onValueChange(nextValue === emptyValue ? "" : nextValue)}
      disabled={disabled}
      open={isOpen}
      onOpenChange={(nextOpen) => {
        setIsOpen(nextOpen);
        if (!nextOpen) {
          setSearchTerm("");
        }
      }}
    >
      <Select.Trigger
        id={id}
        className={triggerClassName ?? "select-trigger"}
        aria-label={ariaLabel ?? id}
        data-role={triggerDataRole}
      >
        <Select.Value placeholder={placeholder} />
        <span className="select-icon-wrap">
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
        </span>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className={contentClassName ?? "select-content"}
          position="popper"
          sideOffset={6}
          style={{ maxHeight: "min(280px, var(--radix-popper-available-height, 280px))" }}
        >
          {enableSearch ? (
            <input
              className="select-search"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder={searchPlaceholder}
            />
          ) : null}
          <Select.Viewport className="select-viewport" style={{ maxHeight: 280, overflowY: "scroll" }}>
            {filteredOptions.length === 0 ? (
              <div className="select-empty">No matches</div>
            ) : (
              filteredOptions.map((option) => {
                const optionValue = option.value === "" ? emptyValue : option.value;
                return (
                  <Select.Item key={optionValue} value={optionValue} className="select-item" disabled={option.disabled}>
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
              })
            )}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

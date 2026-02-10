"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ComboboxInputProps {
  /** Current input value. */
  readonly value: string;
  /** Called when the value changes (via typing or selection). */
  readonly onChange: (value: string) => void;
  /** Suggestion options shown in the dropdown. */
  readonly options: readonly string[];
  /** Optional CSS class for the input element. */
  readonly className?: string;
  /** Optional placeholder text. */
  readonly placeholder?: string;
  /** Optional id for the input element. */
  readonly id?: string;
}

/**
 * A combobox-style input that combines free-text entry with
 * a filterable dropdown of suggestions.
 */
export default function ComboboxInput({
  value,
  onChange,
  options,
  className,
  placeholder,
  id,
}: ComboboxInputProps): React.ReactNode {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) {
      return options;
    }
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, value]);

  const handleBlur = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    if (wrapperRef.current?.contains(event.relatedTarget as Node)) {
      return;
    }
    setIsOpen(false);
    setHighlightIndex(-1);
  }, []);

  const selectOption = useCallback(
    (option: string) => {
      onChange(option);
      setIsOpen(false);
      setHighlightIndex(-1);
      inputRef.current?.focus();
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        setIsOpen(true);
        setHighlightIndex(0);
        event.preventDefault();
        return;
      }
      if (!isOpen) {
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightIndex((current) => (current < filteredOptions.length - 1 ? current + 1 : 0));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightIndex((current) => (current > 0 ? current - 1 : filteredOptions.length - 1));
      } else if (event.key === "Enter" && highlightIndex >= 0 && highlightIndex < filteredOptions.length) {
        event.preventDefault();
        const option = filteredOptions[highlightIndex];
        if (option !== undefined) selectOption(option);
      } else if (event.key === "Escape") {
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    },
    [filteredOptions, highlightIndex, isOpen, selectOption],
  );

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  const showDropdown = isOpen && filteredOptions.length > 0;

  return (
    <div ref={wrapperRef} className="combobox-wrapper" onBlur={handleBlur} role="group">
      <input
        ref={inputRef}
        id={id}
        className={className}
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
          setHighlightIndex(-1);
        }}
        onFocus={() => {
          if (filteredOptions.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls={id ? `${id}-listbox` : undefined}
        autoComplete="off"
      />
      {showDropdown ? (
        <ul ref={listRef} id={id ? `${id}-listbox` : undefined} className="combobox-dropdown" role="listbox">
          {filteredOptions.map((option, index) => (
            <li
              key={option}
              className={`combobox-option${index === highlightIndex ? " combobox-option-highlighted" : ""}${option.toLowerCase() === value.trim().toLowerCase() ? " combobox-option-selected" : ""}`}
              role="option"
              aria-selected={index === highlightIndex}
              onMouseDown={(event) => {
                event.preventDefault();
                selectOption(option);
              }}
              onMouseEnter={() => setHighlightIndex(index)}
            >
              {option}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

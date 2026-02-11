"use client";

interface SearchInputProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly inputClassName?: string;
}

/**
 * Renders a standardized labeled search input.
 */
function SearchInput({ id, label, value, onChange, placeholder, inputClassName }: SearchInputProps): JSX.Element {
  return (
    <>
      <label htmlFor={id} className="text-muted">
        {label}
      </label>
      <input
        id={id}
        className={inputClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </>
  );
}

export default SearchInput;

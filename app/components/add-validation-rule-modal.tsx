"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import FormModal from "./form-modal";
import RadixSelect from "./ui/radix-select";
import ComboboxInput from "./ui/combobox-input";
import type { SupabaseClient } from "@supabase/supabase-js";

type ValidationField = "player" | "source" | "chest" | "clan";

interface AddValidationRuleModalProps {
  readonly isOpen: boolean;
  readonly initialField?: ValidationField;
  readonly initialMatch?: string;
  readonly suggestionsForField: Readonly<Record<string, readonly string[]>>;
  readonly supabase: SupabaseClient;
  readonly onFieldChange?: (field: ValidationField) => string | undefined;
  readonly onSaved: () => void;
  readonly onClose: () => void;
}

export default function AddValidationRuleModal({
  isOpen,
  initialField = "player",
  initialMatch = "",
  suggestionsForField,
  supabase,
  onFieldChange,
  onSaved,
  onClose,
}: AddValidationRuleModalProps): JSX.Element {
  const t = useTranslations("dataImport");
  const [field, setField] = useState<ValidationField>(initialField);
  const [match, setMatch] = useState<string>(initialMatch);
  const [status, setStatus] = useState<string>("valid");
  const [message, setMessage] = useState<string>("");

  /* Reset state when modal opens with new initial values */
  const [prevOpen, setPrevOpen] = useState(false);
  if (isOpen && !prevOpen) {
    setField(initialField);
    setMatch(initialMatch);
    setStatus("valid");
    setMessage("");
  }
  if (isOpen !== prevOpen) setPrevOpen(isOpen);

  function handleFieldChange(nextField: ValidationField): void {
    setField(nextField);
    const result = onFieldChange?.(nextField);
    if (result !== undefined) {
      setMatch(result);
    }
  }

  async function handleSave(): Promise<void> {
    if (!match.trim()) {
      setMessage(t("valueRequired"));
      return;
    }
    const payload = {
      field,
      match_value: match.trim(),
      status: status.trim() || "valid",
    };
    const { error } = await supabase.from("validation_rules").insert(payload);
    if (error) {
      setMessage(t("failedToAddRule", { type: "validation", error: error.message }));
      return;
    }
    setMessage(t("ruleAdded", { type: "validation" }));
    onSaved();
    onClose();
  }

  function handleClose(): void {
    setMessage("");
    onClose();
  }

  return (
    <FormModal
      isOpen={isOpen}
      title={t("addValidationRuleTitle")}
      subtitle={t("createValidValue")}
      statusMessage={message}
      submitLabel={t("saveRule")}
      cancelLabel={t("cancel")}
      onSubmit={handleSave}
      onCancel={handleClose}
      wide
    >
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="validationRuleField">{t("field")}</label>
          <RadixSelect
            id="validationRuleField"
            ariaLabel={t("field")}
            value={field}
            onValueChange={(value) => handleFieldChange(value as ValidationField)}
            options={[
              { value: "player", label: t("player") },
              { value: "source", label: t("source") },
              { value: "chest", label: t("chest") },
              { value: "clan", label: t("clan") },
            ]}
          />
        </div>
        <div className="form-group">
          <label htmlFor="validationRuleMatch">{t("value")}</label>
          <ComboboxInput
            id="validationRuleMatch"
            value={match}
            onChange={setMatch}
            options={suggestionsForField[field] ?? []}
          />
        </div>
        <div className="form-group">
          <label htmlFor="validationRuleStatus">{t("status")}</label>
          <RadixSelect
            id="validationRuleStatus"
            ariaLabel={t("status")}
            value={status}
            onValueChange={(value) => setStatus(value)}
            options={[
              { value: "valid", label: t("valid") },
              { value: "invalid", label: t("invalid") },
            ]}
          />
        </div>
      </div>
    </FormModal>
  );
}

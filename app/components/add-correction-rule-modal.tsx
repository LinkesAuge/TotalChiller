"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useModalReset } from "../hooks/use-modal-reset";
import FormModal from "./form-modal";
import RadixSelect from "./ui/radix-select";
import ComboboxInput from "./ui/combobox-input";
import type { SupabaseClient } from "@supabase/supabase-js";

type CorrectionField = "player" | "source" | "chest" | "clan" | "all";

interface AddCorrectionRuleModalProps {
  readonly isOpen: boolean;
  readonly initialField?: CorrectionField;
  readonly initialMatch?: string;
  readonly initialReplacement?: string;
  readonly suggestionsForField: Readonly<Record<string, readonly string[]>>;
  readonly supabase: SupabaseClient;
  readonly onFieldChange?: (field: CorrectionField) => { match: string; replacement: string } | undefined;
  readonly onSaved: () => void;
  readonly onClose: () => void;
}

export default function AddCorrectionRuleModal({
  isOpen,
  initialField = "player",
  initialMatch = "",
  initialReplacement = "",
  suggestionsForField,
  supabase,
  onFieldChange,
  onSaved,
  onClose,
}: AddCorrectionRuleModalProps): JSX.Element {
  const t = useTranslations("dataImport");
  const [field, setField] = useState<CorrectionField>(initialField);
  const [match, setMatch] = useState<string>(initialMatch);
  const [replacement, setReplacement] = useState<string>(initialReplacement);
  const [status, setStatus] = useState<string>("active");
  const [message, setMessage] = useState<string>("");

  useModalReset(isOpen, () => {
    setField(initialField);
    setMatch(initialMatch);
    setReplacement(initialReplacement);
    setStatus("active");
    setMessage("");
  });

  function handleFieldChange(nextField: CorrectionField): void {
    setField(nextField);
    if (nextField === "all") return;
    const result = onFieldChange?.(nextField);
    if (result) {
      setMatch(result.match);
      setReplacement(result.replacement);
    }
  }

  async function handleSave(): Promise<void> {
    if (!match.trim() || !replacement.trim()) {
      setMessage(t("matchReplacementRequired"));
      return;
    }
    const payload = {
      field,
      match_value: match.trim(),
      replacement_value: replacement.trim(),
      status: status.trim() || "active",
    };
    const { error } = await supabase.from("correction_rules").insert(payload);
    if (error) {
      setMessage(t("failedToAddRule", { type: "correction", error: error.message }));
      return;
    }
    setMessage(t("ruleAdded", { type: "correction" }));
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
      title={t("addCorrectionRuleTitle")}
      subtitle={t("createRuleFromRow")}
      statusMessage={message}
      submitLabel={t("saveRule")}
      cancelLabel={t("cancel")}
      onSubmit={handleSave}
      onCancel={handleClose}
      wide
    >
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="correctionRuleField">{t("field")}</label>
          <RadixSelect
            id="correctionRuleField"
            ariaLabel={t("field")}
            value={field}
            onValueChange={(value) => handleFieldChange(value as CorrectionField)}
            options={[
              { value: "player", label: t("player") },
              { value: "source", label: t("source") },
              { value: "chest", label: t("chest") },
              { value: "clan", label: t("clan") },
              { value: "all", label: t("all") },
            ]}
          />
        </div>
        <div className="form-group">
          <label htmlFor="correctionRuleMatch">{t("matchValue")}</label>
          <ComboboxInput
            id="correctionRuleMatch"
            value={match}
            onChange={setMatch}
            options={suggestionsForField[field] ?? []}
          />
        </div>
        <div className="form-group">
          <label htmlFor="correctionRuleReplacement">{t("replacementValue")}</label>
          <ComboboxInput
            id="correctionRuleReplacement"
            value={replacement}
            onChange={setReplacement}
            options={suggestionsForField[field] ?? []}
          />
        </div>
        <div className="form-group">
          <label htmlFor="correctionRuleStatus">{t("status")}</label>
          <RadixSelect
            id="correctionRuleStatus"
            ariaLabel={t("status")}
            value={status}
            onValueChange={(value) => setStatus(value)}
            options={[
              { value: "active", label: t("active") },
              { value: "inactive", label: t("inactive") },
            ]}
          />
        </div>
      </div>
    </FormModal>
  );
}

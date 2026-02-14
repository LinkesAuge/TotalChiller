"use client";

import { useMemo } from "react";
import type { ValidationRuleRow, CorrectionRuleRow } from "@/lib/types/domain";
import { createValidationEvaluator } from "@/lib/validation-evaluator";
import createCorrectionApplicator from "@/lib/correction-applicator";

/**
 * Extracts unique, sorted suggestions from active validation rules for a given field.
 */
function extractSuggestions(rules: readonly ValidationRuleRow[], field: string): readonly string[] {
  const values = new Set<string>();
  for (const rule of rules) {
    if (rule.field.toLowerCase() === field && rule.status.toLowerCase() === "valid" && rule.match_value.trim()) {
      values.add(rule.match_value.trim());
    }
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

/**
 * Derives validation evaluator, correction applicator, and autocomplete
 * suggestions from the given rule arrays. Pure memoized computation.
 *
 * @param clanSuggestions - Optional clan name suggestions (sourced differently per consumer).
 */
export function useRuleProcessing(
  validationRules: readonly ValidationRuleRow[],
  correctionRules: readonly CorrectionRuleRow[],
  clanSuggestions: readonly string[] = [],
) {
  const validationEvaluator = useMemo(() => createValidationEvaluator(validationRules), [validationRules]);
  const correctionApplicator = useMemo(() => createCorrectionApplicator(correctionRules), [correctionRules]);
  const playerSuggestions = useMemo(() => extractSuggestions(validationRules, "player"), [validationRules]);
  const sourceSuggestions = useMemo(() => extractSuggestions(validationRules, "source"), [validationRules]);
  const chestSuggestions = useMemo(() => extractSuggestions(validationRules, "chest"), [validationRules]);
  const suggestionsForField = useMemo<Record<string, readonly string[]>>(
    () => ({
      player: playerSuggestions,
      source: sourceSuggestions,
      chest: chestSuggestions,
      clan: clanSuggestions,
      all: [],
    }),
    [clanSuggestions, chestSuggestions, playerSuggestions, sourceSuggestions],
  );
  return useMemo(
    () => ({
      validationEvaluator,
      correctionApplicator,
      playerSuggestions,
      sourceSuggestions,
      chestSuggestions,
      suggestionsForField,
    }),
    [
      validationEvaluator,
      correctionApplicator,
      playerSuggestions,
      sourceSuggestions,
      chestSuggestions,
      suggestionsForField,
    ],
  );
}

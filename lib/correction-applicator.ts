interface CorrectionRule {
  readonly id: string;
  readonly field: string;
  readonly match_value: string;
  readonly replacement_value: string;
  readonly status?: string | null;
}

interface CorrectionMatch {
  readonly value: string;
  readonly wasCorrected: boolean;
  readonly ruleId?: string;
  readonly from?: string;
  readonly to?: string;
  readonly ruleField?: string;
}

interface CorrectionApplicator {
  readonly applyToField: (args: { field: string; value: string }) => CorrectionMatch;
}

function normalizeCorrectionValue(value: string): string {
  return value.trim().toLowerCase();
}

function isActiveCorrectionRule(rule: CorrectionRule): boolean {
  return (rule.status ?? "active").toLowerCase() === "active";
}

function createCorrectionApplicator(rules: readonly CorrectionRule[]): CorrectionApplicator {
  const fieldRules = new Map<string, Map<string, CorrectionRule>>();
  const allRules = new Map<string, CorrectionRule>();
  rules.filter(isActiveCorrectionRule).forEach((rule) => {
    const normalizedMatch = normalizeCorrectionValue(rule.match_value);
    if (!normalizedMatch) {
      return;
    }
    const targetField = normalizeCorrectionValue(rule.field);
    if (targetField === "all") {
      if (!allRules.has(normalizedMatch)) {
        allRules.set(normalizedMatch, rule);
      }
      return;
    }
    if (!fieldRules.has(targetField)) {
      fieldRules.set(targetField, new Map());
    }
    const fieldMap = fieldRules.get(targetField);
    if (fieldMap && !fieldMap.has(normalizedMatch)) {
      fieldMap.set(normalizedMatch, rule);
    }
  });

  function applyToField({ field, value }: { field: string; value: string }): CorrectionMatch {
    const normalizedField = normalizeCorrectionValue(field);
    const normalizedValue = normalizeCorrectionValue(value);
    if (!normalizedValue) {
      return { value, wasCorrected: false };
    }
    const fieldMap = fieldRules.get(normalizedField);
    const fieldRule = fieldMap?.get(normalizedValue);
    if (fieldRule) {
      return {
        value: fieldRule.replacement_value,
        wasCorrected: true,
        ruleId: fieldRule.id,
        from: value,
        to: fieldRule.replacement_value,
        ruleField: fieldRule.field,
      };
    }
    const allRule = allRules.get(normalizedValue);
    if (allRule) {
      return {
        value: allRule.replacement_value,
        wasCorrected: true,
        ruleId: allRule.id,
        from: value,
        to: allRule.replacement_value,
        ruleField: allRule.field,
      };
    }
    return { value, wasCorrected: false };
  }

  return { applyToField };
}

export default createCorrectionApplicator;

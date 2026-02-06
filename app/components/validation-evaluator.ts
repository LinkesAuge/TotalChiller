interface ValidationRuleEntry {
  readonly field: string | null;
  readonly match_value: string | null;
  readonly status: string | null;
}

interface ValidationRuleGroup {
  readonly valid: Set<string>;
  readonly invalid: Set<string>;
}

interface ValidationFieldGroups {
  readonly player: ValidationRuleGroup;
  readonly source: ValidationRuleGroup;
  readonly chest: ValidationRuleGroup;
  readonly clan: ValidationRuleGroup;
}

type ValidationFieldKey = "player" | "source" | "chest" | "clan";

interface ValidationRowInput {
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly clan: string;
}

interface ValidationRowResult {
  readonly rowStatus: "valid" | "invalid" | "neutral";
  readonly fieldStatus: Record<ValidationFieldKey, "valid" | "invalid" | "neutral">;
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

function buildRuleGroup(): ValidationRuleGroup {
  return { valid: new Set<string>(), invalid: new Set<string>() };
}

function buildRuleIndex(rules: readonly ValidationRuleEntry[]): ValidationFieldGroups {
  const groups: ValidationFieldGroups = {
    player: buildRuleGroup(),
    source: buildRuleGroup(),
    chest: buildRuleGroup(),
    clan: buildRuleGroup(),
  };
  rules.forEach((rule) => {
    const field = (rule.field ?? "").toLowerCase() as ValidationFieldKey;
    const status = (rule.status ?? "").toLowerCase();
    const matchValue = normalizeValue(rule.match_value ?? "");
    if (!matchValue || (field !== "player" && field !== "source" && field !== "chest" && field !== "clan")) {
      return;
    }
    if (status === "valid") {
      groups[field].valid.add(matchValue);
    } else if (status === "invalid") {
      groups[field].invalid.add(matchValue);
    }
  });
  return groups;
}

function evaluateField(
  rules: ValidationRuleGroup | undefined,
  value: string,
): "valid" | "invalid" | "neutral" {
  if (!rules) {
    return "neutral";
  }
  const normalized = normalizeValue(value);
  const hasValidList = rules.valid.size > 0;
  const hasInvalidList = rules.invalid.size > 0;
  if (hasValidList && !rules.valid.has(normalized)) {
    return "invalid";
  }
  if (hasInvalidList && rules.invalid.has(normalized)) {
    return "invalid";
  }
  if (hasValidList || hasInvalidList) {
    return "valid";
  }
  return "neutral";
}

/**
 * Creates a validation evaluator for rows using exact, case-insensitive matches.
 * Rules are global (not clan-specific).
 */
export function createValidationEvaluator(
  rules: readonly ValidationRuleEntry[],
): (input: ValidationRowInput) => ValidationRowResult {
  const ruleGroups = buildRuleIndex(rules);
  return (input: ValidationRowInput): ValidationRowResult => {
    const fieldStatus: Record<ValidationFieldKey, "valid" | "invalid" | "neutral"> = {
      player: evaluateField(ruleGroups.player, input.player),
      source: evaluateField(ruleGroups.source, input.source),
      chest: evaluateField(ruleGroups.chest, input.chest),
      clan: evaluateField(ruleGroups.clan, input.clan),
    };
    const hasAnyRule =
      ruleGroups.player.valid.size +
        ruleGroups.player.invalid.size +
        ruleGroups.source.valid.size +
        ruleGroups.source.invalid.size +
        ruleGroups.chest.valid.size +
        ruleGroups.chest.invalid.size +
        ruleGroups.clan.valid.size +
        ruleGroups.clan.invalid.size >
      0;
    const hasInvalid = Object.values(fieldStatus).some((value) => value === "invalid");
    if (hasInvalid) {
      return { rowStatus: "invalid", fieldStatus };
    }
    if (hasAnyRule) {
      return { rowStatus: "valid", fieldStatus };
    }
    return { rowStatus: "neutral", fieldStatus };
  };
}

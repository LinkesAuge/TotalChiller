interface ValidationRuleEntry {
  readonly clan_id: string | null;
  readonly field: string | null;
  readonly match_value: string | null;
  readonly status: string | null;
}

interface ValidationRuleGroup {
  readonly valid: Set<string>;
  readonly invalid: Set<string>;
}

interface ValidationRuleIndex {
  readonly [clanId: string]: {
    readonly player: ValidationRuleGroup;
    readonly source: ValidationRuleGroup;
    readonly chest: ValidationRuleGroup;
    readonly clan: ValidationRuleGroup;
  };
}

type ValidationFieldKey = "player" | "source" | "chest" | "clan";

interface ValidationRowInput {
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly clan: string;
  readonly clanId: string | null;
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

function buildRuleIndex(rules: readonly ValidationRuleEntry[]): ValidationRuleIndex {
  return rules.reduce<ValidationRuleIndex>((acc, rule) => {
    const clanId = rule.clan_id ?? "";
    const field = (rule.field ?? "").toLowerCase() as ValidationFieldKey;
    const status = (rule.status ?? "").toLowerCase();
    const matchValue = normalizeValue(rule.match_value ?? "");
    if (!clanId || !matchValue || (field !== "player" && field !== "source" && field !== "chest" && field !== "clan")) {
      return acc;
    }
    if (!acc[clanId]) {
      acc[clanId] = {
        player: buildRuleGroup(),
        source: buildRuleGroup(),
        chest: buildRuleGroup(),
        clan: buildRuleGroup(),
      };
    }
    if (status === "valid") {
      acc[clanId][field].valid.add(matchValue);
    } else if (status === "invalid") {
      acc[clanId][field].invalid.add(matchValue);
    }
    return acc;
  }, {});
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
 */
export function createValidationEvaluator(
  rules: readonly ValidationRuleEntry[],
): (input: ValidationRowInput) => ValidationRowResult {
  const ruleIndex = buildRuleIndex(rules);
  return (input: ValidationRowInput): ValidationRowResult => {
    const clanId = input.clanId ?? "";
    const clanRules = ruleIndex[clanId];
    const fieldStatus: Record<ValidationFieldKey, "valid" | "invalid" | "neutral"> = {
      player: evaluateField(clanRules?.player, input.player),
      source: evaluateField(clanRules?.source, input.source),
      chest: evaluateField(clanRules?.chest, input.chest),
      clan: evaluateField(clanRules?.clan, input.clan),
    };
    const hasAnyRule =
      Boolean(clanRules) &&
      (clanRules.player.valid.size +
        clanRules.player.invalid.size +
        clanRules.source.valid.size +
        clanRules.source.invalid.size +
        clanRules.chest.valid.size +
        clanRules.chest.invalid.size +
        clanRules.clan.valid.size +
        clanRules.clan.invalid.size >
        0);
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

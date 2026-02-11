import { describe, it, expect } from "vitest";
import createCorrectionApplicator from "./correction-applicator";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface TestRule {
  readonly id: string;
  readonly field: string;
  readonly match_value: string;
  readonly replacement_value: string;
  readonly status?: string | null;
}

function makeRule(overrides: Partial<TestRule> & Pick<TestRule, "match_value" | "replacement_value">): TestRule {
  return {
    id: overrides.id ?? "rule-1",
    field: overrides.field ?? "source",
    match_value: overrides.match_value,
    replacement_value: overrides.replacement_value,
    status: overrides.status ?? "active",
  };
}

/* ------------------------------------------------------------------ */
/*  createCorrectionApplicator                                         */
/* ------------------------------------------------------------------ */

describe("createCorrectionApplicator", () => {
  describe("basic field-specific corrections", () => {
    it("corrects a matching value in the target field", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ field: "source", match_value: "typo", replacement_value: "correct" }),
      ]);
      const result = applicator.applyToField({ field: "source", value: "typo" });
      expect(result.wasCorrected).toBe(true);
      expect(result.value).toBe("correct");
      expect(result.from).toBe("typo");
      expect(result.to).toBe("correct");
    });

    it("returns the original value when no rule matches", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ field: "source", match_value: "typo", replacement_value: "correct" }),
      ]);
      const result = applicator.applyToField({ field: "source", value: "no-match" });
      expect(result.wasCorrected).toBe(false);
      expect(result.value).toBe("no-match");
    });

    it("does not apply a field-specific rule to a different field", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ field: "source", match_value: "typo", replacement_value: "correct" }),
      ]);
      const result = applicator.applyToField({ field: "player", value: "typo" });
      expect(result.wasCorrected).toBe(false);
      expect(result.value).toBe("typo");
    });
  });

  describe("case-insensitive matching", () => {
    it("matches regardless of case in the value", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ field: "source", match_value: "Typo", replacement_value: "correct" }),
      ]);
      const result = applicator.applyToField({ field: "source", value: "TYPO" });
      expect(result.wasCorrected).toBe(true);
      expect(result.value).toBe("correct");
    });

    it("matches regardless of case in the field name", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ field: "Source", match_value: "typo", replacement_value: "correct" }),
      ]);
      const result = applicator.applyToField({ field: "SOURCE", value: "typo" });
      expect(result.wasCorrected).toBe(true);
    });
  });

  describe("whitespace handling", () => {
    it("trims whitespace from match values", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ field: "source", match_value: "  typo  ", replacement_value: "correct" }),
      ]);
      const result = applicator.applyToField({ field: "source", value: "typo" });
      expect(result.wasCorrected).toBe(true);
    });

    it("trims whitespace from input values", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ field: "source", match_value: "typo", replacement_value: "correct" }),
      ]);
      const result = applicator.applyToField({ field: "source", value: "  typo  " });
      expect(result.wasCorrected).toBe(true);
    });
  });

  describe("'all' field rules (wildcard)", () => {
    it("applies an 'all' rule to any field", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ field: "all", match_value: "typo", replacement_value: "correct" }),
      ]);
      expect(applicator.applyToField({ field: "source", value: "typo" }).wasCorrected).toBe(true);
      expect(applicator.applyToField({ field: "player", value: "typo" }).wasCorrected).toBe(true);
      expect(applicator.applyToField({ field: "anything", value: "typo" }).wasCorrected).toBe(true);
    });

    it("field-specific rule takes priority over 'all' rule", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ id: "all-rule", field: "all", match_value: "typo", replacement_value: "all-fix" }),
        makeRule({ id: "field-rule", field: "source", match_value: "typo", replacement_value: "field-fix" }),
      ]);
      const result = applicator.applyToField({ field: "source", value: "typo" });
      expect(result.wasCorrected).toBe(true);
      expect(result.value).toBe("field-fix");
      expect(result.ruleId).toBe("field-rule");
    });

    it("falls back to 'all' rule when no field-specific rule matches", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ id: "all-rule", field: "all", match_value: "typo", replacement_value: "all-fix" }),
        makeRule({ id: "field-rule", field: "source", match_value: "other", replacement_value: "field-fix" }),
      ]);
      const result = applicator.applyToField({ field: "player", value: "typo" });
      expect(result.wasCorrected).toBe(true);
      expect(result.value).toBe("all-fix");
      expect(result.ruleId).toBe("all-rule");
    });
  });

  describe("rule status filtering", () => {
    it("ignores inactive rules", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ field: "source", match_value: "typo", replacement_value: "correct", status: "inactive" }),
      ]);
      const result = applicator.applyToField({ field: "source", value: "typo" });
      expect(result.wasCorrected).toBe(false);
    });

    it("treats null status as active", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ field: "source", match_value: "typo", replacement_value: "correct", status: null }),
      ]);
      const result = applicator.applyToField({ field: "source", value: "typo" });
      expect(result.wasCorrected).toBe(true);
    });

    it("treats undefined status as active", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ field: "source", match_value: "typo", replacement_value: "correct", status: undefined }),
      ]);
      const result = applicator.applyToField({ field: "source", value: "typo" });
      expect(result.wasCorrected).toBe(true);
    });

    it("matches status case-insensitively", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ field: "source", match_value: "typo", replacement_value: "correct", status: "Active" }),
      ]);
      const result = applicator.applyToField({ field: "source", value: "typo" });
      expect(result.wasCorrected).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("returns uncorrected for empty value", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ field: "source", match_value: "typo", replacement_value: "correct" }),
      ]);
      const result = applicator.applyToField({ field: "source", value: "" });
      expect(result.wasCorrected).toBe(false);
      expect(result.value).toBe("");
    });

    it("returns uncorrected for whitespace-only value", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ field: "source", match_value: "typo", replacement_value: "correct" }),
      ]);
      const result = applicator.applyToField({ field: "source", value: "   " });
      expect(result.wasCorrected).toBe(false);
    });

    it("skips rules with empty match_value", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ field: "source", match_value: "", replacement_value: "correct" }),
      ]);
      const result = applicator.applyToField({ field: "source", value: "" });
      expect(result.wasCorrected).toBe(false);
    });

    it("handles empty rules array", () => {
      const applicator = createCorrectionApplicator([]);
      const result = applicator.applyToField({ field: "source", value: "anything" });
      expect(result.wasCorrected).toBe(false);
      expect(result.value).toBe("anything");
    });

    it("first rule wins when multiple rules match the same field+value", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ id: "first", field: "source", match_value: "typo", replacement_value: "first-fix" }),
        makeRule({ id: "second", field: "source", match_value: "typo", replacement_value: "second-fix" }),
      ]);
      const result = applicator.applyToField({ field: "source", value: "typo" });
      expect(result.value).toBe("first-fix");
      expect(result.ruleId).toBe("first");
    });
  });

  describe("result metadata", () => {
    it("includes ruleId, from, to, and ruleField on correction", () => {
      const applicator = createCorrectionApplicator([
        makeRule({ id: "r42", field: "player", match_value: "typo", replacement_value: "correct" }),
      ]);
      const result = applicator.applyToField({ field: "player", value: "typo" });
      expect(result.ruleId).toBe("r42");
      expect(result.from).toBe("typo");
      expect(result.to).toBe("correct");
      expect(result.ruleField).toBe("player");
    });

    it("does not include metadata when uncorrected", () => {
      const applicator = createCorrectionApplicator([]);
      const result = applicator.applyToField({ field: "player", value: "ok" });
      expect(result.ruleId).toBeUndefined();
      expect(result.from).toBeUndefined();
      expect(result.to).toBeUndefined();
      expect(result.ruleField).toBeUndefined();
    });
  });
});

import { describe, it, expect } from "vitest";
import { createValidationEvaluator } from "./validation-evaluator";

type ValidationRuleEntry = {
  readonly field: string | null;
  readonly match_value: string | null;
  readonly status: string | null;
};

type ValidationRowInput = {
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly clan: string;
};

/* ------------------------------------------------------------------ */
/*  createValidationEvaluator                                          */
/* ------------------------------------------------------------------ */

describe("createValidationEvaluator", () => {
  describe("empty rules", () => {
    it("returns neutral row status when no rules exist", () => {
      const inputRules: ValidationRuleEntry[] = [];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRow: ValidationRowInput = {
        player: "Alice",
        source: "manual",
        chest: "gold",
        clan: "Warriors",
      };
      const actual = evaluator(inputRow);
      expect(actual.rowStatus).toBe("neutral");
      expect(actual.fieldStatus.player).toBe("neutral");
      expect(actual.fieldStatus.source).toBe("neutral");
      expect(actual.fieldStatus.chest).toBe("neutral");
      expect(actual.fieldStatus.clan).toBe("neutral");
    });
  });

  describe("rules matching by field", () => {
    it("matches player field with valid rule", () => {
      const inputRules: ValidationRuleEntry[] = [{ field: "player", match_value: "alice", status: "valid" }];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRow: ValidationRowInput = {
        player: "Alice",
        source: "manual",
        chest: "gold",
        clan: "Warriors",
      };
      const actual = evaluator(inputRow);
      expect(actual.rowStatus).toBe("valid");
      expect(actual.fieldStatus.player).toBe("valid");
    });

    it("matches source field with valid rule", () => {
      const inputRules: ValidationRuleEntry[] = [{ field: "source", match_value: "manual", status: "valid" }];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRow: ValidationRowInput = {
        player: "Bob",
        source: "manual",
        chest: "silver",
        clan: "Rangers",
      };
      const actual = evaluator(inputRow);
      expect(actual.rowStatus).toBe("valid");
      expect(actual.fieldStatus.source).toBe("valid");
    });

    it("matches chest field with valid rule", () => {
      const inputRules: ValidationRuleEntry[] = [{ field: "chest", match_value: "gold", status: "valid" }];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRow: ValidationRowInput = {
        player: "Charlie",
        source: "api",
        chest: "gold",
        clan: "Elite",
      };
      const actual = evaluator(inputRow);
      expect(actual.rowStatus).toBe("valid");
      expect(actual.fieldStatus.chest).toBe("valid");
    });

    it("matches clan field with valid rule", () => {
      const inputRules: ValidationRuleEntry[] = [{ field: "clan", match_value: "warriors", status: "valid" }];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRow: ValidationRowInput = {
        player: "Dave",
        source: "manual",
        chest: "bronze",
        clan: "Warriors",
      };
      const actual = evaluator(inputRow);
      expect(actual.rowStatus).toBe("valid");
      expect(actual.fieldStatus.clan).toBe("valid");
    });
  });

  describe("valid vs invalid vs neutral", () => {
    it("returns invalid when value not in valid list (whitelist)", () => {
      const inputRules: ValidationRuleEntry[] = [{ field: "player", match_value: "alice", status: "valid" }];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRow: ValidationRowInput = {
        player: "UnknownPlayer",
        source: "manual",
        chest: "gold",
        clan: "Warriors",
      };
      const actual = evaluator(inputRow);
      expect(actual.rowStatus).toBe("invalid");
      expect(actual.fieldStatus.player).toBe("invalid");
    });

    it("returns invalid when value in invalid list (blacklist)", () => {
      const inputRules: ValidationRuleEntry[] = [{ field: "source", match_value: "hack", status: "invalid" }];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRow: ValidationRowInput = {
        player: "Alice",
        source: "hack",
        chest: "gold",
        clan: "Warriors",
      };
      const actual = evaluator(inputRow);
      expect(actual.rowStatus).toBe("invalid");
      expect(actual.fieldStatus.source).toBe("invalid");
    });

    it("returns valid when value matches valid list", () => {
      const inputRules: ValidationRuleEntry[] = [{ field: "player", match_value: "alice", status: "valid" }];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRow: ValidationRowInput = {
        player: "alice",
        source: "manual",
        chest: "gold",
        clan: "Warriors",
      };
      const actual = evaluator(inputRow);
      expect(actual.rowStatus).toBe("valid");
      expect(actual.fieldStatus.player).toBe("valid");
    });

    it("returns valid when value not in invalid list (and invalid list exists)", () => {
      const inputRules: ValidationRuleEntry[] = [{ field: "source", match_value: "hack", status: "invalid" }];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRow: ValidationRowInput = {
        player: "Alice",
        source: "manual",
        chest: "gold",
        clan: "Warriors",
      };
      const actual = evaluator(inputRow);
      expect(actual.rowStatus).toBe("valid");
      expect(actual.fieldStatus.source).toBe("valid");
    });
  });

  describe("multiple rules (AND logic)", () => {
    it("returns valid when all fields match their valid rules", () => {
      const inputRules: ValidationRuleEntry[] = [
        { field: "player", match_value: "alice", status: "valid" },
        { field: "source", match_value: "manual", status: "valid" },
        { field: "chest", match_value: "gold", status: "valid" },
      ];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRow: ValidationRowInput = {
        player: "Alice",
        source: "manual",
        chest: "gold",
        clan: "Warriors",
      };
      const actual = evaluator(inputRow);
      expect(actual.rowStatus).toBe("valid");
      expect(actual.fieldStatus.player).toBe("valid");
      expect(actual.fieldStatus.source).toBe("valid");
      expect(actual.fieldStatus.chest).toBe("valid");
    });

    it("returns invalid when any field fails (one invalid breaks row)", () => {
      const inputRules: ValidationRuleEntry[] = [
        { field: "player", match_value: "alice", status: "valid" },
        { field: "source", match_value: "manual", status: "valid" },
      ];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRow: ValidationRowInput = {
        player: "Alice",
        source: "api",
        chest: "gold",
        clan: "Warriors",
      };
      const actual = evaluator(inputRow);
      expect(actual.rowStatus).toBe("invalid");
      expect(actual.fieldStatus.player).toBe("valid");
      expect(actual.fieldStatus.source).toBe("invalid");
    });

    it("returns invalid when blacklisted value appears in any field", () => {
      const inputRules: ValidationRuleEntry[] = [
        { field: "player", match_value: "alice", status: "valid" },
        { field: "source", match_value: "hack", status: "invalid" },
      ];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRow: ValidationRowInput = {
        player: "Alice",
        source: "hack",
        chest: "gold",
        clan: "Warriors",
      };
      const actual = evaluator(inputRow);
      expect(actual.rowStatus).toBe("invalid");
      expect(actual.fieldStatus.source).toBe("invalid");
    });
  });

  describe("case insensitivity", () => {
    it("matches values case-insensitively", () => {
      const inputRules: ValidationRuleEntry[] = [{ field: "player", match_value: "ALICE", status: "valid" }];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRow: ValidationRowInput = {
        player: "alice",
        source: "manual",
        chest: "gold",
        clan: "Warriors",
      };
      const actual = evaluator(inputRow);
      expect(actual.rowStatus).toBe("valid");
      expect(actual.fieldStatus.player).toBe("valid");
    });

    it("normalizes input values (trim and lowercase)", () => {
      const inputRules: ValidationRuleEntry[] = [{ field: "clan", match_value: "warriors", status: "valid" }];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRow: ValidationRowInput = {
        player: "Alice",
        source: "manual",
        chest: "gold",
        clan: "  WARRIORS  ",
      };
      const actual = evaluator(inputRow);
      expect(actual.rowStatus).toBe("valid");
      expect(actual.fieldStatus.clan).toBe("valid");
    });
  });

  describe("edge cases", () => {
    it("returns neutral when no rules match any field", () => {
      const inputRules: ValidationRuleEntry[] = [];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRow: ValidationRowInput = {
        player: "Anyone",
        source: "anything",
        chest: "any",
        clan: "any",
      };
      const actual = evaluator(inputRow);
      expect(actual.rowStatus).toBe("neutral");
    });

    it("ignores rules with unknown field", () => {
      const inputRules: ValidationRuleEntry[] = [{ field: "unknown", match_value: "x", status: "valid" }];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRow: ValidationRowInput = {
        player: "Alice",
        source: "manual",
        chest: "gold",
        clan: "Warriors",
      };
      const actual = evaluator(inputRow);
      expect(actual.rowStatus).toBe("neutral");
    });

    it("ignores rules with empty match_value", () => {
      const inputRules: ValidationRuleEntry[] = [{ field: "player", match_value: "", status: "valid" }];
      const evaluator = createValidationEvaluator(inputRules);
      const evaluator2 = createValidationEvaluator([{ field: "player", match_value: null, status: "valid" }]);
      const inputRow: ValidationRowInput = {
        player: "Alice",
        source: "manual",
        chest: "gold",
        clan: "Warriors",
      };
      const actual1 = evaluator(inputRow);
      const actual2 = evaluator2(inputRow);
      expect(actual1.rowStatus).toBe("neutral");
      expect(actual2.rowStatus).toBe("neutral");
    });

    it("handles multiple valid values for same field", () => {
      const inputRules: ValidationRuleEntry[] = [
        { field: "player", match_value: "alice", status: "valid" },
        { field: "player", match_value: "bob", status: "valid" },
      ];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRowAlice: ValidationRowInput = {
        player: "Alice",
        source: "manual",
        chest: "gold",
        clan: "Warriors",
      };
      const inputRowBob: ValidationRowInput = {
        ...inputRowAlice,
        player: "Bob",
      };
      const inputRowCharlie: ValidationRowInput = {
        ...inputRowAlice,
        player: "Charlie",
      };
      expect(evaluator(inputRowAlice).rowStatus).toBe("valid");
      expect(evaluator(inputRowBob).rowStatus).toBe("valid");
      expect(evaluator(inputRowCharlie).rowStatus).toBe("invalid");
    });

    it("handles mixed valid and invalid rules for same field", () => {
      const inputRules: ValidationRuleEntry[] = [
        { field: "source", match_value: "manual", status: "valid" },
        { field: "source", match_value: "hack", status: "invalid" },
      ];
      const evaluator = createValidationEvaluator(inputRules);
      const inputManual: ValidationRowInput = {
        player: "Alice",
        source: "manual",
        chest: "gold",
        clan: "Warriors",
      };
      const inputHack: ValidationRowInput = {
        ...inputManual,
        source: "hack",
      };
      const inputApi: ValidationRowInput = {
        ...inputManual,
        source: "api",
      };
      expect(evaluator(inputManual).rowStatus).toBe("valid");
      expect(evaluator(inputHack).rowStatus).toBe("invalid");
      expect(evaluator(inputApi).rowStatus).toBe("invalid");
    });

    it("handles null/empty field and status in rules", () => {
      const inputRules: ValidationRuleEntry[] = [
        { field: null, match_value: "x", status: "valid" },
        { field: "player", match_value: "alice", status: null },
      ];
      const evaluator = createValidationEvaluator(inputRules);
      const inputRow: ValidationRowInput = {
        player: "Alice",
        source: "manual",
        chest: "gold",
        clan: "Warriors",
      };
      const actual = evaluator(inputRow);
      expect(actual.rowStatus).toBe("neutral");
    });
  });
});

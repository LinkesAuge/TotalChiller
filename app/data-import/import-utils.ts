import type { IndexedRow, ImportSortKey } from "./data-import-types";

export function compareImportValues(left: string | number, right: string | number, direction: "asc" | "desc"): number {
  if (left === right) {
    return 0;
  }
  if (typeof left === "number" && typeof right === "number") {
    return direction === "asc" ? left - right : right - left;
  }
  const leftText = String(left);
  const rightText = String(right);
  return direction === "asc" ? leftText.localeCompare(rightText) : rightText.localeCompare(leftText);
}

export function getImportSortValue(item: IndexedRow, key: ImportSortKey): string | number {
  if (key === "index") {
    return item.index;
  }
  if (key === "score") {
    return item.row.score;
  }
  return item.row[key];
}

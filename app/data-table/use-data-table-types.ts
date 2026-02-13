/** Row shape from chest_entries with clan name. */
export interface ChestEntryRow {
  readonly id: string;
  readonly collected_date: string;
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly score: number;
  readonly clan_id: string;
  readonly clan_name: string;
}

/** Editable fields for inline edit. */
export interface EditableRow {
  readonly collected_date: string;
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly score: string;
  readonly clan_id: string;
}

/** Validated row values for save. */
export interface RowValues {
  collected_date: string;
  player: string;
  source: string;
  chest: string;
  score: number;
  clan_id: string;
}

/** Sort direction for table columns. */
export type SortDirection = "asc" | "desc" | null;

/** Sortable column keys. */
export type SortKey = "collected_date" | "player" | "source" | "chest" | "score" | "clan";

/** Filter option for selects. */
export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

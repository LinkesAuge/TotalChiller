import type {
  BugReport,
  BugReportCategory,
  BugReportComment,
  BugReportPriority,
  BugReportScreenshot,
  BugReportStatus,
  ProfileSummary,
} from "@/lib/types/domain";

/** Bug report with joined details for list display. */
export interface BugReportListItem extends BugReport {
  readonly category_name: string | null;
  readonly category_slug: string | null;
  readonly reporter: Pick<ProfileSummary, "username" | "display_name"> | null;
  readonly comment_count: number;
  readonly screenshot_count: number;
}

/** Bug report with full detail (screenshots, category, reporter profile). */
export interface BugReportDetail extends BugReport {
  readonly category_name: string | null;
  readonly category_slug: string | null;
  readonly reporter: Pick<ProfileSummary, "username" | "display_name"> | null;
  readonly screenshots: readonly BugReportScreenshot[];
}

/** Comment with author profile. */
export interface BugCommentWithAuthor extends BugReportComment {
  readonly author: Pick<ProfileSummary, "username" | "display_name"> | null;
}

/** Active view in the bugs page. */
export type BugsView = "list" | "detail" | "create" | "edit";

/** Sort options for the bugs list. */
export type BugSortOption = "newest" | "oldest" | "title" | "priority" | "status";

/** Filter state for the bugs list. */
export interface BugListFilter {
  readonly status: BugReportStatus | "all";
  readonly priority: BugReportPriority | "all";
  readonly categoryId: string;
  readonly search: string;
  readonly sort: BugSortOption;
}

/** Props shared by BugsForm when used in both page and widget contexts. */
export interface BugsFormSubmitData {
  readonly title: string;
  readonly description: string;
  readonly categoryId: string;
  readonly pageUrl: string;
  readonly screenshotPaths: readonly string[];
}

export type { BugReportCategory };

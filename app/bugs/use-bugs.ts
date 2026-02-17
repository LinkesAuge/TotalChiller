"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/app/components/toast-provider";
import type {
  BugReportListItem,
  BugReportDetail,
  BugsView,
  BugListFilter,
  BugSortOption,
  BugsFormSubmitData,
  BugReportCategory,
} from "./bugs-types";

/** Priority sort weight — higher = more urgent (sorted first). */
const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/** Status sort weight — open first, then resolved, then closed. */
const STATUS_WEIGHT: Record<string, number> = {
  open: 0,
  resolved: 1,
  closed: 2,
};

function sortReports(reports: readonly BugReportListItem[], sort: BugSortOption): readonly BugReportListItem[] {
  const sorted = [...reports];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case "oldest":
      return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "priority":
      return sorted.sort((a, b) => (PRIORITY_WEIGHT[b.priority ?? ""] ?? 0) - (PRIORITY_WEIGHT[a.priority ?? ""] ?? 0));
    case "status":
      return sorted.sort((a, b) => (STATUS_WEIGHT[a.status] ?? 9) - (STATUS_WEIGHT[b.status] ?? 9));
    default:
      return sorted;
  }
}

interface UseBugsResult {
  /* Data */
  readonly reports: readonly BugReportListItem[];
  readonly sortedReports: readonly BugReportListItem[];
  readonly selectedReport: BugReportDetail | null;
  readonly categories: readonly BugReportCategory[];
  /* View state */
  readonly view: BugsView;
  readonly setView: (view: BugsView) => void;
  /* Filters */
  readonly filter: BugListFilter;
  readonly updateFilter: (partial: Partial<BugListFilter>) => void;
  /* Loading */
  readonly isLoading: boolean;
  readonly isSubmitting: boolean;
  /* Actions */
  readonly loadReports: () => Promise<void>;
  readonly loadReport: (id: string) => Promise<void>;
  readonly submitReport: (data: BugsFormSubmitData) => Promise<boolean>;
  readonly updateReport: (id: string, fields: Record<string, unknown>) => Promise<boolean>;
  readonly deleteReport: (id: string) => Promise<boolean>;
  readonly openDetail: (id: string) => void;
  readonly backToList: () => void;
}

export function useBugs(): UseBugsResult {
  const { pushToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [reports, setReports] = useState<readonly BugReportListItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<BugReportDetail | null>(null);
  const [categories, setCategories] = useState<readonly BugReportCategory[]>([]);
  const [view, setView] = useState<BugsView>("list");
  const [filter, setFilter] = useState<BugListFilter>({
    status: "all",
    priority: "all",
    categoryId: "",
    search: "",
    sort: "newest",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── Load categories ── */
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/bugs/categories");
      if (!res.ok) return;
      const json = (await res.json()) as { data: BugReportCategory[] };
      setCategories(json.data);
    } catch {
      /* silent — categories are non-critical */
    }
  }, []);

  /* ── Load reports ── */
  const apiStatus = filter.status;
  const apiCategory = filter.categoryId;
  const apiSearch = filter.search;

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (apiStatus !== "all") params.set("status", apiStatus);
      if (apiCategory) params.set("category", apiCategory);
      if (apiSearch) params.set("search", apiSearch);

      const res = await fetch(`/api/bugs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      const json = (await res.json()) as { data: BugReportListItem[] };
      setReports(json.data);
    } catch {
      pushToast("Failed to load bug reports.");
    } finally {
      setIsLoading(false);
    }
  }, [apiStatus, apiCategory, apiSearch, pushToast]);

  /* ── Derived: sorted and priority-filtered reports ── */
  const sortedReports = useMemo(() => {
    const filtered = filter.priority === "all" ? reports : reports.filter((r) => r.priority === filter.priority);
    return sortReports(filtered, filter.sort);
  }, [reports, filter.priority, filter.sort]);

  /* ── Load single report detail ── */
  const loadReport = useCallback(
    async (id: string) => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/bugs/${id}`);
        if (!res.ok) throw new Error("Not found");
        const json = (await res.json()) as { data: BugReportDetail };
        setSelectedReport(json.data);
      } catch {
        pushToast("Failed to load report details.");
      } finally {
        setIsLoading(false);
      }
    },
    [pushToast],
  );

  /* ── Submit new report ── */
  const submitReport = useCallback(
    async (data: BugsFormSubmitData): Promise<boolean> => {
      setIsSubmitting(true);
      try {
        const res = await fetch("/api/bugs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            description: data.description,
            category_id: data.categoryId || undefined,
            page_url: data.pageUrl || undefined,
            screenshot_paths: data.screenshotPaths.length > 0 ? data.screenshotPaths : undefined,
          }),
        });
        if (!res.ok) throw new Error("Failed");
        pushToast("Bug report submitted.");
        return true;
      } catch {
        pushToast("Failed to submit bug report.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [pushToast],
  );

  /* ── Update report (admin controls) ── */
  const updateReport = useCallback(
    async (id: string, fields: Record<string, unknown>): Promise<boolean> => {
      try {
        const res = await fetch(`/api/bugs/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (!res.ok) throw new Error("Failed");
        pushToast("Report updated.");
        return true;
      } catch {
        pushToast("Failed to update report.");
        return false;
      }
    },
    [pushToast],
  );

  /* ── Delete report ── */
  const deleteReport = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/bugs/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed");
        pushToast("Report deleted.");
        return true;
      } catch {
        pushToast("Failed to delete report.");
        return false;
      }
    },
    [pushToast],
  );

  /* ── Navigation helpers ── */
  const openDetail = useCallback(
    (id: string) => {
      setView("detail");
      void loadReport(id);
      router.push(`/bugs?report=${id}`, { scroll: false });
    },
    [loadReport, router],
  );

  const backToList = useCallback(() => {
    setView("list");
    setSelectedReport(null);
    router.push("/bugs", { scroll: false });
  }, [router]);

  const updateFilter = useCallback((partial: Partial<BugListFilter>) => {
    setFilter((prev) => ({ ...prev, ...partial }));
  }, []);

  /* ── Initial load + deep-link ── */
  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const reportId = searchParams.get("report");
    if (reportId) {
      setView("detail");
      if (selectedReport?.id !== reportId) {
        void loadReport(reportId);
      }
    } else if (view === "list") {
      void loadReports();
    }
  }, [searchParams, loadReport, loadReports, selectedReport?.id, view]);

  return {
    reports,
    sortedReports,
    selectedReport,
    categories,
    view,
    setView,
    filter,
    updateFilter,
    isLoading,
    isSubmitting,
    loadReports,
    loadReport,
    submitReport,
    updateReport,
    deleteReport,
    openDetail,
    backToList,
  };
}

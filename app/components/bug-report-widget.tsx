"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/app/hooks/use-auth";
import { useToast } from "@/app/components/toast-provider";
import type { BugReportCategory, BugsFormSubmitData } from "@/app/bugs/bugs-types";

const BugsForm = dynamic(() => import("@/app/bugs/bugs-form"));

/**
 * Floating bug report button + modal.
 * Shows in the bottom-right corner for authenticated users.
 * Auto-captures the current page URL.
 */
function BugReportWidget(): ReactElement | null {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const t = useTranslations("bugs.widget");
  const { pushToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<readonly BugReportCategory[]>([]);

  /* Load categories when modal opens */
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    async function load(): Promise<void> {
      try {
        const res = await fetch("/api/bugs/categories");
        if (!res.ok) return;
        const json = (await res.json()) as { data: BugReportCategory[] };
        if (active) setCategories(json.data);
      } catch {
        /* silent */
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [isOpen]);

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const handleSubmit = useCallback(
    async (data: BugsFormSubmitData) => {
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
        pushToast(t("successMessage"));
        setIsOpen(false);
      } catch {
        pushToast("Failed to submit bug report.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [pushToast, t],
  );

  /* Don't show for unauthenticated users or on the bugs page itself */
  if (authLoading || !isAuthenticated) return null;
  if (pathname === "/bugs") return null;

  return (
    <>
      {/* Floating button */}
      <button
        className="bugs-widget-btn"
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t("tooltip")}
        title={t("tooltip")}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3.003 3.003 0 116 0v1" />
          <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6z" />
          <path d="M12 20v2M6 13H2M22 13h-4M6 17H4M20 17h-2" />
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsOpen(false);
          }}
        >
          <div className="modal card">
            <div className="card-header">
              <div>
                <div className="card-title">{t("tooltip")}</div>
              </div>
            </div>
            <div className="px-4 pb-4">
              <BugsForm
                categories={categories}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
                onCancel={() => setIsOpen(false)}
                initialPageUrl={pathname}
                compact
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BugReportWidget;

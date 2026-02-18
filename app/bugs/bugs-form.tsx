"use client";

import { useCallback, useMemo, useState, type FormEvent, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { useSupabase } from "@/app/hooks/use-supabase";
import { useAuth } from "@/app/hooks/use-auth";
import { BUG_SCREENSHOTS_BUCKET } from "@/lib/constants";
import RadixSelect from "@/app/components/ui/radix-select";
import MarkdownEditor from "@/app/components/markdown-editor";
import GameButton from "@/app/components/ui/game-button";
import BugsScreenshotUpload, { type UploadedScreenshot } from "./bugs-screenshot-upload";
import type { BugReportCategory, BugsFormSubmitData } from "./bugs-types";

/**
 * Known site pages. Sidebar pages reference nav.* translations directly
 * so labels always match the navigation. Extra pages (profile, settings,
 * generic admin) fall back to bugs.pages.* translations.
 */
const SITE_PAGES: readonly { path: string; navKey: string | null; pageKey: string | null }[] = [
  /* Main */
  { path: "/home", navKey: "home", pageKey: null },
  { path: "/", navKey: "dashboard", pageKey: null },
  { path: "/news", navKey: "announcements", pageKey: null },
  { path: "/analytics", navKey: "analytics", pageKey: null },
  { path: "/events", navKey: "events", pageKey: null },
  { path: "/forum", navKey: "forum", pageKey: null },
  { path: "/messages", navKey: "messages", pageKey: null },
  { path: "/members", navKey: "members", pageKey: null },
  { path: "/bugs", navKey: "bugs", pageKey: null },
  /* User */
  { path: "/profile", navKey: null, pageKey: "profile" },
  { path: "/settings", navKey: null, pageKey: "settings" },
  /* Admin */
  { path: "/admin", navKey: null, pageKey: "admin" },
  { path: "/admin?tab=clans", navKey: "clanManagement", pageKey: null },
  { path: "/admin?tab=approvals", navKey: "approvals", pageKey: null },
  { path: "/admin?tab=users", navKey: "users", pageKey: null },
  { path: "/admin?tab=logs", navKey: "auditLogs", pageKey: null },
  { path: "/admin?tab=forum", navKey: "forumAdmin", pageKey: null },
  { path: "/design-system", navKey: "designSystem", pageKey: null },
];

interface BugsFormProps {
  readonly categories: readonly BugReportCategory[];
  readonly isSubmitting: boolean;
  readonly onSubmit: (data: BugsFormSubmitData) => Promise<void>;
  readonly onCancel: () => void;
  /** Pre-filled page URL (from widget auto-capture). */
  readonly initialPageUrl?: string;
  /** Compact mode for the floating widget modal. */
  readonly compact?: boolean;
  /** When editing, pre-fill form with existing data. */
  readonly initialData?: {
    readonly title: string;
    readonly description: string;
    readonly categoryId: string;
    readonly pageUrl: string;
  };
}

function BugsForm({
  categories,
  isSubmitting,
  onSubmit,
  onCancel,
  initialPageUrl = "",
  compact = false,
  initialData,
}: BugsFormProps): ReactElement {
  const t = useTranslations("bugs.form");
  const tCommon = useTranslations("common");
  const supabase = useSupabase();
  const { userId } = useAuth();

  const isEdit = !!initialData;
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "");
  const [screenshots, setScreenshots] = useState<readonly UploadedScreenshot[]>([]);

  /* Page URL: detect if initial value matches a known page, otherwise treat as custom */
  const initialUrl = initialData?.pageUrl ?? initialPageUrl;
  const initialIsKnown = SITE_PAGES.some((p) => initialUrl === p.path);
  const [selectedPage, setSelectedPage] = useState(initialIsKnown ? initialUrl : initialUrl ? "__custom__" : "");
  const [customUrl, setCustomUrl] = useState(initialIsKnown ? "" : initialUrl);

  const handleAddScreenshot = useCallback((ss: UploadedScreenshot) => {
    setScreenshots((prev) => [...prev, ss]);
  }, []);

  const handleRemoveScreenshot = useCallback((index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!title.trim() || !description.trim()) return;
      const resolvedUrl = selectedPage === "__custom__" ? customUrl.trim() : selectedPage;
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        categoryId,
        pageUrl: resolvedUrl,
        screenshotPaths: screenshots.map((s) => s.storagePath),
      });
    },
    [title, description, categoryId, selectedPage, customUrl, screenshots, onSubmit],
  );

  const tBugs = useTranslations("bugs");
  const tPages = useTranslations("bugs.pages");
  const tNav = useTranslations("nav");

  const pageOptions = useMemo(
    () => [
      { value: "", label: tPages("placeholder") },
      ...SITE_PAGES.map((p) => ({
        value: p.path,
        label: p.navKey ? tNav(p.navKey) : tPages(p.pageKey!),
      })),
      { value: "__custom__", label: tPages("custom") },
    ],
    [tPages, tNav],
  );

  const categoryOptions = [
    { value: "", label: t("categoryPlaceholder") },
    ...categories.map((c) => {
      const label = c.slug ? tBugs(`categories.${c.slug}`) : c.name;
      return { value: c.id, label: label.startsWith("categories.") ? c.name : label };
    }),
  ];

  return (
    <section className={compact ? "" : "card col-span-full"}>
      {!compact && (
        <div className="card-header">
          <div>
            <div className="card-title">{isEdit ? t("editTitle") : t("createTitle")}</div>
            <div className="card-subtitle">{isEdit ? t("editSubtitle") : t("createSubtitle")}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={compact ? "" : "pt-0 px-4 pb-4"}>
        {/* Title */}
        <div className="form-group">
          <label className="form-label" htmlFor="bug-title">
            {t("title")}
          </label>
          <input
            id="bug-title"
            className="form-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("titlePlaceholder")}
            maxLength={200}
            required
          />
        </div>

        {/* Category */}
        <div className="form-group">
          <label className="form-label">{t("category")}</label>
          <RadixSelect
            value={categoryId}
            options={categoryOptions}
            onValueChange={setCategoryId}
            placeholder={t("categoryPlaceholder")}
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label" htmlFor="bug-description">
            {t("description")}
          </label>
          <MarkdownEditor
            id="bug-description"
            value={description}
            onChange={setDescription}
            supabase={supabase}
            userId={userId ?? ""}
            placeholder={t("descriptionPlaceholder")}
            rows={compact ? 5 : 8}
            minHeight={compact ? 140 : 200}
            storageBucket={BUG_SCREENSHOTS_BUCKET}
          />
        </div>

        {/* Affected Page */}
        <div className="form-group">
          <label className="form-label">{tPages("label")}</label>
          <RadixSelect
            value={selectedPage}
            options={pageOptions}
            onValueChange={(val) => {
              setSelectedPage(val);
              if (val !== "__custom__") setCustomUrl("");
            }}
            placeholder={tPages("placeholder")}
          />
          {selectedPage === "__custom__" && (
            <input
              id="bug-page-url"
              className="form-input"
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder={tPages("customPlaceholder")}
              maxLength={500}
              style={{ marginTop: 8 }}
            />
          )}
        </div>

        {/* Screenshots (only for new reports — existing screenshots are shown in detail view) */}
        {!isEdit && (
          <div className="form-group">
            <label className="form-label">{t("screenshots")}</label>
            <div className="text-muted" style={{ fontSize: "0.78rem", marginBottom: 8 }}>
              {t("screenshotsHint")}
            </div>
            <BugsScreenshotUpload
              screenshots={screenshots}
              onAdd={handleAddScreenshot}
              onRemove={handleRemoveScreenshot}
            />
          </div>
        )}

        {/* Actions */}
        <div className="list inline" style={{ marginTop: 16 }}>
          <GameButton
            variant="green"
            fontSize="0.6rem"
            type="submit"
            disabled={isSubmitting || !title.trim() || !description.trim()}
          >
            {isSubmitting ? t("submitting") : isEdit ? t("saveChanges") : t("submit")}
          </GameButton>
          <button className="button" type="button" onClick={onCancel}>
            {tCommon("cancel")}
          </button>
        </div>
      </form>
    </section>
  );
}

export default BugsForm;

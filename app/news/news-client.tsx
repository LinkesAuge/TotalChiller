"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import GameIcon from "../components/ui/game-icon";
import { formatLocalDateTime } from "../../lib/date-format";
import { useNews } from "./use-news";
import RadixSelect from "../components/ui/radix-select";
import DatePicker from "../components/date-picker";
import SearchInput from "../components/ui/search-input";
import dynamic from "next/dynamic";
import PageShell from "../components/page-shell";
import DataState from "../components/data-state";
import PaginationBar from "../components/pagination-bar";
import ConfirmModal from "../components/confirm-modal";
import GameButton from "../components/ui/game-button";
import NewsForm from "./news-form";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), {
  loading: () => <div className="skeleton h-32 rounded" />,
});

function NewsClient(): JSX.Element {
  const t = useTranslations("news");
  const locale = useLocale();
  const {
    articles,
    isLoading,
    pagination,
    isFiltersOpen,
    setIsFiltersOpen,
    tagFilter,
    searchTerm,
    dateFrom,
    dateTo,
    availableTags,
    hasActiveFilters,
    editFormRef,
    isFormOpen,
    isSaving,
    editingId,
    formValues,
    isBannerUploading,
    bannerFileRef,
    expandedArticleId,
    setExpandedArticleId,
    deletingArticleId,
    setDeletingArticleId,
    canManage,
    currentUserId,
    supabase,
    handleOpenCreate,
    handleEditArticle,
    handleFieldChange,
    handleBannerUpload,
    handleSubmit,
    resetForm,
    handleConfirmDeleteArticle,
    handleClearFilters,
    handleSearchTermChange,
    handleTagFilterChange,
    handleDateFromChange,
    handleDateToChange,
  } = useNews(t);

  function renderForm(): JSX.Element {
    return (
      <NewsForm
        editFormRef={editFormRef}
        isEditing={!!editingId}
        values={formValues}
        onFieldChange={handleFieldChange}
        isSaving={isSaving}
        isBannerUploading={isBannerUploading}
        bannerFileRef={bannerFileRef}
        onBannerUpload={handleBannerUpload}
        onSubmit={handleSubmit}
        onCancel={resetForm}
        supabase={supabase}
        userId={currentUserId}
        t={t}
      />
    );
  }

  return (
    <>
      <PageShell
        breadcrumb={t("breadcrumb")}
        title={t("title")}
        heroTitle={t("heroTitle")}
        heroSubtitle={t("heroSubtitle")}
        bannerSrc="/assets/banners/banner_chest.png"
      >
        {/* Top row: create button + filter toggle */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {!isFormOpen && canManage && (
            <GameButton variant="ornate1" onClick={handleOpenCreate}>
              {t("createPost")}
            </GameButton>
          )}
          <button className="news-filter-toggle" type="button" onClick={() => setIsFiltersOpen((prev) => !prev)}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            {t("filters")}
            {hasActiveFilters && <span className="news-filter-badge" />}
            <svg
              className={`news-filter-chevron${isFiltersOpen ? " open" : ""}`}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {hasActiveFilters && (
            <button className="news-filter-clear" type="button" onClick={handleClearFilters}>
              {t("clearFilters")}
            </button>
          )}
        </div>

        {/* ═══ Collapsible Filters ═══ */}
        {isFiltersOpen && (
          <section className="card mb-4">
            <div className="form-grid px-4 py-3" style={{ gap: "12px 16px" }}>
              <div className="form-group mb-0">
                <label htmlFor="newsSearch">{t("search")}</label>
                <SearchInput
                  id="newsSearch"
                  label=""
                  value={searchTerm}
                  onChange={handleSearchTermChange}
                  placeholder={t("searchPlaceholder")}
                />
              </div>
              {availableTags.length > 0 && (
                <div className="form-group mb-0">
                  <label htmlFor="newsTagFilter">{t("filterByTag")}</label>
                  <RadixSelect
                    id="newsTagFilter"
                    ariaLabel={t("filterByTag")}
                    value={tagFilter}
                    onValueChange={handleTagFilterChange}
                    options={[
                      { value: "all", label: t("all") },
                      ...availableTags.map((tag) => ({ value: tag, label: tag })),
                    ]}
                  />
                </div>
              )}
              <div className="form-group mb-0">
                <label>{t("filterByDate")}</label>
                <div className="flex gap-2 items-center">
                  <DatePicker value={dateFrom} onChange={handleDateFromChange} />
                  <span className="text-muted">–</span>
                  <DatePicker value={dateTo} onChange={handleDateToChange} />
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="grid">
          {/* ═══ Create Form (top position — only for new posts) ═══ */}
          {isFormOpen && !editingId && canManage && renderForm()}

          {/* ═══ Pagination ═══ */}
          <div className="col-span-full">
            <PaginationBar pagination={pagination} pageSizeOptions={[10, 25, 50]} idPrefix="news" />
          </div>

          <DataState
            isLoading={isLoading}
            isEmpty={articles.length === 0}
            loadingMessage={t("loadingNews")}
            emptyMessage={t("noNews")}
            className="col-span-full"
          >
            {articles.map((article) => {
              const isExpanded = expandedArticleId === article.id;
              const isBeingEdited = isFormOpen && editingId === article.id;
              return (
                <React.Fragment key={article.id}>
                  <article id={`article-${article.id}`} className="news-card col-span-full">
                    {/* Banner header */}
                    <div
                      className="news-card-banner"
                      onClick={() => setExpandedArticleId(isExpanded ? "" : article.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedArticleId(isExpanded ? "" : article.id);
                        }
                      }}
                    >
                      <Image
                        src={article.banner_url || "/assets/banners/banner_gold_dragon.png"}
                        alt=""
                        className="news-card-banner-img"
                        width={800}
                        height={200}
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      <div className="news-card-banner-overlay" />
                      {/* Decorative line */}
                      <Image
                        src="/assets/vip/components_decor_6.png"
                        alt=""
                        className="news-card-decor"
                        width={240}
                        height={12}
                      />
                      {/* Title + meta over banner */}
                      <div className="news-card-banner-content">
                        <h3 className="news-card-title">{article.title}</h3>
                        <div className="news-card-meta">
                          <span>{formatLocalDateTime(article.created_at, locale)}</span>
                          {article.author_name && (
                            <>
                              <span className="news-card-meta-sep">&bull;</span>
                              <span>{t("author", { name: article.author_name })}</span>
                            </>
                          )}
                          {article.editor_name && article.updated_at && (
                            <>
                              <span className="news-card-meta-sep">&bull;</span>
                              <span className="news-card-edited">
                                {t("editedBy", {
                                  name: article.editor_name,
                                  date: formatLocalDateTime(article.updated_at, locale),
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Badges */}
                      <div className="news-card-badges">
                        {article.is_pinned && <span className="news-card-badge pinned">{t("pinned")}</span>}
                        <span className="news-card-badge status">
                          {t(article.status as "draft" | "pending" | "published")}
                        </span>
                      </div>
                    </div>

                    {/* Content preview (truncated) — always visible */}
                    {!isExpanded && article.content && (
                      <div
                        className="news-card-preview"
                        onClick={() => setExpandedArticleId(article.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpandedArticleId(article.id);
                          }
                        }}
                      >
                        <AppMarkdown content={article.content} />
                        <div className="news-card-fade" />
                        <span className="news-card-read-more">{t("readMore")}</span>
                      </div>
                    )}

                    {/* Expanded full content */}
                    {isExpanded && (
                      <div className="news-card-body">
                        <AppMarkdown content={article.content} />
                        <div className="news-card-collapse-row">
                          <button
                            className="news-card-collapse-btn"
                            type="button"
                            onClick={() => setExpandedArticleId("")}
                          >
                            {t("showLess")}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {article.tags.length > 0 && (
                      <div className="news-card-tags">
                        {article.tags.map((tag) => (
                          <span className="news-card-tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="news-card-actions">
                      {article.forum_post_id && (
                        <Link
                          className="news-action-btn thread"
                          href={`/forum?post=${article.forum_post_id}`}
                          aria-label={t("goToThread")}
                          title={t("goToThread")}
                        >
                          <img src="/assets/game/icons/icons_message_1.png" alt="" width={14} height={14} />
                          {t("goToThread")}
                        </Link>
                      )}
                      {canManage && (
                        <>
                          {article.is_pinned && (
                            <span className="news-action-btn pin active" aria-label={t("pinned")} title={t("pinned")}>
                              <GameIcon name="star" size="sm" />
                            </span>
                          )}
                          <button
                            className="news-action-btn"
                            type="button"
                            onClick={() => handleEditArticle(article)}
                            aria-label={t("editPost")}
                            title={t("editPost")}
                          >
                            <img src="/assets/game/icons/icons_pen_2.png" alt="" width={14} height={14} />
                          </button>
                          <button
                            className="news-action-btn danger"
                            type="button"
                            onClick={() => setDeletingArticleId(article.id)}
                            aria-label={t("deletePost")}
                            title={t("deletePost")}
                          >
                            <img src="/assets/game/icons/icons_paper_cross_1.png" alt="" width={14} height={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                  {isBeingEdited && canManage && renderForm()}
                </React.Fragment>
              );
            })}
          </DataState>

          {/* (filters moved to top) */}
        </div>
      </PageShell>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={!!deletingArticleId}
        title={t("deletePost")}
        message={t("confirmDelete")}
        variant="danger"
        confirmLabel={t("deletePost")}
        cancelLabel={t("cancel")}
        onConfirm={handleConfirmDeleteArticle}
        onCancel={() => setDeletingArticleId("")}
      />
    </>
  );
}

export default NewsClient;

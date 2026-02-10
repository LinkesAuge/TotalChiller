"use client";

import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
import ForumCategoryAdmin from "../forum-category-admin";

/**
 * Admin Forum tab — thin wrapper around the existing ForumCategoryAdmin component.
 */
export default function ForumTab(): ReactElement {
  const tAdmin = useTranslations("admin");

  return (
    <section className="card" style={{ gridColumn: "1 / -1" }}>
      <div className="card-header">
        <div>
          <div className="card-title">{tAdmin("forum.title")}</div>
          <div className="card-subtitle">{tAdmin("forum.subtitle")}</div>
        </div>
      </div>
      <div style={{ padding: "0 16px 16px" }}>
        <ForumCategoryAdmin />
      </div>
    </section>
  );
}

"use client";

import { useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { useAdminContext } from "../admin-context";
import { EventRulesSection } from "./sections/event-rules-section";
import { ChestGoalsSection } from "./sections/chest-goals-section";

type SubTab = "eventRules" | "chestGoals";

export default function RulesDefinitionsTab(): ReactElement {
  const { supabase, currentUserId, selectedClanId } = useAdminContext();
  const t = useTranslations("admin.rulesDefinitions");

  const [activeSubTab, setActiveSubTab] = useState<SubTab>("eventRules");

  if (!selectedClanId) {
    return (
      <section className="card">
        <div className="card-header">
          <div className="card-title">{t("title")}</div>
        </div>
        <p className="p-4">{t("selectClanFirst")}</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{t("title")}</div>
          <div className="card-subtitle">{t("subtitle")}</div>
        </div>
      </div>

      <div className="tabs admin-sub-tabs" role="tablist">
        <button
          role="tab"
          type="button"
          aria-selected={activeSubTab === "eventRules"}
          className={`tab ${activeSubTab === "eventRules" ? "active" : ""}`}
          onClick={() => setActiveSubTab("eventRules")}
        >
          {t("tabEventRules")}
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={activeSubTab === "chestGoals"}
          className={`tab ${activeSubTab === "chestGoals" ? "active" : ""}`}
          onClick={() => setActiveSubTab("chestGoals")}
        >
          {t("tabChestGoals")}
        </button>
      </div>

      <div className="px-4 pb-4 pt-2">
        {activeSubTab === "eventRules" && (
          <EventRulesSection key={selectedClanId} supabase={supabase} userId={currentUserId} clanId={selectedClanId} />
        )}
        {activeSubTab === "chestGoals" && (
          <ChestGoalsSection key={selectedClanId} supabase={supabase} userId={currentUserId} clanId={selectedClanId} />
        )}
      </div>
    </section>
  );
}

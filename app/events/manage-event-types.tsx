"use client";

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { SupabaseClient } from "@supabase/supabase-js";
import BannerPicker from "../components/banner-picker";
import MarkdownEditor from "../components/markdown-editor";
import GameAlert from "../components/ui/game-alert";
import { BANNER_PRESETS } from "@/lib/constants/banner-presets";
import { useBannerUpload } from "@/lib/hooks/use-banner-upload";
import type { ClanEventType } from "@/lib/types/domain";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), { ssr: false });

export interface ManageEventTypesProps {
  readonly isOpen: boolean;
  readonly eventTypes: readonly ClanEventType[];
  readonly canManage: boolean;
  readonly clanId: string | undefined;
  readonly onReload: () => Promise<void>;
  readonly t: (key: string, values?: Record<string, string>) => string;
  readonly supabase: SupabaseClient;
  readonly userId: string;
}

interface Toast {
  readonly message: string;
  readonly type: "success" | "error";
}

export function ManageEventTypes({
  isOpen,
  eventTypes,
  canManage,
  clanId,
  onReload,
  t,
  supabase,
  userId,
}: ManageEventTypesProps): ReactElement | null {
  if (!isOpen || !canManage) return null;

  return (
    <ManageEventTypesInner
      eventTypes={eventTypes}
      clanId={clanId}
      onReload={onReload}
      t={t}
      supabase={supabase}
      userId={userId}
    />
  );
}

function ManageEventTypesInner({
  eventTypes,
  clanId,
  onReload,
  t,
  supabase,
  userId,
}: Omit<ManageEventTypesProps, "isOpen" | "canManage">): ReactElement {
  const [toast, setToast] = useState<Toast | null>(null);
  const [formName, setFormName] = useState("");
  const [formBanner, setFormBanner] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const bannerFileRef = useRef<HTMLInputElement>(null);

  const pushToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  }, []);

  const { handleBannerUpload, isBannerUploading } = useBannerUpload({
    supabase,
    userId: userId || null,
    onSuccess: setFormBanner,
    onError: (msg) => pushToast(msg, "error"),
    filePrefix: "event_type_banner",
  });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const resetForm = useCallback(() => {
    setFormName("");
    setFormBanner("");
    setFormDescription("");
    setFormIsActive(true);
    setEditingId(null);
    setIsFormOpen(false);
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setIsFormOpen(true);
  }, [resetForm]);

  const openEdit = useCallback((def: ClanEventType) => {
    setFormName(def.name);
    setFormBanner(def.banner_url ?? "");
    setFormDescription(def.description ?? "");
    setFormIsActive(def.is_active);
    setEditingId(def.id);
    setIsFormOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!clanId || !formName.trim()) {
      pushToast(t("eventTypeNameRequired"), "error");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        clan_id: clanId,
        name: formName.trim(),
        banner_url: formBanner || null,
        description: formDescription.trim() || null,
        is_active: formIsActive,
        ...(editingId ? { id: editingId } : {}),
      };

      const res = await fetch("/api/event-types", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Save failed");

      pushToast(editingId ? t("eventTypeUpdated") : t("eventTypeCreated"));
      resetForm();
      void onReload();
    } catch {
      pushToast(t("eventTypeSaveFailed"), "error");
    } finally {
      setIsSaving(false);
    }
  }, [clanId, formName, formBanner, formDescription, formIsActive, editingId, pushToast, t, resetForm, onReload]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!clanId) return;
      try {
        const res = await fetch(`/api/event-types?clan_id=${clanId}&id=${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
        pushToast(t("eventTypeDeleted"));
        setDeleteConfirmId(null);
        void onReload();
      } catch {
        pushToast(t("eventTypeDeleteFailed"), "error");
      }
    },
    [clanId, pushToast, t, onReload],
  );

  return (
    <section className="card col-span-full">
      <div className="card-header">
        <div>
          <div className="card-title">{t("eventTypesTitle")}</div>
          <div className="card-subtitle">{t("eventTypesSubtitle")}</div>
        </div>
        {!isFormOpen && (
          <button type="button" className="button primary compact" onClick={openCreate}>
            {t("eventTypeAddNew")}
          </button>
        )}
      </div>

      {toast && (
        <div className="px-4">
          <GameAlert variant={toast.type === "success" ? "success" : "error"} title={toast.message} />
        </div>
      )}

      {isFormOpen && (
        <div className="px-4 pb-2">
          <div className="card" style={{ padding: "1rem" }}>
            <h3 className="card-title mb-3">{editingId ? t("eventTypeEdit") : t("eventTypeNew")}</h3>

            <div className="form-group">
              <label htmlFor="etName">{t("eventTypeNameLabel")}</label>
              <input
                id="etName"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("eventTypeNamePlaceholder")}
                maxLength={200}
              />
            </div>

            <div className="form-group">
              <label htmlFor="etDescription">{t("eventTypeDescriptionLabel")}</label>
              <MarkdownEditor
                id="etDescription"
                value={formDescription}
                onChange={setFormDescription}
                supabase={supabase}
                userId={userId ?? ""}
                placeholder={t("eventTypeDescriptionPlaceholder")}
                rows={6}
                minHeight={160}
              />
            </div>

            <div className="form-group">
              <label id="etBannerLabel">{t("eventTypeBannerLabel")}</label>
              <BannerPicker
                presets={BANNER_PRESETS}
                value={formBanner}
                onChange={setFormBanner}
                onUpload={handleBannerUpload}
                isUploading={isBannerUploading}
                fileRef={bannerFileRef}
                labelId="etBannerLabel"
              />
            </div>

            <div className="form-group">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />
                {t("eventTypeIsActive")}
              </label>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                className="button primary compact"
                onClick={handleSave}
                disabled={isSaving || !formName.trim()}
              >
                {isSaving ? t("saving") : editingId ? t("save") : t("eventTypeCreate")}
              </button>
              <button type="button" className="button compact" onClick={resetForm}>
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pb-4">
        {eventTypes.length === 0 ? (
          <p className="muted">{t("noEventTypes")}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("eventTypeNameLabel")}</th>
                <th>{t("eventTypeBannerLabel")}</th>
                <th>{t("eventTypeStatusLabel")}</th>
                <th>{t("eventTypeActionsLabel")}</th>
              </tr>
            </thead>
            <tbody>
              {eventTypes.map((et) => (
                <tr key={et.id}>
                  <td>
                    <span className="font-medium">{et.name}</span>
                    {et.description && (
                      <div className="block text-xs muted mt-1">
                        <AppMarkdown content={et.description} />
                      </div>
                    )}
                  </td>
                  <td>
                    {et.banner_url ? (
                      <Image
                        src={et.banner_url}
                        alt={et.name}
                        width={120}
                        height={42}
                        unoptimized
                        style={{ borderRadius: 4 }}
                      />
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={et.is_active ? "badge-active" : "badge-inactive"}>
                      {et.is_active ? t("eventTypeActive") : t("eventTypeInactive")}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button type="button" className="button compact" onClick={() => openEdit(et)}>
                        {t("editEvent")}
                      </button>
                      {deleteConfirmId === et.id ? (
                        <>
                          <button type="button" className="button danger compact" onClick={() => handleDelete(et.id)}>
                            {t("confirmAction")}
                          </button>
                          <button type="button" className="button compact" onClick={() => setDeleteConfirmId(null)}>
                            {t("cancel")}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="button danger compact"
                          onClick={() => setDeleteConfirmId(et.id)}
                        >
                          {t("deleteEvent")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

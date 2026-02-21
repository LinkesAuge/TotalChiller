"use client";

import type { ReactElement } from "react";
import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useSupabase } from "../../hooks/use-supabase";
import useClanContext from "../../hooks/use-clan-context";
import DataState from "../../components/data-state";
import GameAlert from "../../components/ui/game-alert";
import { useAdminContext } from "../admin-context";
import { ImportPayloadSchema, type ImportPayload } from "@/lib/api/import-schemas";

type PageState = "idle" | "previewing" | "submitting" | "success" | "error";

interface SubmissionResultItem {
  readonly id: string;
  readonly type: string;
  readonly itemCount: number;
  readonly autoMatchedCount: number;
  readonly unmatchedCount: number;
  readonly duplicateCount: number;
}

interface SubmitResponse {
  readonly submissions: readonly SubmissionResultItem[];
  readonly validationListsUpdated: boolean;
}

const dropzoneBase: React.CSSProperties = {
  borderWidth: "2px",
  borderStyle: "dashed",
  borderColor: "var(--color-border)",
  borderRadius: "8px",
  background: "var(--color-surface-elevated)",
  padding: "40px 24px",
  textAlign: "center",
  cursor: "pointer",
  transition: "border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease",
};

const dropzoneActive: React.CSSProperties = {
  ...dropzoneBase,
  borderColor: "var(--color-gold)",
  background: "var(--color-gold-a08)",
  boxShadow: "0 0 16px var(--color-gold-a12)",
};

const dropzoneHasFile: React.CSSProperties = {
  ...dropzoneBase,
  borderColor: "var(--color-gold-a50)",
  borderStyle: "solid",
};

export default function ImportTab(): ReactElement {
  const t = useTranslations("import");
  const supabase = useSupabase();
  const clanContext = useClanContext();
  const { updateActiveSection } = useAdminContext();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [payload, setPayload] = useState<ImportPayload | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);

  const processFile = useCallback(
    (file: File) => {
      setValidationError(null);
      setSubmitError(null);
      setSubmitResult(null);
      setPageState("idle");

      if (!file.name.endsWith(".json")) {
        setValidationError(t("errorNotJson"));
        setFileName(file.name);
        setPayload(null);
        return;
      }

      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const raw = JSON.parse(e.target?.result as string);
          const result = ImportPayloadSchema.safeParse(raw);
          if (!result.success) {
            const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
            setValidationError(t("errorValidation", { details: issues }));
            setPayload(null);
            return;
          }
          setPayload(result.data);
          setValidationError(null);
          setPageState("previewing");
        } catch {
          setValidationError(t("errorParseFailed"));
          setPayload(null);
        }
      };
      reader.onerror = () => {
        setValidationError(t("errorReadFailed"));
        setPayload(null);
      };
      reader.readAsText(file);
    },
    [t],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const resetForm = useCallback(() => {
    setFileName(null);
    setPayload(null);
    setValidationError(null);
    setSubmitError(null);
    setSubmitResult(null);
    setPageState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!payload) return;

    const needsClanId = !payload.clan.websiteClanId;
    const clanId = payload.clan.websiteClanId ?? clanContext?.clanId;

    if (needsClanId && !clanId) {
      setSubmitError(t("errorNoClan"));
      return;
    }

    setPageState("submitting");
    setSubmitError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setSubmitError(t("errorUnauthorized"));
        setPageState("error");
        return;
      }

      const url = new URL("/api/import/submit", window.location.origin);
      if (needsClanId && clanId) {
        url.searchParams.set("clan_id", clanId);
      }

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setSubmitError(body?.error ?? t("errorSubmitFailed"));
        setPageState("error");
        return;
      }

      const body = await res.json();
      setSubmitResult(body.data as SubmitResponse);
      setPageState("success");
    } catch {
      setSubmitError(t("errorSubmitFailed"));
      setPageState("error");
    }
  }, [payload, clanContext, supabase, t]);

  const chestCount = payload?.data.chests?.length ?? 0;
  const memberCount = payload?.data.members?.length ?? 0;
  const eventCount = payload?.data.events?.length ?? 0;
  const hasValidationLists = !!payload?.validationLists;
  const needsClanSelector = payload && !payload.clan.websiteClanId;

  function getDropzoneStyle(): React.CSSProperties {
    if (isDragOver) return dropzoneActive;
    if (fileName && !validationError) return dropzoneHasFile;
    return dropzoneBase;
  }

  return (
    <>
      {/* Dropzone */}
      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">{t("dropzoneTitle")}</div>
            <div className="card-subtitle">{t("dropzoneSubtitle")}</div>
          </div>
        </div>
        <div className="card-body">
          <div
            role="button"
            tabIndex={0}
            style={getDropzoneStyle()}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={handleClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleClick();
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileInput}
              style={{ display: "none" }}
            />
            {fileName ? (
              <div>
                <div style={{ fontSize: "0.9rem", color: "var(--color-text-1)", fontWeight: 600 }}>{fileName}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-text-3)", marginTop: "4px" }}>
                  {validationError ? t("dropzoneReplace") : t("dropzoneSelected")}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "0.95rem", color: "var(--color-text-2)", fontWeight: 500 }}>
                  {t("dropzoneCta")}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-text-3)", marginTop: "6px" }}>
                  {t("dropzoneHint")}
                </div>
              </div>
            )}
          </div>

          {validationError && (
            <GameAlert variant="error" title={t("validationFailed")} className="mt-3">
              <pre
                style={{
                  fontSize: "0.78rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {validationError}
              </pre>
            </GameAlert>
          )}
        </div>
      </section>

      {/* Preview */}
      {pageState === "previewing" && payload && (
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t("previewTitle")}</div>
              <div className="card-subtitle">{t("previewSubtitle")}</div>
            </div>
          </div>
          <div className="card-body">
            <table className="table" style={{ marginBottom: 0 }}>
              <tbody>
                <tr>
                  <td style={{ color: "var(--color-text-3)", fontWeight: 500 }}>{t("previewClan")}</td>
                  <td>{payload.clan.name}</td>
                </tr>
                <tr>
                  <td style={{ color: "var(--color-text-3)", fontWeight: 500 }}>{t("previewSource")}</td>
                  <td>{payload.source}</td>
                </tr>
                <tr>
                  <td style={{ color: "var(--color-text-3)", fontWeight: 500 }}>{t("previewExportedAt")}</td>
                  <td>{new Date(payload.exportedAt).toLocaleString()}</td>
                </tr>
                {chestCount > 0 && (
                  <tr>
                    <td style={{ color: "var(--color-text-3)", fontWeight: 500 }}>{t("previewChests")}</td>
                    <td>
                      {chestCount} {t("entries")}
                    </td>
                  </tr>
                )}
                {memberCount > 0 && (
                  <tr>
                    <td style={{ color: "var(--color-text-3)", fontWeight: 500 }}>{t("previewMembers")}</td>
                    <td>
                      {memberCount} {t("entries")}
                    </td>
                  </tr>
                )}
                {eventCount > 0 && (
                  <tr>
                    <td style={{ color: "var(--color-text-3)", fontWeight: 500 }}>{t("previewEvents")}</td>
                    <td>
                      {eventCount} {t("entries")}
                    </td>
                  </tr>
                )}
                <tr>
                  <td style={{ color: "var(--color-text-3)", fontWeight: 500 }}>{t("previewValidationLists")}</td>
                  <td>{hasValidationLists ? t("yes") : t("no")}</td>
                </tr>
              </tbody>
            </table>

            {needsClanSelector && (
              <GameAlert variant="warn" title={t("clanRequired")} className="mt-3">
                <p style={{ margin: 0, fontSize: "0.85rem" }}>
                  {clanContext?.clanId ? t("clanWillUse") : t("clanSelectPrompt")}
                </p>
              </GameAlert>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button
                type="button"
                className="button primary"
                disabled={pageState !== "previewing" || (!!needsClanSelector && !clanContext?.clanId)}
                onClick={handleSubmit}
              >
                {t("submitButton")}
              </button>
              <button type="button" className="button" onClick={resetForm}>
                {t("resetButton")}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Submitting */}
      {pageState === "submitting" && (
        <DataState isLoading loadingMessage={t("submitting")}>
          <span />
        </DataState>
      )}

      {/* Error */}
      {pageState === "error" && submitError && (
        <GameAlert variant="error" title={submitError}>
          <button type="button" className="button" onClick={resetForm} style={{ marginTop: "10px" }}>
            {t("tryAgain")}
          </button>
        </GameAlert>
      )}

      {/* Success */}
      {pageState === "success" && submitResult && (
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ color: "#5ec07e" }}>
                {t("successTitle")}
              </div>
              <div className="card-subtitle">{t("successSubtitle")}</div>
            </div>
          </div>
          <div className="card-body">
            <table className="table" style={{ marginBottom: "12px" }}>
              <thead>
                <tr>
                  <th>{t("resultType")}</th>
                  <th>{t("resultItems")}</th>
                  <th>{t("resultMatched")}</th>
                  <th>{t("resultUnmatched")}</th>
                </tr>
              </thead>
              <tbody>
                {submitResult.submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td style={{ textTransform: "capitalize" }}>{sub.type}</td>
                    <td>{sub.itemCount}</td>
                    <td style={{ color: "#5ec07e" }}>{sub.autoMatchedCount}</td>
                    <td style={{ color: sub.unmatchedCount > 0 ? "var(--color-gold-2)" : "var(--color-text-3)" }}>
                      {sub.unmatchedCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {submitResult.validationListsUpdated && (
              <div style={{ fontSize: "0.83rem", color: "var(--color-text-3)", marginBottom: "12px" }}>
                {t("validationListsUpdated")}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" className="button primary" onClick={() => updateActiveSection("submissions")}>
                {t("viewSubmissions")}
              </button>
              <button type="button" className="button" onClick={resetForm}>
                {t("importAnother")}
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

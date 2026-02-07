"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";

interface DisplayNameEditorProps {
  readonly userId: string;
  readonly initialDisplayName: string;
  readonly email: string;
}

function DisplayNameEditor({ userId, initialDisplayName, email }: DisplayNameEditorProps): JSX.Element {
  const t = useTranslations("displayNameEditor");
  const supabase = createSupabaseBrowserClient();
  const [displayName, setDisplayName] = useState<string>(initialDisplayName);
  const [status, setStatus] = useState<string>("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextDisplayName = displayName.trim();
    setStatus(t("updating"));
    if (nextDisplayName) {
      const { data: existingDisplayName, error: displayNameError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("display_name", nextDisplayName)
        .neq("id", userId)
        .maybeSingle();
      if (displayNameError) {
        setStatus(displayNameError.message);
        return;
      }
      if (existingDisplayName) {
        setStatus(t("alreadyExists"));
        return;
      }
    }
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: nextDisplayName || null })
      .eq("id", userId);
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus(t("updated"));
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="profileDisplayName">{t("label")}</label>
        <input
          id="profileDisplayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder={t("placeholder")}
        />
      </div>
      <div className="list">
        <button className="button" type="submit">
          {t("save")}
        </button>
      </div>
      {status ? <p className="text-muted">{status}</p> : null}
    </form>
  );
}

export default DisplayNameEditor;

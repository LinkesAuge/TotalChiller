"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useSupabase } from "../hooks/use-supabase";

interface DisplayNameEditorProps {
  readonly userId: string;
  readonly initialDisplayName: string;
  readonly email: string;
}

function DisplayNameEditor({ userId, initialDisplayName, email: _email }: DisplayNameEditorProps): JSX.Element {
  const t = useTranslations("displayNameEditor");
  const supabase = useSupabase();
  const [displayName, setDisplayName] = useState<string>(initialDisplayName);
  const [status, setStatus] = useState<string>("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextDisplayName = displayName.trim();
    setStatus(t("updating"));
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: nextDisplayName || null })
      .eq("id", userId);
    if (error) {
      // PostgreSQL unique_violation (23505) - profiles_display_name_unique_lower constraint
      if (error.code === "23505") {
        setStatus(t("alreadyExists"));
        return;
      }
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

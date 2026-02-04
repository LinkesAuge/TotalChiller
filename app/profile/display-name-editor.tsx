"use client";

import { useState, type FormEvent } from "react";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";

interface DisplayNameEditorProps {
  readonly userId: string;
  readonly initialDisplayName: string;
  readonly email: string;
}

function DisplayNameEditor({ userId, initialDisplayName, email }: DisplayNameEditorProps): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const [displayName, setDisplayName] = useState<string>(initialDisplayName);
  const [status, setStatus] = useState<string>("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextDisplayName = displayName.trim();
    setStatus("Updating display name...");
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: userId, email, display_name: nextDisplayName || null },
        { onConflict: "id" },
      );
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus("Display name updated.");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="profileDisplayName">Display name</label>
        <input
          id="profileDisplayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Leinad"
        />
      </div>
      <div className="list">
        <button className="button" type="submit">
          Save Display Name
        </button>
      </div>
      {status ? <p className="text-muted">{status}</p> : null}
    </form>
  );
}

export default DisplayNameEditor;

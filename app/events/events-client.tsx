"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import useClanContext from "../components/use-clan-context";
import { useToast } from "../components/toast-provider";

interface EventRow {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly location: string | null;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly created_at: string;
}

const EVENT_SCHEMA = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  location: z.string().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
});

function EventsClient(): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const clanContext = useClanContext();
  const { pushToast } = useToast();
  const [events, setEvents] = useState<readonly EventRow[]>([]);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [startsAt, setStartsAt] = useState<string>("");
  const [endsAt, setEndsAt] = useState<string>("");

  const parsedStartsAt = useMemo(() => (startsAt ? new Date(startsAt).toISOString() : ""), [startsAt]);
  const parsedEndsAt = useMemo(() => (endsAt ? new Date(endsAt).toISOString() : ""), [endsAt]);

  useEffect(() => {
    async function loadEvents(): Promise<void> {
      if (!clanContext?.clanId) {
        setEvents([]);
        return;
      }
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,location,starts_at,ends_at,created_at")
        .eq("clan_id", clanContext.clanId)
        .order("starts_at", { ascending: true });
      if (error) {
        pushToast(`Failed to load events: ${error.message}`);
        return;
      }
      setEvents((data ?? []) as EventRow[]);
    }
    void loadEvents();
  }, [clanContext?.clanId, pushToast, supabase]);

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!clanContext?.clanId) {
      pushToast("Select a clan first.");
      return;
    }
    const parsed = EVENT_SCHEMA.safeParse({
      title,
      description,
      location: location.trim() || undefined,
      startsAt,
      endsAt,
    });
    if (!parsed.success) {
      pushToast("Check your form values.");
      return;
    }
    if (parsedStartsAt >= parsedEndsAt) {
      pushToast("End time must be after start time.");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      pushToast("You must be logged in.");
      return;
    }
    const payload = {
      clan_id: clanContext.clanId,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location ?? null,
      starts_at: parsedStartsAt,
      ends_at: parsedEndsAt,
      created_by: userId,
    };
    setIsCreating(true);
    const { error } = editingId
      ? await supabase.from("events").update(payload).eq("id", editingId)
      : await supabase.from("events").insert(payload);
    setIsCreating(false);
    if (error) {
      pushToast(`Failed to save event: ${error.message}`);
      return;
    }
    setTitle("");
    setDescription("");
    setLocation("");
    setStartsAt("");
    setEndsAt("");
    setEditingId("");
    pushToast(editingId ? "Event updated." : "Event created.");
    const { data, error: reloadError } = await supabase
      .from("events")
      .select("id,title,description,location,starts_at,ends_at,created_at")
      .eq("clan_id", clanContext.clanId)
      .order("starts_at", { ascending: true });
    if (reloadError) {
      pushToast(`Failed to refresh events: ${reloadError.message}`);
      return;
    }
    setEvents((data ?? []) as EventRow[]);
  }

  function handleEditEvent(entry: EventRow): void {
    setEditingId(entry.id);
    setTitle(entry.title);
    setDescription(entry.description);
    setLocation(entry.location ?? "");
    setStartsAt(entry.starts_at.slice(0, 16));
    setEndsAt(entry.ends_at.slice(0, 16));
  }

  async function handleDeleteEvent(eventId: string): Promise<void> {
    const confirmDelete = window.confirm("Delete this event?");
    if (!confirmDelete) {
      return;
    }
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      pushToast(`Failed to delete event: ${error.message}`);
      return;
    }
    setEvents((current) => current.filter((item) => item.id !== eventId));
    pushToast("Event deleted.");
  }

  return (
    <div className="grid">
      <section className="card" style={{ gridColumn: "span 12" }}>
        <div className="card-header">
          <div>
            <div className="card-title">{editingId ? "Edit Event" : "Create Event"}</div>
            <div className="card-subtitle">Visible to the selected clan</div>
          </div>
        </div>
        <form onSubmit={handleCreateEvent}>
          <div className="form-group">
            <label htmlFor="eventTitle">Title</label>
            <input
              id="eventTitle"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Event title"
            />
          </div>
          <div className="form-group">
            <label htmlFor="eventDescription">Description</label>
            <textarea
              id="eventDescription"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Event description"
            />
          </div>
          <div className="form-group">
            <label htmlFor="eventLocation">Location (optional)</label>
            <input
              id="eventLocation"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Discord / in-game"
            />
          </div>
          <div className="form-group">
            <label htmlFor="eventStartsAt">Starts at</label>
            <input
              id="eventStartsAt"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="eventEndsAt">Ends at</label>
            <input
              id="eventEndsAt"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </div>
          <div className="list">
            <button className="button primary" type="submit" disabled={isCreating}>
              {isCreating ? "Saving..." : editingId ? "Save Changes" : "Create Event"}
            </button>
            {editingId ? (
              <button
                className="button"
                type="button"
                onClick={() => {
                  setEditingId("");
                  setTitle("");
                  setDescription("");
                  setLocation("");
                  setStartsAt("");
                  setEndsAt("");
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>
      {events.length === 0 ? (
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">No events yet</div>
              <div className="card-subtitle">Create the first clan event</div>
            </div>
          </div>
        </section>
      ) : (
        events.map((entry) => (
          <section className="card" key={entry.id}>
            <div className="card-header">
              <div>
                <div className="card-title">{entry.title}</div>
                <div className="card-subtitle">
                  {new Date(entry.starts_at).toLocaleString()} → {new Date(entry.ends_at).toLocaleString()}
                </div>
              </div>
              <span className="badge">Event</span>
            </div>
            <p>{entry.description}</p>
            {entry.location ? (
              <div className="list inline">
                <span className="badge">{entry.location}</span>
              </div>
            ) : null}
            <div className="list inline">
              <button className="button" type="button" onClick={() => handleEditEvent(entry)}>
                Edit
              </button>
              <button className="button danger" type="button" onClick={() => handleDeleteEvent(entry.id)}>
                Delete
              </button>
            </div>
          </section>
        ))
      )}
    </div>
  );
}

export default EventsClient;

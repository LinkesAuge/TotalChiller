"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import formatGermanDateTime from "../../lib/date-format";
import useClanContext from "../components/use-clan-context";
import ClanScopeBanner from "../components/clan-scope-banner";
import AuthActions from "../components/auth-actions";
import DatePicker from "../components/date-picker";
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

/**
 * Full events client component with CRUD, past/upcoming separation, and themed datetime pickers.
 */
function EventsClient(): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const clanContext = useClanContext();
  const { pushToast } = useToast();

  /* ── Data state ── */
  const [events, setEvents] = useState<readonly EventRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPastExpanded, setIsPastExpanded] = useState<boolean>(false);

  /* ── Form state ── */
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [startsAt, setStartsAt] = useState<string>("");
  const [endsAt, setEndsAt] = useState<string>("");

  /* ── Load events ── */

  useEffect(() => {
    async function loadEvents(): Promise<void> {
      if (!clanContext?.clanId) {
        setEvents([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,location,starts_at,ends_at,created_at")
        .eq("clan_id", clanContext.clanId)
        .order("starts_at", { ascending: true });
      setIsLoading(false);
      if (error) {
        pushToast(`Failed to load events: ${error.message}`);
        return;
      }
      setEvents((data ?? []) as EventRow[]);
    }
    void loadEvents();
  }, [clanContext?.clanId, pushToast, supabase]);

  /* ── Reload helper ── */

  async function reloadEvents(): Promise<void> {
    if (!clanContext?.clanId) return;
    const { data, error } = await supabase
      .from("events")
      .select("id,title,description,location,starts_at,ends_at,created_at")
      .eq("clan_id", clanContext.clanId)
      .order("starts_at", { ascending: true });
    if (error) {
      pushToast(`Failed to refresh events: ${error.message}`);
      return;
    }
    setEvents((data ?? []) as EventRow[]);
  }

  /* ── Split upcoming / past ── */

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const now = new Date().toISOString();
    const upcoming: EventRow[] = [];
    const past: EventRow[] = [];
    for (const entry of events) {
      if (entry.ends_at >= now) {
        upcoming.push(entry);
      } else {
        past.push(entry);
      }
    }
    past.reverse();
    return { upcomingEvents: upcoming, pastEvents: past };
  }, [events]);

  /* ── Form helpers ── */

  function resetForm(): void {
    setTitle("");
    setDescription("");
    setLocation("");
    setStartsAt("");
    setEndsAt("");
    setEditingId("");
    setIsFormOpen(false);
  }

  function handleOpenCreate(): void {
    resetForm();
    setIsFormOpen(true);
  }

  function handleEditEvent(entry: EventRow): void {
    setEditingId(entry.id);
    setTitle(entry.title);
    setDescription(entry.description);
    setLocation(entry.location ?? "");
    setStartsAt(entry.starts_at.slice(0, 16));
    setEndsAt(entry.ends_at.slice(0, 16));
    setIsFormOpen(true);
  }

  /* ── Submit ── */

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
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
    const parsedStartsAt = new Date(startsAt).toISOString();
    const parsedEndsAt = new Date(endsAt).toISOString();
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
    setIsSaving(true);
    const { error } = editingId
      ? await supabase.from("events").update(payload).eq("id", editingId)
      : await supabase.from("events").insert(payload);
    setIsSaving(false);
    if (error) {
      pushToast(`Failed to save event: ${error.message}`);
      return;
    }
    pushToast(editingId ? "Event updated." : "Event created.");
    resetForm();
    await reloadEvents();
  }

  /* ── Delete ── */

  async function handleDeleteEvent(eventId: string): Promise<void> {
    const confirmDelete = window.confirm("Delete this event?");
    if (!confirmDelete) return;
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      pushToast(`Failed to delete event: ${error.message}`);
      return;
    }
    setEvents((current) => current.filter((item) => item.id !== eventId));
    pushToast("Event deleted.");
  }

  /* ── Render a single event card ── */

  function renderEventCard(entry: EventRow, isPast: boolean): JSX.Element {
    return (
      <section
        className="card"
        key={entry.id}
        style={{
          gridColumn: "span 12",
          opacity: isPast ? 0.6 : 1,
        }}
      >
        <div className="card-header">
          <div>
            <div className="card-title">{entry.title}</div>
            <div className="card-subtitle">
              {formatGermanDateTime(entry.starts_at)} → {formatGermanDateTime(entry.ends_at)}
            </div>
          </div>
          <span className="badge">{isPast ? "Past" : "Upcoming"}</span>
        </div>
        <p>{entry.description}</p>
        {entry.location && (
          <div className="list inline" style={{ marginTop: 12 }}>
            <span className="badge">{entry.location}</span>
          </div>
        )}
        <div className="list inline" style={{ marginTop: 12 }}>
          <button className="button" type="button" onClick={() => handleEditEvent(entry)}>
            Edit
          </button>
          <button className="button danger" type="button" onClick={() => handleDeleteEvent(entry.id)}>
            Delete
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* ── Header ── */}
      <section className="header header-inline">
        <div className="title">Clan Events</div>
        <div className="actions">
          {!isFormOpen && (
            <button className="button primary" type="button" onClick={handleOpenCreate}>
              Create Event
            </button>
          )}
          <AuthActions />
        </div>
      </section>

      <div className="grid">
        <ClanScopeBanner />

        {/* ── Create / Edit Form (collapsible) ── */}
        {isFormOpen && (
          <section className="card" style={{ gridColumn: "span 12" }}>
            <div className="card-header">
              <div>
                <div className="card-title">{editingId ? "Edit Event" : "Create Event"}</div>
                <div className="card-subtitle">Visible to the selected clan</div>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="eventTitle">Title</label>
                <input
                  id="eventTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event title"
                />
              </div>
              <div className="form-group">
                <label htmlFor="eventDescription">Description</label>
                <textarea
                  id="eventDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Event description"
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label htmlFor="eventLocation">Location (optional)</label>
                <input
                  id="eventLocation"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Discord / in-game"
                />
              </div>
              <div className="form-grid">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="eventStartsAt">Starts at</label>
                  <DatePicker value={startsAt} onChange={setStartsAt} enableTime />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="eventEndsAt">Ends at</label>
                  <DatePicker value={endsAt} onChange={setEndsAt} enableTime />
                </div>
              </div>
              <div className="list inline" style={{ marginTop: 16 }}>
                <button className="button primary" type="submit" disabled={isSaving}>
                  {isSaving ? "Saving…" : editingId ? "Save Changes" : "Create Event"}
                </button>
                <button className="button" type="button" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ── Loading ── */}
        {isLoading && (
          <div className="alert info loading" style={{ gridColumn: "span 12" }}>
            Loading events…
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && events.length === 0 && (
          <section className="card" style={{ gridColumn: "span 12" }}>
            <div className="card-header">
              <div>
                <div className="card-title">No events yet</div>
                <div className="card-subtitle">Create the first clan event</div>
              </div>
            </div>
          </section>
        )}

        {/* ── Upcoming events ── */}
        {!isLoading && upcomingEvents.length > 0 && (
          <>
            <div className="card-title" style={{ gridColumn: "span 12" }}>
              Upcoming Events ({upcomingEvents.length})
            </div>
            {upcomingEvents.map((entry) => renderEventCard(entry, false))}
          </>
        )}

        {/* ── Past events (collapsible) ── */}
        {!isLoading && pastEvents.length > 0 && (
          <>
            <div style={{ gridColumn: "span 12", display: "flex", alignItems: "center", gap: 12 }}>
              <span className="card-title" style={{ color: "var(--color-text-2)" }}>
                Past Events ({pastEvents.length})
              </span>
              <button
                className="button"
                type="button"
                onClick={() => setIsPastExpanded((prev) => !prev)}
                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
              >
                {isPastExpanded ? "Hide" : "Show"}
              </button>
            </div>
            {isPastExpanded && pastEvents.map((entry) => renderEventCard(entry, true))}
          </>
        )}
      </div>
    </>
  );
}

export default EventsClient;

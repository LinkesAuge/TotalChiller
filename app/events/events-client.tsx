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
import QuickActions from "../components/quick-actions";
import SectionHero from "../components/section-hero";

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

const WEEKDAY_LABELS: readonly string[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string): Date | null {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function getDateRangeKeys(startIso: string, endIso: string): readonly string[] {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [];
  }
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const limit = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const keys: string[] = [];
  let guard = 0;
  while (cursor <= limit && guard < 120) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return keys;
}

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
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => toDateKey(new Date()));

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

  const todayKey = toDateKey(new Date());

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, EventRow[]>();
    for (const entry of events) {
      const keys = getDateRangeKeys(entry.starts_at, entry.ends_at);
      keys.forEach((dateKey) => {
        const bucket = grouped.get(dateKey) ?? [];
        bucket.push(entry);
        grouped.set(dateKey, bucket);
      });
    }
    grouped.forEach((bucket) => {
      bucket.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    });
    return grouped;
  }, [events]);

  const calendarDays = useMemo(() => {
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const monthOffset = (monthStart.getDay() + 6) % 7;
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - monthOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + index);
      const dateKey = toDateKey(cellDate);
      return {
        date: cellDate,
        key: dateKey,
        isCurrentMonth: cellDate.getMonth() === calendarMonth.getMonth(),
        isToday: dateKey === todayKey,
        events: eventsByDate.get(dateKey) ?? [],
      };
    });
  }, [calendarMonth, eventsByDate, todayKey]);

  const selectedDate = useMemo(() => parseDateKey(selectedDateKey), [selectedDateKey]);
  const selectedDayEvents = eventsByDate.get(selectedDateKey) ?? [];

  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    : selectedDateKey;

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
    const isNewEvent = !editingId;
    const { data: insertedData, error } = editingId
      ? await supabase.from("events").update(payload).eq("id", editingId).select("id").maybeSingle()
      : await supabase.from("events").insert(payload).select("id").single();
    setIsSaving(false);
    if (error) {
      pushToast(`Failed to save event: ${error.message}`);
      return;
    }
    if (isNewEvent && insertedData?.id) {
      void fetch("/api/notifications/fan-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "event",
          reference_id: insertedData.id as string,
          clan_id: clanContext.clanId,
          title: `New event: ${parsed.data.title}`,
          body: parsed.data.description?.slice(0, 100) ?? null,
        }),
      });
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

  function shiftCalendarMonth(offset: number): void {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function jumpToToday(): void {
    const now = new Date();
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateKey(toDateKey(now));
  }

  /* ── Render a single event card ── */

  function renderEventCard(entry: EventRow, isPast: boolean): JSX.Element {
    return (
      <section
        className="card"
        key={entry.id}
        style={{
          gridColumn: "1 / -1",
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
      {/* ── Top Bar ── */}
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" width={1200} height={56} loading="eager" />
        <div className="top-bar-inner">
          <div>
            <div className="top-bar-breadcrumb">The Chillers &bull; Events</div>
            <h1 className="top-bar-title">Clan Events</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!isFormOpen && (
              <button className="button primary" type="button" onClick={handleOpenCreate}>
                Create Event
              </button>
            )}
            <AuthActions />
          </div>
        </div>
      </div>
      <QuickActions />
      <SectionHero
        title="Events Calendar"
        subtitle="Plan coordination, attendance, and event timings in one place."
        bannerSrc="/assets/banners/banner_ragnarok_clan_event_708x123.png"
      />

      <div className="content-inner">
      <div className="grid">
        <ClanScopeBanner />

        {/* ── Calendar overview ── */}
        {!isLoading && (
          <section className="card event-calendar-card" style={{ gridColumn: "1 / -1" }}>
            <div className="tooltip-head">
              <img src="/assets/vip/back_tooltip_2.png" alt="" className="tooltip-head-bg" width={400} height={44} loading="lazy" />
              <div className="tooltip-head-inner">
                <img src="/assets/vip/batler_icons_stat_armor.png" alt="Calendar overview" width={18} height={18} loading="lazy" />
                <h3 className="card-title">Monthly Overview</h3>
                <span className="pin-badge">{events.length} total events</span>
              </div>
            </div>
            <div className="event-calendar-body">
              <img src="/assets/vip/backs_21.png" alt="" className="event-calendar-bg" width={800} height={600} loading="lazy" />
              <div className="event-calendar-layout">
                <div>
                  <div className="calendar-toolbar">
                    <div className="calendar-nav">
                      <button className="button" type="button" onClick={() => shiftCalendarMonth(-1)}>
                        Prev
                      </button>
                      <div className="calendar-month-label">
                        {calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </div>
                      <button className="button" type="button" onClick={() => shiftCalendarMonth(1)}>
                        Next
                      </button>
                    </div>
                    <button className="button" type="button" onClick={jumpToToday}>
                      Today
                    </button>
                  </div>

                  <div className="event-calendar-grid">
                    {WEEKDAY_LABELS.map((weekday) => (
                      <div key={weekday} className="calendar-weekday">{weekday}</div>
                    ))}
                    {calendarDays.map((day) => (
                      <button
                        key={day.key}
                        type="button"
                        className={[
                          "calendar-day-cell",
                          day.isCurrentMonth ? "" : "muted",
                          day.key === selectedDateKey ? "selected" : "",
                          day.isToday ? "today" : "",
                        ].filter(Boolean).join(" ")}
                        onClick={() => {
                          setSelectedDateKey(day.key);
                          if (!day.isCurrentMonth) {
                            setCalendarMonth(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
                          }
                        }}
                      >
                        <span className="calendar-day-number">{day.date.getDate()}</span>
                        {day.events.length > 0 && (
                          <span className="calendar-day-count">{day.events.length}</span>
                        )}
                        <span className="calendar-day-dots">
                          {day.events.slice(0, 3).map((entry, index) => (
                            <span
                              key={`${day.key}-${entry.id}`}
                              className="calendar-dot"
                              style={{
                                background: ["#c9a34a", "#4a6ea0", "#4a9960", "#c94a3a"][index % 4],
                              }}
                            />
                          ))}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <aside className="calendar-day-panel">
                  <div className="card-title" style={{ marginBottom: 6 }}>Selected Day</div>
                  <div className="card-subtitle" style={{ marginTop: 0 }}>{selectedDateLabel}</div>
                  {selectedDayEvents.length === 0 ? (
                    <div className="text-muted" style={{ marginTop: 12, fontSize: "0.85rem" }}>
                      No events on this day.
                    </div>
                  ) : (
                    <div className="calendar-day-events">
                      {selectedDayEvents.map((entry) => (
                        <article key={`calendar-${entry.id}`} className="calendar-day-event">
                          <div className="calendar-day-event-title">{entry.title}</div>
                          <div className="calendar-day-event-time">
                            {formatGermanDateTime(entry.starts_at)} → {formatGermanDateTime(entry.ends_at)}
                          </div>
                          {entry.location && <div className="calendar-day-event-location">{entry.location}</div>}
                          <button className="button" type="button" onClick={() => handleEditEvent(entry)}>
                            Edit Event
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </aside>
              </div>
            </div>
          </section>
        )}

        {/* ── Create / Edit Form (collapsible) ── */}
        {isFormOpen && (
          <section className="card" style={{ gridColumn: "1 / -1" }}>
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
          <div className="alert info loading" style={{ gridColumn: "1 / -1" }}>
            Loading events…
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && events.length === 0 && (
          <section className="card" style={{ gridColumn: "1 / -1" }}>
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
            <div className="card-title" style={{ gridColumn: "1 / -1" }}>
              Upcoming Events ({upcomingEvents.length})
            </div>
            {upcomingEvents.map((entry) => renderEventCard(entry, false))}
          </>
        )}

        {/* ── Past events (collapsible) ── */}
        {!isLoading && pastEvents.length > 0 && (
          <>
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 12 }}>
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
      </div>
    </>
  );
}

export default EventsClient;

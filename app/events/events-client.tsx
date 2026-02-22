"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import PageShell from "../components/page-shell";
import { EventDeleteModal } from "./event-modals";
import { EventsList } from "./events-list";
import { EventsForm } from "./events-form";
import { useEvents } from "./use-events";

const ManageEventTypes = dynamic(() => import("./manage-event-types").then((mod) => mod.ManageEventTypes));
const PastEventsList = dynamic(() => import("./past-events-list").then((mod) => mod.PastEventsList));

/**
 * Full events client component with CRUD, event types, role-gating, calendar, and past/upcoming.
 * Orchestrates useEvents hook, EventsList, EventsForm, ManageEventTypes, PastEventsList, and modals.
 */
function EventsClient(): JSX.Element {
  const t = useTranslations("events");
  const eventsState = useEvents();

  const {
    isLoading,
    pastEvents,
    isPastExpanded,
    setIsPastExpanded,
    eventTypes,
    deleteEventId,
    setDeleteEventId,
    confirmDeleteEvent,
    handleEditEventById,
    requestDeleteEvent,
    canManage,
    locale,
    t: tFn,
    supabase,
    currentUserId,
  } = eventsState;

  return (
    <>
      <PageShell
        breadcrumb={t("breadcrumb")}
        title={t("title")}
        heroTitle={t("heroTitle")}
        heroSubtitle={t("heroSubtitle")}
        bannerSrc="/assets/banners/banner_ragnarok_clan_event_708x123.png"
      >
        <div className="grid">
          <EventsList eventsState={eventsState} />

          <EventsForm eventsState={eventsState} />

          {eventsState.isEventTypesOpen ? (
            <ManageEventTypes
              isOpen={eventsState.isEventTypesOpen}
              eventTypes={eventTypes}
              canManage={canManage}
              clanId={eventsState.clanId}
              onReload={eventsState.reloadEventTypes}
              t={tFn}
              supabase={supabase}
              userId={currentUserId}
            />
          ) : null}

          {!isLoading && pastEvents.length > 0 && (
            <PastEventsList
              pastEvents={pastEvents}
              isExpanded={isPastExpanded}
              onToggleExpand={() => setIsPastExpanded((prev) => !prev)}
              onEditEvent={handleEditEventById}
              onDeleteEvent={requestDeleteEvent}
              canManage={canManage}
              locale={locale}
              t={tFn}
            />
          )}
        </div>
      </PageShell>

      <EventDeleteModal
        isOpen={Boolean(deleteEventId)}
        onConfirm={confirmDeleteEvent}
        onCancel={() => setDeleteEventId("")}
        t={tFn}
      />
    </>
  );
}

export default EventsClient;

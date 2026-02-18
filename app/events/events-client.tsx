"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import PageShell from "../components/page-shell";
import { EventDeleteModal, TemplateDeleteModal } from "./event-modals";
import { EventsList } from "./events-list";
import { EventsForm } from "./events-form";
import { useEvents } from "./use-events";

const ManageTemplates = dynamic(() => import("./manage-templates").then((mod) => mod.ManageTemplates));
const PastEventsList = dynamic(() => import("./past-events-list").then((mod) => mod.PastEventsList));

/**
 * Full events client component with CRUD, templates, role-gating, calendar, and past/upcoming.
 * Orchestrates useEvents hook, EventsList, EventsForm, ManageTemplates, PastEventsList, and modals.
 */
function EventsClient(): JSX.Element {
  const t = useTranslations("events");
  const eventsState = useEvents();

  const {
    isLoading,
    pastEvents,
    isPastExpanded,
    setIsPastExpanded,
    events,
    templates,
    editingTemplateId,
    editTplTitle,
    editTplDesc,
    editTplLocation,
    editTplDurationH,
    editTplDurationM,
    editTplOpenEnded,
    editTplOrganizer,
    editTplRecurrence,
    editTplRecurrenceEnd,
    editTplRecurrenceOngoing,
    handleStartEditTemplate,
    handleCancelEditTemplate,
    handleSaveEditedTemplate,
    requestDeleteTemplate,
    confirmDeleteTemplate,
    closeDeleteTemplateModal,
    deleteEventId,
    deleteTemplateId,
    deleteTemplateName,
    deleteTemplateInput,
    isDeleteTemplateStep2,
    setDeleteEventId,
    setDeleteTemplateInput,
    setIsDeleteTemplateStep2,
    setEditTplTitle,
    setEditTplDesc,
    setEditTplLocation,
    setEditTplDurationH,
    setEditTplDurationM,
    setEditTplOpenEnded,
    setEditTplOrganizer,
    setEditTplRecurrence,
    setEditTplRecurrenceEnd,
    setEditTplRecurrenceOngoing,
    confirmDeleteEvent,
    handleEditEventById,
    requestDeleteEvent,
    handleSaveEventAsTemplate,
    isSavingTemplate,
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

          {eventsState.isTemplatesOpen ? (
            <ManageTemplates
              isTemplatesOpen={eventsState.isTemplatesOpen}
              templates={templates}
              editingTemplateId={editingTemplateId}
              editTplTitle={editTplTitle}
              editTplDescription={editTplDesc}
              editTplLocation={editTplLocation}
              editTplDurationH={editTplDurationH}
              editTplDurationM={editTplDurationM}
              editTplOpenEnded={editTplOpenEnded}
              editTplOrganizer={editTplOrganizer}
              editTplRecurrence={editTplRecurrence}
              editTplRecurrenceEnd={editTplRecurrenceEnd}
              editTplRecurrenceOngoing={editTplRecurrenceOngoing}
              onStartEdit={handleStartEditTemplate}
              onEditTplTitleChange={setEditTplTitle}
              onEditTplDescChange={setEditTplDesc}
              onEditTplLocationChange={setEditTplLocation}
              onEditTplDurationHChange={setEditTplDurationH}
              onEditTplDurationMChange={setEditTplDurationM}
              onEditTplOpenEndedChange={setEditTplOpenEnded}
              onEditTplOrganizerChange={setEditTplOrganizer}
              onEditTplRecurrenceChange={setEditTplRecurrence}
              onEditTplRecurrenceEndChange={setEditTplRecurrenceEnd}
              onEditTplRecurrenceOngoingChange={setEditTplRecurrenceOngoing}
              onCancelEdit={handleCancelEditTemplate}
              onSaveEdit={handleSaveEditedTemplate}
              onRequestDelete={requestDeleteTemplate}
              isSavingTemplate={isSavingTemplate}
              canManage={canManage}
              t={tFn}
              supabase={supabase}
              userId={currentUserId}
            />
          ) : null}

          {!isLoading && pastEvents.length > 0 && (
            <PastEventsList
              pastEvents={pastEvents}
              sourceEvents={events}
              isExpanded={isPastExpanded}
              onToggleExpand={() => setIsPastExpanded((prev) => !prev)}
              onEditEvent={handleEditEventById}
              onDeleteEvent={requestDeleteEvent}
              onSaveAsTemplate={handleSaveEventAsTemplate}
              isSavingTemplate={isSavingTemplate}
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

      <TemplateDeleteModal
        isOpen={Boolean(deleteTemplateId)}
        isStep2={isDeleteTemplateStep2}
        templateName={deleteTemplateName}
        deleteInput={deleteTemplateInput}
        onInputChange={setDeleteTemplateInput}
        onConfirm={confirmDeleteTemplate}
        onCancel={closeDeleteTemplateModal}
        onContinueToStep2={() => setIsDeleteTemplateStep2(true)}
        t={tFn}
      />
    </>
  );
}

export default EventsClient;

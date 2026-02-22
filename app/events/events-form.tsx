"use client";

import dynamic from "next/dynamic";
import GameButton from "../components/ui/game-button";
import type { UseEventsResult } from "./use-events";

const EventForm = dynamic(() => import("./event-form").then((mod) => mod.EventForm));

export interface EventsFormProps {
  readonly eventsState: UseEventsResult;
}

/**
 * Container component for the event creation/editing form section.
 * Renders the Create Event button, Manage Event Types toggle, and the EventForm.
 */
export function EventsForm({ eventsState }: EventsFormProps): JSX.Element {
  const {
    canManage,
    isFormOpen,
    eventFormRef,
    editingId,
    title,
    description,
    location,
    startsAt,
    durationH,
    durationM,
    isOpenEnded,
    endsAt,
    organizer,
    recurrenceType,
    recurrenceEndDate,
    recurrenceOngoing,
    bannerUrl,
    eventTypeId,
    isBannerUploading,
    bannerFileRef,
    setTitle,
    setDescription,
    setLocation,
    setStartsAt,
    setDurationH,
    setDurationM,
    setIsOpenEnded,
    setEndsAt,
    setOrganizer,
    setRecurrenceType,
    setRecurrenceEndDate,
    setRecurrenceOngoing,
    setBannerUrl,
    handleBannerUpload,
    applyEventType,
    handleSubmit,
    resetForm,
    requestDeleteEvent,
    isSaving,
    gameAccounts,
    eventTypeOptions,
    currentUserId,
  } = eventsState;

  return (
    <>
      {canManage && (
        <div className="col-span-full flex items-center gap-2.5 flex-wrap">
          {!isFormOpen && (
            <GameButton variant="ornate2" fontSize="0.62rem" onClick={eventsState.handleOpenCreate}>
              {eventsState.t("createEvent")}
            </GameButton>
          )}
          <button
            className="button text-[0.82rem]"
            type="button"
            onClick={() => eventsState.setIsEventTypesOpen((prev) => !prev)}
          >
            {eventsState.t("manageEventTypes")} {eventsState.isEventTypesOpen ? "▲" : "▼"}
          </button>
        </div>
      )}

      {isFormOpen && canManage ? (
        <EventForm
          isFormOpen={isFormOpen}
          formRef={eventFormRef}
          editingId={editingId}
          title={title}
          description={description}
          location={location}
          startsAt={startsAt}
          durationH={durationH}
          durationM={durationM}
          isOpenEnded={isOpenEnded}
          endsAt={endsAt}
          organizer={organizer}
          recurrenceType={recurrenceType}
          recurrenceEndDate={recurrenceEndDate}
          recurrenceOngoing={recurrenceOngoing}
          bannerUrl={bannerUrl}
          eventTypeId={eventTypeId}
          eventTypeOptions={eventTypeOptions}
          isBannerUploading={isBannerUploading}
          bannerFileRef={bannerFileRef}
          onBannerUrlChange={setBannerUrl}
          onEventTypeChange={applyEventType}
          onBannerUpload={handleBannerUpload}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onLocationChange={setLocation}
          onStartsAtChange={setStartsAt}
          onDurationHChange={setDurationH}
          onDurationMChange={setDurationM}
          onOpenEndedChange={setIsOpenEnded}
          onEndsAtChange={setEndsAt}
          onOrganizerChange={setOrganizer}
          onRecurrenceTypeChange={setRecurrenceType}
          onRecurrenceEndDateChange={setRecurrenceEndDate}
          onRecurrenceOngoingChange={setRecurrenceOngoing}
          onSubmit={handleSubmit}
          onCancel={resetForm}
          onDelete={() => {
            requestDeleteEvent(editingId);
            resetForm();
          }}
          isSaving={isSaving}
          canManage={canManage}
          gameAccounts={gameAccounts}
          locale={eventsState.locale}
          t={eventsState.t}
          supabase={eventsState.supabase}
          userId={currentUserId}
        />
      ) : null}
    </>
  );
}

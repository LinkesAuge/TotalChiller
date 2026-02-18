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
 * Renders the Create Event button, Manage Templates toggle, and the EventForm
 * with all state and handlers from the useEvents hook.
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
    selectedTemplate,
    bannerUrl,
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
    applyTemplate,
    handleSubmit,
    resetForm,
    handleSaveFormAsTemplate,
    requestDeleteEvent,
    isSaving,
    isSavingTemplate,
    gameAccounts,
    templateOptions,
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
            onClick={() => eventsState.setIsTemplatesOpen((prev) => !prev)}
          >
            {eventsState.t("manageTemplates")} {eventsState.isTemplatesOpen ? "▲" : "▼"}
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
          selectedTemplate={selectedTemplate}
          bannerUrl={bannerUrl}
          isBannerUploading={isBannerUploading}
          bannerFileRef={bannerFileRef}
          onBannerUrlChange={setBannerUrl}
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
          onTemplateSelect={applyTemplate}
          onSubmit={handleSubmit}
          onCancel={resetForm}
          onSaveAsTemplate={handleSaveFormAsTemplate}
          onDelete={() => {
            requestDeleteEvent(editingId);
            resetForm();
          }}
          isSaving={isSaving}
          isSavingTemplate={isSavingTemplate}
          canManage={canManage}
          gameAccounts={gameAccounts}
          templateOptions={templateOptions}
          locale={eventsState.locale}
          t={eventsState.t}
          supabase={eventsState.supabase}
          userId={currentUserId}
        />
      ) : null}
    </>
  );
}

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createMockSupabase, createChainableMock } from "@/test/mocks/supabase";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));

vi.mock("@/lib/supabase/error-utils", () => ({
  classifySupabaseError: vi.fn(() => "unknown"),
  getErrorMessageKey: vi.fn(() => "genericError"),
}));

vi.mock("@/lib/forum-thread-sync", () => ({
  createLinkedForumPost: vi.fn().mockResolvedValue({ forumPostId: null, error: null }),
}));

vi.mock("@/lib/hooks/use-banner-upload", () => ({
  useBannerUpload: vi.fn(() => ({
    handleBannerUpload: vi.fn(),
    isBannerUploading: false,
  })),
}));

import { useEventsForm, type UseEventsFormParams } from "./use-events-form";
import type { EventRow, TemplateRow } from "./events-types";

let mockSupabase: ReturnType<typeof createMockSupabase>;

function makeParams(overrides?: Partial<UseEventsFormParams>): UseEventsFormParams {
  return {
    supabase: mockSupabase.supabase,
    clanId: "clan-1",
    currentUserId: "user-1",
    events: [],
    templates: [],
    pushToast: vi.fn(),
    t: vi.fn((key: string) => key),
    reloadEvents: vi.fn().mockResolvedValue(undefined),
    reloadTemplates: vi.fn().mockResolvedValue(undefined),
    setEvents: vi.fn(),
    ...overrides,
  };
}

const MOCK_EVENT: EventRow = {
  id: "evt-1",
  title: "Test Event",
  description: "A test event",
  location: "Online",
  starts_at: new Date(Date.now() + 86400000).toISOString(),
  ends_at: new Date(Date.now() + 90000000).toISOString(),
  created_at: new Date().toISOString(),
  updated_at: null,
  created_by: "user-1",
  organizer: "Org1",
  recurrence_type: "none",
  recurrence_end_date: null,
  banner_url: null,
  is_pinned: false,
  forum_post_id: null,
  author_name: "TestUser",
};

const MOCK_TEMPLATE: TemplateRow = {
  id: "tpl-1",
  title: "Template Event",
  description: "Template desc",
  location: "HQ",
  duration_hours: 2,
  is_open_ended: false,
  organizer: "OrgTpl",
  recurrence_type: "weekly",
  recurrence_end_date: "2026-12-31",
  banner_url: "https://example.com/banner.png",
};

describe("useEventsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
  });

  it("starts with default form state", () => {
    const params = makeParams();
    const { result } = renderHook(() => useEventsForm(params));

    expect(result.current.isFormOpen).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.editingId).toBe("");
    expect(result.current.title).toBe("");
    expect(result.current.isOpenEnded).toBe(true);
    expect(result.current.recurrenceType).toBe("none");
  });

  it("opens create form and scrolls", () => {
    const params = makeParams();
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.handleOpenCreate();
    });

    expect(result.current.isFormOpen).toBe(true);
    expect(result.current.editingId).toBe("");
  });

  it("applies a template to the form", () => {
    const params = makeParams({ templates: [MOCK_TEMPLATE] });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.applyTemplate("tpl-1");
    });

    expect(result.current.title).toBe("Template Event");
    expect(result.current.description).toBe("Template desc");
    expect(result.current.location).toBe("HQ");
    expect(result.current.organizer).toBe("OrgTpl");
    expect(result.current.bannerUrl).toBe("https://example.com/banner.png");
    expect(result.current.selectedTemplate).toBe("tpl-1");
  });

  it("ignores template apply when value is 'none'", () => {
    const params = makeParams({ templates: [MOCK_TEMPLATE] });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.applyTemplate("tpl-1");
    });
    act(() => {
      result.current.applyTemplate("none");
    });

    expect(result.current.title).toBe("Template Event");
  });

  it("resets form state", () => {
    const params = makeParams({ templates: [MOCK_TEMPLATE] });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.handleOpenCreate();
      result.current.applyTemplate("tpl-1");
    });

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.isFormOpen).toBe(false);
    expect(result.current.title).toBe("");
    expect(result.current.editingId).toBe("");
  });

  it("populates form when editing an event", () => {
    const params = makeParams({ events: [MOCK_EVENT] });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.handleEditEventById("evt-1");
    });

    expect(result.current.isFormOpen).toBe(true);
    expect(result.current.editingId).toBe("evt-1");
    expect(result.current.title).toBe("Test Event");
    expect(result.current.description).toBe("A test event");
    expect(result.current.location).toBe("Online");
  });

  it("does nothing when editing non-existent event", () => {
    const params = makeParams({ events: [MOCK_EVENT] });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.handleEditEventById("nonexistent");
    });

    expect(result.current.isFormOpen).toBe(false);
    expect(result.current.editingId).toBe("");
  });

  it("shows toast when submitting without clanId", async () => {
    const pushToast = vi.fn();
    const params = makeParams({ clanId: undefined, pushToast });
    const { result } = renderHook(() => useEventsForm(params));

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;

    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(pushToast).toHaveBeenCalledWith("selectClanFirst");
  });

  it("creates a new event successfully", async () => {
    const pushToast = vi.fn();
    const reloadEvents = vi.fn().mockResolvedValue(undefined);
    const insertChain = createChainableMock({
      data: { id: "new-evt-1" },
      error: null,
    });
    mockSupabase.mockFrom.mockReturnValue(insertChain);

    const params = makeParams({ pushToast, reloadEvents });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.setTitle("New Event");
      result.current.setDescription("Description");
      result.current.setStartsAt("2026-06-15T10:00");
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(pushToast).toHaveBeenCalledWith("eventCreated");
    expect(reloadEvents).toHaveBeenCalled();
  });

  it("handles delete event", async () => {
    const pushToast = vi.fn();
    const setEvents = vi.fn();
    const deleteChain = createChainableMock({
      data: [{ id: "evt-1" }],
      error: null,
    });
    mockSupabase.mockFrom.mockReturnValue(deleteChain);

    const params = makeParams({ pushToast, setEvents });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.requestDeleteEvent("evt-1");
    });

    expect(result.current.deleteEventId).toBe("evt-1");

    await act(async () => {
      await result.current.confirmDeleteEvent();
    });

    expect(pushToast).toHaveBeenCalledWith("eventDeleted");
    expect(setEvents).toHaveBeenCalled();
  });

  it("handles toggle pin", async () => {
    const reloadEvents = vi.fn().mockResolvedValue(undefined);
    const pinChain = createChainableMock({ data: null, error: null });
    mockSupabase.mockFrom.mockReturnValue(pinChain);

    const params = makeParams({ reloadEvents });
    const { result } = renderHook(() => useEventsForm(params));

    await act(async () => {
      await result.current.handleTogglePin("evt-1", false);
    });

    expect(reloadEvents).toHaveBeenCalled();
  });

  it("generates template options including 'none'", () => {
    const params = makeParams({ templates: [MOCK_TEMPLATE] });
    const { result } = renderHook(() => useEventsForm(params));

    expect(result.current.templateOptions).toEqual([
      { value: "none", label: "templateNone" },
      { value: "tpl-1", label: "Template Event" },
    ]);
  });

  it("shows toast when form validation fails (empty title)", async () => {
    const pushToast = vi.fn();
    const params = makeParams({ pushToast });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.setDescription("Some desc");
      result.current.setStartsAt("2026-06-15T10:00");
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(pushToast).toHaveBeenCalledWith("checkFormValues");
  });

  it("shows toast when recurrence is set but no end date", async () => {
    const pushToast = vi.fn();
    const params = makeParams({ pushToast });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.setTitle("Recurring");
      result.current.setDescription("Desc");
      result.current.setStartsAt("2026-06-15T10:00");
      result.current.setRecurrenceType("weekly");
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(pushToast).toHaveBeenCalledWith("recurrenceRequired");
  });

  it("shows toast when user is not logged in during submit", async () => {
    const pushToast = vi.fn();
    mockSupabase = createMockSupabase({ authUser: null });
    const insertChain = createChainableMock({ data: { id: "new-evt" }, error: null });
    mockSupabase.mockFrom.mockReturnValue(insertChain);

    const params = makeParams({ pushToast, supabase: mockSupabase.supabase });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.setTitle("Event");
      result.current.setDescription("Desc");
      result.current.setStartsAt("2026-06-15T10:00");
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(pushToast).toHaveBeenCalledWith("mustBeLoggedIn");
  });

  it("shows error toast when event insert fails", async () => {
    const pushToast = vi.fn();
    const insertChain = createChainableMock({
      data: null,
      error: { message: "insert error", code: "500" },
    });
    mockSupabase.mockFrom.mockReturnValue(insertChain);

    const params = makeParams({ pushToast });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.setTitle("Event");
      result.current.setDescription("Desc");
      result.current.setStartsAt("2026-06-15T10:00");
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(pushToast).toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
  });

  it("updates an existing event", async () => {
    const pushToast = vi.fn();
    const reloadEvents = vi.fn().mockResolvedValue(undefined);
    const updateChain = createChainableMock({
      data: { id: "evt-1" },
      error: null,
    });
    mockSupabase.mockFrom.mockReturnValue(updateChain);

    const params = makeParams({ pushToast, reloadEvents, events: [MOCK_EVENT] });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.handleEditEventById("evt-1");
    });

    act(() => {
      result.current.setTitle("Updated Title");
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(pushToast).toHaveBeenCalledWith("eventUpdated");
    expect(reloadEvents).toHaveBeenCalled();
  });

  it("submits with endsAt when duration is multi-day", async () => {
    const pushToast = vi.fn();
    const reloadEvents = vi.fn().mockResolvedValue(undefined);
    const insertChain = createChainableMock({
      data: { id: "new-evt" },
      error: null,
    });
    mockSupabase.mockFrom.mockReturnValue(insertChain);

    const params = makeParams({ pushToast, reloadEvents });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.setTitle("Multi Day");
      result.current.setDescription("Desc");
      result.current.setStartsAt("2026-06-15T10:00");
      result.current.setIsOpenEnded(false);
      result.current.setEndsAt("2026-06-17T18:00");
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(pushToast).toHaveBeenCalledWith("eventCreated");
  });

  it("computes end time from duration hours+minutes", async () => {
    const pushToast = vi.fn();
    const reloadEvents = vi.fn().mockResolvedValue(undefined);
    const insertChain = createChainableMock({
      data: { id: "new-evt" },
      error: null,
    });
    mockSupabase.mockFrom.mockReturnValue(insertChain);

    const params = makeParams({ pushToast, reloadEvents });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.setTitle("Duration Event");
      result.current.setDescription("Desc");
      result.current.setStartsAt("2026-06-15T10:00");
      result.current.setIsOpenEnded(false);
      result.current.setDurationH("2");
      result.current.setDurationM("30");
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(pushToast).toHaveBeenCalledWith("eventCreated");
  });

  it("does nothing on confirmDeleteEvent when deleteEventId is empty", async () => {
    const pushToast = vi.fn();
    const setEvents = vi.fn();
    const params = makeParams({ pushToast, setEvents });
    const { result } = renderHook(() => useEventsForm(params));

    await act(async () => {
      await result.current.confirmDeleteEvent();
    });

    expect(pushToast).not.toHaveBeenCalled();
    expect(setEvents).not.toHaveBeenCalled();
  });

  it("shows error toast when delete returns empty data", async () => {
    const pushToast = vi.fn();
    const deleteChain = createChainableMock({ data: [], error: null });
    mockSupabase.mockFrom.mockReturnValue(deleteChain);

    const params = makeParams({ pushToast });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.requestDeleteEvent("evt-1");
    });

    await act(async () => {
      await result.current.confirmDeleteEvent();
    });

    expect(pushToast).toHaveBeenCalledWith("deleteFailed");
  });

  it("shows error toast when delete DB call fails", async () => {
    const pushToast = vi.fn();
    const deleteChain = createChainableMock({
      data: null,
      error: { message: "delete error", code: "500" },
    });
    mockSupabase.mockFrom.mockReturnValue(deleteChain);

    const params = makeParams({ pushToast });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.requestDeleteEvent("evt-1");
    });

    await act(async () => {
      await result.current.confirmDeleteEvent();
    });

    expect(pushToast).toHaveBeenCalled();
  });

  it("shows error toast when pin toggle fails", async () => {
    const pushToast = vi.fn();
    const pinChain = createChainableMock({ data: null, error: { message: "pin error" } });
    mockSupabase.mockFrom.mockReturnValue(pinChain);

    const params = makeParams({ pushToast });
    const { result } = renderHook(() => useEventsForm(params));

    await act(async () => {
      await result.current.handleTogglePin("evt-1", true);
    });

    expect(pushToast).toHaveBeenCalledWith("pinFailed");
  });

  it("saves form as template", async () => {
    const pushToast = vi.fn();
    const reloadTemplates = vi.fn().mockResolvedValue(undefined);
    const templateChain = createChainableMock({ data: null, error: null });
    mockSupabase.mockFrom.mockReturnValue(templateChain);

    const params = makeParams({ pushToast, reloadTemplates });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.setTitle("Template Title");
      result.current.setDescription("Template Desc");
    });

    await act(async () => {
      await result.current.handleSaveFormAsTemplate();
    });

    expect(pushToast).toHaveBeenCalledWith("templateSaved");
    expect(reloadTemplates).toHaveBeenCalled();
  });

  it("shows toast when saving template with empty title", async () => {
    const pushToast = vi.fn();
    const params = makeParams({ pushToast });
    const { result } = renderHook(() => useEventsForm(params));

    await act(async () => {
      await result.current.handleSaveFormAsTemplate();
    });

    expect(pushToast).toHaveBeenCalledWith("checkFormValues");
  });

  it("does nothing when saving template without clanId", async () => {
    const pushToast = vi.fn();
    const params = makeParams({ pushToast, clanId: undefined });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.setTitle("Template");
    });

    await act(async () => {
      await result.current.handleSaveFormAsTemplate();
    });

    expect(pushToast).not.toHaveBeenCalled();
  });

  it("shows error toast when template save fails", async () => {
    const pushToast = vi.fn();
    const templateChain = createChainableMock({
      data: null,
      error: { message: "template error", code: "500" },
    });
    mockSupabase.mockFrom.mockReturnValue(templateChain);

    const params = makeParams({ pushToast });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.setTitle("Template Title");
    });

    await act(async () => {
      await result.current.handleSaveFormAsTemplate();
    });

    expect(pushToast).toHaveBeenCalled();
  });

  it("applies template with open_ended flag from template", () => {
    const openEndedTemplate: TemplateRow = {
      ...MOCK_TEMPLATE,
      id: "tpl-open",
      is_open_ended: true,
      duration_hours: 0,
      recurrence_type: "none",
      recurrence_end_date: null,
      banner_url: null,
    };
    const params = makeParams({ templates: [openEndedTemplate] });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.applyTemplate("tpl-open");
    });

    expect(result.current.isOpenEnded).toBe(true);
    expect(result.current.recurrenceType).toBe("none");
    expect(result.current.recurrenceOngoing).toBe(false);
  });

  it("applies template with recurrence ongoing (no end date)", () => {
    const ongoingTemplate: TemplateRow = {
      ...MOCK_TEMPLATE,
      id: "tpl-ongoing",
      recurrence_type: "daily",
      recurrence_end_date: null,
    };
    const params = makeParams({ templates: [ongoingTemplate] });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.applyTemplate("tpl-ongoing");
    });

    expect(result.current.recurrenceType).toBe("daily");
    expect(result.current.recurrenceOngoing).toBe(true);
  });

  it("edits an open-ended event", () => {
    const openEvent: EventRow = {
      ...MOCK_EVENT,
      id: "evt-open",
      ends_at: MOCK_EVENT.starts_at,
    };
    const params = makeParams({ events: [openEvent] });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.handleEditEventById("evt-open");
    });

    expect(result.current.isOpenEnded).toBe(true);
    expect(result.current.durationH).toBe("0");
  });

  it("edits a multi-day event (sets endsAt)", () => {
    const multiDayEvent: EventRow = {
      ...MOCK_EVENT,
      id: "evt-multi",
      starts_at: "2026-06-01T10:00:00.000Z",
      ends_at: "2026-06-03T18:00:00.000Z",
    };
    const params = makeParams({ events: [multiDayEvent] });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.handleEditEventById("evt-multi");
    });

    expect(result.current.isOpenEnded).toBe(false);
    expect(result.current.endsAt).not.toBe("");
  });

  it("submits with recurrenceOngoing=true (no end date)", async () => {
    const pushToast = vi.fn();
    const reloadEvents = vi.fn().mockResolvedValue(undefined);
    const insertChain = createChainableMock({ data: { id: "new-evt" }, error: null });
    mockSupabase.mockFrom.mockReturnValue(insertChain);

    const params = makeParams({ pushToast, reloadEvents });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.setTitle("Recurring Event");
      result.current.setDescription("Desc");
      result.current.setStartsAt("2026-06-15T10:00");
      result.current.setRecurrenceType("weekly");
      result.current.setRecurrenceOngoing(true);
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(pushToast).toHaveBeenCalledWith("eventCreated");
  });

  it("falls back to starts_at when duration is zero and not open ended", async () => {
    const pushToast = vi.fn();
    const reloadEvents = vi.fn().mockResolvedValue(undefined);
    const insertChain = createChainableMock({ data: { id: "new-evt" }, error: null });
    mockSupabase.mockFrom.mockReturnValue(insertChain);

    const params = makeParams({ pushToast, reloadEvents });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.setTitle("Zero Duration");
      result.current.setDescription("Desc");
      result.current.setStartsAt("2026-06-15T10:00");
      result.current.setIsOpenEnded(false);
      result.current.setDurationH("0");
      result.current.setDurationM("0");
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(pushToast).toHaveBeenCalledWith("eventCreated");
  });

  it("creates forum post on new event and links it", async () => {
    const { createLinkedForumPost } = await import("@/lib/forum-thread-sync");
    vi.mocked(createLinkedForumPost).mockResolvedValue({ forumPostId: "fp-123", error: null });

    const pushToast = vi.fn();
    const reloadEvents = vi.fn().mockResolvedValue(undefined);
    const insertChain = createChainableMock({ data: { id: "new-evt-fp" }, error: null });
    const updateChain = createChainableMock({ data: null, error: null });

    let fromCalls = 0;
    mockSupabase.mockFrom.mockImplementation(() => {
      fromCalls++;
      return fromCalls === 1 ? insertChain : updateChain;
    });

    const params = makeParams({ pushToast, reloadEvents });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.setTitle("Forum Event");
      result.current.setDescription("Description");
      result.current.setStartsAt("2026-06-15T10:00");
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(pushToast).toHaveBeenCalledWith("eventCreated");
    expect(createLinkedForumPost).toHaveBeenCalled();
  });

  it("shows toast when forum post creation fails", async () => {
    const { createLinkedForumPost } = await import("@/lib/forum-thread-sync");
    vi.mocked(createLinkedForumPost).mockResolvedValue({ forumPostId: null, error: "Forum error" });

    const pushToast = vi.fn();
    const reloadEvents = vi.fn().mockResolvedValue(undefined);
    const insertChain = createChainableMock({ data: { id: "new-evt-fail" }, error: null });
    mockSupabase.mockFrom.mockReturnValue(insertChain);

    const params = makeParams({ pushToast, reloadEvents });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.setTitle("Forum Fail Event");
      result.current.setDescription("Description");
      result.current.setStartsAt("2026-06-15T10:00");
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(pushToast).toHaveBeenCalledWith("forumThreadFailed");
  });

  it("edits a normal-duration event (sets durationH and durationM)", () => {
    const normalEvent: EventRow = {
      ...MOCK_EVENT,
      id: "evt-normal",
      starts_at: "2026-06-01T10:00:00.000Z",
      ends_at: "2026-06-01T12:30:00.000Z",
    };
    const params = makeParams({ events: [normalEvent] });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.handleEditEventById("evt-normal");
    });

    expect(result.current.isOpenEnded).toBe(false);
    expect(result.current.durationH).toBe("2");
    expect(result.current.durationM).toBe("30");
    expect(result.current.endsAt).toBe("");
  });

  it("edits event with recurrence and end date", () => {
    const recurringEvent: EventRow = {
      ...MOCK_EVENT,
      id: "evt-rec",
      recurrence_type: "weekly",
      recurrence_end_date: "2026-12-31",
    };
    const params = makeParams({ events: [recurringEvent] });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.handleEditEventById("evt-rec");
    });

    expect(result.current.recurrenceType).toBe("weekly");
    expect(result.current.recurrenceEndDate).toBe("2026-12-31");
    expect(result.current.recurrenceOngoing).toBe(false);
  });

  it("edits event with recurrence but no end date (ongoing)", () => {
    const ongoingEvent: EventRow = {
      ...MOCK_EVENT,
      id: "evt-ongoing",
      recurrence_type: "daily",
      recurrence_end_date: null,
    };
    const params = makeParams({ events: [ongoingEvent] });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.handleEditEventById("evt-ongoing");
    });

    expect(result.current.recurrenceType).toBe("daily");
    expect(result.current.recurrenceOngoing).toBe(true);
  });

  it("saves template with recurrence ongoing", async () => {
    const pushToast = vi.fn();
    const reloadTemplates = vi.fn().mockResolvedValue(undefined);
    const templateChain = createChainableMock({ data: null, error: null });
    mockSupabase.mockFrom.mockReturnValue(templateChain);

    const params = makeParams({ pushToast, reloadTemplates });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.setTitle("Ongoing Template");
      result.current.setRecurrenceType("daily");
      result.current.setRecurrenceOngoing(true);
      result.current.setRecurrenceEndDate("2026-12-31");
    });

    await act(async () => {
      await result.current.handleSaveFormAsTemplate();
    });

    expect(pushToast).toHaveBeenCalledWith("templateSaved");
  });

  it("applies template with no location (null)", () => {
    const noLocTemplate: TemplateRow = {
      ...MOCK_TEMPLATE,
      id: "tpl-noloc",
      location: null,
      organizer: null,
      banner_url: null,
    };
    const params = makeParams({ templates: [noLocTemplate] });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.applyTemplate("tpl-noloc");
    });

    expect(result.current.location).toBe("");
    expect(result.current.organizer).toBe("");
    expect(result.current.bannerUrl).toBe("");
  });

  it("ignores template apply for non-existent template id", () => {
    const params = makeParams({ templates: [MOCK_TEMPLATE] });
    const { result } = renderHook(() => useEventsForm(params));

    act(() => {
      result.current.applyTemplate("nonexistent-id");
    });

    expect(result.current.title).toBe("");
  });
});

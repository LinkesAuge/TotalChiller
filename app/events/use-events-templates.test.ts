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

import { useEventsTemplates, type UseEventsTemplatesParams } from "./use-events-templates";
import type { EventRow, TemplateRow } from "./events-types";

let mockSupabase: ReturnType<typeof createMockSupabase>;

function makeParams(overrides?: Partial<UseEventsTemplatesParams>): UseEventsTemplatesParams {
  return {
    supabase: mockSupabase.supabase,
    clanId: "clan-1",
    pushToast: vi.fn(),
    t: vi.fn((key: string) => key),
    reloadTemplates: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const MOCK_TEMPLATE: TemplateRow = {
  id: "tpl-1",
  title: "Template 1",
  description: "Desc",
  location: "HQ",
  duration_hours: 1.5,
  is_open_ended: false,
  organizer: "Org",
  recurrence_type: "weekly",
  recurrence_end_date: "2026-12-31",
  banner_url: "https://example.com/banner.png",
};

const MOCK_EVENT: EventRow = {
  id: "evt-1",
  title: "Event Title",
  description: "Event desc",
  location: "Online",
  starts_at: "2026-06-15T10:00:00Z",
  ends_at: "2026-06-15T12:00:00Z",
  created_at: "2026-06-01T00:00:00Z",
  updated_at: null,
  created_by: "user-1",
  organizer: "EventOrg",
  recurrence_type: "none",
  recurrence_end_date: null,
  banner_url: null,
  is_pinned: false,
  forum_post_id: null,
  author_name: "TestUser",
};

describe("useEventsTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
  });

  it("starts with default state", () => {
    const params = makeParams();
    const { result } = renderHook(() => useEventsTemplates(params));

    expect(result.current.isTemplatesOpen).toBe(false);
    expect(result.current.isSavingTemplate).toBe(false);
    expect(result.current.editingTemplateId).toBe("");
    expect(result.current.deleteTemplateId).toBe("");
  });

  it("saves an event as a template", async () => {
    const pushToast = vi.fn();
    const reloadTemplates = vi.fn().mockResolvedValue(undefined);
    const insertChain = createChainableMock({ data: null, error: null });
    mockSupabase.mockFrom.mockReturnValue(insertChain);

    const params = makeParams({ pushToast, reloadTemplates });
    const { result } = renderHook(() => useEventsTemplates(params));

    await act(async () => {
      await result.current.handleSaveEventAsTemplate(MOCK_EVENT);
    });

    expect(mockSupabase.mockFrom).toHaveBeenCalledWith("event_templates");
    expect(insertChain.insert).toHaveBeenCalled();
    expect(pushToast).toHaveBeenCalledWith("templateSaved");
    expect(reloadTemplates).toHaveBeenCalled();
  });

  it("shows error when save-as-template fails", async () => {
    const pushToast = vi.fn();
    const insertChain = createChainableMock({
      data: null,
      error: { message: "insert failed", code: "500", details: "", hint: "" },
    });
    mockSupabase.mockFrom.mockReturnValue(insertChain);

    const params = makeParams({ pushToast });
    const { result } = renderHook(() => useEventsTemplates(params));

    await act(async () => {
      await result.current.handleSaveEventAsTemplate(MOCK_EVENT);
    });

    expect(pushToast).toHaveBeenCalledWith("templateSaveFailed");
  });

  it("does nothing when saving event as template without clanId", async () => {
    const pushToast = vi.fn();
    const params = makeParams({ clanId: undefined, pushToast });
    const { result } = renderHook(() => useEventsTemplates(params));

    await act(async () => {
      await result.current.handleSaveEventAsTemplate(MOCK_EVENT);
    });

    expect(mockSupabase.mockFrom).not.toHaveBeenCalled();
  });

  it("starts editing a template", () => {
    const params = makeParams();
    const { result } = renderHook(() => useEventsTemplates(params));

    act(() => {
      result.current.handleStartEditTemplate(MOCK_TEMPLATE);
    });

    expect(result.current.editingTemplateId).toBe("tpl-1");
    expect(result.current.editTplTitle).toBe("Template 1");
    expect(result.current.editTplDesc).toBe("Desc");
    expect(result.current.editTplLocation).toBe("HQ");
    expect(result.current.editTplOrganizer).toBe("Org");
    expect(result.current.editTplDurationH).toBe("1");
    expect(result.current.editTplDurationM).toBe("30");
    expect(result.current.editTplOpenEnded).toBe(false);
    expect(result.current.editTplBannerUrl).toBe("https://example.com/banner.png");
  });

  it("cancels editing a template", () => {
    const params = makeParams();
    const { result } = renderHook(() => useEventsTemplates(params));

    act(() => {
      result.current.handleStartEditTemplate(MOCK_TEMPLATE);
    });
    act(() => {
      result.current.handleCancelEditTemplate();
    });

    expect(result.current.editingTemplateId).toBe("");
  });

  it("saves an edited template", async () => {
    const pushToast = vi.fn();
    const reloadTemplates = vi.fn().mockResolvedValue(undefined);
    const updateChain = createChainableMock({ data: null, error: null });
    mockSupabase.mockFrom.mockReturnValue(updateChain);

    const params = makeParams({ pushToast, reloadTemplates });
    const { result } = renderHook(() => useEventsTemplates(params));

    act(() => {
      result.current.handleStartEditTemplate(MOCK_TEMPLATE);
    });

    await act(async () => {
      await result.current.handleSaveEditedTemplate();
    });

    expect(mockSupabase.mockFrom).toHaveBeenCalledWith("event_templates");
    expect(updateChain.update).toHaveBeenCalled();
    expect(pushToast).toHaveBeenCalledWith("templateSaved");
    expect(reloadTemplates).toHaveBeenCalled();
    expect(result.current.editingTemplateId).toBe("");
  });

  it("validates title before saving edited template", async () => {
    const pushToast = vi.fn();
    const params = makeParams({ pushToast });
    const { result } = renderHook(() => useEventsTemplates(params));

    act(() => {
      result.current.handleStartEditTemplate({ ...MOCK_TEMPLATE, title: "" });
    });

    await act(async () => {
      await result.current.handleSaveEditedTemplate();
    });

    expect(pushToast).toHaveBeenCalledWith("checkFormValues");
  });

  it("requests and confirms template deletion", async () => {
    const pushToast = vi.fn();
    const reloadTemplates = vi.fn().mockResolvedValue(undefined);
    const deleteChain = createChainableMock({
      data: [{ id: "tpl-1" }],
      error: null,
    });
    mockSupabase.mockFrom.mockReturnValue(deleteChain);

    const params = makeParams({ pushToast, reloadTemplates });
    const { result } = renderHook(() => useEventsTemplates(params));

    act(() => {
      result.current.requestDeleteTemplate("tpl-1", "Template 1");
    });

    expect(result.current.deleteTemplateId).toBe("tpl-1");
    expect(result.current.deleteTemplateName).toBe("Template 1");

    await act(async () => {
      await result.current.confirmDeleteTemplate();
    });

    expect(pushToast).toHaveBeenCalledWith("templateDeleted");
    expect(reloadTemplates).toHaveBeenCalled();
    expect(result.current.deleteTemplateId).toBe("");
  });

  it("shows error when delete returns empty data", async () => {
    const pushToast = vi.fn();
    const deleteChain = createChainableMock({ data: [], error: null });
    mockSupabase.mockFrom.mockReturnValue(deleteChain);

    const params = makeParams({ pushToast });
    const { result } = renderHook(() => useEventsTemplates(params));

    act(() => {
      result.current.requestDeleteTemplate("tpl-1", "Template 1");
    });

    await act(async () => {
      await result.current.confirmDeleteTemplate();
    });

    expect(pushToast).toHaveBeenCalledWith("templateDeleteFailed");
  });

  it("closes delete template modal", () => {
    const params = makeParams();
    const { result } = renderHook(() => useEventsTemplates(params));

    act(() => {
      result.current.requestDeleteTemplate("tpl-1", "Template 1");
    });

    act(() => {
      result.current.closeDeleteTemplateModal();
    });

    expect(result.current.deleteTemplateId).toBe("");
    expect(result.current.deleteTemplateName).toBe("");
    expect(result.current.deleteTemplateInput).toBe("");
  });
});

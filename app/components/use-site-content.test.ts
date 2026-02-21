// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createMockSupabase } from "@/test/mocks/supabase";

let mockSupabase: ReturnType<typeof createMockSupabase>;

const stableT = vi.fn((key: string) => key);

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => stableT),
  useLocale: vi.fn(() => "de"),
}));

vi.mock("@/app/hooks/use-supabase", () => ({
  useSupabase: vi.fn(() => mockSupabase.supabase),
}));

vi.mock("@/app/hooks/use-auth", () => ({
  useAuth: vi.fn(() => ({ userId: "test-user", isAuthenticated: true, isLoading: false })),
}));

import { useSiteContent } from "./use-site-content";

const MOCK_CONTENT_ROWS = [
  {
    page: "about",
    section_key: "hero",
    field_key: "title",
    content_de: "Über uns",
    content_en: "About us",
  },
  {
    page: "about",
    section_key: "hero",
    field_key: "subtitle",
    content_de: "Untertitel DE",
    content_en: "Subtitle EN",
  },
];

const MOCK_LIST_ITEMS = [
  {
    id: "item-1",
    page: "about",
    section_key: "features",
    sort_order: 0,
    text_de: "Feature 1 DE",
    text_en: "Feature 1 EN",
    badge_de: "",
    badge_en: "",
    link_url: "",
    icon: "star",
    icon_type: "preset",
  },
  {
    id: "item-2",
    page: "about",
    section_key: "features",
    sort_order: 1,
    text_de: "Feature 2 DE",
    text_en: "Feature 2 EN",
    badge_de: "",
    badge_en: "",
    link_url: "",
    icon: "heart",
    icon_type: "preset",
  },
];

describe("useSiteContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();

    mockSupabase.mockRpc.mockResolvedValue({ data: false, error: null });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (typeof url === "string" && url.includes("/api/site-content") && !options?.method) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(MOCK_CONTENT_ROWS),
          });
        }
        if (typeof url === "string" && url.includes("/api/site-list-items") && !options?.method) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(MOCK_LIST_ITEMS),
          });
        }
        if (typeof url === "string" && url.includes("/api/site-content") && options?.method === "PATCH") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          });
        }
        if (typeof url === "string" && url.includes("/api/site-list-items") && options?.method === "PATCH") {
          const body = JSON.parse(options.body as string);
          if (body.action === "create") {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  item: {
                    id: "item-new",
                    page: "about",
                    section_key: body.section_key,
                    sort_order: 99,
                    text_de: body.text_de,
                    text_en: body.text_en,
                    badge_de: "",
                    badge_en: "",
                    link_url: "",
                    icon: "",
                    icon_type: "preset",
                  },
                }),
            });
          }
          if (body.action === "update") {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  item: {
                    ...MOCK_LIST_ITEMS[0],
                    ...body,
                  },
                }),
            });
          }
          if (body.action === "delete" || body.action === "reorder") {
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
          }
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }),
    );
  });

  it("starts with isLoaded=false and loads content/lists", async () => {
    const { result } = renderHook(() => useSiteContent("about"));

    expect(result.current.isLoaded).toBe(false);

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.error).toBeNull();
  });

  it("loads CMS content into content map", async () => {
    const { result } = renderHook(() => useSiteContent("about"));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.content.hero).toBeDefined();
    expect(result.current.content.hero!.title).toEqual({
      de: "Über uns",
      en: "About us",
    });
    expect(result.current.content.hero!.subtitle).toEqual({
      de: "Untertitel DE",
      en: "Subtitle EN",
    });
  });

  it("loads list items into lists map", async () => {
    const { result } = renderHook(() => useSiteContent("about"));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.lists.features).toHaveLength(2);
    expect(result.current.lists.features![0]!.text_de).toBe("Feature 1 DE");
    expect(result.current.lists.features![1]!.text_de).toBe("Feature 2 DE");
  });

  it("c() returns German content for locale de", async () => {
    const { result } = renderHook(() => useSiteContent("about"));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.c("hero", "title", "Fallback")).toBe("Über uns");
  });

  it("c() returns fallback when field does not exist", async () => {
    const { result } = renderHook(() => useSiteContent("about"));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.c("hero", "nonexistent", "Fallback")).toBe("Fallback");
  });

  it("cEn() returns English content", async () => {
    const { result } = renderHook(() => useSiteContent("about"));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.cEn("hero", "title")).toBe("About us");
  });

  it("cDe() returns German content", async () => {
    const { result } = renderHook(() => useSiteContent("about"));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.cDe("hero", "title")).toBe("Über uns");
  });

  it("saves a field and updates local state", async () => {
    const { result } = renderHook(() => useSiteContent("about"));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(async () => {
      await result.current.saveField("hero", "title", "Neu DE", "New EN");
    });

    expect(result.current.content.hero!.title).toEqual({
      de: "Neu DE",
      en: "New EN",
    });
  });

  it("throws when saveField API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (typeof url === "string" && url.includes("/api/site-content") && options?.method === "PATCH") {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: "Save failed" }),
          });
        }
        if (typeof url === "string" && url.includes("/api/site-content")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_CONTENT_ROWS) });
        }
        if (typeof url === "string" && url.includes("/api/site-list-items")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_LIST_ITEMS) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }),
    );

    const { result } = renderHook(() => useSiteContent("about"));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await expect(
      act(async () => {
        await result.current.saveField("hero", "title", "Fail DE", "Fail EN");
      }),
    ).rejects.toThrow("Save failed");
  });

  it("adds a list item and updates local state", async () => {
    const { result } = renderHook(() => useSiteContent("about"));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    let newItem: unknown;
    await act(async () => {
      newItem = await result.current.addListItem("features", "Neu DE", "New EN");
    });

    expect(newItem).toBeDefined();
    expect(result.current.lists.features).toHaveLength(3);
  });

  it("removes a list item from local state", async () => {
    const { result } = renderHook(() => useSiteContent("about"));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(async () => {
      await result.current.removeListItem("item-1");
    });

    expect(result.current.lists.features).toHaveLength(1);
    expect(result.current.lists.features![0]!.id).toBe("item-2");
  });

  it("reorders list items", async () => {
    const { result } = renderHook(() => useSiteContent("about"));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(async () => {
      await result.current.reorderListItems([
        { id: "item-1", sort_order: 1 },
        { id: "item-2", sort_order: 0 },
      ]);
    });

    expect(result.current.lists.features![0]!.id).toBe("item-2");
    expect(result.current.lists.features![1]!.id).toBe("item-1");
  });

  it("checks admin status on mount", async () => {
    mockSupabase.mockRpc.mockResolvedValue({ data: true, error: null });

    const { result } = renderHook(() => useSiteContent("about"));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.canEdit).toBe(true);
    });
  });

  it("sets canEdit=false when admin check fails", async () => {
    mockSupabase.mockRpc.mockResolvedValue({ data: false, error: null });

    const { result } = renderHook(() => useSiteContent("about"));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.canEdit).toBe(false);
  });

  it("provides userId from auth", async () => {
    const { result } = renderHook(() => useSiteContent("about"));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.userId).toBe("test-user");
  });

  it("sets error when content fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const { result } = renderHook(() => useSiteContent("about"));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.error).toBe("loadContentFailed");
  });

  it("handles locale correctly", async () => {
    const { result } = renderHook(() => useSiteContent("about"));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.locale).toBe("de");
  });
});

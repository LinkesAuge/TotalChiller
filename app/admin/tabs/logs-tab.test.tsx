// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

const mockSetPage = vi.fn();
const mockSetStatus = vi.fn();

let mockSelectedClanId = "c1";
let mockRangeResult: { data: any[]; error: any; count: number } = { data: [], error: null, count: 0 };
let mockActorResult: { data: any[]; error: any } = { data: [], error: null };

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue(mockActorResult),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue(mockRangeResult),
      in: vi.fn().mockReturnThis(),
    };
  }),
};

vi.mock("../admin-context", () => ({
  useAdminContext: () => ({
    supabase: mockSupabase,
    clans: [{ id: "c1", name: "TestClan", description: null }],
    selectedClanId: mockSelectedClanId,
    setStatus: mockSetStatus,
  }),
}));

vi.mock("@/lib/hooks/use-pagination", () => ({
  usePagination: () => ({
    page: 1,
    pageSize: 25,
    totalPages: 1,
    startIndex: 0,
    endIndex: 25,
    setPage: mockSetPage,
  }),
}));

vi.mock("../../../lib/date-format", () => ({
  formatLocalDateTime: (iso: string) => iso,
}));

let _mockSearchOnChange: ((val: string) => void) | null = null;
vi.mock("../../components/ui/search-input", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    if (props.id === "auditSearch") _mockSearchOnChange = props.onChange;
    return React.createElement("input", {
      "data-testid": props.id || "search",
      value: props.value,
      onChange: (e: any) => props.onChange?.(e.target.value),
    });
  },
}));

const mockSelectHandlers: Record<string, (v: string) => void> = {};
vi.mock("../../components/ui/labeled-select", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    mockSelectHandlers[props.id] = props.onValueChange;
    return React.createElement("select", {
      "data-testid": props.id,
      value: props.value,
      onChange: (e: any) => props.onValueChange?.(e.target.value),
    });
  },
}));

let _paginationRendered = false;
vi.mock("@/app/components/pagination-bar", () => ({
  __esModule: true,
  default: (_props: any) => {
    const React = require("react");
    _paginationRendered = true;
    return React.createElement("div", { "data-testid": "pagination-bar" });
  },
}));

import LogsTab from "./logs-tab";

describe("LogsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedClanId = "c1";
    mockRangeResult = { data: [], error: null, count: 0 };
    mockActorResult = { data: [], error: null };
    _paginationRendered = false;
  });

  it("renders without crashing", () => {
    render(<LogsTab />);
    expect(screen.getByText("logs.title")).toBeInTheDocument();
  });

  it("shows subtitle", () => {
    render(<LogsTab />);
    expect(screen.getByText("logs.subtitle")).toBeInTheDocument();
  });

  it("shows total count badge", () => {
    const { container } = render(<LogsTab />);
    const badge = container.querySelector(".badge");
    expect(badge).toBeInTheDocument();
  });

  it("renders filter controls", () => {
    render(<LogsTab />);
    expect(screen.getByTestId("auditSearch")).toBeInTheDocument();
    expect(screen.getByTestId("auditClanFilter")).toBeInTheDocument();
    expect(screen.getByTestId("auditActionFilter")).toBeInTheDocument();
  });

  it("shows no entries message when empty", () => {
    render(<LogsTab />);
    expect(screen.getByText("logs.noEntries")).toBeInTheDocument();
  });

  it("renders reset button", () => {
    render(<LogsTab />);
    expect(screen.getByText("common.reset")).toBeInTheDocument();
  });

  /* ── Log entries with data ── */

  it("renders log entries when data exists", async () => {
    mockRangeResult = {
      data: [
        {
          id: "log-1",
          clan_id: "c1",
          actor_id: "actor-1",
          action: "create",
          entity: "member",
          entity_id: "ent-12345678-rest",
          diff: { name: "changed" },
          created_at: "2024-06-01T12:00:00Z",
        },
      ],
      error: null,
      count: 1,
    };
    mockActorResult = {
      data: [{ id: "actor-1", email: "actor@test.com", display_name: "ActorName", username: "actoruser" }],
      error: null,
    };

    render(<LogsTab />);

    await waitFor(() => {
      expect(screen.getByText(/create/)).toBeInTheDocument();
      expect(screen.getByText(/member/)).toBeInTheDocument();
    });
  });

  it("renders actor display name when available", async () => {
    mockRangeResult = {
      data: [
        {
          id: "log-2",
          clan_id: "c1",
          actor_id: "actor-2",
          action: "update",
          entity: "clan",
          entity_id: "ent-22222222-rest",
          diff: null,
          created_at: "2024-06-02T12:00:00Z",
        },
      ],
      error: null,
      count: 1,
    };
    mockActorResult = {
      data: [{ id: "actor-2", email: "a2@test.com", display_name: "Jane", username: "jane" }],
      error: null,
    };

    render(<LogsTab />);

    await waitFor(() => {
      expect(screen.getByText(/Jane/)).toBeInTheDocument();
    });
  });

  it("shows truncated actor ID when no profile", async () => {
    mockRangeResult = {
      data: [
        {
          id: "log-3",
          clan_id: "c1",
          actor_id: "abcdefgh-1234",
          action: "delete",
          entity: "post",
          entity_id: "ent-33333333-rest",
          diff: null,
          created_at: "2024-06-03T12:00:00Z",
        },
      ],
      error: null,
      count: 1,
    };
    mockActorResult = { data: [], error: null };

    render(<LogsTab />);

    await waitFor(() => {
      expect(screen.getByText(/abcdefgh/)).toBeInTheDocument();
    });
  });

  /* ── getDiffSummary branch: null diff ── */

  it("renders dash for null diff", async () => {
    mockRangeResult = {
      data: [
        {
          id: "log-4",
          clan_id: "c1",
          actor_id: "a1",
          action: "test",
          entity: "x",
          entity_id: "e4444444-rest",
          diff: null,
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
      error: null,
      count: 1,
    };

    render(<LogsTab />);

    await waitFor(() => {
      const badges = screen.getAllByText("—");
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ── getDiffSummary branch: keys present ── */

  it("renders diff key summary", async () => {
    mockRangeResult = {
      data: [
        {
          id: "log-5",
          clan_id: "c1",
          actor_id: "a1",
          action: "update",
          entity: "profile",
          entity_id: "e5555555-rest",
          diff: { name: "old", rank: "new" },
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
      error: null,
      count: 1,
    };

    render(<LogsTab />);

    await waitFor(() => {
      expect(screen.getByText("name, rank")).toBeInTheDocument();
    });
  });

  /* ── Reset filters ── */

  it("resets filters when reset button is clicked", async () => {
    render(<LogsTab />);

    await act(async () => {
      fireEvent.click(screen.getByText("common.reset"));
    });

    expect(mockSetPage).toHaveBeenCalledWith(1);
  });

  /* ── No selected clan ── */

  it("clears logs when no clan is selected", () => {
    mockSelectedClanId = "";
    render(<LogsTab />);
    expect(screen.getByText("logs.noEntries")).toBeInTheDocument();
  });

  /* ── Supabase error on log load ── */

  it("calls setStatus on supabase query error", async () => {
    mockRangeResult = { data: [], error: { message: "Query failed" }, count: 0 };

    render(<LogsTab />);

    await waitFor(() => {
      expect(mockSetStatus).toHaveBeenCalledWith("Failed to load audit logs: Query failed");
    });
  });

  /* ── Actor load error ── */

  it("calls setStatus on actor profile load error", async () => {
    mockRangeResult = {
      data: [
        {
          id: "log-e",
          clan_id: "c1",
          actor_id: "a1",
          action: "x",
          entity: "y",
          entity_id: "eeeee-rest",
          diff: null,
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
      error: null,
      count: 1,
    };
    mockActorResult = { data: [], error: { message: "Profile query failed" } };

    render(<LogsTab />);

    await waitFor(() => {
      expect(mockSetStatus).toHaveBeenCalledWith("Failed to load audit actors: Profile query failed");
    });
  });

  /* ── Pagination rendering ── */

  it("renders pagination bar when total count > 0", async () => {
    mockRangeResult = {
      data: [
        {
          id: "log-p",
          clan_id: "c1",
          actor_id: "a1",
          action: "test",
          entity: "x",
          entity_id: "ppppp-rest",
          diff: null,
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
      error: null,
      count: 30,
    };

    render(<LogsTab />);

    await waitFor(() => {
      expect(screen.getByTestId("pagination-bar")).toBeInTheDocument();
    });
  });

  it("does not render pagination when total count is 0", () => {
    mockRangeResult = { data: [], error: null, count: 0 };
    render(<LogsTab />);
    expect(screen.queryByTestId("pagination-bar")).not.toBeInTheDocument();
  });

  /* ── Entity/Actor filter selects ── */

  it("renders entity filter", () => {
    render(<LogsTab />);
    expect(screen.getByTestId("auditEntityFilter")).toBeInTheDocument();
  });

  it("renders actor filter", () => {
    render(<LogsTab />);
    expect(screen.getByTestId("auditActorFilter")).toBeInTheDocument();
  });

  /* ── Shown count ── */

  it("displays shown count in filter summary", () => {
    render(<LogsTab />);
    expect(screen.getByText(/common.shown/)).toBeInTheDocument();
  });
});

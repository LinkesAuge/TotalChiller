// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("a", props, children);
  },
}));

const mockUseDashboardData = vi.fn();
vi.mock("./hooks/use-dashboard-data", () => ({
  useDashboardData: (...args: any[]) => mockUseDashboardData(...args),
}));
vi.mock("../lib/dashboard-utils", () => ({
  formatRelativeTime: () => "2h ago",
  toDateString: (d: Date) => d.toISOString().slice(0, 10),
}));

const mockUseClanContext = vi.fn();
vi.mock("./hooks/use-clan-context", () => ({
  __esModule: true,
  default: () => mockUseClanContext(),
}));
vi.mock("./components/data-state", () => ({
  __esModule: true,
  default: ({ children, isLoading, isEmpty, loadingNode, emptyNode }: any) => {
    const React = require("react");
    if (isLoading) return loadingNode || React.createElement("div", null, "Loading...");
    if (isEmpty) return emptyNode || React.createElement("div", null, "Empty");
    return React.createElement("div", { "data-testid": "data-state" }, children);
  },
}));

import DashboardClient from "./dashboard-client";

describe("DashboardClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseClanContext.mockReturnValue({ clanId: "clan1" });
    mockUseDashboardData.mockReturnValue({
      announcements: [],
      events: [],
      isLoadingAnnouncements: false,
      isLoadingEvents: false,
      announcementsError: null,
      eventsError: null,
    });
  });

  it("renders dashboard sections", () => {
    render(<DashboardClient />);
    expect(screen.getByText("announcementsTitle")).toBeInTheDocument();
    expect(screen.getByText("quickStatsTitle")).toBeInTheDocument();
    expect(screen.getByText("eventsTitle")).toBeInTheDocument();
    expect(screen.getByText("weekHighlightsTitle")).toBeInTheDocument();
  });

  it("renders empty announcements state", () => {
    render(<DashboardClient />);
    expect(screen.getByText("noAnnouncements")).toBeInTheDocument();
  });

  it("renders empty events state", () => {
    render(<DashboardClient />);
    expect(screen.getByText("noEventsScheduled")).toBeInTheDocument();
  });

  it("renders loading state for announcements", () => {
    mockUseDashboardData.mockReturnValue({
      announcements: [],
      events: [],
      isLoadingAnnouncements: true,
      isLoadingEvents: false,
      announcementsError: null,
      eventsError: null,
    });
    render(<DashboardClient />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("renders announcements list when data is present", () => {
    mockUseDashboardData.mockReturnValue({
      announcements: [
        {
          id: "a1",
          title: "Important News",
          created_at: "2025-01-01T00:00:00Z",
          author_name: "Admin",
          is_pinned: false,
          tags: [],
          forum_post_id: null,
        },
      ],
      events: [],
      isLoadingAnnouncements: false,
      isLoadingEvents: false,
      announcementsError: null,
      eventsError: null,
    });
    render(<DashboardClient />);
    expect(screen.getByText("Important News")).toBeInTheDocument();
  });

  it("renders events list when data is present", () => {
    mockUseDashboardData.mockReturnValue({
      announcements: [],
      events: [
        { id: "e1", title: "Raid Night", starts_at: "2025-01-20T18:00:00Z", author_name: null, forum_post_id: null },
      ],
      isLoadingAnnouncements: false,
      isLoadingEvents: false,
      announcementsError: null,
      eventsError: null,
    });
    render(<DashboardClient />);
    expect(screen.getByText("Raid Night")).toBeInTheDocument();
  });

  it("renders view all links for announcements and events", () => {
    render(<DashboardClient />);
    const viewAllLinks = screen.getAllByText(/viewAll/);
    expect(viewAllLinks.length).toBe(3);
  });

  it("renders stat cards with placeholder values", () => {
    render(<DashboardClient />);
    expect(screen.getByText("statMembersLabel")).toBeInTheDocument();
    expect(screen.getByText("statPowerLabel")).toBeInTheDocument();
    expect(screen.getByText("statEventsLabel")).toBeInTheDocument();
    expect(screen.getByText("statActivityLabel")).toBeInTheDocument();
  });

  it("renders analytics quick links in week highlights", () => {
    render(<DashboardClient />);
    expect(screen.getByText("chestsRankingLink")).toBeInTheDocument();
    expect(screen.getByText("eventResultsLink")).toBeInTheDocument();
    expect(screen.getByText("powerRankingLink")).toBeInTheDocument();
  });

  it("renders announcements error state", () => {
    mockUseDashboardData.mockReturnValue({
      announcements: [],
      events: [],
      isLoadingAnnouncements: false,
      isLoadingEvents: false,
      announcementsError: "Failed to load",
      eventsError: null,
    });
    render(<DashboardClient />);
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("renders events error state", () => {
    mockUseDashboardData.mockReturnValue({
      announcements: [],
      events: [],
      isLoadingAnnouncements: false,
      isLoadingEvents: false,
      announcementsError: null,
      eventsError: "Events failed",
    });
    render(<DashboardClient />);
    expect(screen.getByText("Events failed")).toBeInTheDocument();
  });

  it("renders events loading state", () => {
    mockUseDashboardData.mockReturnValue({
      announcements: [],
      events: [],
      isLoadingAnnouncements: false,
      isLoadingEvents: true,
      announcementsError: null,
      eventsError: null,
    });
    render(<DashboardClient />);
    const loadingTexts = screen.getAllByText("loading");
    expect(loadingTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders announcement with tag color", () => {
    mockUseDashboardData.mockReturnValue({
      announcements: [
        {
          id: "a-tag",
          title: "Tagged News",
          created_at: "2025-01-01T00:00:00Z",
          author_name: null,
          is_pinned: false,
          tags: ["Priority"],
          forum_post_id: null,
        },
      ],
      events: [],
      isLoadingAnnouncements: false,
      isLoadingEvents: false,
      announcementsError: null,
      eventsError: null,
    });
    render(<DashboardClient />);
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("Tagged News")).toBeInTheDocument();
  });

  it("renders pinned announcement without tag shows pin badge", () => {
    mockUseDashboardData.mockReturnValue({
      announcements: [
        {
          id: "a-pinned",
          title: "Pinned News",
          created_at: "2025-01-01T00:00:00Z",
          author_name: "Admin",
          is_pinned: true,
          tags: [],
          forum_post_id: null,
        },
      ],
      events: [],
      isLoadingAnnouncements: false,
      isLoadingEvents: false,
      announcementsError: null,
      eventsError: null,
    });
    render(<DashboardClient />);
    expect(screen.getByText("pinnedLabel")).toBeInTheDocument();
  });

  it("renders announcement with forum thread link", () => {
    mockUseDashboardData.mockReturnValue({
      announcements: [
        {
          id: "a-forum",
          title: "Forum News",
          created_at: "2025-01-01T00:00:00Z",
          author_name: null,
          is_pinned: false,
          tags: [],
          forum_post_id: "fp-1",
        },
      ],
      events: [],
      isLoadingAnnouncements: false,
      isLoadingEvents: false,
      announcementsError: null,
      eventsError: null,
    });
    render(<DashboardClient />);
    const threadLinks = screen.getAllByLabelText("goToThread");
    expect(threadLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders event with forum thread link", () => {
    mockUseDashboardData.mockReturnValue({
      announcements: [],
      events: [
        {
          id: "e-forum",
          title: "Forum Event",
          starts_at: "2025-01-20T18:00:00Z",
          author_name: null,
          forum_post_id: "fp-ev-1",
        },
      ],
      isLoadingAnnouncements: false,
      isLoadingEvents: false,
      announcementsError: null,
      eventsError: null,
    });
    render(<DashboardClient />);
    const threadLink = screen.getByLabelText("goToThread");
    expect(threadLink).toHaveAttribute("href", "/forum?post=fp-ev-1");
  });

  it("renders event with author name", () => {
    mockUseDashboardData.mockReturnValue({
      announcements: [],
      events: [
        {
          id: "e-author",
          title: "Authored Event",
          starts_at: "2025-01-20T18:00:00Z",
          author_name: "GameMaster",
          forum_post_id: null,
        },
      ],
      isLoadingAnnouncements: false,
      isLoadingEvents: false,
      announcementsError: null,
      eventsError: null,
    });
    render(<DashboardClient />);
    expect(screen.getByText("GameMaster")).toBeInTheDocument();
  });

  it("renders multiple announcements with dividers", () => {
    mockUseDashboardData.mockReturnValue({
      announcements: [
        {
          id: "a1",
          title: "First",
          created_at: "2025-01-01T00:00:00Z",
          author_name: null,
          is_pinned: false,
          tags: [],
          forum_post_id: null,
        },
        {
          id: "a2",
          title: "Second",
          created_at: "2025-01-02T00:00:00Z",
          author_name: null,
          is_pinned: false,
          tags: [],
          forum_post_id: null,
        },
      ],
      events: [],
      isLoadingAnnouncements: false,
      isLoadingEvents: false,
      announcementsError: null,
      eventsError: null,
    });
    const { container } = render(<DashboardClient />);
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    const announcementSection = container.querySelector(".col-span-2 .card-body");
    const dividers = announcementSection!.querySelectorAll(".gold-divider");
    expect(dividers.length).toBe(1);
  });

  it("renders announcement with author name and relative time", () => {
    mockUseDashboardData.mockReturnValue({
      announcements: [
        {
          id: "a-authored",
          title: "Authored",
          created_at: "2025-01-01T00:00:00Z",
          author_name: "Writer",
          is_pinned: false,
          tags: [],
          forum_post_id: null,
        },
      ],
      events: [],
      isLoadingAnnouncements: false,
      isLoadingEvents: false,
      announcementsError: null,
      eventsError: null,
    });
    render(<DashboardClient />);
    expect(screen.getByText(/Writer/)).toBeInTheDocument();
    expect(screen.getByText(/2h ago/)).toBeInTheDocument();
  });

  it("renders multiple events with different dot colors", () => {
    const events = Array.from({ length: 6 }, (_, i) => ({
      id: `e-${i}`,
      title: `Event ${i}`,
      starts_at: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
      author_name: null,
      forum_post_id: null,
    }));
    mockUseDashboardData.mockReturnValue({
      announcements: [],
      events,
      isLoadingAnnouncements: false,
      isLoadingEvents: false,
      announcementsError: null,
      eventsError: null,
    });
    render(<DashboardClient />);
    events.forEach((e) => {
      expect(screen.getByText(e.title)).toBeInTheDocument();
    });
  });

  it("renders stat card labels", () => {
    render(<DashboardClient />);
    expect(screen.getByText("statAvgPowerLabel")).toBeInTheDocument();
    expect(screen.getByText("statTopCollectorLabel")).toBeInTheDocument();
  });
});

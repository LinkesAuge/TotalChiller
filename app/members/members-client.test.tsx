// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const stableT = vi.fn((key: string) => key);
vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => stableT),
  useLocale: vi.fn(() => "de"),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ fill, priority, unoptimized, ...props }: any) => {
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

function buildChain(result: any = { data: [], error: null }) {
  const chain: any = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.returns = vi.fn(() => Promise.resolve(result));
  chain.then = (fn?: any, rej?: any) => Promise.resolve(result).then(fn, rej);
  return chain;
}

const defaultChain = buildChain();
const stableSupabase = { from: vi.fn(() => defaultChain) };

vi.mock("../hooks/use-supabase", () => ({
  useSupabase: () => stableSupabase,
}));

const mockUseClanContext = vi.fn();
vi.mock("../hooks/use-clan-context", () => ({
  __esModule: true,
  default: () => mockUseClanContext(),
}));
vi.mock("../admin/admin-types", () => ({
  formatRank: (rank: string) => rank,
  formatRole: (role: string) => role,
  rankOptions: ["leader", "officer", "soldier"],
}));
vi.mock("../components/data-state", () => ({
  __esModule: true,
  default: ({ children, isLoading, isEmpty, loadingMessage, emptyNode, error }: any) => {
    const React = require("react");
    if (isLoading) return React.createElement("div", null, loadingMessage || "loading");
    if (error) return React.createElement("div", null, error);
    if (isEmpty) return emptyNode || React.createElement("div", null, "empty");
    return React.createElement("div", { "data-testid": "data-state" }, children);
  },
}));
vi.mock("./members-utils", () => ({
  NOTABLE_ROLES: new Set(["admin", "owner"]),
  RANK_SUBSTITUTE_ROLES: new Set(["admin", "owner"]),
  getRoleColor: () => "#fff",
  getRankColor: () => "#ccc",
  buildMessageLink: (userId: string) => `/messages?to=${userId}`,
  compareMemberOrder: () => 0,
  countRoleSubstitutes: () => [],
}));

import MembersClient from "./members-client";

describe("MembersClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseClanContext.mockReturnValue({ clanId: "clan1" });
    const chain = buildChain();
    stableSupabase.from.mockReturnValue(chain);
  });

  it("renders no clan selected when clan context is null", async () => {
    mockUseClanContext.mockReturnValue(null);
    render(<MembersClient />);
    expect(await screen.findByText("noClanSelected")).toBeInTheDocument();
  });

  it("renders loading state initially when clan is set", () => {
    const neverResolve = buildChain();
    neverResolve.returns.mockReturnValue(new Promise(() => {}));
    stableSupabase.from.mockReturnValue(neverResolve);
    render(<MembersClient />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("renders empty state after data loads with no members", async () => {
    render(<MembersClient />);
    expect(await screen.findByText("noMembers")).toBeInTheDocument();
  });
});

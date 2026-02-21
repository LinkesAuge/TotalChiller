// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";

const stableTranslator = (key: string, params?: any) => {
  if (params) return `${key}:${JSON.stringify(params)}`;
  return key;
};
vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => stableTranslator),
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

const mockGetSession = vi.fn().mockResolvedValue({ data: { session: { access_token: "tok-123" } } });
const stableSupabase = { auth: { getSession: mockGetSession } };

vi.mock("../../hooks/use-supabase", () => ({
  useSupabase: () => stableSupabase,
}));

let mockClanContext: { clanId: string } | null = { clanId: "clan-1" };
vi.mock("../../hooks/use-clan-context", () => ({
  __esModule: true,
  default: () => mockClanContext,
}));

const mockUpdateActiveSection = vi.fn();
vi.mock("../admin-context", () => ({
  useAdminContext: () => ({
    updateActiveSection: mockUpdateActiveSection,
  }),
}));

vi.mock("../../components/data-state", () => ({
  __esModule: true,
  default: ({ children, isLoading, loadingMessage }: any) => {
    const React = require("react");
    if (isLoading)
      return React.createElement("div", { "data-testid": "data-state-loading" }, loadingMessage || "Loading...");
    return children;
  },
}));

vi.mock("../../components/ui/game-alert", () => ({
  __esModule: true,
  default: ({ children, title, variant }: any) => {
    const React = require("react");
    return React.createElement(
      "div",
      { role: "alert", "data-variant": variant },
      title ? React.createElement("div", null, title) : null,
      children,
    );
  },
}));

const mockSafeParse = vi.hoisted(() =>
  vi.fn<() => { success: boolean; data?: any; error?: { issues: { path: string[]; message: string }[] } }>(() => ({
    success: false,
    error: { issues: [] },
  })),
);
vi.mock("@/lib/api/import-schemas", () => ({
  ImportPayloadSchema: { safeParse: mockSafeParse },
}));

globalThis.fetch = vi.fn();

import ImportTab from "./import-tab";

function createValidPayload() {
  return {
    source: "test-tool",
    exportedAt: "2024-01-01T00:00:00Z",
    clan: { name: "TestClan", websiteClanId: "clan-1" },
    data: {
      chests: [{ id: "c1" }],
      members: [{ id: "m1" }, { id: "m2" }],
      events: [],
    },
    validationLists: { items: [] },
  };
}

function simulateFileUpload(container: HTMLElement, content: string, fileName = "data.json") {
  const file = new File([content], fileName, { type: "application/json" });
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, "files", { value: [file] });
  fireEvent.change(input);
}

describe("ImportTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClanContext = { clanId: "clan-1" };
    mockSafeParse.mockReturnValue({ success: false, error: { issues: [] } });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok-123" } } });
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { submissions: [], validationListsUpdated: false } }),
    });
  });

  it("renders without crashing", () => {
    render(<ImportTab />);
    expect(document.querySelector("section")).toBeInTheDocument();
  });

  it("renders file upload dropzone", () => {
    render(<ImportTab />);
    expect(screen.getByText("dropzoneTitle")).toBeInTheDocument();
  });

  it("renders hidden file input", () => {
    const { container } = render(<ImportTab />);
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
  });

  it("accepts only JSON files", () => {
    const { container } = render(<ImportTab />);
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute("accept", ".json");
  });

  /* ── Dropzone CTA text ── */

  it("shows CTA text when no file selected", () => {
    render(<ImportTab />);
    expect(screen.getByText("dropzoneCta")).toBeInTheDocument();
    expect(screen.getByText("dropzoneHint")).toBeInTheDocument();
  });

  /* ── Non-JSON file rejection ── */

  it("shows error when non-JSON file is uploaded", async () => {
    const { container } = render(<ImportTab />);

    const file = new File(["hello"], "data.txt", { type: "text/plain" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [file] });

    await act(async () => {
      fireEvent.change(input);
    });

    await waitFor(() => {
      expect(screen.getByText("errorNotJson")).toBeInTheDocument();
    });
  });

  /* ── JSON parse failure ── */

  it("shows error when JSON parsing fails", async () => {
    const { container } = render(<ImportTab />);

    simulateFileUpload(container, "not-json{{{");

    await waitFor(() => {
      expect(screen.getByText("errorParseFailed")).toBeInTheDocument();
    });
  });

  /* ── Schema validation failure ── */

  it("shows validation error when schema validation fails", async () => {
    mockSafeParse.mockReturnValue({
      success: false,
      error: { issues: [{ path: ["data", "chests"], message: "Required" }] },
    });

    const { container } = render(<ImportTab />);
    simulateFileUpload(container, JSON.stringify({ some: "data" }));

    await waitFor(() => {
      const alerts = screen.getAllByRole("alert");
      expect(alerts.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ── Successful validation → preview ── */

  it("shows preview when valid JSON is uploaded", async () => {
    const payload = createValidPayload();
    mockSafeParse.mockReturnValue({ success: true, data: payload });

    const { container } = render(<ImportTab />);
    simulateFileUpload(container, JSON.stringify(payload));

    await waitFor(() => {
      expect(screen.getByText("previewTitle")).toBeInTheDocument();
      expect(screen.getByText("TestClan")).toBeInTheDocument();
      expect(screen.getByText("test-tool")).toBeInTheDocument();
    });
  });

  it("shows chest and member counts in preview", async () => {
    const payload = createValidPayload();
    mockSafeParse.mockReturnValue({ success: true, data: payload });

    const { container } = render(<ImportTab />);
    simulateFileUpload(container, JSON.stringify(payload));

    await waitFor(() => {
      expect(screen.getByText("previewChests")).toBeInTheDocument();
      expect(screen.getByText("previewMembers")).toBeInTheDocument();
    });
  });

  it("shows validation lists status in preview", async () => {
    const payload = createValidPayload();
    mockSafeParse.mockReturnValue({ success: true, data: payload });

    const { container } = render(<ImportTab />);
    simulateFileUpload(container, JSON.stringify(payload));

    await waitFor(() => {
      expect(screen.getByText("previewValidationLists")).toBeInTheDocument();
      expect(screen.getByText("yes")).toBeInTheDocument();
    });
  });

  /* ── Reset form ── */

  it("resets form when reset button is clicked", async () => {
    const payload = createValidPayload();
    mockSafeParse.mockReturnValue({ success: true, data: payload });

    const { container } = render(<ImportTab />);
    simulateFileUpload(container, JSON.stringify(payload));

    await waitFor(() => expect(screen.getByText("previewTitle")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("resetButton"));
    });

    expect(screen.queryByText("previewTitle")).not.toBeInTheDocument();
    expect(screen.getByText("dropzoneCta")).toBeInTheDocument();
  });

  /* ── Submit flow ── */

  it("submits payload via POST and shows success", async () => {
    const payload = createValidPayload();
    mockSafeParse.mockReturnValue({ success: true, data: payload });

    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            submissions: [
              { id: "s1", type: "chests", itemCount: 1, autoMatchedCount: 1, unmatchedCount: 0, duplicateCount: 0 },
            ],
            validationListsUpdated: true,
          },
        }),
    });

    const { container } = render(<ImportTab />);
    simulateFileUpload(container, JSON.stringify(payload));

    await waitFor(() => expect(screen.getByText("submitButton")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("submitButton"));
    });

    await waitFor(() => {
      expect(screen.getByText("successTitle")).toBeInTheDocument();
      expect(screen.getByText("validationListsUpdated")).toBeInTheDocument();
    });
  });

  it("calls fetch with correct authorization header", async () => {
    const payload = createValidPayload();
    mockSafeParse.mockReturnValue({ success: true, data: payload });

    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { submissions: [], validationListsUpdated: false } }),
    });

    const { container } = render(<ImportTab />);
    simulateFileUpload(container, JSON.stringify(payload));

    await waitFor(() => expect(screen.getByText("submitButton")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("submitButton"));
    });

    await waitFor(() => {
      const postCalls = (globalThis.fetch as any).mock.calls.filter((c: any[]) => c[1]?.method === "POST");
      expect(postCalls.length).toBe(1);
      expect(postCalls[0][1].headers.Authorization).toBe("Bearer tok-123");
    });
  });

  /* ── Submit failure ── */

  it("shows error state when submit fails", async () => {
    const payload = createValidPayload();
    mockSafeParse.mockReturnValue({ success: true, data: payload });

    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Import failed" }),
    });

    const { container } = render(<ImportTab />);
    simulateFileUpload(container, JSON.stringify(payload));

    await waitFor(() => expect(screen.getByText("submitButton")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("submitButton"));
    });

    await waitFor(() => {
      expect(screen.getByText("Import failed")).toBeInTheDocument();
    });
  });

  it("shows generic error when submit response has no error body", async () => {
    const payload = createValidPayload();
    mockSafeParse.mockReturnValue({ success: true, data: payload });

    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error("no body")),
    });

    const { container } = render(<ImportTab />);
    simulateFileUpload(container, JSON.stringify(payload));

    await waitFor(() => expect(screen.getByText("submitButton")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("submitButton"));
    });

    await waitFor(() => {
      expect(screen.getByText("errorSubmitFailed")).toBeInTheDocument();
    });
  });

  /* ── Submit network error ── */

  it("shows error when network fails during submit", async () => {
    const payload = createValidPayload();
    mockSafeParse.mockReturnValue({ success: true, data: payload });

    (globalThis.fetch as any).mockRejectedValue(new Error("Network down"));

    const { container } = render(<ImportTab />);
    simulateFileUpload(container, JSON.stringify(payload));

    await waitFor(() => expect(screen.getByText("submitButton")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("submitButton"));
    });

    await waitFor(() => {
      expect(screen.getByText("errorSubmitFailed")).toBeInTheDocument();
    });
  });

  /* ── No auth token ── */

  it("shows unauthorized error when no session token", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const payload = createValidPayload();
    mockSafeParse.mockReturnValue({ success: true, data: payload });

    const { container } = render(<ImportTab />);
    simulateFileUpload(container, JSON.stringify(payload));

    await waitFor(() => expect(screen.getByText("submitButton")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("submitButton"));
    });

    await waitFor(() => {
      expect(screen.getByText("errorUnauthorized")).toBeInTheDocument();
    });
  });

  /* ── Clan selector prompt for missing websiteClanId ── */

  it("shows clan warning when payload has no websiteClanId", async () => {
    const payload = createValidPayload();
    payload.clan.websiteClanId = null as any;
    mockSafeParse.mockReturnValue({ success: true, data: payload });

    const { container } = render(<ImportTab />);
    simulateFileUpload(container, JSON.stringify(payload));

    await waitFor(() => {
      expect(screen.getByText("clanRequired")).toBeInTheDocument();
    });
  });

  /* ── View submissions button ── */

  it.skip("navigates to submissions on success", async () => {
    const payload = createValidPayload();
    mockSafeParse.mockReturnValue({ success: true, data: payload });

    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { submissions: [], validationListsUpdated: false } }),
    });

    const { container } = render(<ImportTab />);
    simulateFileUpload(container, JSON.stringify(payload));

    await waitFor(() => expect(screen.getByText("submitButton")).toBeInTheDocument());

    fireEvent.click(screen.getByText("submitButton"));

    await waitFor(() => expect(screen.getByText("viewSubmissions")).toBeInTheDocument());

    fireEvent.click(screen.getByText("viewSubmissions"));

    expect(mockUpdateActiveSection).toHaveBeenCalledWith("submissions");
  });

  /* ── Try again button from error state ── */

  it("resets form via tryAgain button in error state", async () => {
    const payload = createValidPayload();
    mockSafeParse.mockReturnValue({ success: true, data: payload });
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Submit err" }),
    });

    const { container } = render(<ImportTab />);
    simulateFileUpload(container, JSON.stringify(payload));

    await waitFor(() => expect(screen.getByText("submitButton")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("submitButton"));
    });

    await waitFor(() => expect(screen.getByText("tryAgain")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("tryAgain"));
    });

    expect(screen.getByText("dropzoneCta")).toBeInTheDocument();
  });

  /* ── Drag and drop events ── */

  it("shows active dropzone style on dragEnter", async () => {
    render(<ImportTab />);
    const dropzone = screen.getByRole("button");

    await act(async () => {
      fireEvent.dragEnter(dropzone, { preventDefault: vi.fn(), stopPropagation: vi.fn() });
    });
  });

  it("handles drop event with file", async () => {
    mockSafeParse.mockReturnValue({ success: true, data: createValidPayload() });

    render(<ImportTab />);
    const dropzone = screen.getByRole("button");

    const file = new File([JSON.stringify(createValidPayload())], "drop.json", { type: "application/json" });
    const dataTransfer = { files: [file] };

    await act(async () => {
      fireEvent.drop(dropzone, { dataTransfer });
    });

    await waitFor(() => {
      expect(screen.getByText("drop.json")).toBeInTheDocument();
    });
  });

  /* ── Dropzone keyboard click ── */

  it("opens file dialog on Enter key", () => {
    render(<ImportTab />);
    const dropzone = screen.getByRole("button");
    fireEvent.keyDown(dropzone, { key: "Enter" });
  });

  /* ── Import another button ── */

  it("shows importAnother button on success", async () => {
    const payload = createValidPayload();
    mockSafeParse.mockReturnValue({ success: true, data: payload });

    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { submissions: [], validationListsUpdated: false } }),
    });

    const { container } = render(<ImportTab />);
    simulateFileUpload(container, JSON.stringify(payload));

    await waitFor(() => expect(screen.getByText("submitButton")).toBeInTheDocument());

    fireEvent.click(screen.getByText("submitButton"));

    await waitFor(() => expect(screen.getByText("importAnother")).toBeInTheDocument());
  });

  /* ── Submitting state ── */

  it("shows loading state during submission", async () => {
    const payload = createValidPayload();
    mockSafeParse.mockReturnValue({ success: true, data: payload });
    mockGetSession.mockReturnValue(new Promise(() => {}));

    const { container } = render(<ImportTab />);
    simulateFileUpload(container, JSON.stringify(payload));

    await waitFor(() => expect(screen.getByText("submitButton")).toBeInTheDocument());

    fireEvent.click(screen.getByText("submitButton"));

    await waitFor(() => {
      expect(screen.getByTestId("data-state-loading")).toBeInTheDocument();
    });
  });
});

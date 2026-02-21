// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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

vi.mock("next/dynamic", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: (loader: () => Promise<any>) => {
      function DynamicWrapper(props: any) {
        const [Comp, setComp] = React.useState<any>(null);
        React.useEffect(() => {
          let cancelled = false;
          loader().then((mod: any) => {
            if (!cancelled) setComp(() => mod.default || mod);
          });
          return () => {
            cancelled = true;
          };
        }, []);
        if (!Comp) return null;
        return React.createElement(Comp, props);
      }
      DynamicWrapper.displayName = "DynamicWrapper";
      return DynamicWrapper;
    },
  };
});

vi.mock("./bugs-detail", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement(
      "div",
      { "data-testid": "bugs-detail" },
      React.createElement("button", { "data-testid": "detail-edit-btn", onClick: props.onEdit }, "Edit"),
      React.createElement("button", { "data-testid": "detail-delete-btn", onClick: props.onDelete }, "Delete"),
      props.onUpdate &&
        React.createElement(
          "button",
          { "data-testid": "detail-update-btn", onClick: () => props.onUpdate({ status: "closed" }) },
          "Update",
        ),
    );
  },
}));

vi.mock("./bugs-form", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement(
      "div",
      { "data-testid": "bugs-form", "data-has-initial": props.initialData ? "true" : "false" },
      React.createElement(
        "button",
        {
          "data-testid": "form-submit-btn",
          onClick: () =>
            props.onSubmit?.({
              title: "Test Bug",
              description: "desc",
              categoryId: "c1",
              pageUrl: "/page",
              screenshotPaths: [],
            }),
        },
        "Submit",
      ),
      React.createElement("button", { "data-testid": "form-cancel-btn", onClick: props.onCancel }, "Cancel"),
    );
  },
}));

vi.mock("@/app/hooks/use-supabase", () => ({
  useSupabase: () => ({}),
}));
vi.mock("@/app/hooks/use-auth", () => ({
  useAuth: () => ({ userId: "u1" }),
}));
vi.mock("@/lib/hooks/use-user-role", () => ({
  useUserRole: () => ({ isContentManager: false }),
}));
vi.mock("@/app/components/page-shell", () => ({
  __esModule: true,
  default: ({ children }: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "page-shell" }, children);
  },
}));
vi.mock("@/app/components/data-state", () => ({
  __esModule: true,
  default: ({ children, isLoading, loadingMessage }: any) => {
    const React = require("react");
    if (isLoading) return React.createElement("div", { "data-testid": "loading" }, loadingMessage);
    return React.createElement("div", { "data-testid": "data-state" }, children);
  },
}));
vi.mock("@/app/components/confirm-modal", () => ({
  __esModule: true,
  default: ({ isOpen, title, onConfirm, onCancel, isConfirmDisabled }: any) => {
    const React = require("react");
    if (!isOpen) return null;
    return React.createElement(
      "div",
      { "data-testid": "confirm-modal" },
      React.createElement("span", null, title),
      React.createElement(
        "button",
        { onClick: onConfirm, disabled: isConfirmDisabled, "data-testid": "confirm-btn" },
        "Confirm",
      ),
      React.createElement("button", { onClick: onCancel, "data-testid": "cancel-modal-btn" }, "CancelModal"),
    );
  },
}));
vi.mock("@/app/components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", props, children);
  },
}));
vi.mock("./bugs-list", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement(
      "div",
      { "data-testid": "bugs-list" },
      React.createElement("span", null, props.emptyMessage),
      props.onSelectReport &&
        React.createElement(
          "button",
          { "data-testid": "select-report-btn", onClick: () => props.onSelectReport("r1") },
          "Select",
        ),
      props.onEditReport &&
        React.createElement(
          "button",
          { "data-testid": "edit-report-btn", onClick: () => props.onEditReport("r1") },
          "EditFromList",
        ),
      props.onDeleteReport &&
        React.createElement(
          "button",
          { "data-testid": "delete-report-btn", onClick: () => props.onDeleteReport("r1") },
          "DeleteFromList",
        ),
    );
  },
}));

const mockUseBugs = vi.fn();
vi.mock("./use-bugs", () => ({
  useBugs: () => mockUseBugs(),
}));

import BugsClient from "./bugs-client";

function baseBugsState(overrides: Record<string, any> = {}) {
  return {
    view: "list",
    setView: vi.fn(),
    sortedReports: [],
    selectedReport: null,
    categories: [],
    filter: { status: "all", priority: "all", search: "", categoryId: "" },
    updateFilter: vi.fn(),
    isLoading: false,
    isSubmitting: false,
    openDetail: vi.fn(),
    backToList: vi.fn(),
    loadReports: vi.fn().mockResolvedValue(undefined),
    loadReport: vi.fn().mockResolvedValue(undefined),
    deleteReport: vi.fn().mockResolvedValue(true),
    submitReport: vi.fn().mockResolvedValue(true),
    updateReport: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("BugsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBugs.mockReturnValue(baseBugsState());
  });

  // ── List view ──

  it("renders list view with new report button", () => {
    render(<BugsClient />);
    expect(screen.getByText("newReport")).toBeInTheDocument();
    expect(screen.getByTestId("bugs-list")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    mockUseBugs.mockReturnValue(baseBugsState({ isLoading: true }));
    render(<BugsClient />);
    expect(screen.getByText("loadingReports")).toBeInTheDocument();
  });

  it("shows 'noReports' when no active filters", () => {
    render(<BugsClient />);
    expect(screen.getByText("noReports")).toBeInTheDocument();
  });

  it("shows 'noReportsFiltered' when status filter is active", () => {
    mockUseBugs.mockReturnValue(
      baseBugsState({ filter: { status: "open", priority: "all", search: "", categoryId: "" } }),
    );
    render(<BugsClient />);
    expect(screen.getByText("noReportsFiltered")).toBeInTheDocument();
  });

  it("shows 'noReportsFiltered' when priority filter is active", () => {
    mockUseBugs.mockReturnValue(
      baseBugsState({ filter: { status: "all", priority: "high", search: "", categoryId: "" } }),
    );
    render(<BugsClient />);
    expect(screen.getByText("noReportsFiltered")).toBeInTheDocument();
  });

  it("shows 'noReportsFiltered' when search filter is active", () => {
    mockUseBugs.mockReturnValue(
      baseBugsState({ filter: { status: "all", priority: "all", search: "bug", categoryId: "" } }),
    );
    render(<BugsClient />);
    expect(screen.getByText("noReportsFiltered")).toBeInTheDocument();
  });

  it("shows 'noReportsFiltered' when categoryId filter is active", () => {
    mockUseBugs.mockReturnValue(
      baseBugsState({ filter: { status: "all", priority: "all", search: "", categoryId: "cat1" } }),
    );
    render(<BugsClient />);
    expect(screen.getByText("noReportsFiltered")).toBeInTheDocument();
  });

  // ── View switching ──

  it("switches to create view on new report click", () => {
    const setView = vi.fn();
    mockUseBugs.mockReturnValue(baseBugsState({ setView }));
    render(<BugsClient />);
    fireEvent.click(screen.getByText("newReport"));
    expect(setView).toHaveBeenCalledWith("create");
  });

  it("renders create view with back button and form", async () => {
    mockUseBugs.mockReturnValue(baseBugsState({ view: "create" }));
    render(<BugsClient />);
    expect(screen.getByText("backToList")).toBeInTheDocument();
    expect(await screen.findByTestId("bugs-form")).toBeInTheDocument();
  });

  it("renders detail view with back button", () => {
    mockUseBugs.mockReturnValue(baseBugsState({ view: "detail", selectedReport: { id: "r1", title: "Bug" } }));
    render(<BugsClient />);
    expect(screen.getByText("backToList")).toBeInTheDocument();
  });

  it("renders edit view with back-to-detail button by default", () => {
    mockUseBugs.mockReturnValue(
      baseBugsState({
        view: "edit",
        selectedReport: { id: "r1", title: "Bug", description: "desc", category_id: "", page_url: "" },
      }),
    );
    render(<BugsClient />);
    expect(screen.getByText("backToDetail")).toBeInTheDocument();
  });

  it("back button in create view calls backToList", () => {
    const backToList = vi.fn();
    mockUseBugs.mockReturnValue(baseBugsState({ view: "create", backToList }));
    render(<BugsClient />);
    fireEvent.click(screen.getByText("backToList"));
    expect(backToList).toHaveBeenCalled();
  });

  // ── Edit view with correct back behavior ──

  it("edit view from detail shows back-to-detail", () => {
    mockUseBugs.mockReturnValue(
      baseBugsState({
        view: "edit",
        selectedReport: { id: "r1", title: "Bug", description: "", category_id: "", page_url: "" },
      }),
    );
    render(<BugsClient />);
    expect(screen.getByText("backToDetail")).toBeInTheDocument();
  });

  it("back button in edit view (from detail) calls setView('detail')", () => {
    const setView = vi.fn();
    mockUseBugs.mockReturnValue(
      baseBugsState({
        view: "edit",
        setView,
        selectedReport: { id: "r1", title: "Bug", description: "", category_id: "", page_url: "" },
      }),
    );
    render(<BugsClient />);
    fireEvent.click(screen.getByText("backToDetail"));
    expect(setView).toHaveBeenCalledWith("detail");
  });

  // ── Create form ──

  it("passes onSubmit and onCancel to BugsForm in create view", async () => {
    mockUseBugs.mockReturnValue(baseBugsState({ view: "create" }));
    render(<BugsClient />);
    const form = await screen.findByTestId("bugs-form");
    expect(form.dataset.hasInitial).toBe("false");
    expect(screen.getByTestId("form-submit-btn")).toBeInTheDocument();
    expect(screen.getByTestId("form-cancel-btn")).toBeInTheDocument();
  });

  it("calls submitReport and reloads on successful create submit", async () => {
    const submitReport = vi.fn().mockResolvedValue(true);
    const setView = vi.fn();
    const loadReports = vi.fn().mockResolvedValue(undefined);
    mockUseBugs.mockReturnValue(baseBugsState({ view: "create", submitReport, setView, loadReports }));
    render(<BugsClient />);
    fireEvent.click(await screen.findByTestId("form-submit-btn"));
    await waitFor(() => {
      expect(submitReport).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Test Bug", description: "desc", categoryId: "c1", pageUrl: "/page" }),
      );
      expect(setView).toHaveBeenCalledWith("list");
      expect(loadReports).toHaveBeenCalled();
    });
  });

  it("does not switch view when submitReport fails", async () => {
    const submitReport = vi.fn().mockResolvedValue(false);
    const setView = vi.fn();
    mockUseBugs.mockReturnValue(baseBugsState({ view: "create", submitReport, setView }));
    render(<BugsClient />);
    fireEvent.click(await screen.findByTestId("form-submit-btn"));
    await waitFor(() => {
      expect(submitReport).toHaveBeenCalled();
    });
    expect(setView).not.toHaveBeenCalledWith("list");
  });

  it("calls backToList when cancel is clicked in create form", async () => {
    const backToList = vi.fn();
    mockUseBugs.mockReturnValue(baseBugsState({ view: "create", backToList }));
    render(<BugsClient />);
    fireEvent.click(await screen.findByTestId("form-cancel-btn"));
    expect(backToList).toHaveBeenCalled();
  });

  // ── Edit form ──

  it("passes initialData to BugsForm in edit view", async () => {
    mockUseBugs.mockReturnValue(
      baseBugsState({
        view: "edit",
        selectedReport: { id: "r1", title: "Bug", description: "desc", category_id: "c1", page_url: "/page" },
      }),
    );
    render(<BugsClient />);
    const form = await screen.findByTestId("bugs-form");
    expect(form.dataset.hasInitial).toBe("true");
  });

  it("saves edit and returns to detail on successful save (editOrigin=detail)", async () => {
    const updateReport = vi.fn().mockResolvedValue(true);
    const loadReport = vi.fn().mockResolvedValue(undefined);
    const setView = vi.fn();
    mockUseBugs.mockReturnValue(
      baseBugsState({
        view: "edit",
        setView,
        updateReport,
        loadReport,
        selectedReport: { id: "r1", title: "Bug", description: "desc", category_id: "c1", page_url: "/page" },
      }),
    );
    render(<BugsClient />);
    fireEvent.click(await screen.findByTestId("form-submit-btn"));
    await waitFor(() => {
      expect(updateReport).toHaveBeenCalledWith("r1", expect.objectContaining({ title: "Test Bug" }));
      expect(loadReport).toHaveBeenCalledWith("r1");
      expect(setView).toHaveBeenCalledWith("detail");
    });
  });

  it("does not navigate when updateReport fails during edit save", async () => {
    const updateReport = vi.fn().mockResolvedValue(false);
    const loadReport = vi.fn();
    const setView = vi.fn();
    mockUseBugs.mockReturnValue(
      baseBugsState({
        view: "edit",
        setView,
        updateReport,
        loadReport,
        selectedReport: { id: "r1", title: "Bug", description: "desc", category_id: "", page_url: "" },
      }),
    );
    render(<BugsClient />);
    fireEvent.click(await screen.findByTestId("form-submit-btn"));
    await waitFor(() => {
      expect(updateReport).toHaveBeenCalled();
    });
    expect(loadReport).not.toHaveBeenCalled();
    expect(setView).not.toHaveBeenCalledWith("detail");
  });

  it("cancel in edit view (from detail) calls setView('detail')", async () => {
    const setView = vi.fn();
    mockUseBugs.mockReturnValue(
      baseBugsState({
        view: "edit",
        setView,
        selectedReport: { id: "r1", title: "Bug", description: "desc", category_id: "", page_url: "" },
      }),
    );
    render(<BugsClient />);
    fireEvent.click(await screen.findByTestId("form-cancel-btn"));
    expect(setView).toHaveBeenCalledWith("detail");
  });

  it("edits from list then saves back to list (editOrigin=list)", async () => {
    const loadReport = vi.fn().mockResolvedValue(undefined);
    const setView = vi.fn();
    const updateReport = vi.fn().mockResolvedValue(true);
    const loadReports = vi.fn().mockResolvedValue(undefined);
    const backToList = vi.fn();
    mockUseBugs.mockReturnValue(
      baseBugsState({
        view: "list",
        loadReport,
        setView,
        updateReport,
        loadReports,
        backToList,
        selectedReport: { id: "r1", title: "Bug", description: "desc", category_id: "", page_url: "" },
      }),
    );
    const { rerender } = render(<BugsClient />);

    fireEvent.click(screen.getByTestId("edit-report-btn"));
    await waitFor(() => {
      expect(loadReport).toHaveBeenCalledWith("r1");
      expect(setView).toHaveBeenCalledWith("edit");
    });

    mockUseBugs.mockReturnValue(
      baseBugsState({
        view: "edit",
        setView,
        updateReport,
        loadReports,
        backToList,
        selectedReport: { id: "r1", title: "Bug", description: "desc", category_id: "", page_url: "" },
      }),
    );
    rerender(<BugsClient />);

    expect(await screen.findByText("backToList")).toBeInTheDocument();

    fireEvent.click(await screen.findByTestId("form-submit-btn"));
    await waitFor(() => {
      expect(updateReport).toHaveBeenCalledWith("r1", expect.objectContaining({ title: "Test Bug" }));
      expect(loadReports).toHaveBeenCalled();
      expect(backToList).toHaveBeenCalled();
    });
  });

  it("cancel in edit view (from list) calls backToList", async () => {
    const backToList = vi.fn();
    const loadReport = vi.fn().mockResolvedValue(undefined);
    const setView = vi.fn();
    mockUseBugs.mockReturnValue(
      baseBugsState({
        view: "list",
        backToList,
        loadReport,
        setView,
        selectedReport: { id: "r1", title: "Bug", description: "desc", category_id: "", page_url: "" },
      }),
    );
    const { rerender } = render(<BugsClient />);

    fireEvent.click(screen.getByTestId("edit-report-btn"));
    await waitFor(() => expect(setView).toHaveBeenCalledWith("edit"));

    mockUseBugs.mockReturnValue(
      baseBugsState({
        view: "edit",
        backToList,
        setView,
        selectedReport: { id: "r1", title: "Bug", description: "desc", category_id: "", page_url: "" },
      }),
    );
    rerender(<BugsClient />);

    fireEvent.click(await screen.findByTestId("form-cancel-btn"));
    expect(backToList).toHaveBeenCalled();
  });

  // ── Detail view ──

  it("renders BugsDetail when in detail view with selectedReport", async () => {
    mockUseBugs.mockReturnValue(
      baseBugsState({
        view: "detail",
        selectedReport: { id: "r1", title: "Bug" },
      }),
    );
    render(<BugsClient />);
    expect(await screen.findByTestId("bugs-detail")).toBeInTheDocument();
  });

  it("switches to edit view when detail edit is clicked", async () => {
    const setView = vi.fn();
    mockUseBugs.mockReturnValue(
      baseBugsState({
        view: "detail",
        setView,
        selectedReport: { id: "r1", title: "Bug" },
      }),
    );
    render(<BugsClient />);
    fireEvent.click(await screen.findByTestId("detail-edit-btn"));
    expect(setView).toHaveBeenCalledWith("edit");
  });

  it("deletes report from detail and returns to list", async () => {
    const deleteReport = vi.fn().mockResolvedValue(true);
    const backToList = vi.fn();
    const loadReports = vi.fn().mockResolvedValue(undefined);
    mockUseBugs.mockReturnValue(
      baseBugsState({
        view: "detail",
        deleteReport,
        backToList,
        loadReports,
        selectedReport: { id: "r1", title: "Bug" },
      }),
    );
    render(<BugsClient />);
    fireEvent.click(await screen.findByTestId("detail-delete-btn"));
    await waitFor(() => {
      expect(deleteReport).toHaveBeenCalledWith("r1");
      expect(backToList).toHaveBeenCalled();
      expect(loadReports).toHaveBeenCalled();
    });
  });

  it("calls updateReport and reloads on detail update", async () => {
    const updateReport = vi.fn().mockResolvedValue(true);
    const loadReport = vi.fn().mockResolvedValue(undefined);
    mockUseBugs.mockReturnValue(
      baseBugsState({
        view: "detail",
        updateReport,
        loadReport,
        selectedReport: { id: "r1", title: "Bug" },
      }),
    );
    render(<BugsClient />);
    fireEvent.click(await screen.findByTestId("detail-update-btn"));
    await waitFor(() => {
      expect(updateReport).toHaveBeenCalledWith("r1", { status: "closed" });
      expect(loadReport).toHaveBeenCalledWith("r1");
    });
  });

  it("does not reload after detail update when updateReport fails", async () => {
    const updateReport = vi.fn().mockResolvedValue(false);
    const loadReport = vi.fn();
    mockUseBugs.mockReturnValue(
      baseBugsState({
        view: "detail",
        updateReport,
        loadReport,
        selectedReport: { id: "r1", title: "Bug" },
      }),
    );
    render(<BugsClient />);
    fireEvent.click(await screen.findByTestId("detail-update-btn"));
    await waitFor(() => {
      expect(updateReport).toHaveBeenCalledWith("r1", { status: "closed" });
    });
    expect(loadReport).not.toHaveBeenCalled();
  });

  // ── Detail view loading ──

  it("shows loading in detail view when loading and no selected report", () => {
    mockUseBugs.mockReturnValue(baseBugsState({ view: "detail", isLoading: true, selectedReport: null }));
    render(<BugsClient />);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("does not show loading in detail view when selectedReport exists (even if isLoading)", () => {
    mockUseBugs.mockReturnValue(
      baseBugsState({
        view: "detail",
        isLoading: true,
        selectedReport: { id: "r1", title: "Bug" },
      }),
    );
    render(<BugsClient />);
    expect(screen.queryByText("loadingReports")).not.toBeInTheDocument();
  });

  // ── Confirm delete from list ──

  it("shows confirm modal when list delete is triggered", () => {
    render(<BugsClient />);
    fireEvent.click(screen.getByTestId("delete-report-btn"));
    expect(screen.getByTestId("confirm-modal")).toBeInTheDocument();
  });

  it("hides confirm modal when cancel is clicked", () => {
    render(<BugsClient />);
    fireEvent.click(screen.getByTestId("delete-report-btn"));
    expect(screen.getByTestId("confirm-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("cancel-modal-btn"));
    expect(screen.queryByTestId("confirm-modal")).not.toBeInTheDocument();
  });

  it("calls deleteReport and loadReports on confirm delete", async () => {
    const deleteReport = vi.fn().mockResolvedValue(true);
    const loadReports = vi.fn().mockResolvedValue(undefined);
    mockUseBugs.mockReturnValue(baseBugsState({ deleteReport, loadReports }));
    render(<BugsClient />);
    fireEvent.click(screen.getByTestId("delete-report-btn"));
    fireEvent.click(screen.getByTestId("confirm-btn"));
    await waitFor(() => {
      expect(deleteReport).toHaveBeenCalledWith("r1");
    });
  });

  // ── Page shell ──

  it("renders inside page shell", () => {
    render(<BugsClient />);
    expect(screen.getByTestId("page-shell")).toBeInTheDocument();
  });

  // ── No report in edit view = no form ──

  it("does not render edit form when selectedReport is null", () => {
    mockUseBugs.mockReturnValue(baseBugsState({ view: "edit", selectedReport: null }));
    render(<BugsClient />);
    expect(screen.queryByTestId("bugs-form")).not.toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EditableList from "./editable-list";
import type { ListItem } from "./use-site-content";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ fill, priority, unoptimized, ...props }: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return function MockMarkdown({ content }: { content: string }) {
      return React.createElement("div", { "data-testid": "markdown" }, content);
    };
  },
}));

function makeItem(overrides: Partial<ListItem> = {}): ListItem {
  return {
    id: "item-1",
    page: "home",
    section_key: "features",
    sort_order: 0,
    text_de: "German text",
    text_en: "English text",
    badge_de: "Neu",
    badge_en: "New",
    link_url: "",
    icon: "",
    icon_type: "preset",
    ...overrides,
  };
}

const defaultCallbacks = {
  onAdd: vi.fn().mockResolvedValue(makeItem({ id: "new" })),
  onUpdate: vi.fn().mockResolvedValue(undefined),
  onRemove: vi.fn().mockResolvedValue(undefined),
  onReorder: vi.fn().mockResolvedValue(undefined),
};

describe("EditableList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders list items with markdown content", () => {
    render(<EditableList items={[makeItem()]} canEdit={false} locale="de" {...defaultCallbacks} />);
    expect(screen.getByText("German text")).toBeTruthy();
  });

  it("shows English text when locale=en", () => {
    render(<EditableList items={[makeItem()]} canEdit={false} locale="en" {...defaultCallbacks} />);
    expect(screen.getByText("English text")).toBeTruthy();
  });

  it("shows badge when showBadges=true", () => {
    render(<EditableList items={[makeItem()]} canEdit={false} locale="de" showBadges {...defaultCallbacks} />);
    expect(screen.getByText("Neu")).toBeTruthy();
  });

  it("hides badge when showBadges=false", () => {
    render(<EditableList items={[makeItem()]} canEdit={false} locale="de" showBadges={false} {...defaultCallbacks} />);
    expect(screen.queryByText("Neu")).toBeNull();
  });

  it("shows add button when canEdit=true", () => {
    render(<EditableList items={[]} canEdit={true} locale="de" {...defaultCallbacks} />);
    expect(screen.getByLabelText("addItem")).toBeTruthy();
  });

  it("hides add button when canEdit=false", () => {
    render(<EditableList items={[]} canEdit={false} locale="de" {...defaultCallbacks} />);
    expect(screen.queryByLabelText("addItem")).toBeNull();
  });

  it("calls onAdd when add button is clicked", async () => {
    render(<EditableList items={[]} canEdit={true} locale="de" {...defaultCallbacks} />);
    fireEvent.click(screen.getByLabelText("addItem"));
    await waitFor(() => expect(defaultCallbacks.onAdd).toHaveBeenCalledOnce());
  });

  it("shows edit and remove buttons when canEdit=true", () => {
    render(<EditableList items={[makeItem()]} canEdit={true} locale="de" {...defaultCallbacks} />);
    expect(screen.getByLabelText("editItem")).toBeTruthy();
    expect(screen.getByLabelText("removeItem")).toBeTruthy();
  });

  it("calls onRemove when remove button is clicked", async () => {
    render(<EditableList items={[makeItem()]} canEdit={true} locale="de" {...defaultCallbacks} />);
    fireEvent.click(screen.getByLabelText("removeItem"));
    await waitFor(() => expect(defaultCallbacks.onRemove).toHaveBeenCalledWith("item-1"));
  });

  it("opens edit modal when edit button is clicked", () => {
    render(<EditableList items={[makeItem()]} canEdit={true} locale="de" {...defaultCallbacks} />);
    fireEvent.click(screen.getByLabelText("editItem"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByDisplayValue("German text")).toBeTruthy();
  });

  it("closes edit modal on backdrop click", () => {
    render(<EditableList items={[makeItem()]} canEdit={true} locale="de" {...defaultCallbacks} />);
    fireEvent.click(screen.getByLabelText("editItem"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByText("editItem").closest(".editable-list-modal-backdrop")!);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("saves edits via onUpdate", async () => {
    render(<EditableList items={[makeItem()]} canEdit={true} locale="de" {...defaultCallbacks} />);
    fireEvent.click(screen.getByLabelText("editItem"));
    fireEvent.change(screen.getByDisplayValue("German text"), { target: { value: "Updated" } });
    fireEvent.click(screen.getByLabelText("save"));
    await waitFor(() => expect(defaultCallbacks.onUpdate).toHaveBeenCalledOnce());
  });

  it("closes edit modal on cancel", () => {
    render(<EditableList items={[makeItem()]} canEdit={true} locale="de" {...defaultCallbacks} />);
    fireEvent.click(screen.getByLabelText("editItem"));
    fireEvent.click(screen.getByLabelText("cancel"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows error when onAdd throws", async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error("Add failed"));
    render(<EditableList items={[]} canEdit={true} locale="de" {...defaultCallbacks} onAdd={onAdd} />);
    fireEvent.click(screen.getByLabelText("addItem"));
    await waitFor(() => expect(screen.getByText("Add failed")).toBeTruthy());
  });

  it("shows error when onRemove throws", async () => {
    const onRemove = vi.fn().mockRejectedValue(new Error("Remove failed"));
    render(<EditableList items={[makeItem()]} canEdit={true} locale="de" {...defaultCallbacks} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText("removeItem"));
    await waitFor(() => expect(screen.getByText("Remove failed")).toBeTruthy());
  });

  it("dismisses error on close button click", async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error("Oops"));
    render(<EditableList items={[]} canEdit={true} locale="de" {...defaultCallbacks} onAdd={onAdd} />);
    fireEvent.click(screen.getByLabelText("addItem"));
    await waitFor(() => expect(screen.getByText("Oops")).toBeTruthy());
    fireEvent.click(screen.getByLabelText("closeError"));
    expect(screen.queryByText("Oops")).toBeNull();
  });

  it("renders preset icon emoji when showIcons=true", () => {
    render(
      <EditableList
        items={[makeItem({ icon: "star", icon_type: "preset" })]}
        canEdit={false}
        locale="de"
        showIcons
        {...defaultCallbacks}
      />,
    );
    expect(screen.getByText("⭐")).toBeTruthy();
  });

  it("renders custom icon image when showIcons=true and icon_type=custom", () => {
    const { container } = render(
      <EditableList
        items={[makeItem({ icon: "https://example.com/icon.svg", icon_type: "custom" })]}
        canEdit={false}
        locale="de"
        showIcons
        {...defaultCallbacks}
      />,
    );
    expect(container.querySelector(".editable-list-icon-custom")).toBeTruthy();
  });

  it("applies className", () => {
    const { container } = render(
      <EditableList items={[]} canEdit={false} locale="de" className="extra" {...defaultCallbacks} />,
    );
    expect(container.querySelector(".editable-list.extra")).toBeTruthy();
  });

  it("shows badge modal fields in edit modal when showBadges=true", () => {
    render(<EditableList items={[makeItem()]} canEdit={true} locale="de" showBadges {...defaultCallbacks} />);
    fireEvent.click(screen.getByLabelText("editItem"));
    expect(screen.getByLabelText("Badge (DE)")).toBeTruthy();
    expect(screen.getByLabelText("Badge (EN)")).toBeTruthy();
  });

  it("shows icon picker in edit modal when showIcons=true", () => {
    render(<EditableList items={[makeItem()]} canEdit={true} locale="de" showIcons {...defaultCallbacks} />);
    fireEvent.click(screen.getByLabelText("editItem"));
    expect(screen.getByLabelText("noIcon")).toBeTruthy();
  });

  it("shows link URL field in edit modal", () => {
    render(<EditableList items={[makeItem()]} canEdit={true} locale="de" {...defaultCallbacks} />);
    fireEvent.click(screen.getByLabelText("editItem"));
    expect(screen.getByLabelText("Link URL (optional)")).toBeTruthy();
  });
});

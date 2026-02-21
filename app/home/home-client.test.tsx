// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("a", props, children);
  },
}));

const mockUseSiteContent = vi.fn();
vi.mock("../components/use-site-content", () => ({
  useSiteContent: (...args: any[]) => mockUseSiteContent(...args),
}));
vi.mock("../components/editable-text", () => ({
  __esModule: true,
  default: ({ value, className, as: Tag = "span", canEdit, onSave }: any) => {
    const React = require("react");
    return React.createElement(
      Tag || "span",
      {
        className,
        "data-testid": `et-${value}`,
        "data-canedit": canEdit ? "true" : "false",
        "data-onsave": onSave ? "true" : "false",
      },
      value,
      onSave &&
        React.createElement(
          "button",
          {
            key: "s",
            "data-testid": `save-${value}`,
            onClick: () => onSave("test-de", "test-en"),
          },
          "save",
        ),
    );
  },
}));
vi.mock("../components/editable-list", () => ({
  __esModule: true,
  default: ({ items, canEdit, showBadges, onAdd, onUpdate, onRemove, onReorder }: any) => {
    const React = require("react");
    return React.createElement(
      "div",
      {
        "data-testid": "editable-list",
        "data-itemcount": items?.length ?? 0,
        "data-canedit": canEdit ? "true" : "false",
        "data-showbadges": showBadges ? "true" : "false",
      },
      onAdd &&
        React.createElement(
          "button",
          { key: "add", "data-testid": "list-add-btn", onClick: () => onAdd("de", "en", "extra") },
          "add",
        ),
      onUpdate &&
        React.createElement(
          "button",
          { key: "upd", "data-testid": "list-update-btn", onClick: () => onUpdate("id1", "de", "en") },
          "update",
        ),
      onRemove &&
        React.createElement(
          "button",
          { key: "rem", "data-testid": "list-remove-btn", onClick: () => onRemove("id1") },
          "remove",
        ),
      onReorder &&
        React.createElement(
          "button",
          { key: "reo", "data-testid": "list-reorder-btn", onClick: () => onReorder([]) },
          "reorder",
        ),
    );
  },
}));
vi.mock("../components/cms-page-shell", () => ({
  __esModule: true,
  default: ({ children, isLoaded, error, title, heroSlot, actions, contentClassName }: any) => {
    const React = require("react");
    if (error) return React.createElement("div", { "data-testid": "cms-error" }, error);
    if (!isLoaded) return React.createElement("div", { "data-testid": "cms-loading" }, "Loading...");
    return React.createElement(
      "div",
      { "data-testid": "cms-shell", "data-classname": contentClassName },
      React.createElement("h1", null, title),
      actions && React.createElement("div", { "data-testid": "cms-actions" }, actions),
      heroSlot,
      children,
    );
  },
}));
vi.mock("../components/public-auth-actions", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "auth-actions" });
  },
}));
vi.mock("../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, variant, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", { ...props, "data-variant": variant }, children);
  },
}));

import HomeClient from "./home-client";

function baseSiteContent(overrides: Record<string, any> = {}) {
  return {
    lists: {},
    canEdit: false,
    userId: "u1",
    supabase: {},
    locale: "de",
    isLoaded: true,
    error: null,
    c: (_s: string, _f: string, fallback: string) => fallback,
    cEn: () => undefined,
    cDe: () => undefined,
    saveField: vi.fn(),
    addListItem: vi.fn(),
    updateListItem: vi.fn(),
    removeListItem: vi.fn(),
    reorderListItems: vi.fn(),
    ...overrides,
  };
}

describe("HomeClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSiteContent.mockReturnValue(baseSiteContent());
  });

  it("renders loading state when not loaded", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ isLoaded: false }));
    render(<HomeClient />);
    expect(screen.getByTestId("cms-loading")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ error: "Load failed" }));
    render(<HomeClient />);
    expect(screen.getByTestId("cms-error")).toBeInTheDocument();
    expect(screen.getByText("Load failed")).toBeInTheDocument();
  });

  it("calls useSiteContent with 'home'", () => {
    render(<HomeClient />);
    expect(mockUseSiteContent).toHaveBeenCalledWith("home");
  });

  it("renders all sections when loaded", () => {
    render(<HomeClient />);
    expect(screen.getByTestId("cms-shell")).toBeInTheDocument();
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("passes contentClassName to CmsPageShell", () => {
    render(<HomeClient />);
    expect(screen.getByTestId("cms-shell").dataset.classname).toBe("content-constrained");
  });

  it("renders PublicAuthActions in actions slot", () => {
    render(<HomeClient />);
    expect(screen.getByTestId("cms-actions")).toBeInTheDocument();
    expect(screen.getByTestId("auth-actions")).toBeInTheDocument();
  });

  it("renders hero banner with correct images", () => {
    const { container } = render(<HomeClient />);
    expect(container.querySelector('img[src="/assets/banners/banner_gold_dragon.webp"]')).toBeTruthy();
    expect(container.querySelector('img[src="/assets/vip/decor_light_1.png"]')).toBeTruthy();
    expect(container.querySelector('img[src="/assets/vip/components_decor_6.png"]')).toBeTruthy();
  });

  it("renders hero title and subtitle", () => {
    render(<HomeClient />);
    expect(screen.getByText("heroTitle")).toBeInTheDocument();
    expect(screen.getByText("heroSubtitle")).toBeInTheDocument();
  });

  it("renders About Us section with title, badge, and body", () => {
    render(<HomeClient />);
    expect(screen.getByText("missionTitle")).toBeInTheDocument();
    expect(screen.getByText("missionBadge")).toBeInTheDocument();
    expect(screen.getByText("missionText1")).toBeInTheDocument();
  });

  it("renders requirements and apply sections in About Us", () => {
    render(<HomeClient />);
    expect(screen.getByText("requirementsTitle")).toBeInTheDocument();
    expect(screen.getByText("aboutRequirements")).toBeInTheDocument();
    expect(screen.getByText("applyTitle")).toBeInTheDocument();
    expect(screen.getByText("aboutContact")).toBeInTheDocument();
  });

  it("renders extras and disclaimer in About Us", () => {
    render(<HomeClient />);
    expect(screen.getByText("aboutExtras")).toBeInTheDocument();
    expect(screen.getByText("aboutDisclaimer")).toBeInTheDocument();
  });

  it("renders Why Join section with title and text", () => {
    render(<HomeClient />);
    expect(screen.getByText("whyJoinTitle")).toBeInTheDocument();
    expect(screen.getByText("whyJoinText")).toBeInTheDocument();
  });

  it("renders Clan News section with title and badge", () => {
    render(<HomeClient />);
    expect(screen.getByText("publicNews")).toBeInTheDocument();
    expect(screen.getByText("publicNewsBadge")).toBeInTheDocument();
    expect(screen.getByText("publicNewsText")).toBeInTheDocument();
  });

  it("renders How It Works section", () => {
    render(<HomeClient />);
    expect(screen.getByText("howItWorksTitle")).toBeInTheDocument();
    expect(screen.getByText("howItWorksText1")).toBeInTheDocument();
    expect(screen.getByText("howItWorksText2")).toBeInTheDocument();
  });

  it("renders Contact section", () => {
    render(<HomeClient />);
    expect(screen.getByText("contactTitle")).toBeInTheDocument();
    expect(screen.getByText("contactText")).toBeInTheDocument();
  });

  it("renders editable lists for whyJoin, publicNews, contact", () => {
    render(<HomeClient />);
    const lists = screen.getAllByTestId("editable-list");
    expect(lists.length).toBe(3);
  });

  it("passes list items to editable lists when available", () => {
    const whyJoinItems = [{ id: "1", content_de: "A" }];
    const publicNewsItems = [{ id: "2", content_de: "B" }];
    const contactItems = [{ id: "3", content_de: "C" }];
    mockUseSiteContent.mockReturnValue(
      baseSiteContent({
        lists: {
          whyJoin: whyJoinItems,
          publicNews: publicNewsItems,
          contact: contactItems,
        },
      }),
    );
    render(<HomeClient />);
    const lists = screen.getAllByTestId("editable-list");
    expect(lists[0].dataset.itemcount).toBe("1");
    expect(lists[1].dataset.itemcount).toBe("1");
    expect(lists[2].dataset.itemcount).toBe("1");
  });

  it("passes empty lists when no list items exist", () => {
    render(<HomeClient />);
    const lists = screen.getAllByTestId("editable-list");
    lists.forEach((list) => {
      expect(list.dataset.itemcount).toBe("0");
    });
  });

  it("renders learn more link to /about", () => {
    render(<HomeClient />);
    const aboutLink = screen.getByRole("link", { name: "learnMoreAbout" });
    expect(aboutLink).toHaveAttribute("href", "/about");
  });

  it("renders apply now link to /auth/register", () => {
    render(<HomeClient />);
    const registerLink = screen.getByRole("link", { name: "applyNow" });
    expect(registerLink).toHaveAttribute("href", "/auth/register");
  });

  it("renders learn more button with ornate3 variant", () => {
    render(<HomeClient />);
    const learnMoreBtn = screen.getByText("learnMoreAbout");
    expect(learnMoreBtn.dataset.variant).toBe("ornate3");
  });

  it("renders apply now button with hero variant", () => {
    render(<HomeClient />);
    const applyBtn = screen.getByText("applyNow");
    expect(applyBtn.dataset.variant).toBe("hero");
  });

  it("propagates canEdit=false to EditableText components", () => {
    const { container } = render(<HomeClient />);
    const editableTexts = container.querySelectorAll('[data-testid^="et-"]');
    editableTexts.forEach((el) => {
      expect((el as HTMLElement).dataset.canedit).toBe("false");
    });
  });

  it("propagates canEdit=true to EditableText components", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ canEdit: true }));
    const { container } = render(<HomeClient />);
    const editableTexts = container.querySelectorAll('[data-testid^="et-"]');
    editableTexts.forEach((el) => {
      expect((el as HTMLElement).dataset.canedit).toBe("true");
    });
  });

  it("propagates canEdit to editable lists", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ canEdit: true }));
    render(<HomeClient />);
    const lists = screen.getAllByTestId("editable-list");
    lists.forEach((list) => {
      expect(list.dataset.canedit).toBe("true");
    });
  });

  it("passes showBadges to editable lists", () => {
    render(<HomeClient />);
    const lists = screen.getAllByTestId("editable-list");
    lists.forEach((list) => {
      expect(list.dataset.showbadges).toBe("true");
    });
  });

  it("uses CMS content when available via c()", () => {
    mockUseSiteContent.mockReturnValue(
      baseSiteContent({
        c: (section: string, field: string) =>
          section === "aboutUs" && field === "title" ? "Custom About Title" : "fallback",
      }),
    );
    render(<HomeClient />);
    expect(screen.getByText("Custom About Title")).toBeInTheDocument();
  });

  it("renders all editable text fields with onSave handlers", () => {
    const { container } = render(<HomeClient />);
    const editableTexts = container.querySelectorAll('[data-testid^="et-"]');
    editableTexts.forEach((el) => {
      expect((el as HTMLElement).dataset.onsave).toBe("true");
    });
  });

  it("renders distinct sections with correct CSS classes", () => {
    const { container } = render(<HomeClient />);
    expect(container.querySelector(".home-about-card")).toBeTruthy();
    expect(container.querySelector(".home-whyjoin-card")).toBeTruthy();
    expect(container.querySelector(".home-about-bg")).toBeTruthy();
    expect(container.querySelector(".home-whyjoin-bg")).toBeTruthy();
  });

  it("does not render shell content when in error state", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ error: "Something failed" }));
    render(<HomeClient />);
    expect(screen.queryByTestId("cms-shell")).not.toBeInTheDocument();
    expect(screen.queryByText("missionTitle")).not.toBeInTheDocument();
  });

  it("does not render shell content when still loading", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ isLoaded: false }));
    render(<HomeClient />);
    expect(screen.queryByTestId("cms-shell")).not.toBeInTheDocument();
    expect(screen.queryByText("missionTitle")).not.toBeInTheDocument();
  });

  /* ── Callback coverage: saveField via EditableText onSave ── */

  it("calls saveField with correct section and field for each EditableText", () => {
    const saveField = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ saveField }));
    render(<HomeClient />);

    const cases: [string, string, string][] = [
      ["missionTitle", "aboutUs", "title"],
      ["missionBadge", "aboutUs", "badge"],
      ["missionText1", "aboutUs", "intro"],
      ["aboutRequirements", "aboutUs", "requirements"],
      ["aboutContact", "aboutUs", "contact"],
      ["aboutExtras", "aboutUs", "extras"],
      ["aboutDisclaimer", "aboutUs", "disclaimer"],
      ["whyJoinTitle", "whyJoin", "title"],
      ["whyJoinText", "whyJoin", "text"],
      ["publicNews", "publicNews", "title"],
      ["publicNewsText", "publicNews", "text"],
      ["howItWorksTitle", "howItWorks", "title"],
      ["howItWorksText1", "howItWorks", "text1"],
      ["howItWorksText2", "howItWorks", "text2"],
      ["contactTitle", "contact", "title"],
      ["contactText", "contact", "text"],
    ];

    cases.forEach(([testId, section, field]) => {
      saveField.mockClear();
      fireEvent.click(screen.getByTestId(`save-${testId}`));
      expect(saveField).toHaveBeenCalledWith(section, field, "test-de", "test-en");
    });
  });

  /* ── Callback coverage: addListItem via EditableList onAdd ── */

  it("calls addListItem with correct list key for each EditableList", () => {
    const addListItem = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ addListItem }));
    render(<HomeClient />);
    const addButtons = screen.getAllByTestId("list-add-btn");

    fireEvent.click(addButtons[0]);
    expect(addListItem).toHaveBeenCalledWith("whyJoin", "de", "en", "extra");
    addListItem.mockClear();

    fireEvent.click(addButtons[1]);
    expect(addListItem).toHaveBeenCalledWith("publicNews", "de", "en", "extra");
    addListItem.mockClear();

    fireEvent.click(addButtons[2]);
    expect(addListItem).toHaveBeenCalledWith("contact", "de", "en", "extra");
  });

  /* ── Callback coverage: updateListItem via EditableList onUpdate ── */

  it("passes updateListItem to each EditableList", () => {
    const updateListItem = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ updateListItem }));
    render(<HomeClient />);
    const updateButtons = screen.getAllByTestId("list-update-btn");
    updateButtons.forEach((btn) => {
      updateListItem.mockClear();
      fireEvent.click(btn);
      expect(updateListItem).toHaveBeenCalledWith("id1", "de", "en");
    });
  });

  /* ── Callback coverage: removeListItem via EditableList onRemove ── */

  it("passes removeListItem to each EditableList", () => {
    const removeListItem = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ removeListItem }));
    render(<HomeClient />);
    const removeButtons = screen.getAllByTestId("list-remove-btn");
    removeButtons.forEach((btn) => {
      removeListItem.mockClear();
      fireEvent.click(btn);
      expect(removeListItem).toHaveBeenCalledWith("id1");
    });
  });

  /* ── Callback coverage: reorderListItems via EditableList onReorder ── */

  it("passes reorderListItems to each EditableList", () => {
    const reorderListItems = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ reorderListItems }));
    render(<HomeClient />);
    const reorderButtons = screen.getAllByTestId("list-reorder-btn");
    reorderButtons.forEach((btn) => {
      reorderListItems.mockClear();
      fireEvent.click(btn);
      expect(reorderListItems).toHaveBeenCalledWith([]);
    });
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import BannerPicker from "./banner-picker";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ fill, priority, unoptimized, ...props }: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));
vi.mock("@/lib/constants/banner-presets", () => ({
  isCustomBanner: vi.fn((url: string, presets: any[]) => url !== "" && !presets.some((p: any) => p.src === url)),
}));

const presets = [
  { src: "/banners/preset-a.png", label: "Preset A" },
  { src: "/banners/preset-b.png", label: "Preset B" },
];

function makeProps(overrides: any = {}): any {
  return {
    presets,
    value: "",
    onChange: vi.fn(),
    onUpload: vi.fn(),
    isUploading: false,
    fileRef: createRef<HTMLInputElement>(),
    labelId: "banner-label",
    ...overrides,
  };
}

describe("BannerPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders no-banner button", () => {
    render(<BannerPicker {...makeProps()} />);
    expect(screen.getByText("noBanner")).toBeInTheDocument();
  });

  it("renders preset buttons", () => {
    render(<BannerPicker {...makeProps()} />);
    expect(screen.getByTitle("Preset A")).toBeInTheDocument();
    expect(screen.getByTitle("Preset B")).toBeInTheDocument();
  });

  it("marks no-banner as pressed when value is empty", () => {
    render(<BannerPicker {...makeProps({ value: "" })} />);
    expect(screen.getByText("noBanner")).toHaveAttribute("aria-pressed", "true");
  });

  it("marks preset as pressed when value matches", () => {
    render(<BannerPicker {...makeProps({ value: "/banners/preset-a.png" })} />);
    expect(screen.getByTitle("Preset A")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTitle("Preset B")).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange with empty string when no-banner clicked", () => {
    const onChange = vi.fn();
    render(<BannerPicker {...makeProps({ onChange, value: "/banners/preset-a.png" })} />);
    fireEvent.click(screen.getByText("noBanner"));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("calls onChange with preset src when preset clicked", () => {
    const onChange = vi.fn();
    render(<BannerPicker {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByTitle("Preset B"));
    expect(onChange).toHaveBeenCalledWith("/banners/preset-b.png");
  });

  it("shows live preview when value is set", () => {
    render(<BannerPicker {...makeProps({ value: "/banners/preset-a.png" })} />);
    const preview = screen.getByAltText("selectedBanner");
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveAttribute("src", "/banners/preset-a.png");
  });

  it("does not show live preview when value is empty", () => {
    render(<BannerPicker {...makeProps({ value: "" })} />);
    expect(screen.queryByAltText("selectedBanner")).not.toBeInTheDocument();
  });

  it("shows uploading message when isUploading is true", () => {
    render(<BannerPicker {...makeProps({ isUploading: true })} />);
    expect(screen.getByText("uploadingImage")).toBeInTheDocument();
  });

  it("does not show uploading message when isUploading is false", () => {
    render(<BannerPicker {...makeProps({ isUploading: false })} />);
    expect(screen.queryByText("uploadingImage")).not.toBeInTheDocument();
  });

  it("renders custom upload button", () => {
    render(<BannerPicker {...makeProps()} />);
    expect(screen.getByText("customBanner")).toBeInTheDocument();
  });

  it("has hidden file input for upload", () => {
    const { container } = render(<BannerPicker {...makeProps()} />);
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute("accept", "image/*");
  });
});

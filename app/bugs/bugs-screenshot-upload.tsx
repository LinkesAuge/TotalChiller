"use client";

import { useCallback, useRef, useState, type DragEvent, type ReactElement } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { BUG_MAX_SCREENSHOTS, BUG_MAX_SCREENSHOT_BYTES, BUG_ACCEPTED_IMAGE_TYPES } from "@/lib/constants";

interface UploadedScreenshot {
  readonly storagePath: string;
  readonly publicUrl: string;
  readonly fileName: string;
}

interface BugsScreenshotUploadProps {
  readonly screenshots: readonly UploadedScreenshot[];
  readonly onAdd: (screenshot: UploadedScreenshot) => void;
  readonly onRemove: (index: number) => void;
}

function BugsScreenshotUpload({ screenshots, onAdd, onRemove }: BugsScreenshotUploadProps): ReactElement {
  const t = useTranslations("bugs.screenshot");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      if (screenshots.length >= BUG_MAX_SCREENSHOTS) return;

      if (!BUG_ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof BUG_ACCEPTED_IMAGE_TYPES)[number])) {
        return;
      }
      if (file.size > BUG_MAX_SCREENSHOT_BYTES) {
        return;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/bugs/screenshots", { method: "POST", body: formData });
        if (!res.ok) return;

        const json = (await res.json()) as {
          data: { storage_path: string; public_url: string; file_name: string };
        };
        onAdd({
          storagePath: json.data.storage_path,
          publicUrl: json.data.public_url,
          fileName: json.data.file_name,
        });
      } finally {
        setIsUploading(false);
      }
    },
    [screenshots.length, onAdd],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = BUG_MAX_SCREENSHOTS - screenshots.length;
      const toUpload = Array.from(files).slice(0, remaining);
      for (const file of toUpload) {
        void uploadFile(file);
      }
    },
    [screenshots.length, uploadFile],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const atMax = screenshots.length >= BUG_MAX_SCREENSHOTS;

  return (
    <div>
      {!atMax && (
        <div
          className={`bugs-screenshot-upload${isDragOver ? " dragover" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          {isUploading ? t("uploading") : t("dragDrop")}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {atMax && <div className="alert info">{t("maxReached", { max: String(BUG_MAX_SCREENSHOTS) })}</div>}

      {screenshots.length > 0 && (
        <div className="bugs-upload-previews">
          {screenshots.map((ss, idx) => (
            <div key={ss.storagePath} className="bugs-upload-preview">
              <Image src={ss.publicUrl} alt={ss.fileName} fill sizes="80px" unoptimized />
              <button
                className="bugs-upload-remove"
                type="button"
                onClick={() => onRemove(idx)}
                aria-label={t("remove")}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BugsScreenshotUpload;
export type { UploadedScreenshot };

/**
 * Asset Scanner Script
 *
 * Scans Design/Resources/Assets, auto-categorizes by filename pattern,
 * reads image dimensions, copies to public/design-assets/{category}/,
 * and upserts rows into the design_assets Supabase table.
 *
 * Usage: npx tsx scripts/scan-design-assets.ts
 *
 * Flags:
 *   --dry-run    Log actions without copying files or writing to DB
 *   --skip-copy  Skip the file copy step (DB upsert only)
 *   --skip-db    Skip the DB upsert step (copy only)
 */

import * as fs from "fs";
import * as path from "path";
import imageSize from "image-size";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SOURCE_DIR = path.resolve(__dirname, "../Design/Resources/Assets");
const DEST_DIR = path.resolve(__dirname, "../public/design-assets");
const PUBLIC_PREFIX = "/design-assets";

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_COPY = process.argv.includes("--skip-copy");
const SKIP_DB = process.argv.includes("--skip-db");

/* ------------------------------------------------------------------ */
/*  Category patterns — priority order, first match wins              */
/* ------------------------------------------------------------------ */

interface CategoryPattern {
  category: string;
  pattern: RegExp;
  tags: string[];
}

const CATEGORY_PATTERNS: CategoryPattern[] = [
  { category: "fort-unit", pattern: /forticon/i, tags: ["unit", "military"] },
  { category: "button", pattern: /button|btn/i, tags: ["interactive", "ui"] },
  { category: "banner", pattern: /banner/i, tags: ["decorative", "header"] },
  { category: "chest", pattern: /chest/i, tags: ["reward", "loot"] },
  { category: "frame", pattern: /frame/i, tags: ["border", "container"] },
  { category: "arrow", pattern: /arrow/i, tags: ["navigation", "indicator"] },
  { category: "icon", pattern: /icon/i, tags: ["ui", "symbol"] },
  { category: "background", pattern: /backs_|_bg|background|back\./i, tags: ["surface", "texture"] },
  { category: "badge", pattern: /badge|medal|achieve/i, tags: ["reward", "status"] },
  { category: "shield", pattern: /shield/i, tags: ["defense", "emblem"] },
  { category: "scroll", pattern: /scroll/i, tags: ["decorative", "parchment"] },
  { category: "effect", pattern: /effect|glow|particle|spark/i, tags: ["vfx", "animation"] },
  { category: "flag", pattern: /flag/i, tags: ["country", "emblem"] },
  { category: "tab-panel", pattern: /tab_|tab\./i, tags: ["ui", "navigation"] },
  { category: "widget", pattern: /widget|panel|menu/i, tags: ["ui", "container"] },
  { category: "decoration", pattern: /decor|ornament/i, tags: ["decorative", "embellishment"] },
  { category: "tech", pattern: /tech_/i, tags: ["research", "upgrade"] },
  { category: "weapon", pattern: /sword|weapon/i, tags: ["military", "equipment"] },
  { category: "clan", pattern: /clan_/i, tags: ["social", "group"] },
  { category: "map", pattern: /map_/i, tags: ["world", "terrain"] },
  { category: "progress", pattern: /progress|bar_/i, tags: ["ui", "indicator"] },
  { category: "character", pattern: /avatar|face|portrait|_head|_face/i, tags: ["character", "portrait"] },
  { category: "ribbon", pattern: /ribbon/i, tags: ["decorative", "label"] },
  { category: "cursor", pattern: /cursor/i, tags: ["ui", "pointer"] },
  { category: "drapery", pattern: /drapery|curtain|drape/i, tags: ["decorative", "fabric"] },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function categorizeFile(filename: string): { category: string; tags: string[] } {
  const lower = filename.toLowerCase();
  for (const { category, pattern, tags } of CATEGORY_PATTERNS) {
    if (pattern.test(lower)) {
      return { category, tags: [...tags] };
    }
  }
  return { category: "uncategorized", tags: [] };
}

interface AssetRecord {
  filename: string;
  original_path: string;
  public_path: string;
  category: string;
  tags: string[];
  width: number | null;
  height: number | null;
  file_size_bytes: number;
}

function getImageDimensions(filePath: string): { width: number | null; height: number | null } {
  try {
    const buffer = fs.readFileSync(filePath);
    const result = imageSize(new Uint8Array(buffer));
    return { width: result.width ?? null, height: result.height ?? null };
  } catch {
    return { width: null, height: null };
  }
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  console.log("=== Design Asset Scanner ===");
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Dest:   ${DEST_DIR}`);
  if (DRY_RUN) console.log("** DRY RUN — no files will be written **");
  if (SKIP_COPY) console.log("** Skipping file copy **");
  if (SKIP_DB) console.log("** Skipping DB upsert **");
  console.log("");

  // 1. Read source directory
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(SOURCE_DIR).filter((f) => /\.png$/i.test(f));
  console.log(`Found ${allFiles.length} PNG files`);

  // 2. Process each file
  const records: AssetRecord[] = [];
  const categoryStats: Record<string, number> = {};

  for (const filename of allFiles) {
    const srcPath = path.join(SOURCE_DIR, filename);
    const stat = fs.statSync(srcPath);
    const { category, tags } = categorizeFile(filename);
    const { width, height } = getImageDimensions(srcPath);

    const destSubdir = path.join(DEST_DIR, category);
    const destPath = path.join(destSubdir, filename);
    const publicPath = `${PUBLIC_PREFIX}/${category}/${filename}`;

    // Copy file
    if (!SKIP_COPY && !DRY_RUN) {
      ensureDir(destSubdir);
      fs.copyFileSync(srcPath, destPath);
    }

    records.push({
      filename,
      original_path: path.relative(path.resolve(__dirname, ".."), srcPath).replace(/\\/g, "/"),
      public_path: publicPath,
      category,
      tags,
      width,
      height,
      file_size_bytes: stat.size,
    });

    categoryStats[category] = (categoryStats[category] ?? 0) + 1;
  }

  // 3. Print stats
  console.log("\nCategory breakdown:");
  const sorted = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sorted) {
    console.log(`  ${cat}: ${count}`);
  }
  console.log(`  TOTAL: ${records.length}`);

  // 4. Upsert to Supabase
  if (!SKIP_DB && !DRY_RUN) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    console.log("\nUpserting to Supabase...");

    // Batch upsert in chunks of 500
    const BATCH_SIZE = 500;
    let upserted = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("design_assets").upsert(batch, { onConflict: "filename" });

      if (error) {
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
      } else {
        upserted += batch.length;
        console.log(`  Upserted ${upserted}/${records.length}`);
      }
    }

    console.log(`\nDone. ${upserted} records upserted.`);
  } else {
    console.log("\nDB upsert skipped.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

#!/usr/bin/env node
// gen-manifest.mjs — regenerates manifest.json from page images in an issue directory.
//
// Usage:
//   node tools/gen-manifest.mjs --issueDir=<folderName>
//   node tools/gen-manifest.mjs <fullPath> [--publisher <slug>] [--comic <slug>] [--issue-slug <slug>] [--title <title>]
//
// --issueDir=<name>  folder name under issues/ (e.g. issue-001). Reads publisher/comic/slug/title
//                    from the existing manifest.json in that directory.
//
// <fullPath>         full path to issue dir (for local use). Publisher/comic/etc can be passed
//                    as flags or will be derived from the existing manifest / directory name.
//
// In both modes, the tool:
//   - Scans published/ for PNG/JPEG/WebP images and reads their dimensions
//   - Detects dialogue.txt and layout.json and adds optional fields
//   - Writes published/manifest.json

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, basename, extname, resolve } from "node:path";

// --- Image dimension readers ---

function readPngDimensions(buf) {
  if (buf.length < 24) return null;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) return null;
  const width = (buf[16] << 24) | (buf[17] << 16) | (buf[18] << 8) | buf[19];
  const height = (buf[20] << 24) | (buf[21] << 16) | (buf[22] << 8) | buf[23];
  return { width: width >>> 0, height: height >>> 0 };
}

function readJpegDimensions(buf) {
  if (buf.length < 4) return null;
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length - 8) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    const segLen = (buf[i + 2] << 8) | buf[i + 3];
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      const height = (buf[i + 5] << 8) | buf[i + 6];
      const width = (buf[i + 7] << 8) | buf[i + 8];
      return { width, height };
    }
    i += 2 + segLen;
  }
  return null;
}

function readWebpDimensions(buf) {
  if (buf.length < 30) return null;
  const riff = String.fromCharCode(buf[0], buf[1], buf[2], buf[3]);
  const webp = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]);
  if (riff !== "RIFF" || webp !== "WEBP") return null;
  const chunk = String.fromCharCode(buf[12], buf[13], buf[14], buf[15]);
  if (chunk === "VP8 " && buf.length >= 30) {
    const rawW = buf[26] | (buf[27] << 8);
    const rawH = buf[28] | (buf[29] << 8);
    return { width: rawW & 0x3fff, height: rawH & 0x3fff };
  }
  if (chunk === "VP8L" && buf.length >= 25) {
    const bits = buf[21] | (buf[22] << 8) | (buf[23] << 16) | (buf[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X" && buf.length >= 30) {
    return {
      width: (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1,
      height: (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1,
    };
  }
  return null;
}

function getImageDimensions(buf, ext) {
  const e = ext.toLowerCase();
  if (e === ".png") return readPngDimensions(buf);
  if (e === ".jpg" || e === ".jpeg") return readJpegDimensions(buf);
  if (e === ".webp") return readWebpDimensions(buf);
  return null;
}

// --- Argument parsing ---

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node tools/gen-manifest.mjs --issueDir=<folderName>");
  console.error("       node tools/gen-manifest.mjs <fullIssuePath> [--publisher <slug>] ...");
  process.exit(1);
}

let issueDirName = null;  // folder name only (under issues/)
let issueFullPath = null; // full path
let publisherSlug = "";
let comicSlug = "";
let issueSlug = "";
let issueTitle = "";

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--issueDir=")) {
    issueDirName = args[i].slice("--issueDir=".length);
  } else if (args[i] === "--publisher") {
    publisherSlug = args[++i] || "";
  } else if (args[i] === "--comic") {
    comicSlug = args[++i] || "";
  } else if (args[i] === "--issue-slug") {
    issueSlug = args[++i] || "";
  } else if (args[i] === "--title") {
    issueTitle = args[++i] || "";
  } else if (!args[i].startsWith("--")) {
    issueFullPath = resolve(args[i]);
  }
}

// Resolve the full path
if (issueDirName) {
  issueFullPath = resolve("issues", issueDirName);
} else if (!issueFullPath) {
  console.error("No issue directory specified.");
  process.exit(1);
}

const publishedDir = join(issueFullPath, "published");
const existingManifestPath = join(publishedDir, "manifest.json");

// Read existing manifest to fill in any missing metadata
let existingManifest = null;
try {
  const raw = await readFile(existingManifestPath, "utf-8");
  existingManifest = JSON.parse(raw);
} catch {
  // no existing manifest — that's fine for fresh runs with explicit flags
}

if (!publisherSlug) publisherSlug = existingManifest?.publisher?.slug || "";
if (!comicSlug)    comicSlug    = existingManifest?.comic?.slug    || "";
if (!issueSlug)    issueSlug    = existingManifest?.issue?.slug    || basename(issueFullPath);
if (!issueTitle)   issueTitle   = existingManifest?.issue?.title   || issueSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// --- Scan for page images ---

const entries = await readdir(publishedDir).catch(() => {
  console.error(`Cannot read directory: ${publishedDir}`);
  process.exit(1);
});

const imageExts = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const imageFiles = entries
  .filter((f) => imageExts.has(extname(f).toLowerCase()))
  .filter((f) => !f.startsWith("."))
  .sort();

if (imageFiles.length === 0) {
  console.warn("Warning: no image files found in", publishedDir);
}

// --- Build pages array ---

const pages = [];
for (let i = 0; i < imageFiles.length; i++) {
  const fileName = imageFiles[i];
  const ext = extname(fileName);
  const pageId = `p${String(i + 1).padStart(3, "0")}`;
  const r2Key = `${comicSlug}/${issueSlug}/${fileName}`;

  const fileBuf = await readFile(join(publishedDir, fileName));
  const dims = getImageDimensions(fileBuf, ext);

  pages.push({
    id: pageId,
    pageNumber: i + 1,
    alt: `Page ${i + 1}`,
    image: {
      r2Key,
      githubPath: `issues/${basename(issueFullPath)}/published/${fileName}`,
      ...(dims ? { width: dims.width, height: dims.height } : {}),
    },
  });
}

// --- Check for optional dialogue.txt and layout.json ---

const hasDialogue = await stat(join(publishedDir, "dialogue.txt")).then(() => true).catch(() => false);
const hasLayout   = await stat(join(publishedDir, "layout.json")).then(() => true).catch(() => false);

const issueDirRelative = `issues/${basename(issueFullPath)}`;

// --- Build manifest ---

const manifest = {
  schemaVersion: 1,
  ...(publisherSlug ? { publisher: { slug: publisherSlug } } : {}),
  ...(comicSlug     ? { comic:     { slug: comicSlug     } } : {}),
  issue: { slug: issueSlug, title: issueTitle },
  ...(hasDialogue ? { dialogue: `${issueDirRelative}/published/dialogue.txt` } : {}),
  ...(hasLayout   ? { layout:   `${issueDirRelative}/published/layout.json`  } : {}),
  pages,
};

await writeFile(existingManifestPath, JSON.stringify(manifest, null, 2), "utf-8");
console.log(
  `Wrote ${existingManifestPath} with ${pages.length} page(s)` +
  (hasDialogue ? ", dialogue" : "") +
  (hasLayout   ? ", layout"   : "")
);


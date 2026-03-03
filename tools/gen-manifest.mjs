// tools/gen-manifest.mjs
import fs from "node:fs";
import path from "node:path";

function die(msg) { console.error(msg); process.exit(1); }

function getImageDimensions(filepath) {
  const fd = fs.openSync(filepath, "r");
  const buf = Buffer.alloc(26);
  fs.readSync(fd, buf, 0, 26, 0);
  fs.closeSync(fd);

  // PNG: signature 8 bytes, then IHDR chunk: 4 len + 4 type + 4 width + 4 height
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // JPEG: scan for SOF marker (0xFF 0xC0/C1/C2)
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    const full = fs.readFileSync(filepath);
    for (let i = 2; i < full.length - 8; i++) {
      if (full[i] === 0xff && (full[i + 1] & 0xf0) === 0xc0 && full[i + 1] !== 0xff) {
        const marker = full[i + 1];
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          return { width: full.readUInt16BE(i + 7), height: full.readUInt16BE(i + 5) };
        }
      }
    }
  }

  // WebP: RIFF....WEBP VP8 /VP8L/VP8X
  if (buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP") {
    const type = buf.slice(12, 16).toString("ascii");
    if (type === "VP8 ") {
      // lossy: skip 10 bytes after chunk header, then 3 byte start code, then 16-bit w/h
      const full = fs.readFileSync(filepath);
      const w = (full.readUInt16LE(26) & 0x3fff);
      const h = (full.readUInt16LE(28) & 0x3fff);
      return { width: w, height: h };
    }
    if (type === "VP8L") {
      const full = fs.readFileSync(filepath);
      const bits = full.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (type === "VP8X") {
      const w = (buf.readUIntLE(24, 3)) + 1;
      const h = (buf.readUIntLE(27, 3)) + 1;  // buf is only 26 bytes, use full read
      const full = fs.readFileSync(filepath);
      return { width: full.readUIntLE(24, 3) + 1, height: full.readUIntLE(27, 3) + 1 };
    }
  }

  return null;
}

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)=(.*)$/);
  return m ? [m[1], m[2]] : [a.replace(/^--/, ""), "true"];
}));

const issueDir = args.issueDir || die("Missing --issueDir=issue-001");
const base = path.join("issues", issueDir, "published");
const pagesDir = path.join(base, "pages");
const textDir = path.join(base, "text");
const manifestPath = path.join(base, "manifest.json");

if (!fs.existsSync(manifestPath)) die(`Missing manifest: ${manifestPath}`);
if (!fs.existsSync(pagesDir)) die(`Missing pages dir: ${pagesDir}`);

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const publisher = manifest?.publisher?.slug || die("manifest.publisher.slug missing");
const comic = manifest?.comic?.slug || die("manifest.comic.slug missing");
const issueSlug = manifest?.issue?.slug || die("manifest.issue.slug missing");

const files = fs.readdirSync(pagesDir)
  .filter(f => /\.(png|jpe?g|webp)$/i.test(f))
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

function pageIdFromFilename(fn) {
  return fn.replace(/\.(png|jpe?g|webp)$/i, "");
}

function r2KeyFor(pageId, ext) {
  return `publishers/${publisher}/${comic}/${issueSlug}/pages/${pageId}${ext}`;
}

manifest.pages = files.map(fn => {
  const pageId = pageIdFromFilename(fn);
  const ext = path.extname(fn).toLowerCase();
  const githubPath = `issues/${issueDir}/published/pages/${fn}`;
  const r2Key = r2KeyFor(pageId, ext);

  const textPath = path.join(textDir, `${pageId}.json`);
  const textRefs = fs.existsSync(textPath)
    ? [`issues/${issueDir}/published/text/${pageId}.json`]
    : [];

  const dims = getImageDimensions(path.join(pagesDir, fn));
  if (!dims) console.warn(`  Warning: could not read dimensions for ${fn}`);

  return {
    id: pageId,
    alt: "",
    image: {
      r2Key,
      githubPath,
      ...(dims && { width: dims.width, height: dims.height }),
    },
    textRefs
  };
});

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`Updated ${manifestPath} with ${manifest.pages.length} pages.`);
// tools/gen-manifest.mjs
import fs from "node:fs";
import path from "node:path";

function die(msg) { console.error(msg); process.exit(1); }

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

  return {
    id: pageId,
    alt: "",
    image: { r2Key, githubPath },
    textRefs
  };
});

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`Updated ${manifestPath} with ${manifest.pages.length} pages.`);
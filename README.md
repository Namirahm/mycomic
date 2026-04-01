# STOP!!!!!!!!!!!! READ THIS FIRST.

# ComicYore: Simple Step-by-Step

## 1) Create your private repo
1. Click **Use this template**.
2. Create a new repository.
3. Set it to **Private**.

## 2) Enable GitHub Actions to write to the repo (one time)
1. Go to **Settings → Actions → General**.
2. Under **Workflow permissions**, select **Read and write permissions**.
3. Save.

## 3) Initialize your first issue (one time per issue)
1. Go to the **Actions** tab.
2. Run the workflow: **ComicYore – Init Issue + Generate Manifest**.
3. Enter:
   - `issueDir` (example: `issue-001`)
   - `publisher` (example: `kraken`)
   - `comic` (example: `chance-magic`)
   - `issueSlug` (example: `chance-magic-001`)
   - `title` (example: `Chance Magic #1`)
4. The workflow will create the folders and an initial `manifest.json`, then commit them to your repo.

## 4) Add final pages
Put your finished panel images directly in:
```
issues/<issueDir>/published/
```
Name your files using this pattern:
```
p001-pn01.jpg   ← page 1, panel 1
p001-pn02.jpg   ← page 1, panel 2
p002-pn01.jpg   ← page 2, panel 1
```
Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`

Commit and push — the manifest will be regenerated automatically.

## 5) Optional: add dialogue and layout
- **`dialogue.txt`** — speech bubble script. A starter file is created by the init workflow.
- **`layout.json`** — panel layout data.

Place these alongside your images in `issues/<issueDir>/published/`. When present, they are referenced automatically in the manifest.

## 6) Generate/update the manifest
The manifest regenerates automatically on every push that changes files in `published/`. To trigger it manually:
1. Go to the **Actions** tab.
2. Run the **ComicYore – Init Issue + Generate Manifest** workflow with the same `issueDir` as your existing issue.

## 7) Publish to ComicYore
1. Log into ComicYore with GitHub OAuth.
2. Refresh the issue (ComicYore caches your manifest from GitHub).
3. Sync the issue (ComicYore copies your published panel images from GitHub into R2).
4. Publish the issue.

## 8) Share
Share the ComicYore page link (reader URL). Do not share the signed image URLs; they expire.

## Rules
- Only put final files under `published/`.
- Keep work-in-progress files under `working/`. They should never be referenced by the manifest.

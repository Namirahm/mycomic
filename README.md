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
1. Put your finished page images here:
   - `issues/<issueDir>/published/pages/`
   Example:
   - `issues/issue-001/published/pages/p001.jpg`
   - `issues/issue-001/published/pages/p002.jpg`
2. Commit and push.

## 5) Generate/update the manifest (each time you add/remove pages)
1. Go to **Actions** tab.
2. Run the workflow again (or let it run automatically, if enabled).
3. It updates:
   - `issues/<issueDir>/published/manifest.json`
   and commits the change.

## 6) Publish to ComicYore
1. Log into ComicYore with GitHub OAuth.
2. Refresh the issue (ComicYore caches your manifest from GitHub).
3. Sync the issue (ComicYore copies your published page images from GitHub into R2).
4. Publish the issue.

## 7) Share
Share the ComicYore page link (reader URL). Do not share the signed image URLs; they expire.

## Rules
- Only put final files under `published/`.
- Keep work-in-progress files under `working/`. They should never be referenced by the manifest.

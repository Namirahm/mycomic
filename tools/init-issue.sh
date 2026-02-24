#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   tools/init-issue.sh <issueDir> <publisherSlug> <comicSlug> <issueSlug> "<issueTitle>"
#
# Example:
#   tools/init-issue.sh issue-001 kraken chance-magic chance-magic-001 "Chance Magic #1"
#
# Creates:
#   issues/<issueDir>/published/pages/
#   issues/<issueDir>/published/text/
#   issues/<issueDir>/working/
#   issues/<issueDir>/published/manifest.json
#
# Also creates .gitkeep files so empty folders appear in GitHub.

ISSUE_DIR="${1:-}"
PUBLISHER="${2:-}"
COMIC="${3:-}"
ISSUE_SLUG="${4:-}"
ISSUE_TITLE="${5:-}"

if [[ -z "${ISSUE_DIR}" || -z "${PUBLISHER}" || -z "${COMIC}" || -z "${ISSUE_SLUG}" || -z "${ISSUE_TITLE}" ]]; then
  echo "Usage: $0 <issueDir> <publisherSlug> <comicSlug> <issueSlug> \"<issueTitle>\""
  exit 1
fi

BASE="issues/${ISSUE_DIR}"
PUB="${BASE}/published"
WORK="${BASE}/working"

mkdir -p "${PUB}/pages" "${PUB}/text" "${WORK}"

# Ensure empty folders are tracked by git
touch "${PUB}/pages/.gitkeep" "${PUB}/text/.gitkeep" "${WORK}/.gitkeep"

MANIFEST_PATH="${PUB}/manifest.json"

if [[ ! -f "${MANIFEST_PATH}" ]]; then
  cat > "${MANIFEST_PATH}" <<EOF
{
  "schemaVersion": 1,
  "publisher": { "slug": "${PUBLISHER}" },
  "comic": { "slug": "${COMIC}" },
  "issue": { "title": "${ISSUE_TITLE}", "slug": "${ISSUE_SLUG}" },
  "pages": []
}
EOF
fi

echo "Ready:"
echo "  ${PUB}/pages/ (final exports go here)"
echo "  ${PUB}/text/  (optional page JSON)"
echo "  ${WORK}/      (WIP files go here)"
echo "  ${MANIFEST_PATH}"
echo
echo "Next:"
echo "  Add final images to: ${PUB}/pages/"
echo "  Then run: node tools/gen-manifest.mjs --issueDir=${ISSUE_DIR}"
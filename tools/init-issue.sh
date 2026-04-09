#!/usr/bin/env bash
# init-issue.sh — scaffolds a new issue directory under issues/
# Usage: bash tools/init-issue.sh <issueDir> <publisher> <comic> <issueSlug> <title>
# Example: bash tools/init-issue.sh issue-001 kraken-comics chance-magic chance-magic-001 "Chance Magic #1"

set -e

ISSUE_DIR_NAME="${1}"
PUBLISHER="${2}"
COMIC="${3}"
ISSUE_SLUG="${4}"
ISSUE_TITLE="${5}"

if [ -z "$ISSUE_DIR_NAME" ] || [ -z "$PUBLISHER" ] || [ -z "$COMIC" ] || [ -z "$ISSUE_SLUG" ] || [ -z "$ISSUE_TITLE" ]; then
  echo "Usage: bash tools/init-issue.sh <issueDir> <publisher> <comic> <issueSlug> <title>"
  exit 1
fi

FULL_DIR="issues/${ISSUE_DIR_NAME}"
PUBLISHED_DIR="${FULL_DIR}/published"

if [ -d "$PUBLISHED_DIR" ]; then
  echo "Issue already initialised: $PUBLISHED_DIR — skipping."
  exit 0
fi

mkdir -p "$PUBLISHED_DIR"

cat > "${PUBLISHED_DIR}/dialogue.txt" << 'DIALOGUEEOF'
# dialogue.txt — speech bubble script for this issue
# Lines starting with # are comments and are never rendered.
# Blank lines are ignored.

# Global style defaults
@font: Bangers
@font-size: 16
@bubble-bg: #ffffff
@caption-bg: #ffffcc
@text-color: #000000

# Format: pNNN.N [Speaker]: Text
#   [Name]    -> oval speech bubble
#   [Name!]   -> jagged/shout bubble
#   [Name~]   -> thought bubble
#   [caption] -> rectangular caption box, no tail
#
# Inline style overrides (inside brackets after the name):
#   bg=#xxxxxx   font=Font Name   font-size=N   text-color=#xxxxxx
#
# Examples:
# p001.1 [Maya]: Hey, are you sure about this?
# p001.2 [Cass]: Never been more sure in my life.
# p002.1 [caption]: Three weeks earlier.
# p002.2 [Maya!]: Watch out!
# p002.3 [Maya~]: I have a bad feeling about this.
# p002.4 [Cass bg=#ffeeee font=Permanent Marker]: This changes everything.
#
# For translation files (dialogue.ja.txt, dialogue.fr.txt, etc.):
#   @writing-mode: vertical-rl   (Japanese/Chinese vertical text, right-to-left columns)
#   @writing-mode: horizontal    (default, left-to-right — safe to omit)
DIALOGUEEOF

echo "Created: ${PUBLISHED_DIR}/dialogue.txt"

cat > "${PUBLISHED_DIR}/manifest.json" << MANIFESTEOF
{
  "schemaVersion": 1,
  "publisher": { "slug": "${PUBLISHER}" },
  "comic": { "slug": "${COMIC}" },
  "issue": { "slug": "${ISSUE_SLUG}", "title": "${ISSUE_TITLE}" },
  "pages": []
}
MANIFESTEOF

echo "Created: ${PUBLISHED_DIR}/manifest.json"
echo ""
echo "Next steps:"
echo "  1. Add page images to ${PUBLISHED_DIR}/"
echo "  2. Edit ${PUBLISHED_DIR}/dialogue.txt with your script"
echo "  3. Run: node tools/gen-manifest.mjs --issueDir=${ISSUE_DIR_NAME}"

#!/usr/bin/env bash
# Install/update kanban SDLC skills.
#
# If run from inside the repo (clone or submodule), uses the local copy.
# Otherwise, pulls the latest fresh from GitHub — no repo clone needed.
#
# Usage:
#   bash update_kanban_skills.sh         # interactive — prompts for agent type and install level
#   bash update_kanban_skills.sh --help  # show usage

set -euo pipefail

REPO_URL="https://github.com/tpearsallmd/kanban-claude-code.git"
SKILLS="kanban build review test pipeline commit"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    echo "Usage: bash update_kanban_skills.sh"
    echo ""
    echo "Interactive installer for kanban SDLC skills."
    echo "Prompts for agent type (claude/codex) and install level (user/project)."
    echo ""
    echo "Uses the local repo if run from inside it, otherwise pulls fresh from GitHub."
    exit 0
fi

# --- Prompt: agent type ---
echo "Which agent? [claude/codex] (default: claude)"
read -r AGENT
AGENT="${AGENT:-claude}"

if [[ "$AGENT" != "claude" && "$AGENT" != "codex" ]]; then
    echo "Error: Unknown agent type '$AGENT'. Use 'claude' or 'codex'."
    exit 1
fi

# --- Prompt: install level ---
# Detect project root from CWD
PROJECT_ROOT=""
DIR="$(pwd)"
while [[ "$DIR" != "/" ]]; do
    if [[ -d "$DIR/.git" || -f "$DIR/.git" ]]; then
        PROJECT_ROOT="$DIR"
        break
    fi
    DIR="$(dirname "$DIR")"
done

USER_TARGET="$HOME/.$AGENT/skills"

if [[ -n "$PROJECT_ROOT" ]]; then
    PROJECT_TARGET="$PROJECT_ROOT/.$AGENT/skills"
    echo ""
    echo "Install level:"
    echo "  1) Project — $PROJECT_TARGET"
    echo "  2) User    — $USER_TARGET"
    echo ""
    echo "Choose [1/2] (default: 1)"
    read -r LEVEL
    LEVEL="${LEVEL:-1}"

    case "$LEVEL" in
        1) TARGET="$PROJECT_TARGET" ;;
        2) TARGET="$USER_TARGET" ;;
        *) echo "Error: Invalid choice '$LEVEL'."; exit 1 ;;
    esac
else
    echo ""
    echo "No project detected. Installing to user level: $USER_TARGET"
    TARGET="$USER_TARGET"
fi

# --- Determine source directory ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -d "$SCRIPT_DIR/$AGENT" ]]; then
    SOURCE="$SCRIPT_DIR"
    echo ""
    echo "Using local repo at $SOURCE"
else
    TMPDIR=$(mktemp -d)
    trap 'rm -rf "$TMPDIR"' EXIT
    echo ""
    echo "Cloning from $REPO_URL..."
    git clone --depth 1 --quiet "$REPO_URL" "$TMPDIR"
    SOURCE="$TMPDIR"
fi

if [[ ! -d "$SOURCE/$AGENT" ]]; then
    echo "Error: Agent type '$AGENT' not found in repo (no $AGENT/ directory)."
    exit 1
fi

echo "Installing $AGENT skills -> $TARGET"

# --- Preserve user's SDLC.md configuration if it exists ---
SDLC_BACKUP=""
if [[ -f "$TARGET/kanban/SDLC.md" ]]; then
    SDLC_BACKUP=$(mktemp)
    cp "$TARGET/kanban/SDLC.md" "$SDLC_BACKUP"
    echo "Backed up existing SDLC.md (will preserve your configuration)"
fi

# --- Copy each skill ---
for skill in $SKILLS; do
    mkdir -p "$TARGET/$skill"
    cp "$SOURCE/$AGENT/$skill/"* "$TARGET/$skill/"
    echo "  Updated $skill"
done

# --- Restore user's SDLC.md configuration if it had real values ---
if [[ -n "$SDLC_BACKUP" ]]; then
    if ! grep -q 'YOUR_CLOUD_ID' "$SDLC_BACKUP"; then
        cp "$SDLC_BACKUP" "$TARGET/kanban/SDLC.md"
        echo "  Restored your SDLC.md configuration (Cloud ID, project key, transition IDs)"
    else
        echo "  SDLC.md has default placeholders — using fresh copy"
    fi
    rm -f "$SDLC_BACKUP"
fi

echo ""
echo "Done. Skills installed to $TARGET."
if grep -q 'YOUR_CLOUD_ID' "$TARGET/kanban/SDLC.md" 2>/dev/null; then
    echo ""
    echo "IMPORTANT: Edit $TARGET/kanban/SDLC.md to set your Cloud ID, project key, and transition IDs."
fi

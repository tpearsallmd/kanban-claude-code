#!/bin/bash
# Update user-level kanban skills from GitHub repository
# Usage:
#   bash skills/update.sh           # update both Claude and Codex
#   bash skills/update.sh claude    # update Claude only
#   bash skills/update.sh codex     # update Codex only

set -e

AGENTS="${1:-both}"

update_agent() {
  local agent=$1
  local home_dir=$2
  local skills_dir="$home_dir/skills"

  echo "Updating $agent skills..."

  # Clone repo to temp directory
  git clone https://github.com/tpearsallmd/kanban-claude-code.git /tmp/kanban-setup

  # Update each skill
  for skill in kanban build review test pipeline commit; do
    mkdir -p "$skills_dir/$skill"
    rm -rf "$skills_dir/$skill"
    mv /tmp/kanban-setup/skills/integrations/$agent/$skill/* "$skills_dir/$skill/"
  done

  # Clean up
  rm -rf /tmp/kanban-setup
  echo "✓ $agent skills updated to $skills_dir"
}

# Validate argument
case "$AGENTS" in
  both|claude|codex)
    ;;
  *)
    echo "Usage: bash skills/update.sh [both|claude|codex]"
    echo "  both   - update both Claude and Codex skills (default)"
    echo "  claude - update Claude skills only"
    echo "  codex  - update Codex skills only"
    exit 1
    ;;
esac

# Update requested agents
[[ "$AGENTS" == "both" || "$AGENTS" == "claude" ]] && update_agent claude ~/.claude
[[ "$AGENTS" == "both" || "$AGENTS" == "codex" ]] && update_agent codex ~/.codex

echo ""
echo "Done! Skills are ready to use."

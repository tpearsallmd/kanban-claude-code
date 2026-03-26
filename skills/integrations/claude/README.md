# Claude Code Integration

Install these skills into your user-level `~/.claude/skills/` directory for access across all projects.

## Setup (One Time)

From your home directory:

```bash
# Clone the repo to a temporary location
git clone https://github.com/tpearsallmd/kanban-claude-code.git /tmp/kanban-setup

# Extract integration files to your skills directory
mkdir -p ~/.claude/skills
mv /tmp/kanban-setup/skills/integrations/* ~/.claude/skills/kanban
rm -rf /tmp/kanban-setup

# Set the kanban service endpoint (add to ~/.bashrc, ~/.zshrc, or ~/.bash_profile)
echo 'export KANBAN_HOST=homelab-01:5555' >> ~/.bashrc
source ~/.bashrc
```

This installs the skills to `~/.claude/skills/kanban/` with the expected structure:
- `kanban/` — kanban board integration
- `build/`, `review/`, `test/`, `pipeline/`, `commit/` — individual skills

Replace `homelab-01:5555` with your actual kanban service hostname and port. Defaults to `localhost:5555` if not set.

## What You Get

- `kanban/` — kanban board integration (SDLC reference, workflow gates)
- `build/` — build skill with kanban integration
- `review/` — code review skill with kanban integration
- `test/` — test skill with kanban integration
- `pipeline/` — pipeline orchestration skill
- `commit/` — smart git commit with semver bumping

## Update Skills

To pull the latest versions:

```bash
# Re-run the setup steps above, or manually:
git clone https://github.com/tpearsallmd/kanban-claude-code.git /tmp/kanban-setup
rm -rf ~/.claude/skills/kanban
mv /tmp/kanban-setup/skills/integrations ~/.claude/skills/kanban
rm -rf /tmp/kanban-setup
```

## Verify

In Claude Code, run:

```bash
/kanban
```

Should read the board from `$KANBAN_HOST` and display current tasks.

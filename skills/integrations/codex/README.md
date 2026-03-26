# Codex Integration

Install these skills into your user-level `~/.codex/skills/` directory for access across all projects.

## Setup (One Time)

From your home directory:

```bash
# Clone the repo to a temporary location
git clone https://github.com/tpearsallmd/kanban-claude-code.git /tmp/kanban-setup

# Extract each skill to its own top-level directory
for skill in kanban build review test pipeline commit; do
  mkdir -p ~/.codex/skills/$skill
  mv /tmp/kanban-setup/skills/integrations/codex/$skill/* ~/.codex/skills/$skill/
done

rm -rf /tmp/kanban-setup

# Set the kanban service endpoint (add to ~/.bashrc, ~/.zshrc, or ~/.bash_profile)
echo 'export KANBAN_HOST=homelab-01:5555' >> ~/.bashrc
source ~/.bashrc
```

This installs each skill as a top-level directory:

```text
~/.codex/skills/
├── kanban/       # /kanban — read and display the board
├── build/        # /build — work on Ready cards
├── test/         # /test — work on Testing cards
├── review/       # /review — work on Review cards
├── pipeline/     # /pipeline — orchestrate multiple sessions
└── commit/       # /commit — smart git commit with semver bumping
```

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
# Re-run the setup steps above, or manually update each skill:
git clone https://github.com/tpearsallmd/kanban-claude-code.git /tmp/kanban-setup

for skill in kanban build review test pipeline commit; do
  rm -rf ~/.codex/skills/$skill
  mkdir -p ~/.codex/skills/$skill
  mv /tmp/kanban-setup/skills/integrations/codex/$skill/* ~/.codex/skills/$skill/
done

rm -rf /tmp/kanban-setup
```

## Verify

In Codex, run:

```bash
/kanban
```

Should read the board from `$KANBAN_HOST` and display current tasks.

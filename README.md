# Kanban for Coding Agents

A unified kanban board for human-agent collaboration across multiple projects. Runs as a standalone Docker service with HTTP API access. Agents read and update the board via HTTP; humans use the browser UI for planning.

## Why

Coding agents work best when they know what to work on, what changed, and what to do next. This board gives them context through a simple JSON API they can read and write. The human uses the browser UI for planning and prioritization; the agent picks up cards, updates progress, and moves them through the workflow.

## Quick Start

### 1. Deploy the Docker Service

On your server or local machine:

```bash
git clone https://github.com/tpearsallmd/kanban-claude-code.git
cd kanban-claude-code/docker
docker compose up -d
```

Verify it's running:

```bash
curl http://localhost:5555/health
# Output: ok
```

Open the UI at [http://localhost:5555](http://localhost:5555).

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for detailed setup, remote deployment, and troubleshooting.

### 2. Install Agent Skills (User Level)

From your home directory, install skills for Claude and Codex:

```bash
# Clone the repo
git clone https://github.com/tpearsallmd/kanban-claude-code.git /tmp/kanban-setup

# Claude — extract each skill to its own top-level directory
for skill in kanban build review test pipeline commit; do
  mkdir -p ~/.claude/skills/$skill
  mv /tmp/kanban-setup/skills/integrations/claude/$skill/* ~/.claude/skills/$skill/
done
rm -rf /tmp/kanban-setup

# Codex — same process for Codex-specific skills
git clone https://github.com/tpearsallmd/kanban-claude-code.git /tmp/kanban-setup
for skill in kanban build review test pipeline commit; do
  mkdir -p ~/.codex/skills/$skill
  mv /tmp/kanban-setup/skills/integrations/codex/$skill/* ~/.codex/skills/$skill/
done
rm -rf /tmp/kanban-setup

# Set kanban service endpoint (add to ~/.bashrc, ~/.zshrc, or ~/.bash_profile)
echo 'export KANBAN_HOST=homelab-01:5555' >> ~/.bashrc
source ~/.bashrc
```

Replace `homelab-01:5555` with your actual service hostname and port.

For setup details, see:

- [skills/integrations/claude/README.md](skills/integrations/claude/README.md)
- [skills/integrations/codex/README.md](skills/integrations/codex/README.md)

## Features

- **Drag-and-drop** — cards between columns
- **WIP limits** with visual warnings
- **Blocked flag** with reason
- **T-shirt sizing** (XS/S/M/L/XL) and priority (high/medium/low)
- **Structured sections** — Requirements, Design, Implementation Notes, Test Plan, Review Notes
- **Project field** — identify which repo a card belongs to
- **Auto-save** on every action
- **Dark mode** UI
- **Completion history** — completed cards stay in the board (25 recent in UI, older ones archived)
- **HTTP API** — agents read/write via curl, no file I/O
- **Concurrent write safety** — writes are queued automatically

## Workflow

```text
Backlog → Ready → In Progress → Code Review → Testing → Review → Done
```

| Column | Owner | Purpose |
| --- | --- | --- |
| **Backlog** | Human | All ideas, bugs, enhancements — unsorted |
| **Ready** | Human/Agent | Groomed, prioritized, actionable |
| **In Progress** | Agent | Actively writing code |
| **Code Review** | Agent | Automated code review (linting, testing, security) |
| **Testing** | Agent | Write/run tests, verify implementation |
| **Review** | Human | Human review and approval |
| **Done** | — | Completed work; recent 25 shown in UI, older cards archived |

## Agent Integrations

The board is agent-neutral. Agent-specific skills and SDLC rules live under `skills/integrations/`.

### Claude Code

Setup: [skills/integrations/claude/README.md](skills/integrations/claude/README.md)

Skills include: kanban bootstrap, build, code review, test, pipeline orchestration, smart commit.

### Codex

Setup: [skills/integrations/codex/README.md](skills/integrations/codex/README.md)

Same skills, Codex-specific syntax.

## How Agents Use the Board

1. **Session start**: verify service health, read the board via HTTP
2. **During work**: update card sections (design, implementation notes, test results, etc.)
3. **Card transitions**: move through workflow gates (Ready → In Progress → Testing → Review → Done)
4. **Session end**: move card forward, add discovered tasks to Backlog

See [skills/integrations/KANBAN_AGENT_RULES.md](skills/integrations/KANBAN_AGENT_RULES.md) for the complete API reference and workflow rules.

## Card Schema

```json
{
  "id": "card_1741234567_abc",
  "title": "Short task name",
  "description": "Longer context and acceptance criteria",
  "type": "enhancement",
  "priority": "high",
  "size": "M",
  "column": "Ready",
  "project": "repo-name",
  "created": "2026-03-12T10:00:00Z",
  "updated": "2026-03-12T10:00:00Z",
  "tags": ["backend", "urgent"],
  "blocked": false
}
```

Optional sections (include only when populated):

- **requirements** — acceptance criteria, constraints, edge cases
- **design** — approach, affected files, architecture
- **implementationNotes** — what changed, decisions (build phase)
- **testPlan** — how to test, expected results (test phase)
- **reviewNotes** — summary for reviewer (review phase)

## Files & Architecture

```text
├── README.md                     # This file
├── docker/
│   ├── Dockerfile                # Docker image definition
│   ├── docker-compose.yml        # Container orchestration
│   ├── .env.example              # Environment variable template
│   ├── serve.js                  # HTTP server (port 5555)
│   ├── kanban.html               # UI (single file, zero deps)
│   ├── favicon.svg               # Browser icon
│   └── kanban-board.json         # Board data (persists in Docker volume)
├── skills/
│   └── integrations/
│       ├── KANBAN_AGENT_RULES.md # Canonical agent API reference
│       ├── claude/               # Claude Code integration
│       │   ├── README.md
│       │   ├── kanban/SDLC.md    # Workflow gates and rules
│       │   ├── build/SKILL.md
│       │   ├── review/SKILL.md
│       │   ├── test/SKILL.md
│       │   ├── pipeline/SKILL.md
│       │   └── commit/SKILL.md
│       └── codex/                # Codex integration (same structure)
└── docs/
    ├── INSTALLATION.md           # Setup and deployment guide
    ├── kanban-spec.md            # Full specification for operators
    └── CHANGELOG.md              # Release history
```

## Deployment Models

### Local (Development)

```bash
cd kanban-claude-code/docker
docker compose up -d
export KANBAN_HOST=localhost:5555
```

### Remote Server

```bash
# On homelab-01:
cd kanban-claude-code/docker
docker compose up -d

# On local machine:
export KANBAN_HOST=homelab-01:5555
```

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for full setup instructions, volume management, troubleshooting, and backup procedures.

## Done History

Completed cards stay in the same board JSON for traceability:

- The UI shows the **25 most recently completed** cards in **Done**
- Older completed cards are marked `archived: true` and hidden from the active board
- When a card first enters **Done**, the board records `completedAt`
- Completed history is permanent; older cards are never deleted

## Update Skills

To pull the latest versions:

```bash
# Claude
cd ~/.claude/skills/kanban && git pull

# Codex
cd ~/.codex/skills/kanban && git pull
```

## License

CC-BY-NC-4.0

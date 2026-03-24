# Kanban for Coding Agents

A local kanban board for human-agent collaboration. Single HTML file, zero dependencies, JSON data store.

## Why

Coding agents work best when they know what to work on, what changed, and what is next. This board gives them that context through a simple JSON file they can read and write directly. The human uses the browser UI for planning and prioritization; the agent picks up cards, updates progress, and moves them through the workflow.

## Quick Start

```bash
# Clone into your project
git submodule add https://github.com/tpearsallmd/kanban-claude-code.git kanban

# Create your board from the template
cp kanban/templates/kanban.json.template kanban-board.json
# Edit kanban-board.json to set your repo name

# Start the server
node kanban/serve.js

# Open http://localhost:5555
```

## Features

- Drag-and-drop cards between columns
- WIP limits with visual warnings
- Blocked card flag with reason
- T-shirt sizing (XS/S/M/L/XL)
- Priority indicators (high/medium/low)
- Collapsible structured sections: Requirements, Design, Implementation Notes, Test Plan, Review Notes
- Dark mode UI
- Auto-save on every action
- Recent-completion `Done` view with older completed cards archived in the same JSON file
- Zero dependencies, zero build step

## Workflow

```
Backlog → Ready → Design → In Progress → Testing → Review → Done
```

| Column | Owner | Purpose |
| --- | --- | --- |
| **Backlog** | Human | All ideas, bugs, enhancements |
| **Ready** | Human/Agent | Groomed, prioritized, actionable |
| **Design** | Agent | Plan approach, update design section |
| **In Progress** | Agent | Actively writing code |
| **Testing** | Agent | Write/run tests, verify implementation |
| **Review** | Human | Review the agent's work |
| **Done** | -- | Recent completed work; older completed cards stay archived in the same board file |

## Integrations

The board core is vendor-neutral. Agent-specific setup lives under `templates/integrations/`.

### Claude Code

Use [templates/integrations/claude/README.md](templates/integrations/claude/README.md).

### Codex

Use [templates/integrations/codex/README.md](templates/integrations/codex/README.md).

### How Agents Use the Board

- **Session start**: reads `kanban.json`, identifies work to do
- **During work**: updates structured sections (design, implementation notes, etc.)
- **Session end**: moves card forward, adds discovered tasks to Backlog

## Structured Card Sections

Cards have optional collapsible sections that get populated as work progresses:

| Section | Populated During | Content |
| --- | --- | --- |
| **Requirements** | Ready/Design | Acceptance criteria, constraints, edge cases |
| **Design** | Design | Approach, affected files, architecture notes |
| **Implementation Notes** | In Progress | What changed, key decisions |
| **Test Plan** | Testing | How to test, expected results |
| **Review Notes** | Review | Feedback, docs updated, approval notes |

## Done History

Completed cards stay in the same board JSON for traceability.

- The UI shows the 25 most recently completed cards in **Done**
- Older completed cards are marked `archived: true` and hidden from the active board
- When a card first enters **Done**, the board stamps `completedAt`
- Existing boards do not need template changes for this feature; the metadata is added automatically as cards move through the board

## Pipeline Skills

The shared workflow supports dedicated build, code review, and test sessions. Agent-specific pipeline templates live under:

- [templates/integrations/claude/README.md](templates/integrations/claude/README.md)
- [templates/integrations/codex/README.md](templates/integrations/codex/README.md)

## Files

```text
kanban/
├── kanban.html                          # The entire UI — single file, no dependencies
├── kanban-spec.md                       # Full spec and design document
├── serve.js                             # Node.js HTTP server (port 5555)
├── CHANGELOG.md                         # Schema changes and migration instructions
├── README.md                            # This file
└── templates/
    ├── kanban.json.template             # Empty board template for new repos
    ├── kanban-pipeline.json.template    # Board template with Code Review column
    ├── SKILL.md                         # Legacy Claude bootstrap template (compatibility path)
    ├── pipeline/                        # Legacy Claude pipeline templates (compatibility path)
    └── integrations/
        ├── claude/                      # Claude Code setup
        └── codex/                       # Codex setup
```

## Using as a Git Submodule

The board is designed to be shared across repositories. The submodule contains the UI, server, and spec. Each repo tracks its own board data.

**Key detail:** Git doesn't allow parent repos to track files inside submodules. So the board data file (`kanban-board.json`) lives at the **repo root**, not inside `kanban/`. The server auto-detects this layout.

```text
your-repo/
├── kanban/                  # ← git submodule (shared code)
│   ├── kanban.html
│   ├── serve.js
│   └── ...
├── kanban-board.json        # ← your board data (tracked in parent repo)
└── ...
```

### Adding to a New Repo

```bash
# 1. Add the submodule
git submodule add https://github.com/tpearsallmd/kanban-claude-code.git kanban

# 2. Create your board from the template
cp kanban/templates/kanban.json.template kanban-board.json
# Edit kanban-board.json to set your repo name

# 3. Install the integration that matches your agent
# Claude Code: see templates/integrations/claude/README.md
# Codex: see templates/integrations/codex/README.md

# 4. Start the server
node kanban/serve.js
# → Data file: /path/to/your-repo/kanban-board.json
```

### Pulling Updates

```bash
cd kanban && git pull origin main && cd ..
git add kanban
git commit -m "Update kanban submodule"
```

If the update includes a schema change, check `CHANGELOG.md` for the migration instructions.

### Standalone Usage

If you do not need submodule sharing:

```bash
git clone https://github.com/tpearsallmd/kanban-claude-code.git kanban
cp kanban/templates/kanban.json.template kanban/kanban.json
node kanban/serve.js
```

In standalone mode, `serve.js` finds `kanban.json` in its own directory.

## Schema

See [kanban-spec.md](kanban-spec.md) for the full JSON schema, field definitions, column entry policies, and WIP limit configuration.

## Compatibility Notes

- The root `templates/SKILL.md` and `templates/pipeline/` files remain as compatibility aliases for existing Claude setups.
- New installs should prefer `templates/integrations/claude/` or `templates/integrations/codex/`.

## License

CC-BY-NC-4.0

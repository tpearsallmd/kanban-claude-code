# Kanban for Claude Code

A local kanban board designed for human-AI collaboration with [Claude Code](https://claude.com/claude-code). Single HTML file, zero dependencies, JSON data store.

## Why

Claude Code works best when it knows what to work on, what's been done, and what's next. This board gives it that context through a simple JSON file it can read and write directly. The human uses the browser UI for planning and prioritization; Claude picks up cards, updates progress, and moves them through the workflow.

## Quick Start

```bash
# Clone into your project
git submodule add https://github.com/tpearsallmd/kanban-claude-code.git kanban

# Create your board from the template
cp kanban/kanban.json.template kanban/kanban.json
# Edit kanban.json to set your repo name

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
- Zero dependencies, zero build step

## Workflow

```
Backlog → Ready → Design → In Progress → Testing → Review → Done
```

| Column | Owner | Purpose |
| --- | --- | --- |
| **Backlog** | Human | All ideas, bugs, enhancements |
| **Ready** | Human/Claude | Groomed, prioritized, actionable |
| **Design** | Claude | Plan approach, update design section |
| **In Progress** | Claude | Actively writing code |
| **Testing** | Claude | Write/run tests, verify implementation |
| **Review** | Human | Review Claude's work |
| **Done** | -- | Merged/complete |

## Claude Code Integration

### `/kanban` Skill

Copy the skill template into your project's Claude config:

```bash
mkdir -p .claude/projects/<project-dir>/skills/kanban
cp kanban/templates/SKILL.md .claude/projects/<project-dir>/skills/kanban/SKILL.md
```

Then invoke `/kanban` at session start. Claude will read the board, summarize the state, and pick up the highest-priority Ready card.

### How Claude Uses the Board

- **Session start**: reads `kanban.json`, identifies work to do
- **During work**: updates structured sections (design, implementation notes, etc.)
- **Session end**: moves card forward, adds discovered tasks to Backlog

### Structured Card Sections

Cards have optional collapsible sections that get populated as work progresses:

| Section | Populated During | Content |
| --- | --- | --- |
| **Requirements** | Ready/Design | Acceptance criteria, constraints, edge cases |
| **Design** | Design | Approach, affected files, architecture notes |
| **Implementation Notes** | In Progress | What changed, key decisions |
| **Test Plan** | Testing | How to test, expected results |
| **Review Notes** | Review | Feedback, docs updated, approval notes |

## Files

```
kanban/
├── kanban.html           # The entire UI — single file, no dependencies
├── kanban.json.template  # Template for new repos (empty board)
├── kanban-spec.md        # Full spec and design document
├── serve.js              # Node.js HTTP server (port 5555)
├── CHANGELOG.md          # Schema changes and migration instructions
├── README.md             # This file
└── templates/
    └── SKILL.md          # Template for the /kanban Claude Code skill
```

## Using as a Git Submodule

The board is designed to be shared across repositories. The submodule contains the UI, server, and spec. Each repo tracks its own `kanban.json`.

### Adding to a New Repo

```bash
git submodule add https://github.com/tpearsallmd/kanban-claude-code.git kanban
cp kanban/kanban.json.template kanban/kanban.json
git add kanban/kanban.json
```

### Pulling Updates

```bash
cd kanban && git pull origin main && cd ..
git add kanban
git commit -m "Update kanban submodule"
```

If the update includes a schema change, check `CHANGELOG.md` -- it includes AI-readable migration instructions that Claude can apply automatically.

## Schema

See [kanban-spec.md](kanban-spec.md) for the full JSON schema, field definitions, column entry policies, and WIP limit configuration.

## License

MIT

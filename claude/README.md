# Claude Code Integration

Kanban SDLC skills for Claude Code, powered by Jira via the Atlassian MCP server.

## Prerequisites

- Claude Code with the [Atlassian MCP server](https://www.npmjs.com/package/@anthropic/mcp-atlassian) configured
- A Jira Kanban board with these statuses: Backlog, Selected for Development, In Progress, Code Review, Testing, Review, Done

## Installation

Run the installer script — no need to clone the repo:

```bash
# Bash (macOS / Linux / Git Bash on Windows)
curl -fsSL https://raw.githubusercontent.com/tpearsallmd/kanban-claude-code/main/update_kanban_skills.sh -o update_kanban_skills.sh
bash update_kanban_skills.sh
```

```powershell
# PowerShell (Windows)
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/tpearsallmd/kanban-claude-code/main/update_kanban_skills.ps1" -OutFile "update_kanban_skills.ps1"
.\update_kanban_skills.ps1
```

The script prompts for agent type and whether to install at project level or user level.

To update later, re-run the same script — it preserves your SDLC.md configuration.

## Configuration

After installing, edit `~/.claude/skills/kanban/SDLC.md`:

1. Set your **Cloud ID** — run the `getAccessibleAtlassianResources` MCP tool to find it
2. Set your **Project Key** — the prefix in your issue keys (e.g., `HI` for `HI-123`)
3. Fill in the **transition IDs** — run `getTransitionsForJiraIssue` on any issue to get them

## Skills

| Skill | Command | Purpose |
|---|---|---|
| kanban | `/kanban` | Bootstrap — read the board, summarize state, pick up work |
| build | `/build` | Work Selected for Development issues, move to Code Review |
| review | `/review` | Code review issues in Code Review, pass to Testing or return |
| test | `/test` | Test issues in Testing, pass to Review or return |
| pipeline | `/pipeline` | Orchestrate build -> review -> test sequentially |
| commit | `/commit` | Smart commit with conventional format and optional semver bump |

## Workflow

```
Backlog -> Selected for Development -> In Progress -> Code Review -> Testing -> Review -> Done
```

Each transition is a gate with required actions. See [SDLC.md](kanban/SDLC.md) for the complete rulebook.

## Session Model

Run each role in a separate Claude Code session:

- **Build session:** `/build` — picks up work, writes code, moves to Code Review
- **Review session:** `/review` — reads code, checks quality, passes or returns
- **Test session:** `/test` — derives test plan, executes, passes or returns
- **Pipeline:** `/loop 5m /pipeline` — automates the dispatch cycle

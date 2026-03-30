# Kanban SDLC Skills for Coding Agents

A structured SDLC workflow for human-agent collaboration, powered by Jira. Agents follow defined gates to build, review, and test work — humans plan and approve.

## Why

Coding agents work best when they know what to work on, what the rules are, and what to do next. These skills give agents a structured workflow with mandatory gates, role separation, and clear ownership of issue fields. The human uses Jira for planning and prioritization; the agent picks up issues and moves them through the workflow.

## Architecture

```text
Jira Board (source of truth)
    |
    v
Atlassian MCP Server (transport)
    |
    v
Coding Agent (Claude Code, Codex, etc.)
    |
    v
Skills (this repo — workflow rules + gate logic)
```

No local server, no JSON file storage. The Jira board is the single source of truth. Agents interact with it via the Atlassian MCP server.

## Quick Start

### 1. Set up your Jira board

Create a Kanban board with these statuses:

| Status | Purpose |
| --- | --- |
| Backlog | Ideas, not yet ready |
| Selected for Development | Prioritized, actionable |
| In Progress | Actively being built |
| Code Review | Awaiting code review |
| Testing | Awaiting test verification |
| Review | Awaiting human approval |
| Done | Complete |

### 2. Configure the Atlassian MCP server

Follow the [Atlassian MCP server setup](https://www.npmjs.com/package/@anthropic/mcp-atlassian) to connect your agent to Jira.

### 3. Install skills

Download and run the installer script — no need to clone the repo:

**Bash (macOS / Linux / Git Bash on Windows):**

```bash
curl -fsSL https://raw.githubusercontent.com/tpearsallmd/kanban-claude-code/main/update_kanban_skills.sh -o update_kanban_skills.sh
bash update_kanban_skills.sh
```

**PowerShell (Windows):**

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/tpearsallmd/kanban-claude-code/main/update_kanban_skills.ps1" -OutFile "update_kanban_skills.ps1"
.\update_kanban_skills.ps1
```

The script will prompt you for:

- **Agent type** — claude or codex
- **Install level** — project-level (`.claude/skills/` in your repo) or user-level (`~/.claude/skills/`)

It clones a temporary copy of the repo, copies the skills, and cleans up after itself.

> **Already have the repo cloned or as a submodule?** Run the script from inside it and it will use your local copy instead of cloning.

### 4. Configure SDLC.md

After installing, edit `kanban/SDLC.md` in your skills directory:

1. Set your **Cloud ID** — run the `getAccessibleAtlassianResources` MCP tool to find it
2. Set your **Project Key** — the prefix in your issue keys (e.g., `HI` for `HI-123`)
3. Fill in the **transition IDs** — run `getTransitionsForJiraIssue` on any issue to get them

## Updating Skills

Re-run the same installer script. It preserves your SDLC.md configuration (Cloud ID, project key, transition IDs) while updating all skill files.

## Workflow

```text
Backlog -> Selected for Development -> In Progress -> Code Review -> Testing -> Review -> Done
```

| Gate | From | To | Owner |
| --- | --- | --- | --- |
| 1 | Selected for Development | In Progress | Build session |
| 2 | In Progress | Code Review | Build session |
| 3 | Code Review | Testing or Selected for Development | Review session |
| 4 | Testing | Review or Selected for Development | Test session |
| 5 | Review | Done | Human |

Each gate has mandatory actions. See [SDLC.md](claude/kanban/SDLC.md) for the complete rulebook.

## Skills

| Skill | Purpose |
| --- | --- |
| **kanban** | Board bootstrap — read state, summarize, pick up work |
| **build** | Work issues from Selected for Development through to Code Review |
| **review** | Independent code review — pass to Testing or return with feedback |
| **test** | Independent testing — pass to Review or return with failure analysis |
| **pipeline** | Orchestrate build -> review -> test sequentially |
| **commit** | Smart git commit with conventional format and optional semver bump |

## Key Design Decisions

- **Role separation** — build, review, and test are independent sessions with strict field ownership. No role can write another role's fields.
- **Gates are mandatory** — issues cannot skip statuses. Each transition has required actions.
- **No silent descoping** — if work is dropped from an issue, it must be split into a new issue or explicitly approved.
- **Test plans are independent** — the test session derives its own plan from the diff, not from developer notes.
- **Structured comments** — test locking and failure tracking use Jira comments with structured prefixes for append-only semantics.

## Agent-Specific Docs

- **[Claude Code](claude/README.md)** — installation details, skill reference, session model
- **Codex** — coming soon

## License

CC-BY-NC-4.0

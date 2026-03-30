---
name: kanban
description: Read the Jira board and bootstrap Claude with the current task state. Use at session start to understand work in progress, pick up tasks, or update the board.
---

# Kanban Board Bootstrap (Jira)

Read `SDLC.md` (in this same directory) before proceeding — it defines the Jira configuration, MCP tools, status mappings, and gate logic.

## Session Start Protocol

1. Read **SDLC.md** to get the Cloud ID, Project Key, and transition IDs for your Jira project
2. Query the board state:
   ```
   mcp__atlassian__searchJiraIssuesUsingJql
     cloudId: <Cloud ID from SDLC.md>
     jql: project = <Project Key> AND status != Done ORDER BY priority ASC
     fields: ["summary", "status", "priority", "labels", "description"]
     maxResults: 50
     responseContentFormat: markdown
   ```
3. Summarize the board state: how many issues per status, what's in progress, what's blocked
4. Identify the highest priority issue in **Selected for Development** (or **In Progress** if resuming work)
5. Skip any issue with the `blocked` label — report it and move on
6. Assess the issue description — is there enough context to act on?
   - If yes: confirm with the user which issue to pick up
   - If not: update the description with clarifying questions and leave it in Selected for Development
   - If the issue is too large: recommend breaking it into multiple issues in Backlog

## Issue Management

### Adding issues

Use `mcp__atlassian__createJiraIssue` with:
- `cloudId` from SDLC.md configuration
- `projectKey` from SDLC.md configuration
- `issueTypeName: "Story"` (or `"Bug"` for defects)
- `contentFormat: "markdown"`
- Description with `## Description`, `## Requirements`, `## Size` sections
- `additional_fields` for priority and labels (including `size-*` label)

### Editing issues

Use `mcp__atlassian__editJiraIssue` with `contentFormat: "markdown"`.

Follow the **read-modify-write protocol** in SDLC.md when updating description sections — never clobber another role's sections.

### Moving issues

Use `mcp__atlassian__transitionJiraIssue` with the transition ID from SDLC.md's status map.

Check the lifecycle gates in SDLC.md before any transition — each gate has required actions that must happen before the move.

### Blocking and unblocking

**To block:** Add label `blocked`, update `## Blocked` section in description with status and reason.

**To unblock:** Remove label `blocked`, clear `## Blocked` section content.

Agents should never claim a blocked issue. Report it to the user and skip it.

---

## SDLC Reference

For role-based workflows (build, test, review sessions), see:

- **[SDLC.md](./SDLC.md)** — Workflow gates, section conventions, ownership rules, structured comments protocol

### Related executable skills

- **[/build](../build/SKILL.md)** — Build session: picks up Selected for Development issues one at a time
- **[/test](../test/SKILL.md)** — Test session: picks up Testing issues one at a time
- **[/review](../review/SKILL.md)** — Review session: picks up Code Review issues one at a time
- **[/commit](../commit/SKILL.md)** — Smart commit with semver bumping
- **[/pipeline](../pipeline/SKILL.md)** — Orchestrates build -> review -> test sequentially

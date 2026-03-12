---
name: kanban
description: Read the kanban board and bootstrap Claude with the current task state. Use at session start to understand work in progress, pick up tasks, or update the board.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

# Kanban Board Bootstrap

Read `kanban/kanban.json` and `kanban/kanban-spec.md` to understand the current board state and workflow rules.

## Session Start Protocol

1. Read `kanban/kanban.json`
2. Summarize the board state: how many cards per column, what's in progress, what's in review
3. Identify the highest priority card in **Ready** (or **In Progress** if resuming work)
4. Assess the card description — is there enough context to act on?
   - If yes: move it to **In Progress** (or **Design** if it needs planning first) and begin work
   - If not: update the description with clarifying questions and leave it in **Ready**
   - If the card is too large: recommend breaking it into multiple cards in **Backlog**

## Session End Protocol

1. Update `kanban/kanban.json`: move the current card to **Testing** (or **Review** if tests pass)
2. Update the appropriate structured sections (`implementationNotes`, `testPlan`, etc.)
3. If new tasks were discovered during the session, add them to **Backlog**
4. Summarize what was done and what's next

## Board Rules

- To move a card: update `column` and `updated` fields only
- To add a card: append to `cards` array with id format `card_{timestamp}_{random3}`
- Valid columns: Backlog, Ready, Design, In Progress, Testing, Review, Done
- Card fields: id, title, description, type (enhancement/defect), priority (high/medium/low), size (XS/S/M/L/XL), column, created, updated, tags, blocked, blockedReason
- Structured sections (optional, omit if empty): requirements, design, implementationNotes, testPlan, reviewNotes
- Before moving to Testing: update relevant docs in `docs/` folder
- Check `wipLimits` before moving cards — do not exceed without flagging
- Always pretty-print JSON with 2-space indentation
- The kanban server runs on port 5555 (`node kanban/serve.js`) — changes to the JSON are immediately reflected in the browser

## Schema Migration

If you pull a submodule update, check `kanban/CHANGELOG.md` for schema changes. Follow the "Migration (for AI)" instructions to update `kanban/kanban.json` to the latest schema version.

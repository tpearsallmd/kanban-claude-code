---
name: kanban
description: Read the kanban board and bootstrap Claude with the current task state. Use at session start to understand work in progress, pick up tasks, or update the board.
---

# Kanban Board Bootstrap

Read `kanban-board.json` and `kanban-claude-code/kanban-spec.md` to understand the current board state and workflow rules.

## Session Start Protocol

1. **Start the kanban server** if it's not already running:
   - Check if port 5555 is in use: `curl -s http://localhost:5555/kanban-board.json > /dev/null 2>&1`
   - If not running, start it in the background: `node kanban-claude-code/serve.js` (using Bash with `run_in_background: true`)
   - Confirm it's serving before proceeding
2. Read `kanban-board.json`
3. Summarize the board state: how many cards per column, what's in progress, what's in review
4. Identify the highest priority card in **Ready** (or **In Progress** if resuming work)
5. Assess the card description — is there enough context to act on?
   - If yes: confirm with the user which card to pick up, then move it to **In Progress** (or **Design** if it needs planning first)
   - If not: update the description with clarifying questions and leave it in **Ready**
   - If the card is too large: recommend breaking it into multiple cards in **Backlog**

## Lifecycle Gates

Each column transition is a discrete gate. Claude must confirm with the user before crossing each gate, and must satisfy the entry criteria before moving the card.

### Gate 1: Ready → In Progress
**When:** User confirms which card to work on.
**Actions:**
- Move card to **In Progress**, update `updated`
- Tell the user what you're about to implement

### Gate 2: In Progress → Testing
**When:** Code is written and the implementation is complete.
**Before moving the card:**
1. Update `implementationNotes` with what changed and key decisions
2. Update `testPlan` with test commands and expected results
3. Check whether relevant docs in `docs/` need updating — update them if so
4. Move card to **Testing**, update `updated`
5. Tell the user exactly how to test: what commands to run, what to look for, what edge cases to check
6. **Wait for the user to confirm results before proceeding**

### Gate 3: Testing → Review
**When:** Claude's own testing passes (do not wait for user confirmation — move immediately after verifying).
**Before moving the card:**
1. Confirm all items in `testPlan` are verified
2. Move card to **Review**, update `updated`
3. Summarize what was built, what was tested, and what the user should review in the diff

### Gate 4: Review → Done
**When:** User explicitly approves the work.
**Before moving the card:**
1. Move card to **Done**, update `updated`
2. Note any follow-up cards discovered during this session — add them to **Backlog**

## Board Rules

- To move a card: update `column` and `updated` fields only
- To add a card: append to `cards` array with id format `card_{timestamp}_{random3}`
- Valid columns: Backlog, Ready, Design, In Progress, Testing, Review, Done
- Card fields: id, title, description, type (enhancement/defect), priority (high/medium/low), size (XS/S/M/L/XL), column, created, updated, tags, blocked, blockedReason
- Structured sections (optional, omit if empty): requirements, design, implementationNotes, testPlan, reviewNotes
- Check `wipLimits` before moving cards — do not exceed without flagging
- Always pretty-print JSON with 2-space indentation
- The kanban server runs on port 5555 (`node kanban-claude-code/serve.js`) — changes to the JSON are immediately reflected in the browser

## Schema Migration

If you pull a submodule update, check `kanban-claude-code/CHANGELOG.md` for schema changes. Follow the "Migration (for AI)" instructions to update `kanban-board.json` to the latest schema version.

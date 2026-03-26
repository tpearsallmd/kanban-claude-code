---
name: kanban
description: Read the kanban board and bootstrap Claude with the current task state. Use at session start to understand work in progress, pick up tasks, or update the board.
---

# Kanban Board Bootstrap

Read `kanban-board.json` and `kanban/kanban-spec.md` to understand the current board state and workflow rules.

## Session Start Protocol

1. **Verify kanban service is running**:
   - Check: `curl -sf http://${KANBAN_HOST:-localhost}:5555/health`
   - If it fails, you cannot proceed — the service must be running before this session starts
2. **Read the board**:
   - `curl -sf http://${KANBAN_HOST:-localhost}:5555/kanban.json`
3. Summarize the board state: how many cards per column, what's in progress, what's in review
4. Identify the highest priority card in **Ready** (or **In Progress** if resuming work)
5. Assess the card description — is there enough context to act on?
   - If yes: confirm with the user which card to pick up, then move it to **In Progress** (or **Design** if it needs planning first)
   - If not: update the description with clarifying questions and leave it in **Ready**
   - If the card is too large: recommend breaking it into multiple cards in **Backlog**

## Lifecycle Gates

Each column transition is a discrete gate. **Gates are not optional — never skip a column, never do work before moving the card.**

### Gate 1: Ready → In Progress
**When:** User confirms which card to work on.
**Actions — in this order:**
1. Move card to **In Progress**, update `updated` — **do this before starting any work**
2. Tell the user what you're about to implement
3. Then begin the work

### Gate 2: In Progress → Testing
**When:** Work is complete (code written, data updated, investigation done).
**Before moving the card:**
1. Update `implementationNotes` with what changed and key decisions
2. Update `testPlan` with what was verified and expected results
3. Check whether relevant docs in `docs/` need updating — update them if so
4. Move card to **Testing**, update `updated`
5. Tell the user exactly how to test: what commands to run, what to look for, what edge cases to check
6. **Wait for the user to confirm results before proceeding**

> **Data-only cards** (no code changes): Testing = verify the change in RDS/production (e.g. `manage_kennels.py show <id>`). Still move through Testing before Review.

### Gate 3: Testing → Review
**When:** Claude's own testing passes (do not wait for user confirmation — move immediately after verifying).
**Before moving the card:**
1. Confirm all items in `testPlan` are verified
2. Move card to **Review**, update `updated`
3. Summarize what was built, what was tested, and what the user should review in the diff

### Gate 4: Review → Done
**When:** User explicitly approves in the current conversation turn — e.g. "looks good", "ship it", "close that out", "move to Done". A general instruction to do work does NOT imply approval of results.
**Before moving the card:**
1. Move card to **Done**, update `updated`, and set `completedAt` if it is missing
2. Note any follow-up cards discovered during this session — add them to **Backlog**

## Board Rules

- The kanban service runs as a standalone Docker container at `http://${KANBAN_HOST:-localhost}:5555`
- **Never read or write `kanban-board.json` directly** — always use HTTP (`GET` and `PUT /kanban.json`)
- To move a card: read the board, update `column` and `updated` fields only, write back via HTTP
- To add a card: read the board, append to `cards` array with id format `card_{timestamp}_{random3}`, write back via HTTP
- Valid columns: Backlog, Ready, Design, In Progress, Testing, Review, Done
- Card fields: id, title, description, type (enhancement/defect), priority (high/medium/low), size (XS/S/M/L/XL), column, created, updated, completedAt, archived, tags, blocked, blockedReason
- Structured sections (optional, omit if empty): requirements, design, implementationNotes, testPlan, reviewNotes
- Check `wipLimits` before moving cards — do not exceed without flagging
- Always pretty-print JSON with 2-space indentation
- The UI shows only the 25 most recently completed `Done` cards; older completed cards remain in the same JSON file with `archived: true`


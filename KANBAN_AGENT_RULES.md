# Kanban Board — Agent Rules & API

Reference for AI agents integrating with the kanban service. For deployment info, see [INSTALLATION.md](INSTALLATION.md).

---

## Quick Start

```bash
# Verify service is running
curl -sf http://${KANBAN_HOST:-localhost}:5555/health

# Read the board
curl -sf http://${KANBAN_HOST:-localhost}:5555/kanban.json

# Update the board (read, modify, write back with 2-space indent)
curl -X PUT http://${KANBAN_HOST:-localhost}:5555/kanban.json \
  -H "Content-Type: application/json" \
  -d "$(jq --indent 2 . updated_board.json)"
```

---

## Workflow & Columns

```
Backlog → Ready → In Progress → Testing → Review → Done
```

| Column | Entry Criteria |
|--------|---|
| **Ready** | Description has acceptance criteria, relevant file paths, and edge cases. Card `requirements` section populated. |
| **In Progress** | Design is complete (or card is simple enough to skip). Only move here when actively coding. |
| **Testing** | Code is written and committed. `implementationNotes` updated with what changed. `testPlan` updated with how to test. Relevant docs updated. |
| **Review** | Tests pass. Docs updated. Ready for human approval. |
| **Done** | Human approved. Code merged or confirmed working. |

---

## Card Schema

```json
{
  "id": "card_1741234567_abc",
  "title": "Short task name",
  "description": "Longer context, acceptance criteria, file paths",
  "type": "enhancement",
  "priority": "high",
  "size": "M",
  "column": "Ready",
  "project": "repo-name",
  "created": "2026-03-12T10:00:00Z",
  "updated": "2026-03-12T10:00:00Z",
  "tags": ["backend", "urgent"],
  "blocked": false,
  "blockedReason": ""
}
```

### Core Fields
- **id** — `card_{timestamp}_{random3}`, unique and immutable
- **title** — short task name (required)
- **description** — longer context, acceptance criteria
- **type** — `enhancement` or `defect`
- **priority** — `high`, `medium`, or `low`
- **size** — `XS`, `S`, `M`, `L`, or `XL`
- **column** — must match one of the board's columns
- **project** — repository or project name (e.g., `SI_RDM`, `my-api`)
- **created / updated** — ISO 8601 timestamps (update on every write)
- **tags** — array of strings
- **blocked** — boolean; if true, `blockedReason` is required

### Optional Section Fields
Include only when they have content:
- **requirements** — acceptance criteria, constraints, edge cases
- **design** — approach, affected files, architecture notes
- **implementationNotes** — what changed, key decisions (build phase)
- **testPlan** — how to test, expected results, test commands (test phase)
- **reviewNotes** — summary for human reviewer (review phase)

---

## Rules for Agents

### Reading the Board
1. Health check first: `curl -sf http://${KANBAN_HOST:-localhost}:5555/health`
2. Read: `curl -sf http://${KANBAN_HOST:-localhost}:5555/kanban.json`
3. Parse as JSON and filter by column or project as needed

### Moving Cards
1. Read current board
2. Find the card by `id`
3. Update `column` and `updated` fields only
4. Write back via HTTP PUT

### Creating Cards
1. Read current board
2. Generate unique `id`: `card_{timestamp}_{random3}`
3. Add new object to `cards` array with required fields
4. Set `column` to `Backlog` (new cards start here)
5. Write back via HTTP PUT

### Card Lifecycle
- **Before moving to In Progress**: confirm description is actionable; ask user for clarification if needed
- **Before moving to Testing**: update `implementationNotes` with what changed
- **Before moving to Review**: confirm `testPlan` items are verified
- **When moving to Done**: set `column` to `Done` and update `updated`

### When a Card is Blocked
Set `blocked: true` and populate `blockedReason` with explanation. Never claim a blocked card.

### JSON Format
- Always pretty-print with **2-space indentation** when writing
- Omit optional section fields if they're empty
- Never modify `id` or `created` fields

---

## WIP Limits

The board defines WIP (Work In Progress) limits per column to prevent overload:

```json
{
  "wipLimits": {
    "In Progress": 3,
    "Testing": 2,
    "Review": 2
  }
}
```

Check before moving a card to a limited column. If the move would exceed the limit, flag it to the user rather than silently exceeding it.

---

## Concurrency

The service serializes writes via a promise queue. Concurrent PUTs are safe — the second write waits for the first to complete, then processes. No data loss or race conditions.

---

## Environment Variables

- `KANBAN_HOST` — hostname of the kanban service (default: `localhost`)
- `KANBAN_HOST_PORT` — port mapping (default: `5555`)

Example:
```bash
export KANBAN_HOST=homelab-01
curl -sf http://${KANBAN_HOST}:5555/health
```

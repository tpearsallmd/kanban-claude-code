# Kanban Board — Agent Rules & API

Reference for AI agents integrating with the kanban service. For deployment info, see [INSTALLATION.md](INSTALLATION.md).

---

## Quick Start

Set `KANBAN_HOST` environment variable (e.g., `export KANBAN_HOST=homelab-01:5555`). Defaults to `localhost:5555` if unset.

```bash
# Verify service is running
curl -sf http://${KANBAN_HOST:-localhost:5555}/health

# Read the entire board
curl -sf http://${KANBAN_HOST:-localhost:5555}/kanban.json

# Read cards from a specific column (more efficient for role sessions)
curl -sf http://${KANBAN_HOST:-localhost:5555}/kanban.json?column=Ready
curl -sf http://${KANBAN_HOST:-localhost:5555}/kanban.json?column=Code%20Review
curl -sf http://${KANBAN_HOST:-localhost:5555}/kanban.json?column=Testing

# Read a single card
curl -sf http://${KANBAN_HOST:-localhost:5555}/cards/card_1741234567_f7k

# Add a new card (POST sends only the card, not the full board)
curl -sf -X POST http://${KANBAN_HOST:-localhost:5555}/cards \
  -H "Content-Type: application/json" \
  -d '{"id": "card_...", "title": "...", "column": "Backlog", ...}'

# Update specific fields on a card (PATCH sends only changed fields)
curl -sf -X PATCH http://${KANBAN_HOST:-localhost:5555}/cards/card_1741234567_f7k \
  -H "Content-Type: application/json" \
  -d '{"column": "In Progress", "updated": "2026-03-27T12:00:00Z"}'

# Delete a card
curl -sf -X DELETE http://${KANBAN_HOST:-localhost:5555}/cards/card_1741234567_f7k
```

**Always use the granular endpoints** (POST, PATCH, DELETE) — they send only the card or changed fields, avoiding board corruption. Never use PUT to overwrite the full board.

---

## Workflow & Columns

```
Backlog → Ready → In Progress → Code Review → Testing → Review → Done
```

| Column | Entry Criteria |
|--------|---|
| **Ready** | Description has acceptance criteria, relevant file paths, and edge cases. Card `requirements` section populated. |
| **In Progress** | Design is complete (or card is simple enough to skip). Only move here when actively coding. |
| **Code Review** | Code is written and committed. `implementationNotes` updated with what changed. Ready for automated review (linting, security, unit tests). |
| **Testing** | Code review passed. `testPlan` updated with how to test. Relevant docs updated. Ready for manual verification. |
| **Review** | Tests pass. Ready for human approval. |
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
1. Health check first: `curl -sf http://${KANBAN_HOST:-localhost:5555}/health`
2. Read: `curl -sf http://${KANBAN_HOST:-localhost:5555}/kanban.json`
3. Parse as JSON and filter by column or project as needed

### Moving Cards

PATCH the card with the new column and updated timestamp:

```bash
curl -sf -X PATCH http://${KANBAN_HOST:-localhost:5555}/cards/<card_id> \
  -H "Content-Type: application/json" \
  -d '{"column": "In Progress", "updated": "2026-03-27T12:00:00Z"}'
```

### Creating Cards

POST a new card object — the server appends it to the board:

```bash
curl -sf -X POST http://${KANBAN_HOST:-localhost:5555}/cards \
  -H "Content-Type: application/json" \
  -d '{"id": "card_{timestamp}_{random3}", "title": "...", "column": "Backlog", ...}'
```

Set `column` to `Backlog` (new cards start here). See the Quick Start or kanban SKILL.md for the full card schema.

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

The service serializes writes via a promise queue. Concurrent requests are safe — the second write waits for the first to complete, then processes. No data loss or race conditions.

---

## Environment Variables

- `KANBAN_HOST` — service endpoint in format `hostname:port` (default: `localhost:5555`)

Example:
```bash
export KANBAN_HOST=homelab-01:5555
curl -sf http://${KANBAN_HOST:-localhost:5555}/health
```

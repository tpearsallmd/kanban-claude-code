---
name: kanban
description: Reference documentation for kanban workflow, card schema, and API. Not executable — use /build, /test, /review for actual work.
---

# Kanban Board

Manage cards on the kanban board and reference documentation for the SDLC workflow.

## Setup

Before any operation, ensure:
1. The kanban Docker service is running on `$KANBAN_HOST` (or `localhost:5555` by default)
2. Set the environment variable:
   ```bash
   export KANBAN_HOST=homelab-01:5555
   ```

## API Endpoints

All endpoints use `http://${KANBAN_HOST:-localhost:5555}` as the base URL.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| GET | `/kanban.json` | Read entire board |
| GET | `/kanban.json?column=Ready` | Read board filtered to one column |
| GET | `/cards/:id` | Read a single card |
| POST | `/cards` | Add a new card |
| PATCH | `/cards/:id` | Update specific fields on a card |
| DELETE | `/cards/:id` | Remove a card |

## Card Management

### Health check

```bash
curl -sf http://${KANBAN_HOST:-localhost:5555}/health
```

If this fails, stop — the service must be running.

### List cards

```bash
# Entire board
curl -sf http://${KANBAN_HOST:-localhost:5555}/kanban.json

# Single column
curl -sf http://${KANBAN_HOST:-localhost:5555}/kanban.json?column=Ready
curl -sf http://${KANBAN_HOST:-localhost:5555}/kanban.json?column=Backlog
```

Parse the JSON response. Cards are in a flat `cards` array — filter by `card.column` as needed.

### Read a single card

```bash
curl -sf http://${KANBAN_HOST:-localhost:5555}/cards/card_1741234567_f7k
```

Returns the card object directly (not wrapped in a board).

### Add a card

Generate a unique id: `card_{unix_timestamp}_{3_random_alphanumeric_chars}` (e.g., `card_1741234567_f7k`)

```bash
curl -sf -X POST http://${KANBAN_HOST:-localhost:5555}/cards \
  -H "Content-Type: application/json" \
  -d '{
  "id": "card_1741234567_f7k",
  "title": "Add rate limiting to API endpoints",
  "description": "Implement per-user rate limiting on all public API routes. Should return 429 with Retry-After header when exceeded.",
  "type": "enhancement",
  "priority": "high",
  "size": "M",
  "column": "Backlog",
  "project": "my-api",
  "created": "2026-03-27T10:00:00Z",
  "updated": "2026-03-27T10:00:00Z",
  "tags": ["backend", "security"],
  "blocked": false,
  "blockedReason": ""
}'
```

Returns the created card on success (HTTP 201). Returns HTTP 409 if the id already exists.

**Required fields:** `id`, `title`, `description`, `type`, `priority`, `size`, `column`, `project`, `created`, `updated`, `blocked`

**Field values:**
- `type` — `enhancement` or `defect`
- `priority` — `high`, `medium`, or `low`
- `size` — `XS`, `S`, `M`, `L`, or `XL`
- `column` — new cards go to `Backlog` unless the user specifies otherwise
- `project` — the repository or project name the card belongs to
- `tags` — optional array of strings
- `blockedReason` — required string when `blocked` is `true`, empty string otherwise

**Optional section fields** (omit when empty — do not include as empty strings):
- `requirements` — acceptance criteria, constraints, edge cases
- `design` — approach, affected files, architecture notes
- `implementationNotes` — what changed, key decisions (written during build)
- `testPlan` — how to test, expected results (written during testing)
- `reviewNotes` — summary for human reviewer (written during review)

### Edit a card

Send only the fields you want to change. The server merges them into the existing card. `id` and `created` are protected and cannot be changed.

```bash
curl -sf -X PATCH http://${KANBAN_HOST:-localhost:5555}/cards/card_1741234567_f7k \
  -H "Content-Type: application/json" \
  -d '{"priority": "medium", "updated": "2026-03-27T12:00:00Z"}'
```

Returns the full updated card on success.

### Move a card

Same as edit — PATCH with the new column and updated timestamp:

```bash
curl -sf -X PATCH http://${KANBAN_HOST:-localhost:5555}/cards/card_1741234567_f7k \
  -H "Content-Type: application/json" \
  -d '{"column": "In Progress", "updated": "2026-03-27T12:00:00Z"}'
```

Check `wipLimits` before moving. If the target column would exceed its limit, flag it to the user rather than silently exceeding it.

### Block and unblock cards

Use blocking to express dependencies between cards — card A must be completed before card B can proceed.

**To block a card:**

```bash
curl -sf -X PATCH http://${KANBAN_HOST:-localhost:5555}/cards/card_DEPENDENT_ID \
  -H "Content-Type: application/json" \
  -d '{"blocked": true, "blockedReason": "Blocked by card_1741234567_f7k — need rate limiting before adding public endpoints", "updated": "2026-03-27T12:00:00Z"}'
```

**When a blocker is completed:**
1. Read the board and find all cards where `blockedReason` references the completed card's id or title
2. PATCH each blocked card to unblock it:
   ```bash
   curl -sf -X PATCH http://${KANBAN_HOST:-localhost:5555}/cards/card_BLOCKED_ID \
     -H "Content-Type: application/json" \
     -d '{"blocked": false, "blockedReason": "", "updated": "2026-03-27T12:00:00Z"}'
   ```

Agents should never claim a blocked card. Report it to the user and skip it.

### Delete a card

```bash
curl -sf -X DELETE http://${KANBAN_HOST:-localhost:5555}/cards/card_1741234567_f7k
```

Returns the deleted card on success.

---

## SDLC Reference

For role-based workflows (build, test, review sessions), see:

- **[SDLC.md](./SDLC.md)** — Workflow gates, entry criteria, column rules, WIP limits, and session startup checklist
- **[KANBAN_AGENT_RULES.md](../../KANBAN_AGENT_RULES.md)** — Complete API reference, card schema, field definitions, and board rules

### Related executable skills

- **[/build](../build/SKILL.md)** — Build session: picks up Ready cards one at a time
- **[/test](../test/SKILL.md)** — Test session: picks up Testing cards one at a time
- **[/review](../review/SKILL.md)** — Review session: picks up Code Review cards one at a time
- **[/commit](../commit/SKILL.md)** — Smart commit with semver bumping
- **[/pipeline](../pipeline/SKILL.md)** — Orchestrates build → review → test sequentially

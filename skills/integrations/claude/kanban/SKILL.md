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

### Add a card

1. Read the current board:
   ```bash
   curl -sf http://${KANBAN_HOST:-localhost:5555}/kanban.json
   ```
2. Generate a unique id: `card_{unix_timestamp}_{3_random_alphanumeric_chars}` (e.g., `card_1741234567_f7k`)
3. Append a new card object to the `cards` array with all required fields
4. Write back:
   ```bash
   curl -sf -X PUT http://${KANBAN_HOST:-localhost:5555}/kanban.json \
     -H "Content-Type: application/json" \
     -d '<full board JSON>'
   ```

**Complete card example with all required fields:**

```json
{
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
}
```

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

1. Read the current board
2. Find the card by `id` in the `cards` array
3. Update the desired fields, always update `updated` to the current timestamp
4. Write the full board back via PUT

**Never modify:** `id`, `created`

### Move a card

Same as edit — update `column` and `updated`, then PUT the full board back.

Check `wipLimits` before moving. If the target column would exceed its limit, flag it to the user rather than silently exceeding it.

### Block and unblock cards

Use blocking to express dependencies between cards — card A must be completed before card B can proceed.

**To block a card:**
1. Set `blocked: true` on the dependent card
2. Set `blockedReason` to reference the blocker, e.g., `"Blocked by card_1741234567_f7k — need rate limiting before adding public endpoints"`
3. Update `updated`

**When a blocker is completed:**
1. Read the board and find all cards where `blockedReason` references the completed card's id or title
2. For each blocked card: set `blocked: false`, clear `blockedReason` to `""`
3. Update `updated` on each unblocked card
4. Write the board back

Agents should never claim a blocked card. Report it to the user and skip it.

### Delete a card

1. Read the current board
2. Remove the card object from the `cards` array by `id`
3. Write the full board back via PUT

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

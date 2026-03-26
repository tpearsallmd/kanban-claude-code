---
name: pipeline
description: Pipeline orchestrator. Checks the kanban board and sequentially dispatches build, review, and test sessions for any queued work. Run via /loop for continuous pipeline processing.
---

# Pipeline Orchestrator

Checks the kanban board state and dispatches role sessions for any queued work.
Does not do any work itself — it only reads the board and invokes existing skills.

Run via: `/loop 5m /pipeline`

---

## Constraints

- **Read-only on `kanban-board.json`** — this skill never writes to the board. All card movement is done by the dispatched skills.
- **Sequential dispatch only** — never run build, review, and test concurrently. This is the concurrency guard. Run one, wait for it to finish, then run the next.
- **No source code changes** — this skill does not touch any source files.

---

## Startup

1. Verify the kanban service is running:
   - Check: `curl -sf http://${KANBAN_HOST:-localhost:5555}/health`
   - If it fails: Report "Kanban service not running at `$KANBAN_HOST` (or `localhost:5555` if not set). Start the Docker service and try again." Then stop.
   - Do NOT attempt to start the service — it must be running independently as a Docker container.
2. Read the board from the HTTP API:
   - `curl -sf http://${KANBAN_HOST:-localhost:5555}/kanban.json`

**Board schema reminder:** The HTTP response is a JSON object with `columns` (array of strings) and `cards` (flat array). Cards have a `column` field. Filter by column: `board.cards.filter(c => c.column === "Ready")`. See `SDLC.md` and `KANBAN_AGENT_RULES.md` for full schema details.

---

## Dispatch Logic

Check each queue in order. **Wait for each dispatch to complete before starting the next.**

### 1. Build

1. Count cards in the **Ready** column (excluding `blocked: true`)
2. If any cards are present:
   - Report: "Dispatching build — {n} card(s) queued"
   - Invoke the `/build` skill
   - Wait for it to complete
3. If no cards: report "Ready queue empty — skipping build"

### 2. Code Review

1. **Re-read `kanban-board.json`** — build may have moved cards into Code Review
2. Count cards in the **Code Review** column (excluding `blocked: true`)
3. If any cards are present:
   - Report: "Dispatching code review — {n} card(s) queued"
   - Invoke the `/review` skill
   - Wait for it to complete
4. If no cards: report "Code Review queue empty — skipping"

### 3. Testing

1. **Re-read `kanban-board.json`** — review may have moved cards into Testing
2. Count cards in the **Testing** column where `lockedBy` is not set and `blocked` is not `true`
3. If any cards are available:
   - Report: "Dispatching testing — {n} card(s) queued"
   - Invoke the `/test` skill
   - Wait for it to complete
4. If no cards: report "Testing queue empty — skipping"

---

## Tick Summary

After all dispatches complete (or are skipped), report:

```
Pipeline tick complete — {timestamp}

  Build:        {n} cards processed / queue empty
  Code Review:  {n} cards processed / queue empty
  Testing:      {n} cards processed / queue empty

  Next check: waiting for loop interval
```

---

## Notes

- **Cards flow through stages in a single tick.** If build moves cards into Code Review and review passes them into Testing, subsequent dispatches in the same tick pick them up immediately because the board is re-read between dispatches.
- **Blocked cards are reported but not touched.** If any cards have `blocked: true` in any column, mention them in the tick summary so the user is aware.
- **lockedBy is respected.** If a Testing card has `lockedBy` set, another session is already working it. Report it for visibility but do not attempt to process it.

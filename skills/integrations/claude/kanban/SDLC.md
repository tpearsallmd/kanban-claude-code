# SDLC Reference

This is the canonical rulebook for all role sessions (build, test, review). Every role skill references this document. Gate logic is defined here once and owned here permanently.

**For API reference and card schema, see [KANBAN_AGENT_RULES.md](../../KANBAN_AGENT_RULES.md).**

---

## Session Startup (all roles)

Every role session runs these steps on start, before doing anything role-specific:

1. **Verify kanban service is running**:
   - Check: `curl -sf http://${KANBAN_HOST:-localhost}:5555/health`
   - If it fails, you cannot proceed — the service must be running before this session starts
2. **Read the board**:
   - `curl -sf http://${KANBAN_HOST:-localhost}:5555/kanban.json`
3. **Filter to your role's column** — each role only works cards in its designated column (see role skills)
4. **Present available cards** to the user — do not begin any work, do not claim any card
5. **Wait for the user to confirm** which card to pick up before proceeding

---

## Columns

| Column | Purpose |
|--------|---------|
| Backlog | Defined but not ready to start |
| Ready | Prioritized and actionable — the normal intake queue for build sessions |
| In Progress | Actively being built by a build session |
| Code Review | Awaiting independent code review by a review session before testing |
| Testing | Awaiting independent verification by a test session |
| Review | Awaiting human approval |
| Done | Complete |

WIP limits are defined in `kanban-board.json` -> `wipLimits`. Check before moving cards. Flag if a move would exceed the limit rather than silently exceeding it.

### Board JSON Schema

`kanban-board.json` uses a **flat cards array**, NOT nested column objects. The structure is:

```json
{
  "columns": ["Backlog", "Ready", "In Progress", "Code Review", "Testing", "Review", "Done"],
  "wipLimits": { "In Progress": 3, ... },
  "cards": [
    { "id": "card_...", "title": "...", "column": "Ready", "blocked": false, ... }
  ]
}
```

- `columns` is an array of **strings** (column names), not objects.
- `cards` is a flat array at the top level. Each card has a `column` field indicating which column it belongs to.
- To find cards in a column: `board.cards.filter(c => c.column === "Code Review")`
- **Do NOT** use `board.columns.find(c => c.cards)` or treat `columns` as objects — they are plain strings.

---

## Lifecycle Gates

Each gate is a mandatory transition. **Never skip a column. Never do work before the card is moved.**

### Gate 1: Ready -> In Progress
**Owner:** Build session
**Trigger:** User confirms which card to work on

Actions in order:
1. Move card to **In Progress**, update `updated`
2. Tell the user what you are about to implement
3. Begin work

---

### Gate 2: In Progress -> Code Review
**Owner:** Build session
**Trigger:** Work is complete

Required before moving:
1. Write `implementationNotes` — what changed, key decisions, files touched, new/modified test files. **Required. Do not move without it.**
2. Check whether any project docs need updating — update them if so
3. Move card to **Code Review**, update `updated`
4. Tell the user: "Card is ready for code review — open a new session and run `/review` to pick it up."

> Do NOT write `testPlan` — that is the test session's responsibility, derived independently.

> Data-only cards: `implementationNotes` should describe what data changed and where to verify it.

---

### Gate 3: Code Review -> Testing (pass) or Code Review -> Ready (fail)
**Owner:** Review session
**Trigger:** Review checklist complete

**On pass:** All checklist items clear:
1. Write `reviewNotes` — summary of what was reviewed, what passed, any caveats
2. Move card to **Testing**, update `updated`
3. Tell the user: "Code review passed — open a new session and run `/test` to pick it up."

**On fail:**
1. Write `reviewFeedback` — specific, actionable list of issues found. Group by category: fidelity, quality, security, test coverage.
2. Add tag `returned-from-review`
3. Move card to **Ready**, update `updated`

> The review session does not fix code. It identifies issues and returns the card. Build session reads `reviewFeedback` on returned cards before resuming work.

---

### Gate 4: Testing -> Review (pass) or Testing -> Ready (fail)
**Owner:** Test session
**Trigger:** All test steps executed

**On pass:** All `testResults` items are `pass` or `skip` with justification:
1. Write `reviewNotes` — what was built, what was tested, files changed, caveats for reviewer
2. Clear `testPlan` and `testResults` (working fields — reviewNotes is the permanent record)
3. Clear `lockedBy`
4. Move card to **Review**, update `updated`

**On fail:**
1. Append to `testFailureLog`: `{date, failedSteps, errorSummary, hypothesis}` — hypothesis is **required**
2. Increment `testFailureCount` (create at 1 if missing)
3. Clear `testPlan`, `testResults`, `lockedBy`
4. Add tag `returned-from-test`
5. If `testFailureCount` >= 2: set `blocked: true`, `blockedReason: "Failed testing {n} times — human review required"`
6. Move card to **Ready**, update `updated`

> Environment conflicts (service down, port in use, data collision from another session): do NOT increment `testFailureCount`. Set `blocked: true` with an environment conflict reason. Leave in Testing.

---

### Gate 5: Review -> Done
**Owner:** Human (explicit approval)
**Trigger:** User says "looks good", "ship it", "close it out", "move to Done", or equivalent

Actions:
1. Move card to **Done**, update `updated`, and set `completedAt` if it is missing
2. Add any discovered follow-up work as new cards in **Backlog**

A general instruction to do work does NOT imply approval. Explicit sign-off only.

---

## Card Schema

### Core fields (always present)
| Field | Values |
|-------|--------|
| id | `card_{timestamp}_{random3}` |
| title | Short imperative label |
| description | What needs to be done and why |
| type | `enhancement` \| `defect` |
| priority | `high` \| `medium` \| `low` |
| size | `XS` \| `S` \| `M` \| `L` \| `XL` |
| column | See Columns above |
| created | ISO date |
| updated | ISO date — update on every write |
| completedAt | ISO date — set when the card first enters `Done` |
| archived | Boolean — optional flag for older `Done` cards kept in the same file |
| tags | Array of strings |
| blocked | Boolean |
| blockedReason | String (required when blocked: true) |

### Role-owned fields (omit when empty)
| Field | Owner | Purpose |
|-------|-------|---------|
| lockedBy | Test session | `"test-agent-{timestamp}"` — prevents double-testing. Cleared on completion. |
| implementationNotes | Build session | What changed, decisions, files touched, new/modified test files. Read-only for all other sessions. |
| reviewFeedback | Review session | Actionable issues found during code review, grouped by category. Read by build session on returned cards. Cleared when card passes review. |
| testPlan | Test session | Derived independently from implementationNotes + git diff. Not written by build. |
| testResults | Test session | `[{step, result, notes}]` — `result` is `pass`\|`fail`\|`skip` |
| testFailureLog | Test session | `[{date, failedSteps, errorSummary, hypothesis}]` — append-only, never cleared |
| testFailureCount | Test session | Integer. >= 2 triggers block. |
| reviewNotes | Test session | Summary for human reviewer. Permanent record after Testing. |
| requirements | Any | Structured requirements if needed |
| design | Any | Design notes if needed |

### Field ownership rules
- Build session: writes `implementationNotes`. Reads `reviewFeedback` on returned cards. Never writes `testPlan`, `testResults`, `reviewFeedback`, or `reviewNotes`.
- Review session: writes `reviewFeedback`, `reviewNotes`, `tags`. Reads `implementationNotes`. Never writes `implementationNotes` or `testPlan`.
- Test session: writes `testPlan`, `testResults`, `testFailureLog`, `testFailureCount`, `reviewNotes`, `lockedBy`, `blocked`, `blockedReason`, `tags`. Never writes `implementationNotes` or `reviewFeedback`.
- Human reviewer: explicit approval only (Gate 5).
- All sessions: update `column` and `updated` when moving cards.

---

## Board Rules

- The kanban service runs as a standalone Docker container at `http://${KANBAN_HOST:-localhost}:5555`
- **Never read or write `kanban-board.json` directly** — always use HTTP endpoints
- **Always use granular endpoints** — `POST /cards`, `PATCH /cards/:id`, `DELETE /cards/:id`. Never use PUT to overwrite the full board.
- Move a card: `PATCH /cards/:id` with `column` and `updated` (plus any required fields for that gate)
- Add a card: `POST /cards` with the full card object — id format `card_{timestamp}_{random3}`
- Never modify: `created`, `id`
- Blocked cards: never claim. Report to user and skip.
- Always pretty-print JSON with 2-space indentation
- The UI shows the 25 most recently completed cards in `Done`; older completed cards remain in the same JSON file with `archived: true`

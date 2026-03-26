# SDLC Reference

This is the canonical rulebook for the build, review, and test skills.

**For API reference and card schema, see [KANBAN_AGENT_RULES.md](../../KANBAN_AGENT_RULES.md).**

## Session Startup

Every role session should:

1. Read `kanban-board.json`.
2. Filter to the role's working column.
3. Present available cards unless the role skill is explicitly designed to auto-process the queue.

## Columns

| Column | Purpose |
|--------|---------|
| Backlog | Defined but not ready |
| Ready | Prioritized and actionable |
| In Progress | Actively being built |
| Code Review | Awaiting independent review |
| Testing | Awaiting independent verification |
| Review | Awaiting human approval |
| Done | Complete |

Check `wipLimits` before moving cards.

## Board JSON Schema

`kanban-board.json` uses a flat top-level `cards` array:

```json
{
  "columns": ["Backlog", "Ready", "In Progress", "Code Review", "Testing", "Review", "Done"],
  "wipLimits": { "In Progress": 3 },
  "cards": [
    { "id": "card_...", "column": "Ready" }
  ]
}
```

- `columns` is an array of strings.
- `cards` is a flat array.
- Filter by `card.column`.

## Lifecycle Gates

### Gate 1: Ready -> In Progress

Owner: build

1. Move the card to `In Progress`.
2. Update `updated`.
3. Begin work.

### Gate 2: In Progress -> Code Review

Owner: build

Before moving:

1. Write `implementationNotes` including what changed, key decisions, files touched, and new or modified tests.
2. Update affected docs.
3. Move the card to `Code Review`.
4. Update `updated`.

### Gate 3: Code Review -> Testing or Ready

Owner: review

On pass:

1. Write `reviewNotes`.
2. Move the card to `Testing`.
3. Update `updated`.

On fail:

1. Write `reviewFeedback`.
2. Add tag `returned-from-review`.
3. Move the card to `Ready`.
4. Update `updated`.

### Gate 4: Testing -> Review or Ready

Owner: test

On pass:

1. Write `reviewNotes`.
2. Clear `lockedBy`.
3. Move the card to `Review`.
4. Update `updated`.

On fail:

1. Append to `testFailureLog` with `date`, `failedSteps`, `errorSummary`, and `hypothesis`.
2. Increment `testFailureCount`.
3. Clear `lockedBy`.
4. Add tag `returned-from-test`.
5. If failures reach 2 or more, block the card for human review.
6. Move the card to `Ready`.
7. Update `updated`.

Environment failures should block the card without incrementing failure count.

### Gate 5: Review -> Done

Owner: human approval

1. Move the card to `Done`.
2. Update `updated`.
3. Set `completedAt` if it is missing.
4. Add any follow-up cards to `Backlog`.

## Card Schema

Core fields:

- `id`
- `title`
- `description`
- `type`
- `priority`
- `size`
- `column`
- `created`
- `updated`
- `completedAt`
- `archived`
- `tags`
- `blocked`
- `blockedReason`

Role-owned optional fields:

- `lockedBy`
- `implementationNotes`
- `reviewFeedback`
- `testPlan`
- `testResults`
- `testFailureLog`
- `testFailureCount`
- `reviewNotes`
- `requirements`
- `design`

## Field Ownership

- Build writes `implementationNotes`.
- Review writes `reviewFeedback`, `reviewNotes`, `tags`, blocking fields, and movement fields.
- Test writes `testPlan`, `testResults`, `testFailureLog`, `testFailureCount`, `reviewNotes`, `lockedBy`, blocking fields, tags, and movement fields.
- All sessions update `column` and `updated` when moving cards.

## Board Rules

- Never change `id` or `created`.
- Never claim blocked cards.
- The UI shows the 25 most recently completed cards in `Done`; older completed cards remain in the same JSON file with `archived: true`.
- Pretty-print JSON with 2-space indentation.

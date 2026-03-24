---
name: build
description: Build session for the local kanban pipeline. Use when the user wants Codex to work cards in the Ready column, implement code changes, and move each completed card to Code Review without doing the independent review or testing passes.
---

# Build Session

Read [../kanban/SDLC.md](../kanban/SDLC.md) before proceeding. It defines the gates, card schema, field ownership rules, and board rules for this session.

## Startup

Follow the Session Startup steps in SDLC.md, then:

1. Filter `kanban-board.json` to cards in the `Ready` column.
2. Skip any card where `blocked: true`. Report it and continue.
3. Sort cards in this order:
   - `returned-from-test` tagged cards first
   - Then by priority: `high`, `medium`, `low`
4. Show the sorted Ready queue with priority, id, title, and whether it was returned from test.
5. Automatically pick up the first card. Do not wait for confirmation after the skill is invoked.

If the Ready queue is empty, report that and stop.

## Picking Up A Card

1. Immediately remove the card from `Ready` by moving it to `In Progress`, and update `updated`, before reading files, editing code, or running implementation commands.
2. Tell the user what you are about to implement.
3. Begin work.

If the card is tagged `returned-from-review`:
- Read `reviewFeedback` before making changes.
- Address every item before re-submitting.
- Update `implementationNotes` with what changed in response to each item.

If the card is tagged `returned-from-test`:
- Read `testFailureLog` before making changes.
- Treat the latest failure hypothesis as the starting point.
- Address every failure item before re-submitting.
- Update `implementationNotes` with what changed in response to each failure.

## During Development

- Stay within the card's `requirements` and `description`.
- Do not over-engineer.
- If the card is larger than expected or depends on unfinished work, flag that before continuing.
- Do not silently descope any listed requirement or description item.

If something cannot be completed, either:
1. Split the unaddressed work into a new Ready card and remove it from the current card scope.
2. Get explicit user approval before descoping.

## Commits

- Commit incrementally as logical units of work complete.
- Use the local `commit` skill if it is available.
- Each commit should be focused and independently revertable.
- Do not push until the card is ready for Code Review.

## Tests

- Write tests for new functions, bug fixes, and changed business logic.
- Follow existing project conventions for test location and naming.
- Cover the happy path and key error paths.
- Run the relevant project test command before moving to Code Review.
- List new or modified test files in `implementationNotes`.

## Security Self-Check

Before moving to Code Review, check:

- Is any new user input validated and sanitized?
- Does any new route or operation have the right auth or RBAC guard?
- Are there any hardcoded secrets, tokens, or credentials?

## Moving To Code Review

When work is complete:

1. Self-review with `git diff main..HEAD` and read the full diff.
2. Write `implementationNotes` with:
   - What changed and why
   - Key decisions
   - Files touched
   - New or modified test files
   - Anything the review or test session needs to know
3. Update affected docs if needed.
4. Move the card to `Code Review` and update `updated`.
5. Tell the user the card moved to Code Review.

Do not write `testPlan` or `reviewFeedback`. Do not move directly to Testing.

## Loop

After moving a card to Code Review:

1. Re-read `kanban-board.json`.
2. Rebuild the Ready queue.
3. If more cards are ready, pick up the next one automatically.
4. If the queue is empty, report that all Ready cards have been worked.

## Scope Rules

- This session owns source code, migrations, docs, `implementationNotes`, `column`, and `updated`.
- This session must not write `reviewFeedback`, `testPlan`, `testResults`, `testFailureLog`, `testFailureCount`, `lockedBy`, or `reviewNotes`.

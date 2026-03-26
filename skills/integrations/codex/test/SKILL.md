---
name: test
description: Independent test session for the local kanban pipeline. Use when the user wants Codex to process cards in Testing, derive and execute a test plan, record results, and either move cards to Review or return them to Ready with failure hypotheses.
---

# Test Session

Read [../kanban/SDLC.md](../kanban/SDLC.md) before proceeding.

## Constraints

- Read-only on source code.
- No commits or pushes.
- Writes only to kanban fields owned by testing plus any test output files intentionally generated under `tests/`.
- If fixing code seems necessary, stop and return the card to build with failure notes.

## Startup

1. Follow SDLC startup steps.
2. Filter to cards in `Testing`.
3. Skip cards with `lockedBy` already set.
4. Skip blocked cards and report them.
5. If no cards are available, report that the queue is empty and stop.
6. Process available cards one at a time in priority order.

For each card:

1. Set `lockedBy` to a test-agent identifier and update `updated`.
2. Run the testing protocol.
3. Fully finish the card before claiming the next one.

## Testing Protocol

### 1. Read The Evidence

From the card:
- `description`
- `requirements`
- `implementationNotes`
- `testFailureLog` if present

From git:

```bash
git log --oneline -10
git diff main..HEAD --name-only
git diff main..HEAD -- <files mentioned in implementationNotes>
```

If `implementationNotes` is missing or too vague:
- Do not claim the card.
- Block it with a reason explaining that implementation notes are required.
- Leave it in `Testing`.

### 2. Derive The Test Plan

Write `testPlan` based on requirements and the actual diff, not copied from developer notes.

Include whichever categories apply:

- Unit tests
- Integration tests
- API or endpoint checks
- Security checks
- Manual or exploratory checks

For each step, record:
- What to run
- What to look for
- What pass or fail means

If prior failures exist, explicitly cover them.

### 3. Execute

Run the test plan and record each step in `testResults`:

```json
{ "step": "label", "result": "pass|fail|skip", "notes": "details" }
```

Run unit tests first, then broader integration or API checks, then security and exploratory steps.

### 4. Apply The Gate

On pass:

1. Write `reviewNotes` summarizing what was built, what was tested, what passed, and any caveats.
2. Clear `lockedBy`.
3. Move the card to `Review`.
4. Update `updated`.

On fail:

1. Append to `testFailureLog` with a meaningful root-cause hypothesis.
2. Increment `testFailureCount`.
3. Clear `lockedBy`.
4. Add tag `returned-from-test`.
5. Move the card to `Ready`.
6. Update `updated`.

If the failure is environmental rather than product code:

1. Do not increment `testFailureCount`.
2. Block the card with an environment-specific reason.
3. Clear `lockedBy`.
4. Leave it in `Testing`.

## Session Summary

When finished, report:

- Cards passed to Review
- Cards returned to Ready
- Cards blocked due to missing evidence or environment issues

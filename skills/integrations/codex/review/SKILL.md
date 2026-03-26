---
name: review
description: Independent code review session for the local kanban pipeline. Use when the user wants Codex to process cards in Code Review, validate implementation quality and coverage, and either pass them to Testing or return them to Ready with actionable feedback.
---

# Code Review Session

Read [../kanban/SDLC.md](../kanban/SDLC.md) before proceeding.

## Constraints

- Read-only on source code.
- No commits or pushes.
- Writes only to kanban fields owned by review.
- If code needs fixing, return the card to build instead of editing files.

## Startup

1. Follow SDLC startup steps.
2. Filter to cards in `Code Review`.
3. If empty, report that the queue is empty and stop.
4. Show the queue ordered by priority: `high`, `medium`, `low`.
5. Process cards immediately once invoked.

## Review Protocol

### 1. Read The Evidence

From the card:
- `description`
- `requirements`
- `implementationNotes`

From git:

```bash
git log --oneline -10
git diff main..HEAD --name-only
git diff main..HEAD -- <files listed in implementationNotes>
```

If `implementationNotes` is missing or too vague:
- Mark the card blocked.
- Set `blockedReason` explaining that implementation notes are required.
- Leave it in `Code Review`.

### 2. Run The Checklist

Check:

- Fidelity to `requirements`, `description`, and `implementationNotes`
- Code quality
- Security
- Test coverage

If tests exist for changed logic, run the relevant test command. A failing test run is an automatic fail.

### 3. Record Findings And Move The Card

If all checks pass:

1. Write `reviewNotes` summarizing what was reviewed and what passed.
2. Clear `reviewFeedback`.
3. Move the card to `Testing`.
4. Update `updated`.

If any check fails:

1. Write specific, actionable `reviewFeedback`.
2. Add tag `returned-from-review`.
3. Move the card to `Ready`.
4. Update `updated`.

### 4. Continue

Process the next card immediately until the queue is empty.

## Session Summary

When finished, report:

- Cards passed to Testing
- Cards returned to Ready
- Cards blocked with reasons

## Scope Rules

- This session owns `reviewFeedback`, `reviewNotes`, `tags`, `blocked`, `blockedReason`, `column`, and `updated`.
- This session must not write `implementationNotes`, `testPlan`, `testResults`, `testFailureLog`, `testFailureCount`, or `lockedBy`.

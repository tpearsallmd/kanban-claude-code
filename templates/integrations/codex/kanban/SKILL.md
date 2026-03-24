---
name: kanban
description: Bootstrap the repo's kanban workflow. Use when the user wants Codex to inspect `kanban-board.json`, summarize board state, pick up a task, or update the board using the repo's SDLC rules.
---

# Kanban Board Bootstrap

Read `kanban-board.json` and [SDLC.md](SDLC.md) before acting.

## Session Start Protocol

1. Read `kanban-board.json`.
2. Summarize the board state, including card counts by column plus anything in progress, review, or testing.
3. Identify the highest-priority card in `Ready`, or `In Progress` if work is being resumed.
4. Assess whether the card description has enough context to act.

If a card is actionable:
- Confirm with the user which card to pick up unless another role skill says to auto-claim.
- Move it to `In Progress` or `Design` before starting work.

If a card lacks detail:
- Add clarifying notes or questions to the card and leave it in `Ready`.

If a card is too large:
- Recommend splitting it into smaller cards in `Backlog`.

## Lifecycle Gates

Each transition is mandatory. Never skip a column and never do work before moving the card.

### Gate 1: Ready -> In Progress

1. Move the card to `In Progress` and update `updated`.
2. Tell the user what you are about to do.
3. Begin work.

### Gate 2: In Progress -> Code Review

1. Write `implementationNotes`.
2. Update affected docs if needed.
3. Move the card to `Code Review` and update `updated`.
4. Tell the user it is ready for code review.

### Gate 3: Code Review -> Testing or Ready

The review skill owns this gate.

### Gate 4: Testing -> Review or Ready

The test skill owns this gate.

### Gate 5: Review -> Done

1. Move the card to `Done`, update `updated`, and set `completedAt` if it is missing.
2. Add follow-up cards to `Backlog` if needed.

Only explicit user approval counts as sign-off.

## Board Rules

- Move a card by updating `column` and `updated`, plus any gate-specific fields.
- Add a card with id format `card_{timestamp}_{random3}`.
- Valid columns: `Backlog`, `Ready`, `Design`, `In Progress`, `Code Review`, `Testing`, `Review`, `Done`
- Card fields may include `completedAt` and `archived` for completed-card history.
- Check `wipLimits` before moving cards.
- Always pretty-print JSON with 2-space indentation.

## Schema Migration

If the bundled kanban helper is updated, check its changelog and migrate `kanban-board.json` when required.

---
name: pipeline
description: Orchestrate the local kanban pipeline. Use when the user wants Codex to inspect the board and sequentially run the build, review, and test role workflows for queued cards without doing them concurrently.
---

# Pipeline Orchestrator

This skill reads the board and dispatches the build, review, and test workflows in sequence. It does not change source code directly.

## Constraints

- Treat `kanban-board.json` as read-only from the orchestrator itself.
- Run build, review, and test sequentially, never concurrently.
- Do not edit source files from this skill.

## Startup

1. Verify the kanban service is running:
   - Check: `curl -sf http://${KANBAN_HOST:-localhost:5555}/health`
   - If it fails: Report "Kanban service not running at `$KANBAN_HOST` (or `localhost:5555` if not set). Start the Docker service and try again." Then stop.
   - Do NOT attempt to start the service — it must be running independently as a Docker container.
2. Read the board from the HTTP API:
   - `curl -sf http://${KANBAN_HOST:-localhost:5555}/kanban.json`
   - Cards live in a flat `cards` array and are filtered by the `column` field

## Dispatch Logic

### 1. Build

1. Count unblocked cards in `Ready`.
2. If any are present, report the count and invoke the `build` skill behavior.
3. If none are present, report that build is skipped.

### 2. Code Review

1. Re-read `kanban-board.json`.
2. Count unblocked cards in `Code Review`.
3. If any are present, report the count and invoke the `review` skill behavior.
4. If none are present, report that review is skipped.

### 3. Testing

1. Re-read `kanban-board.json`.
2. Count unblocked cards in `Testing` where `lockedBy` is not set.
3. If any are present, report the count and invoke the `test` skill behavior.
4. If none are present, report that testing is skipped.

## Tick Summary

After all three checks, report:

- Timestamp
- Build result
- Code review result
- Testing result
- Any blocked cards that were skipped

## Notes

- Cards may move through multiple stages in one pipeline tick because the board is re-read between stages.
- Respect `blocked` and `lockedBy` fields at every step.

# Kanban Board Changelog

Schema and structural changes that affect `kanban.json` compatibility. When pulling submodule updates, check this file and follow the migration instructions.

## [2] - 2026-03-24

### Done History Archiving

- Added optional card fields `completedAt` and `archived`
- The UI now shows only the 25 most recently completed cards in `Done`
- Older completed cards remain in the same JSON file and are marked `archived: true`
- Entering `Done` stamps `completedAt` automatically if it is missing

### Migration (for AI)

For each card in `kanban.json` or `kanban-board.json`:

1. If `card.column === "Done"` and `completedAt` is missing, set `completedAt` to `updated` if present, otherwise `created`
2. Sort `Done` cards descending by `completedAt`, falling back to `updated`, then `created`
3. For the newest 25 `Done` cards, remove `archived` if present
4. For all older `Done` cards, set `archived: true`
5. For cards not in `Done`, remove `archived` if present

These fields are optional. Empty board templates do not need structural changes.

## [1] - 2026-03-12

### Initial Release

- Base schema: `version`, `repo`, `columns`, `wipLimits`, `cards`
- Card fields: `id`, `title`, `description`, `type`, `priority`, `size`, `column`, `created`, `updated`, `tags`, `blocked`, `blockedReason`
- Structured sections (optional): `requirements`, `design`, `implementationNotes`, `testPlan`, `reviewNotes`
- WIP limits: Design (2), In Progress (3), Testing (3), Review (5)
- Columns: Backlog, Ready, Design, In Progress, Testing, Review, Done

### Migration (for AI)

No migration needed — this is the initial version. If your `kanban.json` predates structured sections, no action required; the section fields are optional and omitted when empty.

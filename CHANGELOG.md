# Kanban Board Changelog

Schema and structural changes that affect `kanban.json` compatibility. When pulling submodule updates, check this file and follow the migration instructions.

## [1] - 2026-03-12

### Initial Release

- Base schema: `version`, `repo`, `columns`, `wipLimits`, `cards`
- Card fields: `id`, `title`, `description`, `type`, `priority`, `size`, `column`, `created`, `updated`, `tags`, `blocked`, `blockedReason`
- Structured sections (optional): `requirements`, `design`, `implementationNotes`, `testPlan`, `reviewNotes`
- WIP limits: Design (2), In Progress (3), Testing (3), Review (5)
- Columns: Backlog, Ready, Design, In Progress, Testing, Review, Done

### Migration (for AI)

No migration needed — this is the initial version. If your `kanban.json` predates structured sections, no action required; the section fields are optional and omitted when empty.

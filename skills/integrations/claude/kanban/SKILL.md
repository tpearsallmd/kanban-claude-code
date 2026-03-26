---
name: kanban
description: Reference documentation for kanban workflow, card schema, and API. Not executable — use /build, /test, /review for actual work.
---

# Kanban Documentation Reference

This is not an executable skill — it's a reference for the kanban workflow and rules used by all role skills.

## When to use this

- Before starting a `/build`, `/test`, or `/review` session, read [SDLC.md](./SDLC.md) to understand workflow gates and rules
- When working on a card, refer to [KANBAN_AGENT_RULES.md](../../KANBAN_AGENT_RULES.md) for card schema and field ownership
- When unsure about column flow or WIP limits, check [SDLC.md](./SDLC.md)

## Documentation files

- **[SDLC.md](./SDLC.md)** — Workflow gates, entry criteria, column rules, WIP limits, and session startup checklist
- **[KANBAN_AGENT_RULES.md](../../KANBAN_AGENT_RULES.md)** — Complete API reference, card schema, field definitions, and board rules

## Related executable skills

- **[/build](../build/SKILL.md)** — Build session: picks up Ready cards one at a time
- **[/test](../test/SKILL.md)** — Test session: picks up Testing cards one at a time
- **[/review](../review/SKILL.md)** — Review session: picks up Code Review cards one at a time
- **[/commit](../commit/SKILL.md)** — Smart commit with semver bumping
- **[/pipeline](../pipeline/SKILL.md)** — Orchestrates build → review → test sequentially

## Setup

Before any role can work, ensure:
1. The kanban Docker service is running on `$KANBAN_HOST` (or `localhost:5555` by default)
2. Set the environment variable:
   ```bash
   export KANBAN_HOST=homelab-01:5555
   ```

See the main [README.md](../README.md) for full Docker setup instructions.

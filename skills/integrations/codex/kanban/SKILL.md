---
name: kanban
description: Read and display the current kanban board from the HTTP service. Shows all cards organized by column with priority and status.
---

# Kanban Board Reader

Display the current kanban board from the remote service.

## Usage

```bash
/kanban
```

## What it does

1. **Health check** — verify the kanban service is running at `$KANBAN_HOST` (default: `localhost:5555`)
2. **Read the board** — fetch `GET /kanban.json` from the service
3. **Display summary** — show cards organized by column with priority, size, and status indicators

## Setup

Before running this skill, ensure:
1. The kanban Docker service is running on `$KANBAN_HOST` (or `localhost:5555` by default)
2. Set the `KANBAN_HOST` environment variable if using a remote service:
   ```bash
   export KANBAN_HOST=homelab-01:5555
   ```

See the main [README.md](../README.md) for full setup instructions.

## Related skills

- **[/build](../build/SKILL.md)** — Build session for Ready cards
- **[/test](../test/SKILL.md)** — Test session for Testing cards
- **[/review](../review/SKILL.md)** — Review session for Review cards
- **[/commit](../commit/SKILL.md)** — Smart commit with semver bumping

## Documentation

- **[SDLC.md](./SDLC.md)** — Workflow gates, column rules, and session startup checklist
- **[KANBAN_AGENT_RULES.md](../../KANBAN_AGENT_RULES.md)** — Complete API reference and card schema

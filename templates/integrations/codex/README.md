# Codex Integration

Install these templates into your project's `.codex/skills/` directory.

## Bootstrap Only

```bash
mkdir -p .codex/skills/kanban
cp kanban/templates/integrations/codex/kanban/SKILL.md .codex/skills/kanban/SKILL.md
cp kanban/templates/integrations/codex/kanban/SDLC.md .codex/skills/kanban/SDLC.md
```

## Full Pipeline

```bash
mkdir -p .codex/skills/kanban
cp kanban/templates/integrations/codex/kanban/SKILL.md .codex/skills/kanban/SKILL.md
cp kanban/templates/integrations/codex/kanban/SDLC.md .codex/skills/kanban/SDLC.md

mkdir -p .codex/skills/build
cp kanban/templates/integrations/codex/build/SKILL.md .codex/skills/build/SKILL.md

mkdir -p .codex/skills/review
cp kanban/templates/integrations/codex/review/SKILL.md .codex/skills/review/SKILL.md

mkdir -p .codex/skills/test
cp kanban/templates/integrations/codex/test/SKILL.md .codex/skills/test/SKILL.md

mkdir -p .codex/skills/pipeline
cp kanban/templates/integrations/codex/pipeline/SKILL.md .codex/skills/pipeline/SKILL.md

mkdir -p .codex/skills/commit
cp kanban/templates/integrations/codex/commit/SKILL.md .codex/skills/commit/SKILL.md
```

## Notes

- The Codex templates use the `.codex/skills/<name>/SKILL.md` layout.
- The pipeline assumes the same shared board schema and lifecycle gates as the Claude integration.

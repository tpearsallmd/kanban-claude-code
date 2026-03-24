# Claude Code Integration

Install these templates into your project's `.claude/skills/` directory.

## Bootstrap Only

```bash
mkdir -p .claude/skills/kanban
cp kanban/templates/integrations/claude/kanban/SKILL.md .claude/skills/kanban/SKILL.md
```

## Full Pipeline

```bash
mkdir -p .claude/skills/kanban
cp kanban/templates/integrations/claude/kanban/SKILL.md .claude/skills/kanban/SKILL.md
cp kanban/templates/integrations/claude/kanban/SDLC.md .claude/skills/kanban/SDLC.md

mkdir -p .claude/skills/build
cp kanban/templates/integrations/claude/build/SKILL.md .claude/skills/build/SKILL.md

mkdir -p .claude/skills/review
cp kanban/templates/integrations/claude/review/SKILL.md .claude/skills/review/SKILL.md

mkdir -p .claude/skills/test
cp kanban/templates/integrations/claude/test/SKILL.md .claude/skills/test/SKILL.md

mkdir -p .claude/skills/pipeline
cp kanban/templates/integrations/claude/pipeline/SKILL.md .claude/skills/pipeline/SKILL.md

mkdir -p .claude/skills/commit
cp kanban/templates/integrations/claude/commit/SKILL.md .claude/skills/commit/SKILL.md
```

## Notes

- The legacy compatibility paths `templates/SKILL.md` and `templates/pipeline/` still work for existing Claude installs.
- New installs should prefer `templates/integrations/claude/`.

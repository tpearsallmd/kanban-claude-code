# Pipeline Skills for Kanban Board

An SDLC pipeline that turns the kanban board into an automated build-review-test workflow for Claude Code. Cards flow through dedicated role sessions — each with strict separation of concerns — so the same AI that writes the code never reviews or tests its own work.

## How It Works

```
/pipeline (orchestrator)
    |
    +-- /build    (picks up Ready cards, writes code, moves to Code Review)
    |
    +-- /review   (reviews Code Review cards, passes to Testing or returns to Ready)
    |
    +-- /test     (tests Testing cards, passes to Review or returns to Ready)
```

Each role session:
- Operates on a single column of the board
- Has strict read/write rules for card fields (no session can edit another's fields)
- Follows gate logic defined in a shared SDLC rulebook

The `/pipeline` orchestrator checks the board and dispatches these sessions sequentially. Run it on a loop (`/loop 5m /pipeline`) for continuous processing.

## Prerequisites

- [Kanban for Claude Code](https://github.com/tpearsallmd/kanban-claude-code) — the board itself (you're probably reading this inside it)
- [Claude Code](https://claude.com/claude-code) — the CLI that runs the skills

## Installation

From your project root (where `kanban-board.json` lives):

```bash
# 1. Copy the SDLC rulebook (shared by all role sessions)
mkdir -p .claude/skills/kanban
cp kanban/templates/pipeline/SDLC.md .claude/skills/kanban/SDLC.md

# 2. Copy the pipeline orchestrator
mkdir -p .claude/skills/pipeline
cp kanban/templates/pipeline/pipeline-SKILL.md .claude/skills/pipeline/SKILL.md

# 3. Copy the role sessions
mkdir -p .claude/skills/build
cp kanban/templates/pipeline/build-SKILL.md .claude/skills/build/SKILL.md

mkdir -p .claude/skills/review
cp kanban/templates/pipeline/review-SKILL.md .claude/skills/review/SKILL.md

mkdir -p .claude/skills/test
cp kanban/templates/pipeline/test-SKILL.md .claude/skills/test/SKILL.md

# 4. (Optional) Copy the smart commit skill
mkdir -p .claude/skills/commit
cp kanban/templates/pipeline/commit-SKILL.md .claude/skills/commit/SKILL.md
```

### Update board columns

The pipeline adds a **Code Review** column between "In Progress" and "Testing". If your board was created from the default template, update `kanban-board.json`:

```json
{
  "columns": ["Backlog", "Ready", "In Progress", "Code Review", "Testing", "Review", "Done"],
  "wipLimits": {
    "In Progress": 3,
    "Code Review": 3,
    "Testing": 3,
    "Review": 5
  }
}
```

Or use the pipeline-ready board template:
```bash
cp kanban/templates/kanban-pipeline.json.template kanban-board.json
# Edit to set your repo name
```

## Customization

The templates are generic and project-agnostic. Here's what you'll likely want to customize:

### Build skill (`.claude/skills/build/SKILL.md`)
- **Test commands**: The template says "run your project's test command." Add your specific command (e.g., `npm test`, `pytest`, `go test ./...`).
- **Test file conventions**: Add where tests live and how they're named in your project.
- **Smoke checks**: If you have a local dev environment, add a smoke check section before Code Review.

### Test skill (`.claude/skills/test/SKILL.md`)
- **Dev environment setup**: The template has a generic "start your dev environment" section. Replace with your specific commands (e.g., `docker compose up -d`, `npm run dev`).
- **Test suites**: Add your project's specific test suite commands to the test plan table.
- **Health check**: Replace the generic health check with your actual endpoint.

### Commit skill (`.claude/skills/commit/SKILL.md`)
- **Version file location**: Replace the `package.json` example with your project's version file.
- **Bump commands**: Replace `npm version` with whatever your project uses.

### SDLC rulebook (`.claude/skills/kanban/SDLC.md`)
- Generally doesn't need changes — it defines workflow gates, not project-specific details.
- If you use different column names, update both the SDLC and the skill files.

## Usage

### Manual dispatch
```
/build      # Work all Ready cards
/review     # Review all Code Review cards
/test       # Test all Testing cards
/kanban     # View full board state
```

### Automated pipeline
```
/loop 5m /pipeline    # Check board and dispatch every 5 minutes
```

### Recommended workflow
1. Add cards to the board via the browser UI (http://localhost:5555)
2. Prioritize and move cards to **Ready**
3. Run `/pipeline` or `/build` to start processing
4. Cards flow: Ready -> In Progress -> Code Review -> Testing -> Review
5. Human approves in **Review** -> moves to **Done**

## Architecture

### Separation of concerns

| Session | Reads | Writes | Never touches |
|---------|-------|--------|---------------|
| Build | `reviewFeedback`, `testFailureLog` | Source code, `implementationNotes` | `testPlan`, `reviewFeedback`, `reviewNotes` |
| Review | `implementationNotes`, source code (read-only) | `reviewFeedback`, `reviewNotes` | Source code, `testPlan`, `implementationNotes` |
| Test | `implementationNotes`, source code (read-only) | `testPlan`, `testResults`, `testFailureLog`, `reviewNotes` | Source code, `implementationNotes`, `reviewFeedback` |

### Card lifecycle

```
Ready
  |  (build picks up, moves to In Progress)
  v
In Progress
  |  (build completes, writes implementationNotes, moves to Code Review)
  v
Code Review ----[fail]----> Ready (with reviewFeedback, tagged returned-from-review)
  |
  | [pass]
  v
Testing --------[fail]----> Ready (with testFailureLog, tagged returned-from-test)
  |                          (blocked after 2 failures)
  | [pass]
  v
Review
  |  (human approves)
  v
Done
```

### Failure loops

- **Review failure**: Card returns to Ready with `reviewFeedback`. Build session reads the feedback before resuming work.
- **Test failure**: Card returns to Ready with `testFailureLog` entry including a hypothesis. Build reads the hypothesis as its starting point. After 2 test failures, the card is blocked for human review.

## Files

```
templates/pipeline/
  README.md              # This file
  SDLC.md                # Shared SDLC rulebook (gates, schema, field ownership)
  pipeline-SKILL.md      # Orchestrator — dispatches build/review/test
  build-SKILL.md         # Developer session — writes code
  review-SKILL.md        # Code reviewer session — reviews code (read-only)
  test-SKILL.md          # Tester session — tests code (read-only)
  commit-SKILL.md        # Smart commit with conventional format (optional)
```

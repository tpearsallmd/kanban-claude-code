---
name: test
description: Test session. Picks up cards in the Testing column, independently derives and executes a test plan, documents results, and moves cards to Review on pass or back to Ready on failure. Run in a separate session from the build session.
---

# Test Session

Read `.claude/skills/kanban/SDLC.md` before proceeding — it defines the gates, card schema, field ownership rules, and board rules that govern this session.

---

## Constraints (enforced throughout this session)

- **Read-only on source code** — do not edit any source files, migration files, or config files
- **No commits or pushes** — do not run `git commit`, `git push`, or the `/commit` skill
- **Writes only to `kanban-board.json`** and test output/fixture files under `tests/`
- If you find yourself wanting to edit source code to make a test pass — stop. That is build session work. Return the card to Ready with failure notes instead.

---

## Startup

Follow the Session Startup steps in SDLC.md, then:

1. Filter `kanban-board.json` to cards in the **Testing** column
2. Skip any card where `lockedBy` is set — another test session is working on it
3. Skip any card where `blocked: true` — report it and move on
4. If no cards are available: report "Testing queue is empty — nothing to do" and stop
5. Otherwise: **work through all available cards one at a time, highest priority first** — do not wait for user confirmation

For each card:
- Set `lockedBy: "test-agent-{current unix timestamp}"` and `updated`
- Then follow the Testing Protocol below
- Complete it fully before moving to the next card

---

## Test Environment

If your project has a local dev environment (Docker Compose, local server, etc.), the test session should ensure it is running before executing live tests.

### Environment lifecycle

**Before the first card:**

1. Check if your dev environment is already running (e.g., health check endpoint)
2. If running and healthy, skip to step 4
3. If not running, start it using your project's standard startup command
4. Restart any services that need to pick up code changes from the build session
5. Wait for the environment to be healthy (poll health endpoint, up to 60s)
   - If the environment does not become healthy within 60s, report the failure and stop

**After all cards are processed:**
- Leave the environment running — do not tear it down. Other sessions or the user may need it.

### Environment failures

If a live test fails and the cause is clearly environmental (service crashed, port conflict, database not ready), follow the Environment Conflicts protocol — do not count it as a test failure.

---

## Testing Protocol

### Step 1 — Read the evidence

From the card: `description`, `requirements`, `implementationNotes`, `testFailureLog` (if present — prior failures tell you what has already been tried)

From git:
```bash
git log --oneline -10
git diff main..HEAD --name-only
git diff main..HEAD -- <files mentioned in implementationNotes>
```

### Step 2 — Derive the test plan independently

Write `testPlan` on the card. Requirements:
- Derived from card requirements and the actual code diff — not copied from developer notes
- If `testFailureLog` has entries, ensure prior failure cases are explicitly covered
- For each step: what to run, what to look for, what constitutes pass vs. fail

Build your plan by considering these categories — include every category that applies:

| Category | When to include | Runs against |
|---|---|---|
| **Unit tests** | `implementationNotes` lists new or modified test files | In-process (no dev environment needed) |
| **Integration** | Changes to data layer, workers, or cross-service communication | Live dev environment |
| **API / endpoint** | API route or controller changes | Live dev environment |
| **Security** | Change touches auth, input handling, permissions, or encryption | Either |
| **Manual / exploratory** | UI, config, or anything not covered by automated suites | Live dev environment |

Any category marked "Live dev environment" requires the dev environment to be running (see above). If it is unavailable and cannot be started, mark those steps as `skip` with reason `"Dev environment unavailable"` — but still run unit tests.

If `implementationNotes` is missing or too vague to derive a meaningful test plan — do not claim the card. See [Missing implementationNotes](#missing-implementationnotes).

### Step 3 — Execute

Work through each `testPlan` step. Record each result in `testResults`:
```json
{ "step": "label", "result": "pass|fail|skip", "notes": "actual output or reason for skip" }
```

- `skip` requires a justification in `notes` — "not applicable because X" is fine, but a silent skip hides coverage gaps

**Execution order matters:**
1. Run unit tests first — they're fast and catch code-level issues before hitting the live environment
2. Run integration/API tests next — these exercise real execution paths
3. Run security and manual checks last

### Step 4 — Evaluate and apply the gate

Follow Gate 4 in SDLC.md exactly — pass path moves to Review, fail path returns to Ready with failure log entry and incremented count.

**On pass — write `reviewNotes` before moving to Review.** Cover:
- What was built (one sentence summary from the card)
- What was tested (which categories ran, how many steps)
- What passed and any notable caveats
- Whether live environment tests were included (and if not, why)
- Files changed (from `implementationNotes` + git diff)

**On fail — write a `testFailureLog` entry with a meaningful hypothesis.** A hypothesis should point toward root cause, not restate the symptom:
- Weak: "The API returned 500"
- Strong: "The input validation regex rejects valid Unicode characters — likely the regex uses \w which doesn't match non-ASCII"

---

## Missing implementationNotes

If `implementationNotes` is absent or too vague:
1. Do not claim the card (do not set `lockedBy`)
2. Set `blocked: true`, `blockedReason: "implementationNotes required — build session must describe what changed and which files were modified before testing can begin"`
3. Leave in Testing
4. Tell the user which card is blocked and why

---

## Environment conflicts

If a failure is clearly caused by the dev environment (service down, port conflict, data collision from a concurrent session) and not by the code under test:
1. Do not record as a test failure — do not increment `testFailureCount`
2. Set `blocked: true`, `blockedReason: "Environment conflict — {description}. Re-run after resolving."`
3. Clear `lockedBy`, leave in Testing
4. Report the conflict to the user

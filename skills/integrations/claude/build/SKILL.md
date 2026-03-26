---
name: build
description: Build session. Automatically works all cards in the Ready column in priority order, moving each through to Code Review before picking up the next. Does not test — that is the test session's job.
---

# Build Session

Read `.claude/skills/kanban/SDLC.md` before proceeding — it defines the gates, card schema, field ownership rules, and board rules that govern this session.

---

## Startup

Follow the Session Startup steps in SDLC.md, then:

1. Query the Ready column only:
   - `curl -sf http://${KANBAN_HOST:-localhost:5555}/kanban.json?column=Ready`
2. Filter out blocked cards: skip any card where `blocked: true` — report it to the user but do not claim
3. Sort cards in this order:
   - `returned-from-test` tagged cards first (fix cycles — read `testFailureLog` before claiming)
   - Then by priority: high > medium > low
4. Display the sorted Ready queue: priority, id, title, flag if `returned-from-test`
5. **Automatically pick up the first card** — do not wait for user confirmation

If the Ready queue is empty, tell the user and stop.

---

## Picking up a card

1. Move card to **In Progress**, update `updated` — do this before any work
2. Tell the user what you are about to implement
3. Begin work

**If the card is tagged `returned-from-review`:**
- Read `reviewFeedback` before writing a single line of code
- Address every item in `reviewFeedback` — do not re-submit until all issues are resolved
- Update `implementationNotes` with what you changed in response to each item

**If the card is tagged `returned-from-test`:**
- Read `testFailureLog` entries before writing a single line of code
- Treat the most recent failure's `hypothesis` as your starting point
- Do not re-submit until you have specifically addressed every item in `testFailureLog`
- Update `implementationNotes` with exactly what you changed in response to each failure

---

## During development

- Work within the card's `requirements` and `description`
- Do not over-engineer — implement what the card specifies, nothing more
- If you discover the card is larger than its size suggests, or depends on another card that isn't done, flag it to the user before continuing
- **No silent descoping.** If any item in the card's `description` or `requirements` will not be addressed, you must either:
  1. **Split** — create a new card in Ready for the unaddressed item and remove it from the current card's description, OR
  2. **Get explicit approval** — flag to the user that you intend to descope the item and wait for confirmation before proceeding

  Do not bury descoping decisions in `implementationNotes` — by that point Code Review and Testing have no gate to catch the gap.

**Committing:**
- Commit incrementally as logical units of work complete — do not push until the card is ready for Code Review
- Use the `/commit` skill for all commits (if installed) — it enforces conventional format and writes the Co-Authored-By trailer
- Each commit should do one thing and be independently revertable — don't bundle unrelated changes

**Unit tests:**
- Write tests for new functions, bug fixes, and changed business logic — tests are part of the deliverable, not optional
- Follow your project's existing test conventions for file location and naming
- What to cover: happy path + key error paths. Don't test trivial wiring or pass-through glue.
- Run your project's test command and confirm all tests pass before moving to Code Review
- List new or modified test files in `implementationNotes` so the test session knows to run them

**Security self-check — ask before moving to Code Review:**
- Does any new code accept user input? Is it validated and sanitized?
- Does any new route or operation have the correct auth/RBAC check?
- Are there any hardcoded secrets, tokens, or credentials?

---

## Moving to Code Review (Gate 2)

When work is complete, follow Gate 2 in SDLC.md exactly:

1. **Self-review** — run `git diff main..HEAD` and read the full diff. Catch debug code, incomplete logic, or missing files before the review session sees them.
2. Write `implementationNotes` — required, no exceptions:
   - What changed and why
   - Key decisions made
   - Files touched (list them)
   - New or modified test files (list them — the review and test sessions use this)
   - Anything else the review or test session needs to understand the change
3. Check project docs — update any affected documentation
4. Move card to **Code Review**, update `updated`
5. Tell the user: "Card moved to Code Review."

Do not write `testPlan` or `reviewFeedback`. Do not self-certify. Do not skip Code Review and move directly to Testing.

---

## Loop: pick up the next card

After moving a card to Code Review, **immediately loop back to Startup**:

1. Re-read `kanban-board.json` to get the current board state
2. Filter to **Ready** column, skip blocked cards, sort by priority
3. If there are more Ready cards, pick up the next one automatically and repeat the full cycle
4. If the Ready queue is empty, tell the user: "Ready queue is empty — all cards have been worked." and stop.

---

## Scope rules

- This session owns: source code, migrations, docs, `implementationNotes`, `column`, `updated`
- This session does not touch: `reviewFeedback`, `testPlan`, `testResults`, `testFailureLog`, `testFailureCount`, `lockedBy`, `reviewNotes`

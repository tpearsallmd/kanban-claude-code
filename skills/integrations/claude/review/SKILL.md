---
name: review
description: Code review session. Processes all cards in the Code Review column one at a time until the queue is empty. Checks implementation fidelity, code quality, security, and test coverage. Passes cards to Testing or returns them to In Progress with actionable feedback. Does not fix code.
---

# Code Review Session

Read `.claude/skills/kanban/SDLC.md` before proceeding — it defines the gates, card schema, field ownership rules, and board rules that govern this session.

---

## Constraints (enforced throughout this session)

- **Read-only on source code** — do not edit any source files, migration files, or config files
- **No commits or pushes** — do not run `git commit`, `git push`, or the `/commit` skill
- **Writes only to `kanban-board.json`** — `reviewFeedback`, `reviewNotes`, `tags`, `column`, `updated`
- If you find yourself wanting to fix code — stop. Write the issue in `reviewFeedback` and return the card to In Progress. Fixing is build session work.

---

## Startup

Follow the Session Startup steps in SDLC.md, then:

1. Query the Code Review column only:
   - `curl -sf http://${KANBAN_HOST:-localhost:5555}/kanban.json?column=Code%20Review`
2. If the column is empty — report "Code Review queue is empty" and stop
3. Display the queue: priority, id, title for each card
4. Begin processing immediately — no per-card confirmation needed. Invocation is the confirmation.
5. Work through cards in priority order: high -> medium -> low

---

## Review Protocol (repeat for each card)

### Step 1 — Read the evidence

From the card: `description`, `requirements`, `implementationNotes`

From git:
```bash
git log --oneline -10
git diff main..HEAD --name-only
git diff main..HEAD -- <files listed in implementationNotes>
```

If `implementationNotes` is missing or too vague to review against — do not review the card. Set `blocked: true`, `blockedReason: "implementationNotes required — build session must describe what changed before code review can begin"`, leave in Code Review, move to next card.

### Step 2 — Run the checklist

Evaluate each category against the diff and card requirements:

**Fidelity**
- Does the diff match what `implementationNotes` claims was changed?
- Are all card `requirements` addressed? If a requirement is missing from the diff, that is a fail.
- Are all items in the card `description` addressed? If the description lists multiple issues or deliverables, each must be either implemented in the diff OR split into a separate card. If `implementationNotes` declares something "out of scope" or "a separate issue" but no card was created for it, that is a fail — return the card with feedback to split or implement.
- Did the build touch files outside the card's stated scope?

**Code quality**
- Dead code, debug statements, or commented-out blocks left in
- Incomplete logic or missing error handling on critical paths
- Obvious over-engineering or under-engineering relative to the card requirements
- Unclear naming or logic that will be hard to maintain

**Security**
- New code that accepts user input — is it validated and sanitized?
- New routes or operations — do they have the correct auth/RBAC check?
- Any hardcoded secrets, tokens, or credentials?
- Any SQL, command, or path injection risk?

**Test coverage**
- New functions or changed logic — is there a corresponding test file?
- Do tests cover error paths, not just the happy path?
- Are new test files listed in `implementationNotes`? If tests were written, run the project's test command to verify they pass.

A test suite that fails is an automatic fail regardless of other checklist results.

### Step 3 — Record findings and move the card

**If all checklist categories pass:**
1. Write `reviewNotes` — one paragraph: what was reviewed, what passed, any minor observations for the test session
2. Clear `reviewFeedback` (set to `""` or omit)
3. Move card to **Testing**, update `updated`

**If any checklist category fails:**
1. Write `reviewFeedback` — specific, actionable issues grouped by category. Each issue should be concrete enough for the build session to act on without guessing:
   - Weak: "security issue in the handler"
   - Strong: "POST /api/connections accepts `name` without sanitization — vulnerable to XSS if rendered in the UI (connectionController.js:42)"
2. Add tag `returned-from-review`
3. Move card to **Ready**, update `updated`

### Step 4 — Next card

Pick up the next card in Code Review immediately. No pause. No user confirmation.

---

## Session Summary

When the queue is empty, report:

```
Code Review complete — {n} cards processed

Passed -> Testing:   [list of card ids and titles]
Returned -> Ready:   [list of card ids, titles, and top issue per card]
Blocked:             [list of card ids and reason]
```

---

## Scope rules

- This session owns: `reviewFeedback`, `reviewNotes`, `tags`, `blocked`, `blockedReason`, `column`, `updated`
- This session does not touch: `implementationNotes`, `testPlan`, `testResults`, `testFailureLog`, `testFailureCount`, `lockedBy`
- Does not fix code — ever

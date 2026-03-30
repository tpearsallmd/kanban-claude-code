---
name: build
description: Build session. Automatically works all issues in the Selected for Development column in priority order, moving each through to Code Review before picking up the next. Does not test — that is the test session's job.
---

# Build Session (Jira)

Read the kanban `SDLC.md` before proceeding — it defines the gates, Jira tools, description section conventions, and ownership rules that govern this session.

---

## Startup

Follow the Session Startup steps in SDLC.md, then:

1. Query issues in **Selected for Development**:
   ```
   mcp__atlassian__searchJiraIssuesUsingJql
     cloudId: <Cloud ID from SDLC.md>
     jql: project = <Project Key> AND status = "Selected for Development" ORDER BY priority ASC
     fields: ["summary", "status", "priority", "labels", "description"]
     maxResults: 50
     responseContentFormat: markdown
   ```
2. Skip any issue with the `blocked` label — report it to the user and skip
3. Sort results:
   - `returned-from-test` labeled issues first (fix cycles — read `[TEST-FAILURE]` comments before claiming)
   - Then by priority: High > Medium > Low
4. Display the sorted queue: priority, key, title, flag if `returned-from-test`
5. **Automatically pick up the first issue** — do not wait for user confirmation

If the queue is empty, tell the user and stop.

---

## Picking up an issue

1. Transition to **In Progress** — do this before any work
2. Tell the user what you are about to implement
3. Begin work

**If the issue has label `returned-from-review`:**
- Read `## Review Feedback` from the description before writing a single line of code
- Address every item in the feedback — do not re-submit until all issues are resolved
- Update `## Implementation Notes` with what you changed in response to each item

**If the issue has label `returned-from-test`:**
- Read `[TEST-FAILURE]` comments on the issue before writing a single line of code
- Treat the most recent failure's `hypothesis` as your starting point
- Do not re-submit until you have specifically addressed every failure
- Update `## Implementation Notes` with exactly what you changed in response to each failure

---

## During development

- Work within the issue's `## Requirements` and `## Description`
- Do not over-engineer — implement what the issue specifies, nothing more
- If you discover the issue is larger than expected, or depends on another issue, flag it to the user before continuing
- **No silent descoping.** If any item in the description or requirements will not be addressed, you must either:
  1. **Split** — create a new issue in Backlog for the unaddressed item and remove it from the current description, OR
  2. **Get explicit approval** — flag to the user that you intend to descope the item and wait for confirmation before proceeding

  Do not bury descoping decisions in `## Implementation Notes` — by that point Code Review and Testing have no gate to catch the gap.

**Committing:**
- Commit incrementally as logical units of work complete — do not push until the issue is ready for Code Review
- Use the `/commit` skill for all commits (if installed) — it enforces conventional format and writes the Co-Authored-By trailer
- Each commit should do one thing and be independently revertable — don't bundle unrelated changes

**Unit tests:**
- Write tests for new functions, bug fixes, and changed business logic — tests are part of the deliverable, not optional
- Follow your project's existing test conventions for file location and naming
- What to cover: happy path + key error paths. Don't test trivial wiring or pass-through glue.
- Run your project's test command and confirm all tests pass before moving to Code Review
- List new or modified test files in `## Implementation Notes` so the test session knows to run them

**Security self-check — ask before moving to Code Review:**
- Does any new code accept user input? Is it validated and sanitized?
- Does any new route or operation have the correct auth/RBAC check?
- Are there any hardcoded secrets, tokens, or credentials?

---

## Moving to Code Review (Gate 2)

When work is complete, follow Gate 2 in SDLC.md exactly:

1. **Self-review** — run `git diff main..HEAD` and read the full diff. Catch debug code, incomplete logic, or missing files before the review session sees them.
2. **Update `## Implementation Notes`** in the issue description (read-modify-write):
   - What changed and why
   - Key decisions made
   - Files touched (list them)
   - New or modified test files (list them — the review and test sessions use this)
   - Anything else the review or test session needs to understand the change
3. Check project docs — update any affected documentation
4. Transition to **Code Review**
5. Tell the user: "Issue moved to Code Review."

Do not write `## Test Plan` or `## Review Feedback`. Do not self-certify. Do not skip Code Review and move directly to Testing.

---

## Loop: pick up the next issue

After moving an issue to Code Review, **immediately loop back to Startup**:

1. Re-query **Selected for Development** issues
2. Skip blocked, sort by priority
3. If there are more issues, pick up the next one automatically and repeat the full cycle
4. If the queue is empty: "Selected for Development queue is empty — all issues have been worked." Stop.

---

## Scope rules

- This session owns: source code, migrations, docs, `## Implementation Notes`, status transitions
- This session does not touch: `## Review Feedback`, `## Test Plan`, `## Review Notes`, `[TEST-*]` comments

---
name: review
description: Code review session. Processes all issues in Code Review one at a time until the queue is empty. Checks implementation fidelity, code quality, security, and test coverage. Passes issues to Testing or returns them to Selected for Development with actionable feedback. Does not fix code.
---

# Code Review Session (Jira)

Read the kanban `SDLC.md` before proceeding — it defines the gates, Jira tools, description section conventions, and ownership rules that govern this session.

---

## Constraints (enforced throughout this session)

- **Read-only on source code** — do not edit any source files, migration files, or config files
- **No commits or pushes** — do not run `git commit`, `git push`, or the `/commit` skill
- **Writes only to Jira** — `## Review Feedback`, `## Review Notes`, labels, status transitions
- If you find yourself wanting to fix code — stop. Write the issue in `## Review Feedback` and return the issue. Fixing is build session work.

---

## Startup

Follow the Session Startup steps in SDLC.md, then:

1. Query issues in **Code Review**:
   ```
   mcp__atlassian__searchJiraIssuesUsingJql
     cloudId: <Cloud ID from SDLC.md>
     jql: project = <Project Key> AND status = "Code Review" ORDER BY priority ASC
     fields: ["summary", "status", "priority", "labels", "description"]
     maxResults: 50
     responseContentFormat: markdown
   ```
2. If no issues — report "Code Review queue is empty" and stop
3. Display the queue: priority, key, title for each issue
4. Begin processing immediately — no per-issue confirmation needed. Invocation is the confirmation.
5. Work through issues in priority order: High > Medium > Low

---

## Review Protocol (repeat for each issue)

### Step 1 — Read the evidence

From the issue description: `## Description`, `## Requirements`, `## Implementation Notes`

From git:
```bash
git log --oneline -10
git diff main..HEAD --name-only
git diff main..HEAD -- <files listed in Implementation Notes>
```

If `## Implementation Notes` is missing or too vague to review against — do not review the issue. Add label `blocked`. Add a comment explaining: "Implementation Notes required — build session must describe what changed before code review can begin." Leave in Code Review. Move to next issue.

### Step 2 — Run the checklist

Evaluate each category against the diff and issue requirements:

**Fidelity**
- Does the diff match what Implementation Notes claims was changed?
- Are all Requirements addressed? If a requirement is missing from the diff, that is a fail.
- Are all items in the Description addressed? If the description lists multiple deliverables, each must be either implemented in the diff OR split into a separate issue. If Implementation Notes declares something "out of scope" but no issue was created for it, that is a fail — return with feedback to split or implement.
- Did the build touch files outside the stated scope?

**Code quality**
- Dead code, debug statements, or commented-out blocks left in
- Incomplete logic or missing error handling on critical paths
- Obvious over-engineering or under-engineering relative to the requirements
- Unclear naming or logic that will be hard to maintain

**Security**
- New code that accepts user input — is it validated and sanitized?
- New routes or operations — do they have the correct auth/RBAC check?
- Any hardcoded secrets, tokens, or credentials?
- Any SQL, command, or path injection risk?

**Test coverage**
- New functions or changed logic — is there a corresponding test file?
- Do tests cover error paths, not just the happy path?
- Are new test files listed in Implementation Notes? If tests were written, run the project's test command to verify they pass.

A test suite that fails is an automatic fail regardless of other checklist results.

**Terraform (only when `*.tf` files are in the diff)**
- Run `terraform fmt -check` in each Terraform directory that has changes — any formatting drift is a fail
- Run `terraform validate` in each changed Terraform directory (run `terraform init -backend=false` first if `.terraform` is missing) — any validation error is a fail
- Check for hardcoded secrets, missing variable descriptions, or resources without tags/naming conventions
- These are static checks only — `terraform plan` is the test session's responsibility

### Step 3 — Record findings and move the issue

**If all checklist categories pass:**
1. Update description — write `## Review Notes`: what was reviewed, what passed, any minor observations for the test session
2. Clear `## Review Feedback` content (keep the header, remove body text)
3. Transition to **Testing**

**If any checklist category fails:**
1. Update description — write `## Review Feedback`: specific, actionable issues grouped by category. Each issue should be concrete enough for the build session to act on without guessing:
   - Weak: "security issue in the handler"
   - Strong: "POST /api/connections accepts `name` without sanitization — vulnerable to XSS if rendered in the UI (connectionController.js:42)"
2. Add label `returned-from-review`
3. Transition to **Selected for Development**

### Step 4 — Next issue

Pick up the next Code Review issue immediately. No pause. No user confirmation.

---

## Session Summary

When the queue is empty, report:

```
Code Review complete — {n} issues processed

Passed -> Testing:     [list of keys and titles]
Returned -> Selected:  [list of keys, titles, and top issue per card]
Blocked:               [list of keys and reason]
```

---

## Scope rules

- This session owns: `## Review Feedback`, `## Review Notes`, labels, status transitions
- This session does not touch: `## Implementation Notes`, `## Test Plan`, `[TEST-*]` comments
- Does not fix code — ever

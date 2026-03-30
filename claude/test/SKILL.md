---
name: test
description: Test session. Picks up issues in Testing, independently derives and executes a test plan, documents results, and moves issues to Review on pass or back to Selected for Development on failure. Run in a separate session from the build session.
---

# Test Session (Jira)

Read the kanban `SDLC.md` before proceeding — it defines the gates, Jira tools, description section conventions, structured comment protocols, and ownership rules that govern this session.

---

## Constraints (enforced throughout this session)

- **Read-only on source code** — do not edit any source files, migration files, or config files
- **No commits or pushes** — do not run `git commit`, `git push`, or the `/commit` skill
- **Writes only to Jira** (description sections + structured comments) and test output/fixture files under `tests/`
- If you find yourself wanting to edit source code to make a test pass — stop. That is build session work. Return the issue with failure notes.

---

## Startup

Follow the Session Startup steps in SDLC.md, then:

1. Query issues in **Testing**:
   ```
   mcp__atlassian__searchJiraIssuesUsingJql
     cloudId: <Cloud ID from SDLC.md>
     jql: project = <Project Key> AND status = "Testing" ORDER BY priority ASC
     fields: ["summary", "status", "priority", "labels", "description"]
     maxResults: 50
     responseContentFormat: markdown
   ```
2. For each issue, check for a `[TEST-LOCK]` comment without a subsequent `[TEST-LOCK-CLEAR]` — skip if locked by another session
3. Skip any issue with the `blocked` label — report and move on
4. If no issues available: report "Testing queue is empty — nothing to do" and stop
5. Work through all available issues one at a time, highest priority first — do not wait for user confirmation

For each issue:
- Add comment: `[TEST-LOCK] test-agent-{current unix timestamp}`
- Then follow the Testing Protocol below
- Complete it fully before moving to the next issue

---

## Test Environment

If your project has a local dev environment, ensure it is running before executing live tests.

### Environment lifecycle

**Before the first issue:**

1. Check if the local environment is already running (e.g., health check endpoint)
2. If running and healthy, skip to step 4
3. If not running, start it using your project's standard startup command
4. Restart any services that need to pick up code changes from the build session
5. Wait for the environment to be healthy (poll health endpoint, up to 60s)
   - If the environment does not become healthy within 60s, report the failure and stop

**After all issues are processed:** Leave the environment running — do not tear it down.

### Environment failures

If a live test fails and the cause is clearly environmental (service crashed, port conflict, database not ready), follow the Environment Conflicts protocol — do not count it as a test failure.

---

## Testing Protocol

### Step 1 — Read the evidence

From the issue: read description to get `## Description`, `## Requirements`, `## Implementation Notes`

Also check for prior `[TEST-FAILURE]` comments — these tell you what has already been tried.

From git:
```bash
git log --oneline -10
git diff main..HEAD --name-only
git diff main..HEAD -- <files mentioned in Implementation Notes>
```

### Step 2 — Derive the test plan independently

Update the `## Test Plan` section in the issue description. Requirements:
- Derived from requirements and the actual code diff — not copied from developer notes
- If `[TEST-FAILURE]` comments exist, ensure prior failure cases are explicitly covered
- For each step: what to run, what to look for, what constitutes pass vs. fail

**IMPORTANT: Write `## Test Plan` to the issue description BEFORE executing any tests.** This ensures the plan is recorded even if execution is interrupted.

Build your plan by considering these categories — include every one that applies:

| Category | When to include | Runs against |
|---|---|---|
| **Unit tests** | Implementation Notes lists new/modified test files | In-process |
| **Integration** | Data layer, workers, or cross-service changes | Live dev environment |
| **API / endpoint** | API route or controller changes | Live dev environment |
| **Security** | Auth, input handling, permissions, encryption | Either |
| **Manual / exploratory** | UI, config, or anything not covered by automated suites | Live dev environment |
| **Terraform plan** | `*.tf` files appear in the diff | In-process (requires cloud credentials) |

Any category marked "Live dev environment" requires the dev environment to be running (see above). If it is unavailable and cannot be started, mark those steps as `skip` with reason `"Dev environment unavailable"` — but still run unit tests.

**Terraform plan steps (when `*.tf` files are in the diff):**
1. Identify each Terraform directory containing changed `.tf` files
2. Run `terraform init` (with the real backend) in each directory — if init fails due to missing credentials or backend config, record the step as `skip` with reason
3. Run `terraform plan -detailed-exitcode` in each directory:
   - Exit code 0 = no changes (pass — note this in results)
   - Exit code 2 = changes detected (pass — record the plan summary)
   - Exit code 1 = error (fail — record the error output)
4. Review the plan output for unexpected resource destruction or replacement — flag these even if the plan itself succeeds
5. If credentials are unavailable, record the step as `skip` with reason `"Cloud credentials unavailable"` — do not count as a failure

If `## Implementation Notes` is missing or too vague — do not claim the issue. See [Missing Implementation Notes](#missing-implementation-notes).

### Step 3 — Execute

Work through each test plan step. Record each result as a structured comment:

```
[TEST-RESULT] {"step": "label", "result": "pass|fail|skip", "notes": "actual output or reason for skip"}
```

- `skip` requires a justification in notes — "not applicable because X" is fine, but a silent skip hides coverage gaps

**Execution order matters:**
1. Run unit tests first — they're fast and catch code-level issues before hitting the live environment
2. Run integration/API tests next — these exercise real execution paths
3. Run security and manual checks last

### Step 4 — Evaluate and apply the gate

Follow Gate 4 in SDLC.md exactly.

**On pass — all results are `pass` or `skip` with justification:**
1. Update description `## Review Notes` — what was built, tested, categories run, caveats, files changed
2. Clear `## Test Plan` content (keep header)
3. Add comment: `[TEST-LOCK-CLEAR]`
4. Transition to **Review**

**On fail — any result is `fail`:**
1. Add comment: `[TEST-FAILURE] {"date":"YYYY-MM-DD","failedSteps":[...],"errorSummary":"...","hypothesis":"..."}`
   - Hypothesis must point toward root cause, not restate the symptom
   - Weak: "The API returned 500"
   - Strong: "The input validation regex rejects valid Unicode characters — likely uses \\w which doesn't match non-ASCII"
2. Read the most recent `[TEST-FAILURE-COUNT]` comment (default 0 if none). Increment. Add comment: `[TEST-FAILURE-COUNT] {n}`
3. Clear `## Test Plan` content (keep header)
4. Add comment: `[TEST-LOCK-CLEAR]`
5. Add label `returned-from-test`
6. If failure count >= 2: add label `blocked`, update `## Blocked` section: "Failed testing {n} times — human review required"
7. Transition to **Selected for Development**

---

## Missing Implementation Notes

If `## Implementation Notes` is absent or too vague:
1. Do not claim the issue (do not add `[TEST-LOCK]` comment)
2. Add label `blocked`
3. Add comment explaining: "Implementation Notes required — build session must describe what changed and which files were modified before testing can begin."
4. Leave in Testing
5. Tell the user which issue is blocked and why

---

## Environment Conflicts

If a failure is clearly caused by the dev environment (service down, port conflict, data collision from another session) and not by the code under test:
1. Do not add a `[TEST-FAILURE]` comment — do not increment failure count
2. Add label `blocked`
3. Add comment: "Environment conflict — {description}. Re-run after resolving."
4. Add comment: `[TEST-LOCK-CLEAR]`
5. Leave in Testing
6. Report the conflict to the user

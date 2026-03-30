---
name: pipeline
description: Pipeline orchestrator. Checks the Jira board and sequentially dispatches build, review, and test sessions for any queued work. Run via /loop for continuous pipeline processing.
---

# Pipeline Orchestrator (Jira)

Checks the Jira board state and dispatches role sessions for any queued work.
Does not do any work itself — it only reads the board and invokes existing skills.

Run via: `/loop 5m /pipeline`

---

## Constraints

- **Read-only on Jira** — this skill never writes to the board. All issue movement is done by the dispatched skills.
- **Sequential dispatch only** — never run build, review, and test concurrently. This is the concurrency guard. Run one, wait for it to finish, then run the next.
- **No source code changes** — this skill does not touch any source files.

---

## Startup

1. Read the kanban `SDLC.md` to get the Cloud ID, Project Key, and transition IDs
2. Query the full board state:
   ```
   mcp__atlassian__searchJiraIssuesUsingJql
     cloudId: <Cloud ID from SDLC.md>
     jql: project = <Project Key> AND status != Done AND status != Backlog ORDER BY priority ASC
     fields: ["summary", "status", "priority", "labels"]
     maxResults: 100
     responseContentFormat: markdown
   ```

---

## Dispatch Logic

Check each queue in order. **Wait for each dispatch to complete before starting the next.**

### 1. Build

1. Count issues with status **Selected for Development** (excluding those with `blocked` label)
2. If any are present:
   - Report: "Dispatching build — {n} issue(s) queued"
   - Invoke the `/build` skill
   - Wait for it to complete
3. If none: report "Selected for Development queue empty — skipping build"

### 2. Code Review

1. **Re-query the board** — build may have moved issues into Code Review:
   ```
   mcp__atlassian__searchJiraIssuesUsingJql
     cloudId: <Cloud ID from SDLC.md>
     jql: project = <Project Key> AND status = "Code Review" ORDER BY priority ASC
     fields: ["summary", "status", "priority", "labels"]
     maxResults: 50
     responseContentFormat: markdown
   ```
2. Count issues (excluding `blocked` label)
3. If any are present:
   - Report: "Dispatching code review — {n} issue(s) queued"
   - Invoke the `/review` skill
   - Wait for it to complete
4. If none: report "Code Review queue empty — skipping"

### 3. Testing

1. **Re-query the board** — review may have moved issues into Testing:
   ```
   mcp__atlassian__searchJiraIssuesUsingJql
     cloudId: <Cloud ID from SDLC.md>
     jql: project = <Project Key> AND status = "Testing" ORDER BY priority ASC
     fields: ["summary", "status", "priority", "labels"]
     maxResults: 50
     responseContentFormat: markdown
   ```
2. Count available issues (excluding `blocked` label — also check for `[TEST-LOCK]` without `[TEST-LOCK-CLEAR]` if needed)
3. If any are available:
   - Report: "Dispatching testing — {n} issue(s) queued"
   - Invoke the `/test` skill
   - Wait for it to complete
4. If none: report "Testing queue empty — skipping"

---

## Tick Summary

After all dispatches complete (or are skipped), report:

```
Pipeline tick complete — {timestamp}

  Build:        {n} issues processed / queue empty
  Code Review:  {n} issues processed / queue empty
  Testing:      {n} issues processed / queue empty

  Next check: waiting for loop interval
```

---

## Notes

- **Issues flow through stages in a single tick.** If build moves issues into Code Review and review passes them to Testing, subsequent dispatches in the same tick pick them up immediately because the board is re-queried between dispatches.
- **Blocked issues are reported but not touched.** If any issues have the `blocked` label, mention them in the tick summary so the user is aware.
- **`[TEST-LOCK]` is respected.** If a Testing issue has an active lock, report it but do not process it.

# SDLC Reference (Jira Edition)

This is the canonical rulebook for all role sessions (build, test, review). Every role skill references this document. Gate logic is defined here once and owned here permanently.

---

## Jira Configuration

Fill in these values for your project. All skills reference this section.

| Setting | Value | How to find |
|---|---|---|
| Cloud ID | `YOUR_CLOUD_ID` | Run `mcp__atlassian__getAccessibleAtlassianResources` |
| Project Key | `YOUR_PROJECT_KEY` | Visible in issue keys (e.g., PROJ-123) |

### Status -> Transition ID Map

Find your transition IDs by running `mcp__atlassian__getTransitionsForJiraIssue` on any issue in your project.

| Status | Transition ID | Purpose |
|---|---|---|
| Backlog | `__` | Defined but not ready to start |
| Selected for Development | `__` | Prioritized and actionable |
| In Progress | `__` | Actively being built |
| Code Review | `__` | Awaiting independent code review |
| Testing | `__` | Awaiting independent verification |
| Review | `__` | Awaiting human approval |
| Done | `__` | Complete |

> **Board setup:** Your Jira Kanban board must have all seven statuses above. Add custom statuses (Code Review, Testing, Review) via Project Settings -> Board -> Columns if they don't exist.

### Issue Type Mapping

| Card type | Jira issue type |
|---|---|
| enhancement | Story |
| defect | Bug |

### Priority Mapping

| Priority | Jira priority |
|---|---|
| high | High |
| medium | Medium |
| low | Low |

---

## MCP Tools Reference

All board operations use Atlassian MCP tools. Key tools:

| Operation | MCP Tool |
|---|---|
| Query issues | `mcp__atlassian__searchJiraIssuesUsingJql` |
| Read issue | `mcp__atlassian__getJiraIssue` |
| Create issue | `mcp__atlassian__createJiraIssue` |
| Edit issue | `mcp__atlassian__editJiraIssue` |
| Transition issue | `mcp__atlassian__transitionJiraIssue` |
| Get transitions | `mcp__atlassian__getTransitionsForJiraIssue` |
| Add comment | `mcp__atlassian__addCommentToJiraIssue` |

**Always pass `responseContentFormat: "markdown"` when reading and `contentFormat: "markdown"` when writing descriptions.**

---

## Session Startup (all roles)

Every role session runs these steps on start, before doing anything role-specific:

1. **Read the SDLC configuration** — read this file to get the Cloud ID, Project Key, and transition IDs
2. **Query the board** — use `searchJiraIssuesUsingJql` with `project = YOUR_PROJECT_KEY AND status != Done ORDER BY priority ASC` and fields `["summary", "status", "priority", "labels", "description"]` with `responseContentFormat: "markdown"`
3. **Filter to your role's column** — each role only works issues in its designated status
4. **Present available issues** to the user — do not begin any work, do not claim any issue
5. **Wait for the user to confirm** which issue to pick up before proceeding

---

## Columns

| Jira Status | Purpose |
|---|---|
| Backlog | Defined but not ready to start |
| Selected for Development | Prioritized and actionable — the normal intake queue for build sessions |
| In Progress | Actively being built by a build session |
| Code Review | Awaiting independent code review by a review session |
| Testing | Awaiting independent verification by a test session |
| Review | Awaiting human approval |
| Done | Complete |

---

## Description Sections Convention

Jira issue descriptions use structured markdown sections as the data model. Each section is delimited by a `##` header. Sections are role-owned — only the designated role writes to its sections.

### Standard sections

```markdown
## Description
What needs to be done and why.

## Requirements
Acceptance criteria, constraints, edge cases.

## Blocked
**Status:** BLOCKED
**Reason:** Why it's blocked.

## Size
T-shirt size: XS, S, M, L, XL

## Implementation Notes
<!-- OWNER: build -->
What changed, key decisions, files touched, new/modified test files.

## Review Feedback
<!-- OWNER: review -->
Actionable issues found during code review, grouped by category.

## Test Plan
<!-- OWNER: test -->
Test steps derived independently from implementation notes + git diff.

## Review Notes
<!-- OWNER: test -->
Summary for human reviewer — what was built, tested, and any caveats.
```

### Read-modify-write protocol

When updating a section:

1. Fetch the full description via `getJiraIssue` with `responseContentFormat: "markdown"`
2. Split on `## ` headers to identify sections
3. Replace ONLY the target section's content (everything between its `##` header and the next `##` header or end of document)
4. If the target section doesn't exist, append it at the end
5. Write the full description back via `editJiraIssue` with `contentFormat: "markdown"`

**Never clobber another role's sections.** If your edit accidentally removes or modifies content under a section you don't own, that is a bug.

---

## Structured Comments Protocol

Mechanical fields that need append-only or atomic semantics use Jira comments with structured prefixes:

| Prefix | Purpose | Owner |
|---|---|---|
| `[TEST-LOCK] agent-{timestamp}` | Concurrency guard — prevents double-testing | Test session |
| `[TEST-LOCK-CLEAR]` | Releases the test lock | Test session |
| `[TEST-RESULT] {json}` | Individual test step result | Test session |
| `[TEST-FAILURE] {json}` | Append-only failure log entry | Test session |
| `[TEST-FAILURE-COUNT] {n}` | Current failure count (most recent wins) | Test session |

**To read a structured comment:** Query issue comments via `getJiraIssue`, scan for the prefix, use the most recent match.

**To write a structured comment:** Use `addCommentToJiraIssue` with `contentFormat: "markdown"`.

---

## Lifecycle Gates

Each gate is a mandatory transition. **Never skip a status. Never do work before the issue is moved.**

### Gate 1: Selected for Development -> In Progress
**Owner:** Build session
**Trigger:** User confirms which issue to work on

Actions in order:
1. Transition to **In Progress** — **do this before starting any work**
2. Tell the user what you are about to implement
3. Begin work

---

### Gate 2: In Progress -> Code Review
**Owner:** Build session
**Trigger:** Work is complete

Required before transitioning:
1. Update `## Implementation Notes` section — what changed, key decisions, files touched, new/modified test files. **Required. Do not move without it.**
2. Check whether any project docs need updating — update them if so
3. Transition to **Code Review**
4. Tell the user: "Issue moved to Code Review."

> Do NOT write `## Test Plan` — that is the test session's responsibility, derived independently.

> Data-only issues: `## Implementation Notes` should describe what data changed and where to verify it.

---

### Gate 3: Code Review -> Testing (pass) or Code Review -> Selected for Development (fail)
**Owner:** Review session
**Trigger:** Review checklist complete

**On pass:** All checklist items clear:
1. Write `## Review Notes` — summary of what was reviewed, what passed, any caveats
2. Clear `## Review Feedback` (remove content, keep header)
3. Transition to **Testing**

**On fail:**
1. Write `## Review Feedback` — specific, actionable list of issues found. Group by category: fidelity, quality, security, test coverage.
2. Add label `returned-from-review`
3. Transition to **Selected for Development**

> The review session does not fix code. It identifies issues and returns the issue. Build session reads `## Review Feedback` on returned issues before resuming work.

---

### Gate 4: Testing -> Review (pass) or Testing -> Selected for Development (fail)
**Owner:** Test session
**Trigger:** All test steps executed

**On pass:** All test results are `pass` or `skip` with justification:
1. Write `## Review Notes` — what was built, what was tested, files changed, caveats for reviewer
2. Clear `## Test Plan` (remove content, keep header)
3. Add comment: `[TEST-LOCK-CLEAR]`
4. Transition to **Review**

**On fail:**
1. Add comment: `[TEST-FAILURE] {"date":"...","failedSteps":[...],"errorSummary":"...","hypothesis":"..."}`
2. Read the most recent `[TEST-FAILURE-COUNT]` comment, increment, add new comment: `[TEST-FAILURE-COUNT] {n}`
3. Clear `## Test Plan` (remove content, keep header)
4. Add comment: `[TEST-LOCK-CLEAR]`
5. Add label `returned-from-test`
6. If count >= 2: add label `blocked`, update `## Blocked` section in description
7. Transition to **Selected for Development**

> Environment conflicts (service down, port in use, data collision from another session): do NOT add `[TEST-FAILURE]` or increment count. Add label `blocked` with environment conflict reason. Leave in Testing.

---

### Gate 5: Review -> Done
**Owner:** Human (explicit approval)
**Trigger:** User says "looks good", "ship it", "close it out", "move to Done", or equivalent

Actions:
1. Transition to **Done**
2. Add any discovered follow-up work as new issues in **Backlog**

A general instruction to do work does NOT imply approval. Explicit sign-off only.

---

## Labels Convention

Labels serve multiple purposes:

| Label | Purpose |
|---|---|
| `size-XS` through `size-XL` | T-shirt sizing |
| `blocked` | Issue is blocked (check `## Blocked` section for reason) |
| `returned-from-review` | Issue was returned by code review — build must read `## Review Feedback` |
| `returned-from-test` | Issue was returned by testing — build must read `[TEST-FAILURE]` comments |
| `design-needed` | Issue needs design work before implementation |
| Domain tags | `security`, `frontend`, `backend`, etc. |

---

## Section Ownership Rules

- **Build session:** writes `## Implementation Notes`. Reads `## Review Feedback` on returned issues. Never writes `## Test Plan`, `## Review Feedback`, or `## Review Notes`.
- **Review session:** writes `## Review Feedback`, `## Review Notes`. Reads `## Implementation Notes`. Never writes `## Implementation Notes` or `## Test Plan`.
- **Test session:** writes `## Test Plan`, `## Review Notes`. Uses structured comments for `[TEST-LOCK]`, `[TEST-RESULT]`, `[TEST-FAILURE]`, `[TEST-FAILURE-COUNT]`. Never writes `## Implementation Notes` or `## Review Feedback`.
- **Human reviewer:** explicit approval only (Gate 5).

---

## Adding Issues

To create a new issue:
- Use `createJiraIssue` with your project key and `contentFormat: "markdown"`
- Set `issueTypeName` based on type mapping above
- Include `## Description`, `## Requirements`, and `## Size` sections in the description
- Set priority and labels via `additional_fields`
- New issues default to Backlog status

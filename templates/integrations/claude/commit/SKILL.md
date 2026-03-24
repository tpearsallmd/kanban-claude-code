---
name: commit
description: "Smart commit with optional semver bump. ALWAYS use this skill when the user says any of: 'commit', 'commit and push', 'push', 'ship it', 'check it in', 'save it', 'push the changes', or any variation meaning to commit code to git. Stages changes, drafts a conventional commit message, bumps patch/minor version based on change type, and pushes."
---

# Smart Commit

## Purpose
One skill that handles the full commit cycle with optional version bumping.
Replaces ad-hoc `git commit` calls and keeps semver in sync.

## When to Use
- Any time you're ready to commit completed work
- When changes warrant a version bump (new feature -> minor, bug fix -> patch)
- When user says "commit", "commit and push", or "ship it"

## Steps

### Step 1 — Assess what changed
```bash
git diff --stat
git status
git log --oneline $(git describe --tags --abbrev=0)..HEAD 2>/dev/null || git log --oneline -10
```

### Step 2 — Determine if a version bump is warranted
Analyze the staged/unstaged changes:

| Change type | Bump |
|-------------|------|
| New user-facing feature, new API endpoint, new UI page | **minor** |
| Bug fix, small improvement, config/chore, docs | **patch** |
| Breaking change or production milestone | **major** (ask user) |
| Kanban-only, docs-only, skill/config changes | **none** |

Read the current version from your project's package.json (or equivalent version file):
```bash
# Node.js example:
CURRENT=$(node -p "require('./package.json').version")
echo "Current semver: $CURRENT"

# Or read from wherever your project tracks its version
```

### Step 3 — Apply version bump (if warranted)
```bash
# Node.js example — adjust for your project's version file:
npm version patch --no-git-tag-version
# or
npm version minor --no-git-tag-version
```

If your project uses a different versioning mechanism, apply the bump using the appropriate tool or by editing the version file directly.

### Step 4 — Stage files
```bash
# Stage specific files — never use git add -A blindly
git add <files>
# If version was bumped, include the version file:
git add package.json
```

### Step 5 — Write commit message (conventional commits format)
Follow this format:
```
<type>(<scope>): <short summary>

<optional body — what and why, not how>

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:** `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`

If version was bumped, note it in the body:
```
feat(auth): add SAML SSO support

Bumps version 1.2.0 -> 1.3.0

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Step 6 — Commit and push
```bash
git commit -m "..."
git push
```

### Step 7 — Confirm
```bash
git log --oneline -3
```

## Decision Tree
```
Changes staged?
  -- No  -> remind user to stage files first
  -- Yes -> analyze change types
              -- All chore/docs/config? -> commit, no bump
              -- Bug fixes?             -> patch bump + commit
              -- New features?          -> minor bump + commit
              -- Major milestone?       -> ask user before bumping
```

## Notes
- Never skip the Co-Authored-By trailer
- Never use `git add -A` or `git add .` — stage specific files
- Never force-push the main branch
- If pre-commit hooks fail, fix the issue and retry — do NOT use `--no-verify`
- Do not create git tags on every commit — tags are for deliberate releases

---
name: commit
description: Smart git commit workflow for this repo. Use when the user asks to commit, push, ship, check in, or save changes. It stages specific files, writes a conventional commit, optionally bumps semver, and pushes when requested.
---

# Smart Commit

## Purpose

Handle the full commit flow consistently, including optional version bumps.

## When To Use

- The user asks to commit, push, ship, check in, or save changes.
- Completed work is ready for a conventional commit.
- A version bump may be warranted.

## Steps

### 1. Assess What Changed

Run:

```bash
git diff --stat
git status
git log --oneline $(git describe --tags --abbrev=0)..HEAD 2>/dev/null || git log --oneline -10
```

### 2. Decide Whether To Bump Version

Apply this guidance:

- New user-facing feature, new API, new page: `minor`
- Bug fix, small improvement, config, chore, docs: `patch`
- Breaking change or release milestone: ask before `major`
- Kanban-only, docs-only, skill-only, or config-only changes: `none`

Read the current version from the project's version file such as `package.json` when applicable.

### 3. Apply Version Bump If Needed

Use the repo's versioning mechanism. For Node projects this may be:

```bash
npm version patch --no-git-tag-version
```

or

```bash
npm version minor --no-git-tag-version
```

### 4. Stage Files

- Stage only the specific files intended for the commit.
- Never use `git add -A` or `git add .` blindly.
- If a version file changed, stage that file explicitly too.

### 5. Write The Commit Message

Use conventional commits:

```text
<type>(<scope>): <short summary>

<optional body describing what and why>
```

Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`

If a version bump happened, note it in the body.

### 6. Commit And Push

- Commit with the composed message.
- Push only when the user asked for a push or ship step.

### 7. Confirm

Verify with:

```bash
git log --oneline -3
```

## Notes

- Do not force-push the main branch.
- If hooks fail, fix the issue and retry instead of bypassing them.
- Do not create git tags unless the user explicitly wants a release tag.

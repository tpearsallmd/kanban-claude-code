# Plan: kanban-claude-code — Standalone Docker Service

## Context

The Kanban board has been embedded as a git submodule in project repos, with `kanban-board.json` committed alongside project code. Two problems prompted this change:
1. The submodule confuses other developers who don't use it
2. Cross-project tasks (e.g., terraform + data-manager) need unified visibility

The solution: convert to a standalone Docker service with a single unified board, per-card `project` field for filtering, and HTTP-based access so multiple concurrent Claude agents can safely read/write without file-level race conditions.

---

## Architecture

- **Docker container** running `serve.js` on port 5555
- **Named Docker volume** (`kanban-data`) holding `kanban-board.json` — persists across container restarts
- **Hostname configurable** via `KANBAN_HOST` env var (defaults to `localhost`; set to server hostname when deployed remotely)
- **Claude Code agents** use HTTP (`GET`/`PUT /kanban.json`) instead of direct file I/O
- **Server serializes writes** via a promise write queue — safe for concurrent agents

---

## Step 1: Update `serve.js`

**File:** `kanban-claude-code/serve.js`

Five changes:
1. Replace `resolveDataFile()` with env-var path:
   ```js
   const DATA_FILE = process.env.KANBAN_DATA_FILE || path.join(DIR, 'kanban-board.json');
   ```
2. Make PORT configurable:
   ```js
   const PORT = parseInt(process.env.KANBAN_PORT || '5555', 10);
   ```
3. Add write queue (promise chain) to serialize concurrent PUT requests — use `fs.writeFile` (async) inside a chained promise instead of `writeFileSync`
4. Add `/health` endpoint returning `200 ok` — used by Docker HEALTHCHECK
5. Bind to `0.0.0.0` explicitly in `.listen()`

---

## Step 2: Add Docker files

### `Dockerfile`
- Base: `node:22-alpine`
- Copy only `serve.js` and `kanban.html`
- `RUN mkdir -p /data`
- `ENV KANBAN_DATA_FILE=/data/kanban-board.json`
- `EXPOSE 5555`
- `HEALTHCHECK` via `wget -qO- http://localhost:5555/health`
- `CMD ["node", "serve.js"]`

### `docker-compose.yml`
```yaml
services:
  kanban:
    build: .
    image: kanban-claude-code:latest
    container_name: kanban
    restart: unless-stopped
    ports:
      - "${KANBAN_HOST_PORT:-5555}:5555"
    volumes:
      - kanban-data:/data
    environment:
      - KANBAN_DATA_FILE=/data/kanban-board.json
      - KANBAN_PORT=5555

volumes:
  kanban-data:
    driver: local
```

### `.env.example`
```
KANBAN_HOST_PORT=5555
```

### `.dockerignore`
```
kanban-board.json
.git
node_modules
*.md
templates/
```

---

## Step 3: Schema migration (version 3)

### `migrate-v3.js` (new file at repo root)
Plain Node.js script, zero dependencies:
- Reads existing `kanban-board.json`
- Adds `"project": "<board.repo value>"` to every card missing the field
- Bumps `board.version` to 3
- Writes file back in-place
- Usage: `node migrate-v3.js <path-to-kanban-board.json>`

### `CHANGELOG.md`
Add version 3 entry:
- Docker service migration
- Per-card `project` field (optional string)
- HTTP-only board access
- Migration instructions for AI agents

### `templates/kanban.json.template`
- Add `"version": 3` to board root
- Add `"project": ""` to example card with a comment

---

## Step 4: Update skill templates (HTTP pattern)

**Files to update** (all follow the same pattern):
- `templates/integrations/claude/kanban/SKILL.md`
- `templates/integrations/claude/kanban/SDLC.md`
- `templates/integrations/claude/pipeline/SKILL.md`
- `templates/SKILL.md` (legacy)
- `templates/pipeline/pipeline-SKILL.md` (legacy)
- `templates/pipeline/SDLC.md` (legacy)
- Codex equivalents under `templates/integrations/codex/`

**Replacement patterns:**

Session startup — replace "start server / read file" with:
```
1. Verify kanban service: curl -sf http://${KANBAN_HOST:-localhost}:5555/health
2. Read board: curl -sf http://${KANBAN_HOST:-localhost}:5555/kanban.json
```

Board write — replace direct file writes with:
```
curl -s -X PUT http://${KANBAN_HOST:-localhost}:5555/kanban.json \
  -H "Content-Type: application/json" \
  -d '<json>'
```

Add to Board Rules in all SDLC.md files:
```
- The kanban service runs as a standalone Docker container at http://${KANBAN_HOST:-localhost}:5555
- Never read or write kanban-board.json directly — always use HTTP
- Each agent sets `project` on cards it creates (the source repo name)
- At session start, filter to cards where card.project matches this repo (cards with no project are visible to all)
- Never modify the `project` field on cards created by another agent
```

---

## Step 5: Update `kanban.html` (minimal)

In `makeCardEl()`, add one line above the card title using the already-defined `.card-repo` CSS class:
```js
const projectLabel = card.project ? `<div class="card-repo">${esc(card.project)}</div>` : '';
```
Insert `${projectLabel}` in the card HTML template before the title. No new CSS needed — `.card-repo` is already defined.

---

## Step 6: Migration procedure

Run this sequence once on the Docker host:

```bash
# 1. Migrate the existing board file
node migrate-v3.js /path/to/existing/kanban-board.json

# 2. Start container once to let Docker create the named volume
docker compose up -d && docker compose down

# 3. Copy migrated board into the volume
docker run --rm \
  -v kanban-data:/data \
  -v /path/to/existing:/src \
  alpine cp /src/kanban-board.json /data/kanban-board.json

# 4. Start the service
docker compose up -d

# 5. Verify
curl http://localhost:5555/kanban.json | head -5
```

---

## Step 7: Update `kanban-spec.md`

- Remove the "Using as a Git Submodule" section
- Add a "Docker Deployment" section describing the new architecture
- Update the "Files" section to include `Dockerfile`, `docker-compose.yml`, `.env.example`, `migrate-v3.js`
- Update the schema section to document the `project` field

---

## Implementation sequence

1. `serve.js` (foundation — all else depends on it)
2. `Dockerfile` + `docker-compose.yml` + `.env.example` + `.dockerignore` (build and smoke-test locally)
3. `migrate-v3.js` + `CHANGELOG.md` + `templates/kanban.json.template` (schema)
4. Migration procedure (copy board into volume)
5. All skill template files (7+ files)
6. `kanban.html` (cosmetic, one line)
7. `kanban-spec.md` (docs)

---

## Verification

1. `docker compose up -d` — container starts healthy
2. `curl http://localhost:5555/health` → `ok`
3. `curl http://localhost:5555/kanban.json` → existing board with `project` fields
4. `curl http://localhost:5555/` → kanban UI loads in browser
5. Make a card change in browser → `kanban-board.json` updated in volume
6. Run two concurrent PUT requests — both succeed, no data loss
7. Project label appears on cards in UI

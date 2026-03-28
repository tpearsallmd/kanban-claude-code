# Kanban Docker Service — Installation & Setup

The kanban board now runs as a standalone Docker container, accessible via HTTP. This guide covers setup for local and remote deployments.

---

## Quick Start (Local)

### Prerequisites
- Docker and Docker Compose installed
- A `kanban-board.json` file (see [Initial Board File](#initial-board-file) below)

### 1. Clone the repo

```bash
git clone https://github.com/yourorg/kanban-claude-code.git
cd kanban-claude-code/docker
```

### 2. Prepare your board file

If you have an existing board file, copy it to the docker directory:
```bash
cp /path/to/existing/kanban-board.json .
```

If starting fresh, see [Initial Board File](#initial-board-file) below.

### 3. Start the service

```bash
docker compose up -d
```

Verify it's running:
```bash
curl http://localhost:5555/health
# Output: ok
```

The kanban UI is available at **http://localhost:5555**

### 4. Stop the service

```bash
docker compose down
```

The board file persists in the Docker volume — it won't be lost when the container stops.

---

## Configuration

Create a `.env` file in the docker directory to customize the service (see `.env.example` for a template):

```env
# External port (Docker host → container)
KANBAN_HOST_PORT=5555

# Internal container port (rarely needs to change)
KANBAN_PORT=5555

# Path to board file inside the container
KANBAN_DATA_FILE=/data/kanban-board.json

# Hostname for remote deployments (optional)
# KANBAN_HOST=kanban.example.com
```

Then restart:
```bash
docker compose up -d
```

---

## Remote Deployment

If the Docker service runs on a different machine (e.g., a server), set `KANBAN_HOST` in your environment:

```bash
export KANBAN_HOST=kanban.example.com
```

Then agents and skills will connect to `http://kanban.example.com:5555` instead of `localhost`.

To make this persistent, add it to your shell profile or `.env`:

```env
KANBAN_HOST=kanban.example.com
KANBAN_HOST_PORT=5555
```

---

## Initial Board File

If you don't have an existing board file, start with this template:

```json
{
  "columns": ["Backlog", "Ready", "In Progress", "Testing", "Review", "Done"],
  "wipLimits": {
    "In Progress": 3,
    "Testing": 2,
    "Review": 2
  },
  "cards": []
}
```

Save it as `kanban-board.json` in the project directory, then proceed with "Start the service" above.

---

## Volume Management

The Docker container uses a named volume (`kanban-data`) to persist the board file across container restarts.

### View the volume
```bash
docker volume ls | grep kanban-data
```

### Backup your board
```bash
docker run --rm -v kanban-data:/data -v $(pwd):/backup \
  alpine cp /data/kanban-board.json /backup/kanban-board.json.backup
```

### Restore a backup
```bash
docker run --rm -v kanban-data:/data -v $(pwd):/backup \
  alpine cp /backup/kanban-board.json.backup /data/kanban-board.json
docker compose restart
```

### Clean up the volume (⚠️ destructive)
```bash
docker volume rm kanban-data
```

---

## API Reference

All board access goes through HTTP. Agents and skills use these endpoints:

### Health Check
```bash
GET http://${KANBAN_HOST:-localhost:5555}/health
```
Returns `200 ok` if the service is running.

### Read the board
```bash
curl http://${KANBAN_HOST:-localhost:5555}/kanban.json
```
Returns the full board as JSON.

### Update the board
```bash
curl -X PUT http://${KANBAN_HOST:-localhost:5555}/kanban.json \
  -H "Content-Type: application/json" \
  -d '<board-json>'
```
The server serializes writes — concurrent requests queue automatically.

---

## Troubleshooting

### "Connection refused" when accessing the service

**Check if the container is running:**
```bash
docker compose ps
```

**If the container is not running, start it:**
```bash
docker compose up -d
docker compose logs
```

**If the container crashes, check logs:**
```bash
docker compose logs -f kanban
```

### "Health check failed"

The container has a health check that runs every 30 seconds. If it fails:

```bash
docker compose logs kanban | tail -20
```

### Board file not persisting

Verify the volume exists and is mounted:
```bash
docker inspect kanban | grep -A 5 Mounts
```

Should show a mount from `kanban-data` to `/data`.

### Port already in use

If port 5555 is already in use, set `KANBAN_HOST_PORT` in `.env`:

```env
KANBAN_HOST_PORT=6666
```

Then access the UI at `http://localhost:6666`.

---

## Skill Integration

Only Claude and Codex integration skills reference the kanban service directly. These are already updated to use the HTTP API.

If you're integrating a new agent or custom skill, use these endpoints:

```bash
# Verify service is running
curl -sf http://${KANBAN_HOST:-localhost:5555}/health

# Read the board
curl -sf http://${KANBAN_HOST:-localhost:5555}/kanban.json

# Update the board (pretty-print with 2-space indentation)
curl -s -X PUT http://${KANBAN_HOST:-localhost:5555}/kanban.json \
  -H "Content-Type: application/json" \
  -d "$(echo "$board" | jq --indent 2)"
```

See `templates/integrations/claude/kanban/SDLC.md` for the canonical board rules and schema.

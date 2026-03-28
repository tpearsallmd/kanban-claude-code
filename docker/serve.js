const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.KANBAN_PORT || '5555', 10);
const DATA_FILE = process.env.KANBAN_DATA_FILE || path.join(__dirname, 'kanban-board.json');
const DIR = __dirname;

const MIME = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Write queue: serialize concurrent writes to prevent data loss
let writePromise = Promise.resolve();

console.log(`Data file: ${DATA_FILE}`);
console.log(`Kanban server will listen on 0.0.0.0:${PORT}`);

http.createServer((req, res) => {
  // CORS headers (same origin, but just in case)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // PUT /kanban.json — full board write, restricted to UI only (requires X-Source: ui header)
  if (req.method === 'PUT' && url.pathname === '/kanban.json') {
    if (req.headers['x-source'] !== 'ui') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'PUT is restricted to the UI. Use POST /cards, PATCH /cards/:id, or DELETE /cards/:id instead.' }));
      return;
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      writePromise = writePromise.then(() => {
        return fs.promises.writeFile(DATA_FILE, body, 'utf8');
      }).then(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
    });
    return;
  }

  // GET /health — health check for Docker HEALTHCHECK
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  // GET /kanban.json — read from data file, optionally filtered by column
  if (req.method === 'GET' && url.pathname === '/kanban.json') {
    const column = url.searchParams.get('column');

    fs.readFile(DATA_FILE, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }

      try {
        const board = JSON.parse(data);

        // If column filter requested, return only cards in that column
        if (column) {
          const filtered = {
            ...board,
            cards: board.cards.filter(card => card.column === column)
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(filtered));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(data);
        }
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Helper: read board, apply a mutation, write back (serialized)
  function mutateBoard(res, mutate) {
    writePromise = writePromise.then(() => {
      return fs.promises.readFile(DATA_FILE, 'utf8');
    }).then(data => {
      const board = JSON.parse(data);
      const result = mutate(board);
      if (result.error) {
        res.writeHead(result.status || 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: result.error }));
        return;
      }
      return fs.promises.writeFile(DATA_FILE, JSON.stringify(board, null, 2), 'utf8').then(() => {
        res.writeHead(result.status || 200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.body));
      });
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
  }

  // POST /cards — add a new card
  if (req.method === 'POST' && url.pathname === '/cards') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let card;
      try { card = JSON.parse(body); } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      if (!card.id || !card.title || !card.column) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required fields: id, title, column' }));
        return;
      }
      mutateBoard(res, board => {
        if (board.cards.some(c => c.id === card.id)) {
          return { error: `Card ${card.id} already exists`, status: 409 };
        }
        board.cards.push(card);
        return { status: 201, body: card };
      });
    });
    return;
  }

  // Extract card ID from /cards/:id paths
  const cardMatch = url.pathname.match(/^\/cards\/([^/]+)$/);

  // GET /cards/:id — read a single card
  if (req.method === 'GET' && cardMatch) {
    const cardId = decodeURIComponent(cardMatch[1]);
    fs.readFile(DATA_FILE, (err, data) => {
      if (err) { res.writeHead(500); res.end('Server error'); return; }
      try {
        const board = JSON.parse(data);
        const card = board.cards.find(c => c.id === cardId);
        if (!card) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Card ${cardId} not found` }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(card));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // PATCH /cards/:id — update specific fields on a card
  if (req.method === 'PATCH' && cardMatch) {
    const cardId = decodeURIComponent(cardMatch[1]);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let fields;
      try { fields = JSON.parse(body); } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      // Protect immutable fields
      delete fields.id;
      delete fields.created;
      mutateBoard(res, board => {
        const idx = board.cards.findIndex(c => c.id === cardId);
        if (idx === -1) return { error: `Card ${cardId} not found`, status: 404 };
        Object.assign(board.cards[idx], fields);
        return { status: 200, body: board.cards[idx] };
      });
    });
    return;
  }

  // DELETE /cards/:id — remove a card
  if (req.method === 'DELETE' && cardMatch) {
    const cardId = decodeURIComponent(cardMatch[1]);
    mutateBoard(res, board => {
      const idx = board.cards.findIndex(c => c.id === cardId);
      if (idx === -1) return { error: `Card ${cardId} not found`, status: 404 };
      const removed = board.cards.splice(idx, 1)[0];
      return { status: 200, body: removed };
    });
    return;
  }

  // GET — serve static files from kanban directory
  let filePath = path.join(DIR, req.url === '/' ? 'kanban.html' : req.url);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => console.log(`Kanban server running at http://0.0.0.0:${PORT}`));

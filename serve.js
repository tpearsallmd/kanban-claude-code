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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // PUT /kanban.json — write the data file (queued to serialize concurrent writes)
  if (req.method === 'PUT' && req.url === '/kanban.json') {
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

  // GET /kanban.json — read from data file
  if (req.method === 'GET' && req.url === '/kanban.json') {
    fs.readFile(DATA_FILE, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
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

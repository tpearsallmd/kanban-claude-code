const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5555;
const DIR = __dirname;

// Resolve kanban.json: local dir first, then ../kanban-board.json (submodule layout)
function resolveDataFile() {
  const local = path.join(DIR, 'kanban.json');
  if (fs.existsSync(local)) return local;
  const parent = path.join(DIR, '..', 'kanban-board.json');
  if (fs.existsSync(parent)) return parent;
  return local; // default — will create on first save
}

const MIME = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.js': 'application/javascript',
  '.css': 'text/css'
};

const dataFile = resolveDataFile();
console.log(`Data file: ${dataFile}`);

http.createServer((req, res) => {
  // CORS headers (same origin, but just in case)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // PUT /kanban.json — write the data file
  if (req.method === 'PUT' && req.url === '/kanban.json') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      fs.writeFileSync(dataFile, body, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    });
    return;
  }

  // GET /kanban.json — read from resolved data file
  if (req.method === 'GET' && req.url === '/kanban.json') {
    fs.readFile(dataFile, (err, data) => {
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
}).listen(PORT, () => console.log(`Kanban server running at http://localhost:${PORT}`));

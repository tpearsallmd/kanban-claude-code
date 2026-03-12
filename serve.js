const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5555;
const DIR = __dirname;

const MIME = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.js': 'application/javascript',
  '.css': 'text/css'
};

http.createServer((req, res) => {
  // CORS headers (same origin, but just in case)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // PUT /kanban.json — write the file
  if (req.method === 'PUT' && req.url === '/kanban.json') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      fs.writeFileSync(path.join(DIR, 'kanban.json'), body, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    });
    return;
  }

  // GET — serve static files
  let filePath = path.join(DIR, req.url === '/' ? 'kanban.html' : req.url);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Kanban server running at http://localhost:${PORT}`));

/**
 * Servidor autoritativo "Cosa Nostra" — WebSocket local + estáticos.
 * A lógica de salas vive em server/game/rooms.js (compartilhada com as
 * Vercel Serverless Functions, que usam HTTP long-polling).
 * Rodar: node server/server.js [porta]
 */
const http = require('http');
const { WebSocketServer } = require('ws');
const { rooms, handleMessage, emitState, joinOrCreate, lazyTick, pollRoom } = require('./game/rooms');
const { DISTRICTS, EVENTS, EDGES } = require('./game/data');

const PORT = parseInt(process.argv[2] || process.env.PORT || '8420', 10);
process.on('uncaughtException', (e) => { console.error('[SERVER] uncaught:', e.stack || e.message); });

const staticRoot = require('path').join(__dirname, '..', 'client');
const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) return handleApi(req, res);
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const fs = require('fs');
  const file = require('path').join(staticRoot, p);
  if (!file.startsWith(staticRoot) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('404'); return; }
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
  res.writeHead(200, { 'Content-Type': mime[require('path').extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

// Endpoints HTTP long-polling no servidor local (mesma API das serverless)
const json = (res, code, body) => { if (!res.headersSent) { res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); } res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => d += c); req.on('end', () => { try { r(JSON.parse(d)); } catch { r({}); } }); });

async function handleApi(req, res) {
  if (req.method === 'OPTIONS') return json(res, 200, {});
  try {
    if (req.method === 'POST' && req.url === '/api/action') {
      const m = await readBody(req);
      if (m.type === 'create_room' || m.type === 'join_room') {
        const r = joinOrCreate(m);
        if (r.error) return json(res, 404, { error: r.error });
        return json(res, 200, { ok: true, code: r.room.code, token: r.token, events: r.actorEvents });
      }
      const room = rooms.get((m.code || '').toUpperCase());
      if (!room) return json(res, 404, { error: 'Sala não encontrada' });
      const client = room.clientByToken(m.token);
      if (!client) return json(res, 403, { error: 'Sessão inválida — entre na sala novamente' });
      const r = handleMessage(room, client, m);
      return json(res, r.ok ? 200 : 400, r.ok ? { ok: true, events: r.events } : { error: r.error });
    }
    if (req.method === 'GET' && req.url.startsWith('/api/poll')) {
      const q = new URL(req.url, 'http://x').searchParams;
      const r = await pollRoom(q.get('code'), q.get('token'), parseInt(q.get('seq') || '0', 10), 15000);
      return json(res, r.error ? 404 : 200, r);
    }
    if (req.method === 'GET' && req.url === '/api/health') return json(res, 200, { ok: true, transport: 'ws+long-polling', store: 'memoria-instancia' });
    json(res, 404, { error: 'rota desconhecida' });
  } catch (e) { json(res, 500, { error: e.message }); }
}

const wss = new WebSocketServer({ server });

// ---------- transporte WebSocket (modo local) ----------
function send(ws, type, data) { if (ws.readyState === 1) ws.send(JSON.stringify({ type, ...data })); }

function flushWs(ws) {
  const room = ws.room; if (!room || !ws.client) return;
  for (const e of room.events) {
    if (e.seq <= (ws.lastSeq || 0)) continue;
    if (e.to && e.to !== ws.client.token) continue;
    ws.lastSeq = e.seq;
    send(ws, e.type, e.type === 'state' ? { ...e.data, you: ws.client.family } : e.data);
  }
}

wss.on('connection', (ws) => {
  ws.room = null; ws.client = null; ws.lastSeq = 0;
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    try { handle(ws, m); for (const s of sockets) if (s.room === ws.room) flushWs(s); } catch (e) { send(ws, 'error', { error: e.message }); }
  });
  ws.on('close', () => {
    const room = ws.room; if (!room) return;
    if (ws.client) ws.client.connected = false;
    room.emit('chat', { from: 'sistema', text: `${ws.client ? ws.client.name : 'alguém'} desconectou.` });
    emitState(room);
    for (const other of sockets) if (other.room === room) flushWs(other);
  });
});

function handle(ws, m) {
  const t = m.type;
  if (t === 'create_room' || t === 'join_room') {
    const r = joinOrCreate(m);
    if (r.error) return send(ws, 'error', { error: r.error });
    ws.room = r.room; ws.client = r.client;
    for (const ev of r.actorEvents) send(ws, ev.type, ev);
    return;
  }
  const room = ws.room; if (!room) return;
  const r = handleMessage(room, ws.client, m);
  if (!r.ok) return send(ws, 'error', { error: r.error });
  for (const ev of r.events) send(ws, ev.type, ev.data);
}

const sockets = new Set();
wss.on('connection', (ws) => sockets.add(ws));

setInterval(() => {
  for (const room of rooms.values()) {
    lazyTick(room);
    for (const s of sockets) if (s.room === room) flushWs(s);
  }
}, 1000);

server.listen(PORT, () => {
  console.log(`🥃 Cosa Nostra — servidor em http://localhost:${PORT}  (ws://localhost:${PORT})`);
  console.log('Transportes: WebSocket + HTTP long-polling (/api/action, /api/poll)');
  console.log('Distritos:', DISTRICTS.length, '| Eventos:', EVENTS.length, '| Ligações:', EDGES.length);
});
module.exports = { rooms };

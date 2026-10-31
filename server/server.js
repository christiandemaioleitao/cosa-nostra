/**
 * Servidor autoritativo "Cosa Nostra" — salas, WebSocket, timers e sincronização.
 * Rodar: node server/server.js [porta]
 */
const http = require('http');
const { WebSocketServer } = require('ws');
const { Game } = require('./game/engine');
const { FAMILIES, DISTRICTS, EDGES, EVENTS } = require('./game/data');

const PORT = parseInt(process.argv[2] || process.env.PORT || '8420', 10);
const rooms = new Map(); // code -> room
process.on('uncaughtException', (e) => { console.error('[SERVER] uncaught:', e.stack || e.message); });

const staticRoot = require('path').join(__dirname, '..', 'client');
const server = http.createServer((req, res) => {
  // servidor estático simples para o cliente
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const fs = require('fs');
  const file = require('path').join(staticRoot, p);
  if (!file.startsWith(staticRoot) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('404'); return; }
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
  res.writeHead(200, { 'Content-Type': mime[require('path').extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const wss = new WebSocketServer({ server });

// ---------- utilidades ----------
const genCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');
function send(ws, type, data) { if (ws.readyState === 1) ws.send(JSON.stringify({ type, ...data })); }
function broadcast(room, type, data, exceptWs) {
  const msg = JSON.stringify({ type, ...data });
  for (const c of room.clients) if (c.ws !== exceptWs && c.ws.readyState === 1) c.ws.send(msg);
}
/** Estado visível: segredos (apostas da disputa, baralho) removidos. */
function publicState(room) {
  if (!room.game) return null;
  const s = JSON.parse(JSON.stringify(room.game.st));
  if (s.dispute) s.dispute = { ...s.dispute, bets: undefined, _betsSet: Object.keys(s.dispute.bets || {}) };
  s.eventDeck = undefined;
  return s;
}
function pushState(room) {
  const st = publicState(room);
  for (const c of room.clients) {
    send(c.ws, 'state', {
      state: st, you: c.family, players: room.playersInfo(),
      config: { timer: room.timer, targetPlayers: room.targetPlayers }, spectators: room.spectators.length,
    });
  }
}

class Room {
  constructor(hostName, targetPlayers, timer) {
    this.code = genCode(); while (rooms.has(this.code)) this.code = genCode();
    this.targetPlayers = targetPlayers; this.timer = timer || 120;
    this.clients = [];        // {ws, name, family, ready}
    this.spectators = [];     // {ws, name}
    this.game = null;
    this.turnTimer = null;
    this.chat = [];
  }
  playersInfo() {
    return this.clients.map(c => ({ name: c.name, family: c.family, ready: c.ready }));
  }
}

// ---------- lógica de mensagens ----------
wss.on('connection', (ws) => {
  ws.room = null; ws.name = null; ws.family = null;
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    try { handle(ws, m); } catch (e) { send(ws, 'error', { error: e.message }); }
  });
  ws.on('close', () => {
    const room = ws.room; if (!room) return;
    room.clients = room.clients.filter(c => c.ws !== ws);
    room.spectators = room.spectators.filter(c => c.ws !== ws);
    broadcast(room, 'chat', { from: 'sistema', text: `${ws.name} desconectou.` });
    if (room.game && !room.winner) { /* reconexão: o assento permanece; cliente pode religar */ }
    pushState(room);
  });
});

function handle(ws, m) {
  const t = m.type;
  if (t === 'create_room') {
    const room = new Room(m.name, m.players === 4 ? 4 : 3, m.timer);
    rooms.set(room.code, room);
    join(room, ws, m.name);
    send(ws, 'room_created', { code: room.code });
    return;
  }
  if (t === 'join_room') {
    const room = rooms.get((m.code || '').toUpperCase());
    if (!room) return send(ws, 'error', { error: 'Sala não encontrada' });
    const hasOrphanSeat = room.game && (() => {
      const connected = new Set(room.clients.filter(c => c.family).map(c => c.family));
      return room.game.famList().some(f => !connected.has(f));
    })();
    if (room.clients.length >= room.targetPlayers && !hasOrphanSeat && !room.clients.some(c => c.name === m.name)) {
      room.spectators.push({ ws, name: m.name }); ws.room = room; ws.name = m.name + ' (espectador)';
      send(ws, 'joined', { code: room.code, spectator: true }); pushState(room); return;
    }
    join(room, ws, m.name);
    return;
  }
  const room = ws.room; if (!room) return;

  switch (t) {
    case 'chat': {
      room.chat.push({ from: ws.name, text: String(m.text).slice(0, 300) });
      if (room.chat.length > 200) room.chat.shift();
      broadcast(room, 'chat', { from: ws.name, text: m.text }); break;
    }
    case 'ready': {
      const c = room.clients.find(c => c.ws === ws); if (c) { c.ready = !!m.ready; pushState(room); }
      break;
    }
    case 'start_game': {
      if (room.clients.length < room.targetPlayers) return send(ws, 'error', { error: 'Sala ainda não está cheia' });
      if (!room.clients.every(c => c.ready)) return send(ws, 'error', { error: 'Nem todos estão prontos' });
      // sorteio do 1º jogador: embaralha famílias e atribui
      const fams = [...FAMILIES].sort(() => Math.random() - 0.5).slice(0, room.clients.length);
      room.clients.forEach((c, i) => { c.family = fams[i]; c.ws.family = fams[i]; });
      room.game = new Game(fams);
      broadcast(room, 'chat', { from: 'sistema', text: `Partida iniciada! Primeiro jogador: ${fams[0]}` });
      pushState(room); armTurnTimer(room);
      break;
    }
    case 'set_tax': gameAction(room, ws, (g, f) => g.setTax(f, m.rate)); break;
    case 'action': gameAction(room, ws, (g, f) => g.act(f, m.action)); break;
    case 'dispute_bet': gameAction(room, ws, (g, f) => g.disputeBet(f, m.bet)); break;
    case 'oath_issue': gameAction(room, ws, (g, f) => g.oathIssue(f, m.target)); break;
    case 'oath_demand': gameAction(room, ws, (g, f) => g.oathDemand(f, m.demand)); break;
    case 'negotiate_offer': gameAction(room, ws, (g, f) => g.offer(f, { to: m.to, give: m.give, want: m.want })); break;
    case 'negotiate_respond': gameAction(room, ws, (g, f) => g.respond(f, m.accept)); break;
    default: send(ws, 'error', { error: 'Mensagem desconhecida: ' + t });
  }
}

/** Executa uma ação de jogo autoritativa e propaga o estado. */
function gameAction(room, ws, fn) {
  if (!room.game) return send(ws, 'error', { error: 'Partida não iniciada' });
  const f = ws.family;
  const r = fn(room.game, f);
  if (!r.ok) return send(ws, 'error', { error: r.error });
  broadcast(room, 'action_ok', { by: f, result: { ok: true } });
  pushState(room);
  // timer do turno
  if (room.game.st.phase === 'acoes' && !room.game.st.winner && !room.game.st.dispute) armTurnTimer(room);
  else clearTimeout(room.turnTimer);
  if (room.game.st.winner) broadcast(room, 'victory', { winner: room.game.st.winner });
}

/** Timer opcional por ação (padrão 120s): expira executando "fazer_caixa". */
function armTurnTimer(room) {
  clearTimeout(room.turnTimer);
  if (!room.timer) return;
  room.turnTimer = setTimeout(() => {
    const g = room.game; if (!g || g.st.phase !== 'acoes' || g.st.winner || g.st.dispute) return;
    const cur = g.current();
    g.log(`⏱ ${cur} excedeu o tempo — "Fazer Caixa" automático.`);
    g.act(cur, { type: 'fazer_caixa' });
    pushState(room);
    if (g.st.phase === 'acoes' && !g.st.winner && !g.st.dispute) armTurnTimer(room);
  }, room.timer * 1000);
}

function join(room, ws, name) {
  ws.room = room; ws.name = name;
  room.clients.push({ ws, name, family: null, ready: false });
  // reconexão em partida em andamento: adota o assento de uma família órfã (socket caiu)
  if (room.game) {
    const connected = new Set(room.clients.filter(c => c.family).map(c => c.family));
    const orphan = room.game.famList().find(f => !connected.has(f));
    if (orphan) {
      const seat = room.clients[room.clients.length - 1];
      seat.family = orphan; ws.family = orphan; seat.ready = true;
      broadcast(room, 'chat', { from: 'sistema', text: `${name} reconectou como ${orphan}.` });
    }
  }
  send(ws, 'joined', { code: room.code, spectator: false });
  broadcast(room, 'chat', { from: 'sistema', text: `${name} entrou na sala ${room.code}.` });
  pushState(room);
}

server.listen(PORT, () => {
  console.log(`🥃 Cosa Nostra — servidor em http://localhost:${PORT}  (ws://localhost:${PORT})`);
  console.log('Distritos:', DISTRICTS.length, '| Eventos:', EVENTS.length, '| Ligações:', EDGES.length);
});
module.exports = { rooms };

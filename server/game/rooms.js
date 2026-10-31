/**
 * Motor de salas "Cosa Nostra" — agnóstico de transporte (WebSocket OU HTTP long-polling).
 * Usado por server/server.js (WS local) e pelas Vercel Serverless Functions (api/*).
 *
 * Eventos: cada sala mantém um log sequencial (seq). Transportes entregam os
 * eventos com seq > since ao cliente correspondente. Eventos dirigidos ao
 * autor (room_created/joined/erro) são retornados sincronamente pelo handler.
 */
const crypto = require('crypto');
const { Game } = require('./engine');
const { FAMILIES } = require('./data');

const rooms = new Map(); // code -> Room
const genCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');
const genToken = () => crypto.randomBytes(12).toString('hex');

class Room {
  constructor(hostName, targetPlayers, timer) {
    this.code = genCode(); while (rooms.has(this.code)) this.code = genCode();
    this.targetPlayers = targetPlayers; this.timer = timer || 0;
    this.clients = [];        // {token, name, family, ready, connected}
    this.spectators = [];     // {token, name}
    this.game = null;
    this.chat = [];
    this.seq = 1;             // último seq emitido
    this.events = [];         // [{seq, type, data, to: token|null, audience:'all'|'token'}]
    this.turnDeadline = 0;    // 0 = sem timer
  }
  playersInfo() {
    return this.clients.map(c => ({ name: c.name, family: c.family, ready: c.ready, connected: c.connected }));
  }
  emit(type, data, to = null) {
    this.events.push({ seq: ++this.seq, type, data, to });
    if (this.events.length > 400) this.events = this.events.slice(-200);
  }
  clientByToken(token) { return this.clients.find(c => c.token === token) || this.spectators.find(c => c.token === token); }
}

/** Estado visível: segredos (apostas da disputa, baralho) removidos. */
function publicState(room) {
  if (!room.game) return null;
  const s = JSON.parse(JSON.stringify(room.game.st));
  if (s.dispute) s.dispute = { ...s.dispute, bets: undefined, _betsSet: Object.keys(s.dispute.bets || {}) };
  s.eventDeck = undefined;
  return s;
}
function emitState(room) {
  room.emit('state', {
    state: publicState(room),
    players: room.playersInfo(),
    config: { timer: room.timer, targetPlayers: room.targetPlayers },
    spectators: room.spectators.length,
  });
}

/** Processa timer de turno de forma "lazy" (compatível com serverless). */
function lazyTick(room) {
  if (!room.game || !room.turnDeadline) return;
  if (Date.now() < room.turnDeadline) return;
  const g = room.game;
  if (g.st.phase !== 'acoes' || g.st.winner || g.st.dispute) { room.turnDeadline = 0; return; }
  const cur = g.current();
  g.log(`⏱ ${cur} excedeu o tempo — "Fazer Caixa" automático.`);
  g.act(cur, { type: 'fazer_caixa' });
  emitState(room);
  if (g.st.phase === 'acoes' && !g.st.winner && !g.st.dispute) room.turnDeadline = Date.now() + room.timer * 1000;
  else room.turnDeadline = 0;
  if (g.st.winner) room.emit('victory', { winner: g.st.winner });
}

function createRoom(name, players, timer) {
  const room = new Room(name, players === 4 ? 4 : 3, timer);
  rooms.set(room.code, room);
  return room;
}

function join(room, token, name) {
  const client = { token, name, family: null, ready: false, connected: true };
  room.clients.push(client);
  // reconexão em partida em andamento: adota assento de família órfã
  if (room.game) {
    const connected = new Set(room.clients.filter(c => c.family && c.connected).map(c => c.family));
    const orphan = room.game.famList().find(f => !connected.has(f));
    if (orphan) {
      client.family = orphan; client.ready = true;
      room.emit('chat', { from: 'sistema', text: `${name} reconectou como ${orphan}.` });
    }
  }
  room.emit('chat', { from: 'sistema', text: `${name} entrou na sala ${room.code}.` });
  emitState(room);
  return client;
}

/**
 * Processa uma mensagem de jogo. Retorna { ok, client, events, error }.
 * `events` = eventos dirigidos ao autor (entregues sincronamente pelo transporte).
 */
function handleMessage(room, client, m) {
  const t = m.type;
  const actorEvents = [];
  const err = (error) => ({ ok: false, error, events: [] });
  const ok = (events = []) => ({ ok: true, events });
  if (t === 'chat') {
    room.chat.push({ from: client.name, text: String(m.text || '').slice(0, 300) });
    if (room.chat.length > 200) room.chat.shift();
    room.emit('chat', { from: client.name, text: m.text });
    return ok();
  }
  if (t === 'ready') {
    if (!room.clients.includes(client)) return err('Não é jogador desta sala');
    client.ready = !!m.ready; emitState(room); return ok();
  }
  if (t === 'start_game') {
    if (room.clients.length < room.targetPlayers) return err('Sala ainda não está cheia');
    if (!room.clients.every(c => c.ready)) return err('Nem todos estão prontos');
    const fams = [...FAMILIES].sort(() => Math.random() - 0.5).slice(0, room.clients.length);
    room.clients.forEach((c, i) => { c.family = fams[i]; c.ready = true; });
    room.game = new Game(fams);
    room.emit('chat', { from: 'sistema', text: `Partida iniciada! Primeiro jogador: ${fams[0]}` });
    emitState(room);
    room.turnDeadline = room.timer ? Date.now() + room.timer * 1000 : 0;
    return ok();
  }
  if (['set_tax', 'action', 'dispute_bet', 'oath_issue', 'oath_demand', 'negotiate_offer', 'negotiate_respond'].includes(t)) {
    if (!room.game) return err('Partida não iniciada');
    const f = client.family;
    lazyTick(room);
    const g = room.game;
    let r;
    if (t === 'set_tax') r = g.setTax(f, m.rate);
    else if (t === 'action') r = g.act(f, m.action);
    else if (t === 'dispute_bet') r = g.disputeBet(f, m.bet);
    else if (t === 'oath_issue') r = g.oathIssue(f, m.target);
    else if (t === 'oath_demand') r = g.oathDemand(f, m.demand);
    else if (t === 'negotiate_offer') r = g.offer(f, { to: m.to, give: m.give, want: m.want });
    else r = g.respond(f, m.accept);
    if (!r.ok) return err(r.error);
    emitState(room);
    if (g.st.phase === 'acoes' && !g.st.winner && !g.st.dispute) {
      if (room.timer) room.turnDeadline = Date.now() + room.timer * 1000;
    } else room.turnDeadline = 0;
    if (g.st.winner) room.emit('victory', { winner: g.st.winner });
    return ok();
  }
  return err('Mensagem desconhecida: ' + t);
}

/**
 * Espera por eventos novos (seq > since) por até waitMs ms, processando
 * timers lazy a cada segundo. Resolve imediatamente se já houver eventos.
 */
function pollRoom(code, token, since, waitMs) {
  const room = rooms.get((code || '').toUpperCase());
  if (!room) return Promise.resolve({ error: 'Sala não encontrada' });
  const collect = () => {
    const client = room.clientByToken(token);
    const events = room.events
      .filter(e => e.seq > since && (!e.to || e.to === token || e.to === null))
      .map(e => e.type === 'state'
        ? { seq: e.seq, type: 'state', ...e.data, you: client ? client.family : null }
        : { seq: e.seq, type: e.type, ...e.data });
    return { events, seq: room.seq };
  };
  if (lazyTick(room), room.events.some(e => e.seq > since)) return Promise.resolve(collect());
  return new Promise((resolve) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      lazyTick(room);
      if (room.events.some(e => e.seq > since)) { clearInterval(iv); resolve(collect()); }
      else if (Date.now() - t0 >= waitMs) { clearInterval(iv); resolve(collect()); }
    }, 500);
  });
}

function joinOrCreate(payload) {
  if (payload.type === 'create_room') {
    const room = createRoom(payload.name, payload.players, payload.timer);
    const token = genToken();
    const client = join(room, token, payload.name);
    return { room, token, client, actorEvents: [{ type: 'room_created', code: room.code }, { type: 'joined', code: room.code, spectator: false }] };
  }
  if (payload.type === 'join_room') {
    const room = rooms.get((payload.code || '').toUpperCase());
    if (!room) return { error: 'Sala não encontrada' };
    const hasOrphanSeat = room.game && (() => {
      const connected = new Set(room.clients.filter(c => c.family && c.connected).map(c => c.family));
      return room.game.famList().some(f => !connected.has(f));
    })();
    const already = room.clients.some(c => c.name === payload.name);
    if (room.clients.length >= room.targetPlayers && !hasOrphanSeat && !already) {
      const token = genToken();
      room.spectators.push({ token, name: payload.name + ' (espectador)', connected: true });
      emitState(room);
      return { room, token, spectator: true, actorEvents: [{ type: 'joined', code: room.code, spectator: true }] };
    }
    const token = genToken();
    const client = join(room, token, payload.name);
    return { room, token, client, actorEvents: [{ type: 'joined', code: room.code, spectator: false }] };
  }
  return { error: 'Operação inválida' };
}

module.exports = { rooms, Room, createRoom, handleMessage, pollRoom, joinOrCreate, emitState, lazyTick, publicState, genToken };

/**
 * Adaptador de estado compartilhado para serverless.
 * - Sem BLOB_STORE_ID (local/WS): usa o Map em memória do processo (rooms).
 * - Com BLOB_STORE_ID (Vercel + Blob conectado via OIDC): cada sala é
 *   serializada em um blob `rooms/<CODE>.json`; instâncias diferentes
 *   compartilham o estado. Cache local por instância com verificação de
 *   freshness via `head` (uploadedAt).
 */
const { rooms, Room } = require('./rooms');
const { Game } = require('./engine');

let blobMod = null;
const blobEnabled = () => !!process.env.BLOB_STORE_ID;
async function blob() {
  if (!blobEnabled()) return null;
  if (!blobMod) blobMod = await import('@vercel/blob');
  return blobMod;
}
const key = (code) => `rooms/${code}.json`;

function serialize(room) {
  return JSON.stringify({
    code: room.code, targetPlayers: room.targetPlayers, timer: room.timer,
    clients: room.clients, spectators: room.spectators, chat: room.chat,
    seq: room.seq, events: room.events, turnDeadline: room.turnDeadline,
    bots: room.bots, difficulty: room.difficulty,
    botFingerprint: room.botFingerprint, botNextAt: room.botNextAt,
    game: room.game ? { families: room.game.families, state: room.game.state } : null,
  });
}
function deserialize(json) {
  const d = typeof json === 'string' ? JSON.parse(json) : json;
  const room = new Room(d.code ? '' : '', d.targetPlayers, d.timer);
  room.code = d.code;
  room.clients = d.clients || []; room.spectators = d.spectators || [];
  room.chat = d.chat || []; room.seq = d.seq || 1; room.events = d.events || [];
  room.turnDeadline = d.turnDeadline || 0;
  room.bots = d.bots || 0;
  room.difficulty = d.difficulty || 'medio';
  room.botFingerprint = d.botFingerprint || null;
  room.botNextAt = d.botNextAt || 0;
  if (d.game) {
    room.game = new Game(d.game.families, { rawState: d.game.state });
  }
  return room;
}

const uploadedAtCache = new Map(); // code -> uploadedAt conhecido

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** Carrega a sala mais recente (blob → cache local), tolerando a latência de
 *  consistência eventual do Blob (put visível some segundos depois em head). */
async function getRoom(code, tries = 4) {
  const b = await blob();
  if (!b) return rooms.get(code) || null;
  for (let i = 0; i < tries; i++) {
    try {
      const meta = await b.head(key(code));
      const known = uploadedAtCache.get(code);
      if (rooms.has(code) && known && meta.uploadedAt === known) return rooms.get(code);
      const got = await b.get(key(code), { access: 'private', useCache: false });
      if (!got || !got.stream) return rooms.get(code) || null;
      const text = await new Response(got.stream).text();
      const room = deserialize(text);
      rooms.set(code, room);
      uploadedAtCache.set(code, meta.uploadedAt);
      return room;
    } catch (e) {
      const notFound = e && (e.name === 'BlobNotFoundError' || /not found/i.test(String(e.message || e)));
      if (rooms.has(code)) return rooms.get(code); // cache local é melhor que falhar
      if (!notFound) { console.error('[cloudstore] getRoom falhou:', e); throw e; }
      if (i < tries - 1) await sleep(900);
    }
  }
  return rooms.get(code) || null;
}

/** Persiste a sala (last-write-wins). */
async function saveRoom(room) {
  const b = await blob();
  if (!b) return;
  const res = await b.put(key(room.code), serialize(room), { access: 'private', addRandomSuffix: false, allowOverwrite: true });
  uploadedAtCache.set(room.code, res.uploadedAt);
}

async function deleteRoom(code) {
  const b = await blob();
  if (!b) { rooms.delete(code); return; }
  try { await b.del(key(code)); } catch {}
  rooms.delete(code); uploadedAtCache.delete(code);
}

/** Poll para modo blob: espera até waitMs por eventos com seq > since. */
async function pollCloud(code, token, since, waitMs) {
  const t0 = Date.now();
  let missingSince = null;
  while (true) {
    const room = await getRoom(code);
    if (!room) {
      // sala pode estar a caminho (consistência eventual do Blob): espera um pouco
      missingSince ??= Date.now();
      if (Date.now() - missingSince < 4000) { await sleep(800); continue; }
      return { error: 'Sala não encontrada' };
    }
    missingSince = null;
    // timer lazy compatível com serverless
    const before = room.seq;
    require('./rooms').lazyTick(room);
    if (room.seq !== before) await saveRoom(room);
    if (room.events.some(e => e.seq > since) || Date.now() - t0 >= waitMs) {
      const client = room.clientByToken(token);
      const events = room.events
        .filter(e => e.seq > since && (!e.to || e.to === token || e.to === null))
        .map(e => e.type === 'state'
          ? { seq: e.seq, type: 'state', ...e.data, you: client ? client.family : null }
          : { seq: e.seq, type: e.type, ...e.data });
      return { events, seq: room.seq };
    }
    await new Promise(r => setTimeout(r, 700));
  }
}

module.exports = { blobEnabled, getRoom, saveRoom, deleteRoom, pollCloud, key };

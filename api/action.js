/**
 * POST /api/action — todas as ações de jogo via HTTP (serverless).
 * Body: { type: 'create_room'|'join_room'|..., code?, token?, ...payload }
 * Resposta: { ok, code?, token?, events? } ou { error }
 */
const { handleMessage, joinOrCreate } = require('../server/game/rooms');
const store = require('../server/game/cloudstore');

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'use POST' });

  const m = typeof req.body === 'object' && req.body ? req.body : {};
  try {
    if (m.type === 'create_room' || m.type === 'join_room') {
      const r = joinOrCreate(m);
      if (r.error) return res.status(404).json({ error: r.error });
      await store.saveRoom(r.room);
      return res.status(200).json({ ok: true, code: r.room.code, token: r.token, spectator: !!r.spectator, events: r.actorEvents });
    }
    const room = await store.getRoom((m.code || '').toUpperCase());
    if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
    const client = room.clientByToken(m.token);
    if (!client) return res.status(403).json({ error: 'Sessão inválida — entre na sala novamente' });
    const r = handleMessage(room, client, m);
    if (!r.ok) return res.status(400).json({ error: r.error });
    await store.saveRoom(room);
    return res.status(200).json({ ok: true, events: r.events, seq: room.seq });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

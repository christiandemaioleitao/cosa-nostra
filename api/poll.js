/**
 * GET /api/poll?code=XXX&token=...&seq=N — long-polling de eventos.
 * Espera até ~20s (ou o primeiro evento novo) e responde { events, seq }.
 */
const { pollRoom } = require('../server/game/rooms');
const store = require('../server/game/cloudstore');

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'use GET' });
  const q = new URL(req.url, 'http://x').searchParams;
  try {
    const r = store.blobEnabled()
      ? await store.pollCloud(q.get('code'), q.get('token'), parseInt(q.get('seq') || '0', 10), Math.min(parseInt(q.get('wait') || '20000', 10), 20000))
      : await pollRoom(q.get('code'), q.get('token'), parseInt(q.get('seq') || '0', 10), Math.min(parseInt(q.get('wait') || '20000', 10), 20000));
    if (r.error) return res.status(404).json(r);
    return res.status(200).json(r);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

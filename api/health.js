export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const store = require('../server/game/cloudstore');
  res.status(200).json({ ok: true, transport: 'long-polling', store: store.blobEnabled() ? 'vercel-blob' : 'memoria-instancia' });
}

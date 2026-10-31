/**
 * GET /api/health — verificação simples de deploy (sem Blob, sem estado).
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ ok: true, mode: 'solo-client-side', transport: 'none' });
}

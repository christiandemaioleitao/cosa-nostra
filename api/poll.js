/**
 * GET /api/poll?code=XXX&token=...&seq=N — DESATIVADO.
 * O modo solo roda 100% no navegador (motor + IA via client/js/engine.bundle.js);
 * não há estado serverless (Vercel Blob suspenso / limite gratuito).
 * O código de multiplayer permanece no repo (server/game/*, server/server.js)
 * para reativação futura — esta função não depende de Blob nem de estado.
 */
export const config = { maxDuration: 10 };

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.status(410).json({
    error: 'Multiplayer serverless desativado — o modo solo roda inteiramente no navegador.',
  });
}

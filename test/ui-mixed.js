/**
 * E2E misto: 2 clientes HTTP (long-polling) + 1 host humano via UI (browser).
 * Uso: node test/ui-mixed.js <codigo_da_sala> [turnosDoHost]
 * O host joga pela interface; este script joga os turnos dos outros dois
 * jogadores (set_tax na renda, fazer_caixa nas ações) e aguarda o host.
 */
const BASE = process.env.CN_BASE || 'http://localhost:8420';
const code = (process.argv[2] || '').toUpperCase();
const HOST = process.argv[3] || 'Vitale';

class LpClient {
  constructor(name) { this.name = name; this.token = null; this.code = null; this.seq = 0; this.state = null; this.you = null; this.players = []; }
  async action(type, extra = {}) {
    const r = await fetch(`${BASE}/api/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, code: this.code, token: this.token, ...extra }) });
    const d = await r.json();
    if (d.error) throw new Error(`${type}: ${d.error}`);
    for (const ev of d.events || []) this.feed(ev);
    if (d.token) { this.token = d.token; this.code = d.code; this.poll(); }
  }
  feed(ev) {
    if (ev.seq) this.seq = Math.max(this.seq, ev.seq);
    if (ev.type === 'state') { this.state = ev.state; this.you = ev.you; this.players = ev.players; }
  }
  async poll() {
    while (true) {
      try {
        const r = await fetch(`${BASE}/api/poll?code=${this.code}&token=${this.token}&seq=${this.seq}&wait=10000`);
        const d = await r.json();
        if (d.error) break;
        if (d.seq) this.seq = d.seq;
        for (const ev of d.events || []) this.feed(ev);
      } catch { await new Promise(r => setTimeout(r, 500)); }
    }
  }
  cur() { return this.state && this.state.order[this.state.turnIdx % this.state.order.length]; }
}

async function main() {
  const a = new LpClient('HTTP P2'), b = new LpClient('HTTP P3');
  await a.action('join_room', { name: 'HTTP P2', code });
  await b.action('join_room', { name: 'HTTP P3', code });
  const t0 = Date.now();
  while (!(a.players.length >= 3 && a.players.every(p => p.ready))) {
    if (Date.now() - t0 > 60000) throw new Error('host não ficou pronto a tempo');
    if (!(a.players.find(p => p.name === 'HTTP P2') || {}).ready) await a.action('ready', { ready: true }).catch(() => {});
    if (!(a.players.find(p => p.name === 'HTTP P3') || {}).ready) await b.action('ready', { ready: true }).catch(() => {});
    await new Promise(r => setTimeout(r, 700));
  }
  console.log('[UI-MIX] 3 jogadores prontos — aguardando host iniciar pela UI…');
  await new Promise(async (resolve) => { while (!(a.state && a.state.phase)) await new Promise(r => setTimeout(r, 500)); resolve(); });
  console.log('[UI-MIX] partida iniciada');

  // loop: resolve rendas dos clientes HTTP e joga os turnos deles; aguarda o host jogar pela UI
  const rounds0 = a.state.round;
  for (let i = 0; i < 600; i++) {
    const s = a.state;
    if (!s) break;
    if (s.winner) { console.log('[UI-MIX] vencedor:', s.winner); break; }
    for (const c of [a, b]) {
      if (s.pendingIncome && c.you in s.pendingIncome && !s.pendingIncome[c.you]) {
        try { await c.action('set_tax', { rate: 'normal' }); } catch {}
      }
    }
    const cur = a.cur();
    if (s.phase === 'acoes' && cur && cur !== HOST && !s.dispute) {
      const c = [a, b].find(x => x.you === cur);
      if (c) { try { await c.action('action', { action: { type: 'fazer_caixa' } }); } catch {} }
    }
    if (a.state.round >= rounds0 + 2) { console.log(`[UI-MIX] rodada ${a.state.round} alcançada ✔`); break; }
    await new Promise(r => setTimeout(r, 250));
  }
  console.log(`[UI-MIX] fim: rodada=${a.state.round} fase=${a.state.phase}`);
  process.exit(0);
}
main().catch(e => { console.error('[UI-MIX] erro:', e.message); process.exit(1); });

/**
 * Teste E2E do modo SOLO com robôs — roda contra o servidor local via HTTP
 * long-polling (mesma API das Vercel Functions).
 * Uso: node test/solo.js [porta]
 * Partida solo (1 humano + 3 bots) em CADA dificuldade; o humano joga no
 * automático (fazer_caixa) e aguarda o jogo terminar normalmente.
 */
const BASE = /^https?:/.test(process.argv[2] || '') ? process.argv[2] : `http://localhost:${process.argv[2] || 8420}`;
const DIFFS = process.env.ONLY ? [process.env.ONLY] : ['facil', 'medio', 'dificil'];

async function post(body) {
  const r = await fetch(`${BASE}/api/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runSolo(difficulty) {
  const t0 = Date.now();
  const created = await post({ type: 'create_room', name: 'HumanoTeste', players: 4, timer: 0, bots: 3, difficulty });
  if (created.error) throw new Error('criar sala: ' + created.error);
  const { code, token } = created;
  await post({ type: 'ready', code, token, ready: true });
  await post({ type: 'start_game', code, token });
  let seq = 0, state = null, my = null, winner = null, botActionLog = [];
  const deadline = Date.now() + 12 * 60 * 1000; // 12 min por partida

  while (!winner && Date.now() < deadline) {
    const r = await fetch(`${BASE}/api/poll?code=${code}&token=${token}&seq=${seq}&wait=15000`);
    const data = await r.json();
    if (data.error) throw new Error('poll: ' + data.error);
    if (data.seq) seq = data.seq;
    for (const ev of data.events || []) {
      if (ev.type === 'state') { state = ev.state; my = ev.you; }
      if (ev.type === 'victory') winner = ev.winner;
    }
    if (winner) break;
    if (!state) { await sleep(300); continue; }
    // humano joga no automático
    if (state.pendingIncome && my in state.pendingIncome && !state.pendingIncome[my]) {
      await post({ type: 'set_tax', code, token, rate: 'normal' });
    } else if (state.dispute && (my === state.dispute.attacker || my === state.dispute.defender) &&
               !(state.dispute._betsSet || []).includes(my)) {
      await post({ type: 'dispute_bet', code, token, bet: 0 });
    } else if (state.phase === 'acoes' && !state.dispute && !state.pendingOffer &&
               state.order[state.turnIdx % state.order.length] === my) {
      await post({ type: 'action', code, token, action: { type: 'fazer_caixa' } });
    }
    await sleep(200);
  }
  const s = state || {};
  const resumo = Object.entries(s.players || {}).map(([f, p]) => `${f}: 👑${p.influence} 💰${p.money} 🎖${p.respect}`).join(' | ');
  if (!winner) throw new Error(`[${difficulty}] partida não terminou em 8 min`);
  return {
    difficulty, code, winner, rounds: s.round, ms: Date.now() - t0, resumo,
    eventosBot: (s.log || []).filter(l => /(?:recrutou|exportou|influenciou|cobrança|avança|avançou|vence a disputa|escolheu taxa)/.test(l.msg)).length,
  };
}

(async () => {
  console.log('=== Teste E2E Solo com bots — 3 dificuldades (em paralelo) ===');
  const resultados = await Promise.all(DIFFS.map(d => runSolo(d).then(r => {
    console.log(`✔ [${d}] sala ${r.code} — vencedor: ${r.winner} | rodadas: ${r.rounds} | ${Math.round(r.ms / 1000)}s | ações de bot no log: ${r.eventosBot}`);
    console.log(`   estado final → ${r.resumo}`);
    return r;
  })));
  const ok = resultados.length === 3 && resultados.every(r => r.winner);
  console.log(ok ? '\n✅ TODAS as partidas solo terminaram normalmente nas 3 dificuldades.' : '\n❌ FALHA');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('❌', e.message); process.exit(1); });

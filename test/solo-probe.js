/** Probe: uma partida solo na dificuldade dada, com progresso visível. */
const BASE = `http://localhost:${process.argv[2] || 8421}`;
const DIFF = process.argv[3] || 'facil';
const post = async (b) => (await fetch(`${BASE}/api/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })).json();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const c = await post({ type: 'create_room', name: 'HumanoTeste', players: 4, timer: 0, bots: 3, difficulty: DIFF });
  const { code, token } = c;
  console.log(`[${DIFF}] sala ${code}`);
  let seq = 0, state = null, my = null, winner = null;
  await post({ type: 'ready', code, token, ready: true });
  await post({ type: 'start_game', code, token });
  const t0 = Date.now(), deadline = t0 + 10 * 60 * 1000;
  let lastLog = 0;
  while (!winner && Date.now() < deadline) {
    const r = await (await fetch(`${BASE}/api/poll?code=${code}&token=${token}&seq=${seq}&wait=5000`)).json();
    if (r.seq) seq = r.seq;
    for (const e of r.events || []) {
      if (e.type === 'state') { state = e.state; my = e.you; }
      if (e.type === 'victory') winner = e.winner;
    }
    if (winner) break;
    if (state) {
      if (Date.now() - lastLog > 15000) {
        lastLog = Date.now();
        console.log(`[${DIFF}] ${Math.round((Date.now() - t0) / 1000)}s rodada=${state.round} fase=${state.phase} influências=${Object.values(state.players).map(p => p.influence).join('/')}`);
      }
      if (state.phase === 'acoes' && !state.dispute && !state.pendingOffer && state.order[state.turnIdx % state.order.length] === my) {
        await post({ type: 'action', code, token, action: { type: 'fazer_caixa' } });
      }
      if (state.dispute && (my === state.dispute.attacker || my === state.dispute.defender)) {
        await post({ type: 'dispute_bet', code, token, bet: 0 });
      }
    }
    await sleep(150);
  }
  console.log(`[${DIFF}] FIM: vencedor=${winner} rodadas=${state && state.round} ${Math.round((Date.now() - t0) / 1000)}s`);
  console.log('estado final:', Object.entries(state.players).map(([f, p]) => `${f}👑${p.influence}💰${p.money}`).join(' | '));
  process.exit(winner ? 0 : 1);
})().catch(e => { console.error('ERRO', e); process.exit(1); });

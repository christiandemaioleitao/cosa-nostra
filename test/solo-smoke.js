/** Smoke E2E em produção: uma sala solo por dificuldade; bots jogando vários turnos. */
const BASE = process.argv[2] || 'https://cosa-nostra-beta.vercel.app';
const post = async (b) => (await fetch(BASE + '/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })).json();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  for (const d of ['facil', 'medio', 'dificil']) {
    const c = await post({ type: 'create_room', name: 'Smoke' + d, players: 4, timer: 0, bots: 3, difficulty: d });
    if (c.error) { console.log('ERRO criar', d, c.error); continue; }
    await post({ type: 'ready', code: c.code, token: c.token, ready: true });
    const st0 = await post({ type: 'start_game', code: c.code, token: c.token });
    if (st0.error) { console.log('ERRO iniciar', d, st0.error); continue; }
    let seq = 0, state = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 100000) {
      const r = await (await fetch(`${BASE}/api/poll?code=${c.code}&token=${c.token}&seq=${seq}&wait=20000`)).json();
      if (r.error) { console.log('ERRO poll', d, r.error); break; }
      if (r.seq) seq = r.seq;
      for (const e of r.events || []) if (e.type === 'state') state = e.state;
    }
    const botLog = (state.log || []).filter(l => /(influenciou|exportou|recrutou|cobrança|escolheu taxa|avança|fez caixa|vence a disputa)/i.test(l.msg));
    console.log(`[${d}] sala=${c.code} rodada=${state.round} fase=${state.phase} logBot=${botLog.length}`);
    console.log('  amostra:', botLog.slice(0, 3).map(l => l.msg).join(' | '));
  }
  console.log('SMOKE OK');
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });

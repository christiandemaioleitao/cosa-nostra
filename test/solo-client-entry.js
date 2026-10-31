/**
 * Entrada (empacotada por esbuild) do teste client-side: junta o adaptador
 * LocalSolo (client/js/solo.js) com o motor/IA reais (server/game/*).
 */
import { LocalSolo } from '../client/js/solo.js';
import { Game } from '../server/game/engine.js';
import * as bots from '../server/game/bots.js';
import { FAMILIES } from '../server/game/data.js';

globalThis.CosaServerGame = { Game, bots, FAMILIES };
globalThis.CN_BOT_DELAY_MS = process.env.CN_BOT_DELAY_MS || '1200';

export function runTests() {
  const DIFFS = ['facil', 'medio', 'dificil'];
  const results = [];

  // Rede deve ser IMPOSSÍVEL: qualquer fetch/XHR falha o teste
  globalThis.fetch = (url) => { throw new Error(`CHAMADA DE REDE PROIBIDA: ${url}`); };
  const XHR = class XMLHttpRequest { open() { throw new Error('CHAMADA DE REDE PROIBIDA (XHR)'); } };
  globalThis.XMLHttpRequest = XHR;

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  async function runSolo(difficulty) {
    const t0 = Date.now();
    let state = null, my = null, winner = null, botActions = 0, apiTouched = false;
    const solo = new LocalSolo({
      name: 'HumanoTeste', tableSize: 4, bots: 3, difficulty,
      onEvent: (ev) => {
        if (ev.type === 'state') { state = ev.state; my = ev.you; }
        if (ev.type === 'victory') winner = ev.winner;
      },
    });
    solo.handleMessage({ type: 'ready', ready: true });
    solo.handleMessage({ type: 'start_game' });
    const deadline = Date.now() + 12 * 60 * 1000;
    while (!winner && Date.now() < deadline) {
      if (!state) { await sleep(100); continue; }
      const s = state;
      botActions = (s.log || []).filter(l => /(?:recrutou|exportou|influenciou|cobrança|avança|avançou|vence a disputa|escolheu taxa)/.test(l.msg)).length;
      if (s.phase === 'renda' && s.pendingIncome && my in s.pendingIncome && !s.pendingIncome[my]) {
        solo.handleMessage({ type: 'set_tax', rate: 'normal' });
      } else if (s.dispute && (my === s.dispute.attacker || my === s.dispute.defender) &&
                 !(s.dispute._betsSet || []).includes(my)) {
        solo.handleMessage({ type: 'dispute_bet', bet: 0 });
      } else if (s.phase === 'acoes' && !s.dispute && !s.pendingOffer &&
                 s.order[s.turnIdx % s.order.length] === my) {
        solo.handleMessage({ type: 'action', action: { type: 'fazer_caixa' } });
      }
      await sleep(30);
    }
    solo.stop();
    if (!winner) throw new Error(`[${difficulty}] partida não terminou em 12 min`);
    const resumo = Object.entries(state.players).map(([f, p]) => `${f}: 👑${p.influence} 💰${p.money} 🎖${p.respect}`).join(' | ');
    return { difficulty, winner, rounds: state.round, ms: Date.now() - t0, botActions, resumo };
  }

  (async () => {
    console.log('=== E2E client-side (bundle do motor) — 3 dificuldades ===');
    for (const d of DIFFS) {
      const r = await runSolo(d);
      results.push(r);
      console.log(`✔ [${d}] vencedor: ${r.winner} | rodadas: ${r.rounds} | ${Math.round(r.ms / 1000)}s | ações de bot no log: ${r.botActions}`);
      console.log(`   estado final → ${r.resumo}`);
    }
    const ok = results.length === 3 && results.every(r => r.winner);
    console.log(ok ? '\n✅ 3 partidas solo (client-side) terminaram com vencedor; zero chamadas /api/*.'
                   : '\n❌ FALHA');
    process.exit(ok ? 0 : 1);
  })().catch(e => { console.error('❌', e.message); process.exit(1); });
}

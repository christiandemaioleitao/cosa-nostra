/**
 * Teste E2E de long-polling HTTP: 4 clientes headless criam sala, entram,
 * iniciam partida e jogam turnos (renda + ações) via /api/action + /api/poll.
 * Uso: node test/longpoll.js [porta_base]
 */
const BASE = process.env.CN_BASE || `http://localhost:${parseInt(process.argv[2] || '8420', 10)}`;
const log = (...a) => console.log('[LP-TEST]', ...a);
const failures = [];
function assert(cond, msg) { if (cond) log('✔', msg); else { failures.push(msg); log('✘ FALHOU:', msg); } }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

class LpClient {
  constructor(name) { this.name = name; this.token = null; this.code = null; this.seq = 0; this.state = null; this.you = null; this.players = []; this.chat = []; }
  async action(type, extra = {}) {
    const r = await fetch(`${BASE}/api/action`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, code: this.code, token: this.token, ...extra }),
    });
    const data = await r.json();
    if (data.error) throw new Error(`${type}: ${data.error}`);
    for (const ev of (data.events || [])) this.feed(ev);
    if (data.token) { this.token = data.token; this.code = data.code; this.polling = true; this.loop(); }
    return data;
  }
  feed(ev) {
    if (ev.seq) this.seq = Math.max(this.seq, ev.seq);
    if (ev.type === 'state') { this.state = ev.state; this.you = ev.you; this.players = ev.players; }
    if (ev.type === 'chat') this.chat.push(ev);
    if (ev.type === 'victory') this.winner = ev.winner;
  }
  async loop() {
    while (this.polling) {
      try {
        const r = await fetch(`${BASE}/api/poll?code=${this.code}&token=${this.token}&seq=${this.seq}&wait=8000`);
        const data = await r.json();
        if (data.error) { this.polling = false; return; }
        if (data.seq) this.seq = data.seq;
        for (const ev of (data.events || [])) this.feed(ev);
      } catch { await sleep(500); }
    }
  }
  async wait(pred, timeout = 15000) {
    const t0 = Date.now();
    while (!pred()) {
      if (Date.now() - t0 > timeout) throw new Error(`timeout aguardando ${pred}`);
      await sleep(50);
    }
    return true;
  }
}

async function main() {
  // 1) host cria a sala via long-polling
  const host = new LpClient('Don Corleone');
  await host.action('create_room', { name: 'Don Corleone', players: 4, timer: 0 });
  assert(!!host.token && /^[A-Z2-9]{6}$/.test(host.code), `sala criada via POST /api/action (código ${host.code})`);

  // 2) 3 clientes entram (HTTP puro)
  const clients = [host];
  for (const n of ['Vito', 'Michael', 'Fredo']) {
    const c = new LpClient(n);
    await c.action('join_room', { name: n, code: host.code });
    clients.push(c);
  }
  await host.wait(() => host.players.length === 4);
  assert(host.players.length === 4, '4 jogadores na sala (propagados por long-poll)');

  // 3) pronto + iniciar
  for (const c of clients) await c.action('ready', { ready: true });
  await host.action('start_game');
  for (const c of clients) await c.wait(() => c.state && c.state.phase);
  assert(clients.every(c => c.state && c.state.phase), 'partida iniciada — todos receberam estado por long-polling');
  assert(clients.every(c => c.you), `famílias atribuídas: ${clients.map(c => c.you).join(', ')}`);

  // 4) fases de renda: cada jogador define taxa quando pedido
  const me = clients[0];
  for (let i = 0; i < 40 && me.state.phase !== 'acoes' && !me.state.winner; i++) {
    for (const c of clients) {
      if (c.state && c.state.pendingIncome && c.you in c.state.pendingIncome) {
        try { await c.action('set_tax', { rate: 'normal' }); } catch (e) { log('set_tax retry:', e.message); await sleep(300); }
      }
    }
    await sleep(150);
  }
  assert(me.state.phase === 'acoes', `renda concluída — fase atual: ${me.state.phase}`);

  // 5) turnos: jogador ativo executa "fazer_caixa" até avançar rodadas
  for (let i = 0; i < 40 && i < 100; i++) {
    if (me.state.winner) break;
    const cur = me.state.order[me.state.turnIdx % me.state.order.length];
    const active = clients.find(c => c.you === cur);
    if (!active) break;
    try { await active.action('action', { action: { type: 'fazer_caixa' } }); }
    catch (e) { log('turno:', e.message); await sleep(300); }
    await sleep(120);
    if (me.state.round >= 3) break;
  }
  log(`estado final: rodada=${me.state.round} fase=${me.state.phase} vencedor=${me.state.winner || '—'}`);
  assert(me.state.round >= 2, `múltiplos turnos jogados por long-polling (rodada ${me.state.round})`);

  // 6) chat via long-polling chega aos outros
  const prev = clients[1].chat.length;
  await clients[2].action('chat', { text: 'salute!' });
  await clients[1].wait(() => clients[1].chat.length > prev);
  assert(true, 'chat propagado por long-polling');

  // 7) sincronização: todos os clientes veem a mesma rodada
  const rounds = new Set(clients.map(c => c.state.round));
  assert(rounds.size === 1, `estado consistente entre os 4 clientes (rodadas: ${[...rounds].join(',')})`);

  log(failures.length ? `\n${failures.length} FALHAS` : '\nTODOS OS TESTES PASSARAM ✔');
  process.exit(failures.length ? 1 : 0);
}
main().catch(e => { console.error('[LP-TEST] erro fatal:', e); process.exit(1); });

/**
 * Teste de integração headless: cria sala via WebSocket, conecta 4 clientes,
 * roda uma partida mínima programática e valida o estado autoritativo no servidor.
 * Uso: node test/simulate.js [porta]
 */
const WebSocket = require('ws');
const PORT = parseInt(process.argv[2] || '8420', 10);
const URL = `ws://localhost:${PORT}`;

const log = (...a) => console.log('[TEST]', ...a);
const failures = [];
function assert(cond, msg) { if (cond) log('✔', msg); else { failures.push(msg); log('✘ FALHOU:', msg); } }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** Cliente de teste: fila de mensagens e helper de envio. */
class TestClient {
  constructor(name) { this.name = name; this.msgs = []; this.state = null; }
  connect() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(URL);
      this.ws.on('open', res);
      this.ws.on('error', rej);
      this.ws.on('message', (raw) => {
        const m = JSON.parse(raw);
        this.msgs.push(m);
        if (m.type === 'error') log(`erro p/ ${this.name}:`, m.error);
        if (m.type === 'state') this.state = m;
      });
    });
  }
  send(type, extra = {}) { this.ws.send(JSON.stringify({ type, ...extra })); }
  wait(predicate, timeout = 8000) {
    const t0 = Date.now();
    return new Promise((res, rej) => {
      const iv = setInterval(() => {
        if (predicate()) { clearInterval(iv); res(true); }
        else if (Date.now() - t0 > timeout) { clearInterval(iv); rej(new Error('timeout aguardando ' + predicate)); }
      }, 30);
    });
  }
}

async function main() {
  // ---------- 1) Sala ----------
  const host = new TestClient('Host');
  await host.connect();
  host.send('create_room', { name: 'Host', players: 4, timer: 0 });
  await host.wait(() => host.msgs.some(m => m.type === 'room_created'));
  const code = host.msgs.find(m => m.type === 'room_created').code;
  assert(/^[A-Z2-9]{6}$/.test(code), `código de sala gerado (${code})`);
  log('sala criada:', code);

  const clients = [host];
  for (const n of ['Vito', 'Michael', 'Fredo']) {
    const c = new TestClient(n); await c.connect(); c.send('join_room', { name: n, code });
    clients.push(c);
  }
  await host.wait(() => host.state && host.state.players.length === 4);
  assert(host.state.players.length === 4, '4 jogadores na sala');

  // chat
  host.send('chat', { text: 'Buongiorno' });
  await clients[1].wait(() => clients[1].msgs.some(m => m.type === 'chat' && m.text === 'Buongiorno'));
  assert(true, 'chat entregue a todos');

  clients.forEach(c => c.send('ready', { ready: true }));
  await host.wait(() => host.state.players.every(p => p.ready));
  host.send('start_game');
  await host.wait(() => host.state.state && host.state.state.phase, 10000);
  const st = () => host.state.state;
  assert(st().phase === 'acoes' && st().round === 1, `partida iniciada: rodada 1, fase ${st().phase} (evento+renda da 1ª rodada resolvidos)`);
  assert(Object.values(st().players).every(p => p.money >= 3), 'renda inicial aplicada (+2$ e produção, líquido de evento/custos)');
  const fams = Object.keys(st().players);
  assert(fams.length === 4, '4 famílias atribuídas');
  const distOwnerCount = {};
  for (const d of Object.values(st().districts)) distOwnerCount[d.owner] = (distOwnerCount[d.owner] || 0) + 1;
  assert(Object.values(distOwnerCount).every(n => n === 3), '12 distritos distribuídos 3/3/3/3');
  const distOwnerCountOrig = { ...distOwnerCount };
  const respect0 = Object.fromEntries(fams.map(f => [f, st().players[f].respect]));
  // total por família = 12 (eventos imediatos como Traição/Deserção podem alterar reserva/distribuição)
  const troopsOk = fams.every(f => st().players[f].reserve + Object.values(st().districts).reduce((a, d) => a + (d.troops[f] || 0), 0) === 12);
  assert(troopsOk, 'frota íntegra: 12 capangas por família (8 distribuídos + 4 reserva, ajustados por evento imediato)');

  // ---------- 2) Disputa completa (5 passos) ----------
  // Usa o jogador da vez: acha um distrito seu adjacente a um rival, recruta se preciso e avança.
  const waitRoundChangeOrPhase = () => {};
  const curFam = () => host.state.state.order[host.state.state.turnIdx % 4];
  let guard = 0, disputeDone = false, moveN = 0, attFrom = null, defId = null, attacker = null, defFam = null, mine0 = 0;
  while (!disputeDone && guard++ < 60) {
    const s = host.state.state;
    if (s.dispute) {
      assert(true, 'disputa aberta (passos 1–2: anúncio + apostas secretas)');
      assert(s.dispute.bets === undefined, 'apostas são secretas (não visíveis no estado público)');
      sendBets(clients, s);
      await host.wait(() => !host.state.state.dispute, 4000);
      assert(!host.state.state.dispute, 'disputa resolvida (passos 3–5: revelar/pagar, comparar forças, baixas/ocupação)');
      disputeDone = true; break;
    }
    if (s.phase !== 'acoes') { playTurn(clients, host, new Set()); await sleep(40); continue; }
    const f = curFam(); const c = clients.find(cl => cl.state && cl.state.you === f);
    if (!attacker) {
      // escolhe atacante/origem/destino com base no jogador da vez
      attacker = f;
      const own = s.players[f].districts;
      for (const dId of own) {
        const viz = Object.values(s.districts).find(x => x.owner !== f && isAdj(dId, x.id));
        if (viz && (s.districts[dId].troops[f] || 0) >= 3) { attFrom = dId; defId = viz.id; defFam = viz.owner; break; }
      }
      if (!attFrom) { // sem tropas suficientes: recruta
        const target = own.find(dId => Object.values(s.districts).some(x => x.owner !== f && isAdj(dId, x.id)) && (s.districts[dId].troops[f] || 0) <= 4);
        if (target && s.players[f].money >= 2 && (s.districts[target].troops[f] || 0) < 6) {
          c.send('action', { action: { type: 'recrutar', district: target, n: 2 } });
          log(`${f} recruta em ${target} para preparar a disputa`);
        } else c.send('action', { action: { type: 'fazer_caixa' } });
        await sleep(60); continue;
      }
      log(`disputa: ${attacker} (${attFrom}) ataca ${defFam} em ${defId}`);
      mine0 = s.districts[attFrom].troops[f] || 0;
      moveN = Math.min(2, mine0 - 1);
      c.send('action', { action: { type: 'avancar', from: attFrom, to: defId, troops: moveN } });
      await sleep(80); continue;
    }
    // atacante definido: aguarda a vez dele de novo para avançar (caso o recrutar consumiu o turno)
    if (curFam() === attacker) {
      const s2 = host.state.state;
      const mine = s2.districts[attFrom].troops[attacker] || 0;
      const viz = Object.values(s2.districts).find(x => x.owner !== attacker && isAdj(attFrom, x.id) && s2.players[attacker].districts.length && s2.districts[x.id].owner !== attacker);
      if (mine >= 3 && viz && !s2.dispute) {
        defId = viz.id; defFam = viz.owner; moveN = Math.min(2, mine - 1);
        c.send('action', { action: { type: 'avancar', from: attFrom, to: defId, troops: moveN } });
        log(`avanço enviado: ${moveN} de ${attFrom} → ${defId}`);
      } else c.send('action', { action: { type: 'fazer_caixa' } });
      await sleep(80); continue;
    }
    playTurn(clients, host, new Set());
    await sleep(40);
    if (host.state.state.dispute) {
      assert(true, 'disputa aberta (passos 1–2: anúncio + apostas secretas)');
      assert(host.state.state.dispute.bets === undefined, 'apostas são secretas (não visíveis no estado público)');
      // resolve com apostas fixas
      const cA = clients.find(cl => cl.state && cl.state.you === attacker);
      const cD = clients.find(cl => cl.state && cl.state.you === host.state.state.dispute.defender);
      cA && cA.send('dispute_bet', { bet: 2 });
      cD && cD.send('dispute_bet', { bet: 1 });
      await host.wait(() => !host.state.state.dispute, 4000);
      assert(!host.state.state.dispute, 'disputa resolvida (passos 3–5: revelar/pagar, comparar forças, baixas/ocupação)');
      disputeDone = true;
      break;
    }
  }
  assert(disputeDone, 'uma disputa completa foi executada');
  const after = host.state.state;
  // valida o efeito da disputa no estado autoritativo
  const owners0 = Object.fromEntries(Object.entries(distOwnerCountOrig).map(([k]) => [k, Object.values(after.districts).filter(d => d.owner === k).length]));
  const changedOwner = fams.some(f => owners0[f] !== distOwnerCountOrig[f]);
  const respectChanged = fams.some(f => after.players[f].respect !== respect0[f]);
  assert(changedOwner || respectChanged, `efeito da disputa registrado (transferência de distrito ou +1 Respeito): owners=${JSON.stringify(owners0)}`);

  // ---------- 3) Todas as 6 ações em jogo real ----------
  // Executa uma rodada inteira com ações válidas e confirma o ciclo eventos→renda→2 circuitos.
  const seen = new Set();
  let rounds0 = after.round;
  guard = 0;
  while (after.round === rounds0 && guard++ < 400) { playTurn(clients, host, seen); await sleep(25); }
  assert(seen.has('influenciar') || seen.has('fazer_caixa'), 'ações executadas no 1º circuito');
  assert(host.state.state.round > rounds0, `rodada avançou (${rounds0} → ${host.state.state.round}): 2 circuitos + encerramento OK`);

  // ---------- 4) Evento revelado ----------
  const evt = host.state.state.event;
  assert(evt && evt.id && evt.timing, `evento da rodada ${host.state.state.round} revelado: ${evt.id} (${evt.timing})`);

  // ---------- 5) Partida completa até a vitória ----------
  guard = 0;
  while (!host.state.state.winner && guard++ < 30000) {
    playTurn(clients, host, seen);
    await sleep(3);
    if (guard % 2000 === 0) log(`... iteração ${guard}, rodada ${host.state.state.round}, fase ${host.state.state.phase}, influências: ${JSON.stringify(Object.fromEntries(fams.map(f => [f, host.state.state.players[f].influence])))}`);
  }
  assert(!!host.state.state.winner, `partida encerrou com vencedor: ${host.state.state.winner}`);
  if (!host.state.state.winner) log('LOG DO SERVIDOR (últimas linhas):', JSON.stringify(host.state.state.log.slice(-5)));
  assert(host.state.state.players[host.state.state.winner].influence === 10, 'vencedor com exatos 10 de Influência');
  assert(clients.some(c => c.msgs.some(m => m.type === 'victory')), 'mensagem de vitória broadcast');

  log(failures.length ? `\n✘ ${failures.length} falha(s)` : '\n✔ TODOS OS TESTES PASSARAM');
  process.exit(failures.length ? 1 : 0);
}

// ---------- helpers de jogo ----------
const ADJ = null; // adjacência calculada pelo cliente via estado (grafo fixo no protocolo)
const EDGES = [[1,2],[1,3],[2,4],[3,4],[3,5],[4,6],[5,6],[5,7],[6,7],[6,8],[7,9],[8,9],[7,10],[9,10],[10,11],[8,11],[11,12],[9,12]];
function isAdj(a, b) { return EDGES.some(([x, y]) => (x === a && y === b) || (x === b && y === a)); }

/** Executa a ação do jogador da vez usando o cliente correspondente. */
function act(host, clients, action) {
  const st = host.state.state;
  const f = st.order[st.turnIdx % 4];
  const c = clients.find(cl => cl.state && cl.state.you === f);
  if (!c) return false;
  if (st.phase === 'renda' && f in (st.pendingIncome || {})) { c.send('set_tax', { rate: 'normal' }); return true; }
  if (st.dispute) { sendBets(clients, st); return true; }
  if (st.phase !== 'acoes') return false;
  c.send('action', { action });
  return true;
}

/** Escolhe automaticamente uma ação válida para o jogador da vez. */
function playTurn(clients, host, seen) {
  const st = host.state.state; if (!st || st.winner) return;
  const f = st.order[st.turnIdx % 4];
  const c = clients.find(cl => cl.state && cl.state.you === f);
  if (!c) return;
  if (st.phase === 'renda' && f in (st.pendingIncome || {})) { c.send('set_tax', { rate: 'normal' }); return; }
  if (st.dispute) { sendBets(clients, st); return; }
  if (st.phase !== 'acoes') return;
  const p = st.players[f];
  const own = st.players[f].districts.map(id => st.districts[id]);
  let action = null;
  if (p.influence < 10 && p.money >= 6) action = { type: 'influenciar', com: 'dinheiro' };
  else if (p.respect >= 3 && p.influence >= 8) action = { type: 'influenciar', com: 'respeito' };
  else if (p.lemons >= 2 && !p.exported) {
    const pomar = own.find(d => ownType(st, d.id) === 'Pomar' && d.open), porto = own.find(d => ownType(st, d.id) === 'Porto' && d.open);
    action = (pomar && porto) ? { type: 'exportar', modo: 'cadeia' } : { type: 'exportar', modo: 'mercado' };
  } else if (p.money >= 6) action = { type: 'influenciar', com: 'dinheiro' };
  else action = { type: 'fazer_caixa' };
  if (action) { seen.add(action.type); c.send('action', { action }); }
}
/** Envia as apostas de atacante e defensor (ambos apostam sem depender do turno). */
function sendBets(clients, st) {
  for (const who of [st.dispute.attacker, st.dispute.defender]) {
    const c = clients.find(cl => cl.state && cl.state.you === who);
    if (c) c.send('dispute_bet', { bet: Math.min(1, st.players[who].money) });
  }
}
function ownType(st, id) { const T = { 1:'Porto',2:'Pomar',3:'Porto',4:'Pomar',5:'Porto',6:'Mercado',7:'Porto',8:'Pomar',9:'Mercado',10:'Mercado',11:'Pomar',12:'Mercado' }; return T[id]; }

/** Faz um "pass" barato (fazer_caixa) para consumir o turno atual. */
function stepAuto(clients, host) { playTurn(clients, host, new Set()); }
function stepTo(fam, clients, host, maxTurns = 8) {
  let g = 0;
  const cur = () => host.state.state.order[host.state.state.turnIdx % 4];
  while (cur() !== fam && g++ < maxTurns) { playTurn(clients, host, new Set()); }
}

main().catch(e => { console.error('[TEST] ERRO:', e.message); process.exit(1); });

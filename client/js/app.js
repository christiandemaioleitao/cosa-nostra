/**
 * Cliente "Cosa Nostra" — rede (WebSocket), UI e integração com a cena 3D.
 */
import { Board3D } from './board3d.js';
import { sfx, startAmbient } from './audio.js';
import { DIST_TYPES, EDGES } from './data-client.js';

const $ = (id) => document.getElementById(id);
let ws = null, my = null, code = null, state = null, board = null;
let selFrom = null, selMode = null;      // seleção no tabuleiro
let lastEventId = null, tutorialShown = false;

// ---------- rede (transporte duplo: WebSocket local / long-polling em produção) ----------
// Auto-detecção: localhost usa WebSocket; fora (produção/serverless) usa HTTP long-polling.
const USE_WS = ['localhost', '127.0.0.1'].includes(location.hostname);
let lpToken = null, lpSeq = 0, lpActive = false, lpFailures = 0;

function handleNet(m) {
  if (m.type === 'error') return toast('⚠ ' + m.error);
  if (m.type === 'room_created') { code = m.code; $('roomCodeLabel').textContent = code; }
  if (m.type === 'joined') {
    code = m.code;
    $('lobby').classList.add('hidden');
    if (m.spectator) { $('room').classList.add('hidden'); enterGame(); }
    else $('room').classList.remove('hidden');
    $('roomCodeLabel').textContent = code;
  }
  if (m.type === 'state') { my = m.you; state = m.state; render(m.players, m.config, m.spectators); }
  if (m.type === 'chat') addChat(m.from, m.text);
  if (m.type === 'victory') showVictory(m.winner);
}

if (USE_WS) {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onopen = () => console.log('conectado (websocket)');
  ws.onmessage = (e) => handleNet(JSON.parse(e.data));
  ws.onclose = () => { toast('Conexão perdida — reconectando...'); setTimeout(() => location.reload(), 1500); };
} else {
  console.log('transporte: long-polling');
}

async function lpAction(type, extra = {}, _retry = 0) {
  const r = await fetch('/api/action', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, code, token: lpToken, ...extra }),
  });
  const data = await r.json().catch(() => ({ error: 'resposta inválida' }));
  if (data.error) {
    // erros transitórios (consistência do store serverless): repetir criar/entrar
    if ((type === 'create_room' || type === 'join_room') && _retry < 3) {
      await new Promise(res => setTimeout(res, 1200));
      return lpAction(type, extra, _retry + 1);
    }
    toast('⚠ ' + data.error); return data;
  }
  for (const ev of (data.events || [])) handleNet(ev);
  if (data.token && !lpToken) { lpToken = data.token; startLpLoop(); }
  return data;
}

async function lpLoop() {
  while (lpActive && lpToken) {
    try {
      const r = await fetch(`/api/poll?code=${code}&token=${lpToken}&seq=${lpSeq}&wait=20000`);
      if (r.status === 404) { toast('Sala encerrada.'); return; }
      const data = await r.json();
      if (data.seq) lpSeq = data.seq;
      for (const ev of (data.events || [])) handleNet(ev);
      lpFailures = 0;
    } catch {
      if (++lpFailures > 3) { toast('Conexão perdida — reconectando...'); return setTimeout(() => location.reload(), 1500); }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}
function startLpLoop() { if (!lpActive) { lpActive = true; lpLoop(); } }

const send = (type, extra = {}) => {
  if (USE_WS && ws && ws.readyState === 1) ws.send(JSON.stringify({ type, ...extra }));
  else lpAction(type, extra);
};

// ---------- lobby ----------
$('btnCreate3').onclick = () => createRoom(3);
$('btnCreate4').onclick = () => createRoom(4);
$('btnJoin').onclick = () => {
  const name = $('playerName').value.trim() || 'Anônimo';
  const c = $('roomCode').value.trim().toUpperCase();
  if (!c) return toast('Informe o código da sala');
  send('join_room', { name, code: c });
};
function createRoom(n) {
  const name = $('playerName').value.trim() || 'Anônimo';
  const timer = $('optTimer').checked ? 120 : 0;
  send('create_room', { name, players: n, timer });
}
$('btnReady').onclick = () => { sfx.click(); const btn = $('btnReady'); btn.p = !btn.p; send('ready', { ready: btn.p }); btn.textContent = btn.p ? 'Pronto ✓' : 'Estou pronto'; };
$('btnStart').onclick = () => { sfx.card(); send('start_game'); };

// ---------- chat ----------
$('chatInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && $('chatInput').value.trim()) {
    send('chat', { text: $('chatInput').value.trim() }); $('chatInput').value = '';
  }
});
function addChat(from, text) {
  const div = document.createElement('div');
  div.innerHTML = `<span class="from">${from}:</span> ${escapeHtml(text)}`;
  $('chatLog').appendChild(div); $('chatLog').scrollTop = 1e9;
  sfx.click();
}
const escapeHtml = (s) => s.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

// ---------- render ----------
function render(players, config, spectators) {
  if (!state) return;
  if (state.phase) enterGame();
  $('roomCodeLabel').textContent = code || '';

  // lista da sala
  $('playerList').innerHTML = players.map(p => `<li>${p.name} — ${p.family || 'aguardando…'} ${p.ready ? '✓' : ''}</li>`).join('');
  $('btnStart').classList.toggle('hidden', !(players.length && players.every(p => p.ready) && players.length >= 3));

  if (state.phase) renderGame();
}

function enterGame() {
  $('room').classList.add('hidden'); $('hud').classList.remove('hidden');
  if (!board) {
    board = new Board3D($('scene'));
    // clique no tabuleiro → seleção de distritos (raycast embutido no Board3D)
    addEventListener('pointerdown', (ev) => {
      const id = board.pick(ev.clientX, ev.clientY);
      if (id !== null && selMode && isMyTurn()) { sfx.click(); onDistrictPick(id); }
    });
    if (!tutorialShown && !localStorage.getItem('cn_tutorial')) {
      $('tutorial').classList.remove('hidden');
      localStorage.setItem('cn_tutorial', '1');
    }
    startAmbient();
  }
}

function renderGame() {
  const s = state;
  // topo: famílias
  $('famTabs').innerHTML = Object.entries(s.players).map(([f, p]) =>
    `<span class="${f === my ? 'active' : ''} ${s.order[s.turnIdx % s.order.length] === f && s.phase === 'acoes' ? 'current' : ''}"
      style="border-color:#${(FAMC[f] || 0x888888).toString(16).padStart(6, '0')}">${f} 👑${p.influence} 🎖${p.respect} 💰${p.money}$</span>`).join('');
  $('roundInfo').textContent = `Rodada ${s.round} • ${phaseName(s.phase)} • Vez de ${s.order[s.turnIdx % s.order.length] || '—'}`;

  // meu painel
  const p = s.players[my];
  if (p) {
    $('myFam').textContent = `Família ${my}`;
    $('rMoney').textContent = p.money; $('rLemons').textContent = p.lemons;
    $('rRespect').textContent = p.respect; $('rInfluence').textContent = p.influence;
    $('rReserve').textContent = p.reserve;
  }
  renderActions();
  renderEvent();
  renderDispute();
  renderNegotiation();
  renderOath();
  // log
  $('logList').innerHTML = s.log.slice(-30).reverse().map(l => `<div>• ${escapeHtml(l.msg)}</div>`).join('');
  // 3D
  board && board.updateTroops(s.districts, FAMC);
  if (s.dispute) { board && board.focus(s.dispute.to); sfx.battle(); }
}

const FAMC = { Romano: 0x8a1c1c, Vitale: 0x1f3d6b, Bellini: 0x1d5c3f, Conti: 0x5a3a17 };
function phaseName(ph) {
  return { evento: 'Evento', renda: 'Renda', acoes: 'Ações', fim: 'Fim' }[ph] || ph;
}

// ---------- ações ----------
function isMyTurn() {
  return state && state.phase === 'acoes' && !state.dispute && !state.pendingOffer &&
    state.order[state.turnIdx % state.order.length] === my;
}

function renderActions() {
  const box = $('actionButtons'); box.innerHTML = '';
  const p = state.players[my];
  $('actionHint').textContent = '';
  if (state.dispute) {
    if (my === state.dispute.attacker || my === state.dispute.defender) {
      $('actionHint').textContent = 'Disputa em andamento — escolha sua aposta.';
      $('disputeModal').classList.remove('hidden');
      $('disputeInfo').textContent = `${state.dispute.attacker} avança sobre ${DIST_NAME(state.dispute.to)} com ${state.dispute.troops} capanga(s).`;
    }
    return;
  }
  if (!isMyTurn()) { $('actionHint').textContent = 'Aguarde sua vez… (negociação livre no turno do jogador ativo)'; return; }
  if (state.pendingIncome && my in state.pendingIncome) {
    $('actionHint').textContent = 'Escolha a taxa das suas cobranças:';
    for (const r of ['baixa', 'normal', 'alta']) {
      const b = btn(`Taxa ${r}`, () => { send('set_tax', { rate: r }); sfx.coin(); });
      box.appendChild(b);
    }
    return;
  }
  const B = (label, fn) => { const b = btn(label, fn); box.appendChild(b); return b; };
  B('🎭 Influenciar (6$ ou 3 Respeito)', () => influenciar(p));
  B('🍋 Exportar (2 limões)', () => exportar(p));
  B('💰 Estabelecer Cobrança (2$)', () => { selMode = 'cobranca'; hint('Clique num distrito seu aberto com ≥2 capangas.'); });
  B('🚶 Avançar (1$)', () => { selMode = 'avancar'; selFrom = null; hint('Clique no distrito de ORIGEM.'); });
  B('🖐 Recrutar (2$)', () => { selMode = 'recrutar'; hint('Clique num distrito seu.'); });
  B('💼 Fazer Caixa (grátis, +3$)', () => { send('action', { action: { type: 'fazer_caixa' } }); sfx.coin(); });
  B('🤝 Propor negociação', () => $('negotiateForm').classList.remove('hidden'));
  B('🪙 Juramento', () => renderOathForm(p));
}
function btn(label, fn) { const b = document.createElement('button'); b.textContent = label; b.onclick = () => { sfx.click(); fn(); }; return b; }
function hint(t) { $('actionHint').textContent = t; }
const DIST_NAME = (id) => state.districts[id] ? ({ 1:'Trapani',2:'Marsala',3:'Palermo',4:'Caltanissetta',5:'Messina',6:'Enna',7:'Catania',8:'Agrigento',9:'Gela',10:'Siracusa',11:'Ragusa',12:'Modica' })[id] : id;

function influenciar(p) {
  const box = $('actionButtons'); box.innerHTML = '';
  if (p.money >= 6) box.appendChild(btn('Com 6$', () => send('action', { action: { type: 'influenciar', com: 'dinheiro' } })));
  if (p.respect >= 3) box.appendChild(btn('Com 3 Respeito', () => send('action', { action: { type: 'influenciar', com: 'respeito' } })));
  box.appendChild(btn('← Voltar', renderActions));
}

function exportar(p) {
  const box = $('actionButtons'); box.innerHTML = '';
  box.appendChild(btn('Mercado geral (4$)', () => send('action', { action: { type: 'exportar', modo: 'mercado' } })));
  const pomar = p.districts.find(d => DIST_TYPES[d] === 'Pomar' && state.districts[d].open);
  const porto = p.districts.find(d => DIST_TYPES[d] === 'Porto' && state.districts[d].open);
  if (pomar && porto) box.appendChild(btn(`Cadeia própria (6$ +1 Respeito)`, () => send('action', { action: { type: 'exportar', modo: 'cadeia' } })));
  // porto negociado
  const acessos = p.accesses || [];
  for (const pid of acessos) {
    box.appendChild(btn(`Porto negociado: ${DIST_NAME(pid)} (tarifa 0)`, () =>
      send('action', { action: { type: 'exportar', modo: 'negociado', porto: pid, tarifa: 0 } })));
  }
  box.appendChild(btn('← Voltar', renderActions));
}

function onDistrictPick(id) {
  const d = state.districts[id], p = state.players[my];
  if (!d) return;
  if (selMode === 'cobranca') {
    if (d.owner === my && d.open && (d.troops[my] || 0) >= 2) {
      send('action', { action: { type: 'cobranca', district: id } }); selMode = null; board.pulse(id);
    } else hint('Inválido: precisa ser seu, aberto, com ≥2 capangas.');
  } else if (selMode === 'recrutar') {
    if (d.owner === my) {
      const n = Math.min(2, 6 - (d.troops[my] || 0), p.reserve);
      if (n < 1) return hint('Sem espaço/reserva.');
      send('action', { action: { type: 'recrutar', district: id, n } }); selMode = null; board.pulse(id);
    } else hint('Escolha um distrito seu.');
  } else if (selMode === 'avancar') {
    if (!selFrom) {
      if (d.owner === my && (d.troops[my] || 0) >= 2) { selFrom = id; hint(`Origem: ${DIST_NAME(id)}. Clique no DESTINO adjacente.`); board.pulse(id); }
      else hint('Origem inválida (precisa de ≥2 capangas para deixar ≥1).');
    } else {
      const adj = EDGES.some(([a, b]) => (a === selFrom && b === id) || (b === selFrom && a === id));
      if (!adj) return hint('Destino não é adjacente.');
      if (d.owner === my) return hint('Destino próprio: use apenas movimento — escolha distrito rival.');
      const n = (state.districts[selFrom].troops[my] || 0) - 1;
      chooseTroops(n, (k) => { send('action', { action: { type: 'avancar', from: selFrom, to: id, troops: k } }); selMode = null; selFrom = null; });
    }
  }
}
function chooseTroops(max, cb) {
  const box = $('actionButtons'); box.innerHTML = '';
  hint(`Quantos capangas enviar? (1–${Math.min(max, 6)})`);
  for (let i = 1; i <= Math.min(max, 6); i++) box.appendChild(btn(`Enviar ${i}`, () => cb(i)));
  box.appendChild(btn('← Cancelar', renderActions));
}

// ---------- eventos ----------
function renderEvent() {
  const ev = state.event;
  if (!ev || ev.id === lastEventId) return;
  lastEventId = ev.id;
  const NOMES = { bom_negocio:['Bom Negócio','Todas as famílias recebem +3$.','imediato'], traicao:['Traição na Família','Cada família retorna 1 capanga à reserva.','imediato'], paz:['Paz entre Famílias','Nenhuma disputa nesta rodada.','rodada'], greve_portos:['Greve nos Portos','Portos não produzem nesta renda.','renda'], instabilidade:['Instabilidade Local','Cobranças rendem 1$ a menos nesta renda.','renda'], fiscalizacao:['Fiscalização','Famílias com cobrança pagam 2$ (ou perdem 1 Respeito).','imediato'], reconciliacao:['Reconciliação Interna','1 capanga da reserva volta a um distrito próprio.','imediato'], desercao:['Deserção','1 capanga do distrito mais populoso volta à reserva.','imediato'], roubo:['Roubo nos Negócios','Cada família perde 2$.','imediato'], safra_ruim:['Safra Ruim','Pomares não produzem nesta renda.','renda'], safra_abundante:['Safra Abundante','Pomares produzem +1 limão nesta renda.','renda'], encomenda:['Encomenda Internacional','Exportações rendem +2$ nesta rodada.','rodada'], comercio_aquecido:['Comércio Aquecido','Mercados produzem +1$ nesta renda.','renda'], tregua_imposta:['Trégua Imposta','Nenhuma disputa nesta rodada.','rodada'], credito:['Crédito Emergencial','Todas as famílias recebem +2$.','imediato'], dia_pagamento:['Dia de Pagamento','Cobranças rendem +1$ nesta renda.','renda'], confianca:['Confiança nos Bairros','−1 Tensão em todos os distritos.','imediato'], resistencia:['Resistência Civil','Cobranças geram +1 Tensão nesta renda.','renda'] };
  const [nome, desc, timing] = NOMES[ev.id] || [ev.id, '', ev.timing];
  $('eventName').textContent = nome; $('eventDesc').textContent = desc;
  $('eventTiming').textContent = '⏱ Efeito: ' + timing;
  $('eventCardOverlay').classList.remove('hidden'); sfx.card();
  board && board.focus(state.order.length ? firstOwnDistrict() : null);
  setTimeout(() => $('eventCardOverlay').classList.add('hidden'), 3800);
  $('eventPanel').classList.remove('hidden');
  $('eventBody').innerHTML = `<b>${nome}</b><br><span style="font-size:.8rem">${desc}</span>`;
}
function firstOwnDistrict() { return state.players[my] ? state.players[my].districts[0] : null; }

// ---------- disputa ----------
function renderDispute() {
  const d = state.dispute;
  if (!d) { $('disputeModal').classList.add('hidden'); return; }
  if (my === d.attacker || my === d.defender) {
    $('disputeModal').classList.remove('hidden');
    $('disputeInfo').textContent = `${d.attacker} avança com ${d.troops} sobre ${DIST_NAME(d.to)} (defensor: ${d.defender}).`;
  }
}
document.querySelectorAll('#disputeModal [data-bet]').forEach(b =>
  b.onclick = () => { send('dispute_bet', { bet: parseInt(b.dataset.bet) }); $('disputeModal').classList.add('hidden'); });

// ---------- negociação ----------
function renderNegotiation() {
  const o = state.pendingOffer;
  if (!o) { $('negotiationModal').classList.add('hidden'); return; }
  if (o.to === my) {
    $('negotiationModal').classList.remove('hidden');
    $('negotiationInfo').innerHTML = `<b>${o.from}</b> propõe: entrega ${fmtGive(o.give)} — pede ${fmtGive(o.want)}.`;
    $('negAccept').onclick = () => { send('negotiate_respond', { accept: true }); $('negotiationModal').classList.add('hidden'); };
    $('negReject').onclick = () => { send('negotiate_respond', { accept: false }); $('negotiationModal').classList.add('hidden'); };
  }
}
const fmtGive = (g) => g ? `${g.money || 0}$, ${g.lemons || 0} limões${g.portos && g.portos.length ? ', acesso a ' + g.portos.map(DIST_NAME).join(', ') : ''}` : 'nada';

$('negSend').onclick = () => {
  const to = $('negTo').value;
  const give = { money: +$('negGiveMoney').value || 0, lemons: +$('negGiveLemons').value || 0 };
  const want = { money: +$('negWantMoney').value || 0, lemons: +$('negWantLemons').value || 0 };
  if ($('negGivePorto').value) give.portos = [parseInt($('negGivePorto').value)];
  send('negotiate_offer', { to, give, want });
  $('negotiateForm').classList.add('hidden');
};
$('negCancel').onclick = () => $('negotiateForm').classList.add('hidden');

// ---------- juramento ----------
function renderOathForm(p) {
  $('oathModal').classList.remove('hidden');
  const box = $('oathActions'); box.innerHTML = '';
  if (!p.oath.issuedTo) {
    hint('Escolha quem receberá sua Moeda de Juramento (uma única vez).');
    for (const f of Object.keys(state.players)) if (f !== my) box.appendChild(btn(`Emitir para ${f}`, () => { send('oath_issue', { target: f }); $('oathModal').classList.add('hidden'); }));
  } else {
    $('oathBody').innerHTML = `Sua moeda está com <b>${p.oath.issuedTo}</b>.`;
    if (p.oath.issuedTo !== my && !p.oath.demandedThisRound && state.round > (p.oath.roundIssued || 0)) {
      box.appendChild(btn('Cobrar Pagamento (até 2$)', () => { send('oath_demand', { demand: { target: p.oath.issuedTo, type: 'pagamento', amount: 2 } }); $('oathModal').classList.add('hidden'); }));
      box.appendChild(btn('Exigir Trégua (até o fim da rodada)', () => { send('oath_demand', { demand: { target: p.oath.issuedTo, type: 'tregua' } }); $('oathModal').classList.add('hidden'); }));
    }
  }
  box.appendChild(btn('Fechar', () => $('oathModal').classList.add('hidden')));
}
function renderOath() { /* atualização passiva: modal gerenciado em renderOathForm */ }

// ---------- vitória / toast ----------
function showVictory(winner) {
  $('victoryTitle').textContent = `${winner} vence!`;
  $('victoryOverlay').classList.remove('hidden');
  sfx.victory();
  // confete dourado
  for (let i = 0; i < 60; i++) {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;top:-10px;left:${Math.random() * 100}vw;width:8px;height:14px;background:#${(0xc9a35a + Math.floor(Math.random() * 0x303030)).toString(16)};z-index:99;animation:fall ${2 + Math.random() * 2}s linear forwards;`;
    document.body.appendChild(d); setTimeout(() => d.remove(), 4500);
  }
}
let toastTimer;
function toast(t) {
  const el = $('toast'); el.textContent = t; el.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
}

// preenche selects de negociação
setInterval(() => {
  if (!state) return;
  const sel = $('negTo'); const opts = Object.keys(state.players).filter(f => f !== my);
  if (sel && opts.join() !== [...sel.options].map(o => o.value).join()) sel.innerHTML = opts.map(f => `<option>${f}</option>`).join('');
  const portos = Object.entries(state.districts).filter(([, d]) => d.owner === my && DIST_TYPES[d.id] === 'Porto').map(([id]) => id);
  const sel2 = $('negGivePorto');
  if (sel2 && portos.join() !== [...sel2.options].map(o => o.value).join()) sel2.innerHTML = '<option value="">—</option>' + portos.map(id => `<option value="${id}">${DIST_NAME(+id)}</option>`).join('');
}, 800);

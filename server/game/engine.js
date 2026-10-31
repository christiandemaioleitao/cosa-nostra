/**
 * Engine autoritativo do jogo "Cosa Nostra – O Ouro Amarelo da Sicília".
 * Todas as regras são validadas aqui; o cliente apenas renderiza e envia intenções.
 *
 * Fases da rodada: evento -> renda -> acoes (circuito 1) -> acoes (circuito 2) -> encerramento
 */
const { FAMILIES, DISTRICTS, EDGES, EVENTS, TAXES } = require('./data');

const WIN_INFLUENCE = 10;
const MAX_LEMONS = 6, MAX_RESPECT = 6, MAX_DISTRICT_TROOPS = 6, MAX_TROOPS = 12;
const INITIAL_TROOPS = 8;

// ---------- utilidades ----------
const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const idx = (id) => DISTRICTS.find(d => d.id === id);
const isAdjacent = (a, b) => EDGES.some(([x, y]) => (x === a && y === b) || (x === a && y === b) || (x === b && y === a));
const otherFamilies = (fam, all) => all.filter(f => f !== fam);

class Game {
  constructor(families, opts = {}) {
    this.families = families;                 // ex.: ['Romano','Vitale','Bellini']
    this.rng = opts.rng || Math.random;
    if (opts.rawState) { this.state = opts.rawState; return; } // hidratação (serverless)
    this.state = this.#initState();
    this.state.round = 0;
    this.startRound(); // revela o 1º evento e resolve a 1ª renda
    this.log('Partida iniciada. Famílias: ' + families.join(', '));
  }

  log(msg) { this.state.log.push({ t: Date.now(), msg }); if (this.state.log.length > 400) this.state.log.shift(); }

  #initState() {
    const fams = this.families;
    // Embaralha e distribui as 12 cartas de distrito igualmente (4 p/ 3 jogadores, 3 p/ 4)
    const deck = shuffle(DISTRICTS.map(d => d.id));
    const per = fams.length === 3 ? 4 : 3;
    const districts = {};
    DISTRICTS.forEach(d => districts[d.id] = { id: d.id, owner: null, troops: {}, tension: 0, charge: null, open: true, justReopened: false });
    const players = {};
    fams.forEach((f, i) => {
      const mine = deck.slice(i * per, (i + 1) * per);
      mine.forEach(id => { districts[id].owner = f; districts[id].troops[f] = 0; });
      players[f] = {
        money: 6, lemons: 1, respect: 2, influence: 0,
        reserve: MAX_TROOPS - INITIAL_TROOPS,   // 4 na reserva
        districts: mine, exported: false,
        oath: { issuedTo: null, roundIssued: 0, demandedThisRound: false },
        truce: false, taxPref: 'normal', accesses: [],   // acessos a portos negociados nesta rodada
      };
      // Distribuição secreta dos 8 capangas iniciais (1–6 por distrito, soma 8)
      const dist = this.#randomTroopDistribution(mine, INITIAL_TROOPS);
      dist.forEach((n, k) => { districts[mine[k]].troops[f] = n; });
    });
    return {
      players, districts,
      eventDeck: shuffle(EVENTS.map(e => e.id)), event: null,
      round: 1, firstIdx: 0, order: fams, circuit: 1, turnIdx: 0,
      phase: 'evento',            // evento | renda | acoes | fim
      pendingIncome: {},          // fam -> taxa escolhida (renda)
      dispute: null,
      pendingOffer: null,         // oferta de negociação aberta
      winner: null,
      log: [], history: [],
    };
  }

  #randomTroopDistribution(districtIds, total) {
    // mínimo 1, máximo 6 por distrito, soma = total (8)
    const n = districtIds.length;
    for (let tries = 0; tries < 500; tries++) {
      const d = Array(n).fill(1); let rest = total - n;
      while (rest > 0) { const k = Math.floor(this.rng() * n); if (d[k] < 6) { d[k]++; rest--; } }
      if (d.every(v => v >= 1 && v <= 6)) return d;
    }
    return Array(n).fill(Math.floor(total / n));
  }

  // ---------- helpers de estado ----------
  get st() { return this.state; }
  famList() { return this.families; }
  current() { return this.state.order[this.state.turnIdx % this.state.order.length]; }
  totalTroops(f) { let n = this.state.players[f].reserve; for (const d of Object.values(this.state.districts)) n += d.troops[f] || 0; return n; }
  ownDistricts(f) { return this.state.players[f].districts; }
  snapshot() {
    // história/log ficam FORA do snapshot: cada snapshot contém o estado, não a si mesmo
    const { log, history, eventDeck, ...rest } = this.state;
    return JSON.parse(JSON.stringify(rest));
  }

  #pushHistory() {
    this.state.history.push({ round: this.state.round, phase: this.state.phase, snap: this.snapshot() });
    if (this.state.history.length > 500) this.state.history.shift();
  }

  #checkWin(f) {
    if (this.state.players[f].influence >= WIN_INFLUENCE) { this.state.winner = f; this.state.phase = 'fim'; this.log(`🏆 ${f} alcançou ${WIN_INFLUENCE} de Influência e venceu!`); return true; }
    return false;
  }

  // ---------- ciclo da rodada ----------
  startRound() {
    const s = this.state;
    s.round++;
    // revelar evento (re-embaralha quando o baralho esgota)
    if (s.eventDeck.length === 0) s.eventDeck = shuffle(EVENTS.map(e => e.id));
    const id = s.eventDeck.shift();
    s.event = { id, timing: EVENTS.find(e => e.id === id).timing };
    const ev = EVENTS.find(e => e.id === id);
    this.log(`📜 Evento revelado: ${ev.nome} — ${ev.desc}`);
    this.#applyImmediateEvent(id);
    // renda
    s.phase = 'renda';
    s.pendingIncome = {};
    for (const f of this.families) {
      const hasCharge = Object.values(s.districts).some(d => d.charge && d.charge.owner === f && d.open);
      if (hasCharge) s.pendingIncome[f] = this.state.players[f].taxPref; // pré-preferência; jogador pode alterar
    }
    // se ninguém tem cobrança, resolve imediatamente
    if (Object.keys(s.pendingIncome).length === 0 || Object.values(s.pendingIncome).every(v => v)) this.#applyIncome();
  }

  #applyImmediateEvent(id) {
    const s = this.state;
    const each = (fn) => this.families.forEach(fn);
    switch (id) {
      case 'bom_negocio': each(f => s.players[f].money += 3); break;
      case 'traicao':
        each(f => { for (const dId of s.players[f].districts) { const d = s.districts[dId]; if ((d.troops[f] || 0) > 0) { d.troops[f]--; s.players[f].reserve = Math.min(MAX_TROOPS, s.players[f].reserve + 1); break; } } });
        break;
      case 'fiscalizacao':
        each(f => {
          const has = Object.values(s.districts).some(d => d.charge && d.charge.owner === f);
          if (has) { if (s.players[f].money >= 2) s.players[f].money -= 2; else s.players[f].respect = Math.max(0, s.players[f].respect - 1); }
        });
        break;
      case 'reconciliacao':
        each(f => { const p = s.players[f]; if (p.reserve > 0) { const dId = p.districts.find(d => (s.districts[d].troops[f] || 0) < MAX_DISTRICT_TROOPS); if (dId) { p.reserve--; s.districts[dId].troops[f] = (s.districts[dId].troops[f] || 0) + 1; } } });
        break;
      case 'desercao':
        each(f => { let best = null, bestN = -1; for (const dId of s.players[f].districts) { const n = s.districts[dId].troops[f] || 0; if (n > bestN) { bestN = n; best = dId; } } if (best && bestN > 0) { s.districts[best].troops[f]--; s.players[f].reserve = Math.min(MAX_TROOPS, s.players[f].reserve + 1); } });
        break;
      case 'roubo': each(f => s.players[f].money = Math.max(0, s.players[f].money - 2)); break;
      case 'credito': each(f => s.players[f].money += 2); break;
      case 'confianca':
        each(f => { for (const dId of s.players[f].districts) s.districts[dId].tension = Math.max(0, s.districts[dId].tension - 1); });
        break;
      // paz, greve_portos, instabilidade, safra_*, encomenda, comercio_aquecido, tregua_imposta,
      // dia_pagamento, resistencia: efeitos de renda/rodada, aplicados nos pontos correspondentes
    }
  }

  /** Aplica a taxa escolhida para a renda (jogador com cobrança confirma; padrão = preferência). */
  setTax(f, rate) {
    const s = this.state;
    if (s.phase !== 'renda' || !(f in s.pendingIncome)) return { ok: false, error: 'Fora da fase de renda' };
    if (!TAXES[rate]) return { ok: false, error: 'Taxa inválida' };
    s.pendingIncome[f] = rate;
    s.players[f].taxPref = rate;
    this.log(`💵 ${f} escolheu taxa ${rate} para suas cobranças.`);
    if (Object.values(s.pendingIncome).every(v => v)) this.#applyIncome();
    return { ok: true };
  }

  #applyIncome() {
    const s = this.state;
    const evId = s.event && s.event.id;
    // 1) reabrir distritos fechados (não produzem nesta renda)
    for (const d of Object.values(s.districts)) { if (!d.open) { d.open = true; d.tension = 0; d.justReopened = true; } }
    // 2) produção
    for (const f of this.families) {
      const p = s.players[f];
      p.money += 2; // renda fixa
      for (const dId of p.districts) {
        const d = s.districts[dId];
        if (!d.open || d.justReopened) continue;
        const tipo = idx(dId).tipo;
        if (tipo === 'Porto') { if (evId !== 'greve_portos') p.money += 1; }
        else if (tipo === 'Mercado') { p.money += (evId === 'comercio_aquecido' ? 2 : 1); }
        else if (tipo === 'Pomar') { let L = (evId === 'safra_abundante' ? 2 : (evId === 'safra_ruim' ? 0 : 1)); p.lemons = Math.min(MAX_LEMONS, p.lemons + L); }
      }
    }
    // 3) cobranças: taxa escolhida + Tensão
    for (const d of Object.values(s.districts)) {
      if (!d.charge || !d.open) continue;
      const owner = d.charge.owner; const p = s.players[owner];
      let rate = s.pendingIncome[owner] || p.taxPref;
      let val = TAXES[rate].valor, ten = TAXES[rate].tensao;
      if (evId === 'instabilidade') val = Math.max(0, val - 1);
      if (evId === 'dia_pagamento') val += 1;
      let extraT = evId === 'resistencia' ? 1 : 0;
      p.money += val;
      d.tension = clamp(d.tension + ten + extraT, 0, 3);
      if (d.tension >= 3) { // fecha o distrito
        d.charge = null; d.open = false; d.justReopened = false;
        this.log(`🔒 ${idx(d.id).nome} fechou (Tensão 3). Cobrança retirada.`);
      }
    }
    // 3b) distrito aberto sem cobrança: -1 Tensão
    for (const d of Object.values(s.districts)) {
      if (d.open && !d.charge && !d.justReopened) d.tension = Math.max(0, d.tension - 1);
    }
    // 4) custo de estrutura: 1$ por 3 capangas completos + 1$ por distrito além do 4º
    for (const f of this.families) {
      const p = s.players[f];
      const custo = Math.floor(this.totalTroops(f) / 3) + Math.max(0, p.districts.length - 4);
      p.money = Math.max(0, p.money - custo);
    }
    for (const d of Object.values(s.districts)) d.justReopened = false;
    this.log(`💰 Renda da rodada ${s.round} aplicada.`);
    // inicia circuitos de ações
    s.phase = 'acoes'; s.circuit = 1; s.turnIdx = 0;
    this.#pushHistory();
  }

  endTurnActions() {
    // avança para o próximo jogador do circuito ou encerra a rodada
    const s = this.state;
    s.turnIdx++;
    if (s.turnIdx >= s.order.length) {
      if (s.circuit === 1) { s.circuit = 2; s.turnIdx = 0; this.log('↻ Segundo circuito de ações.'); }
      else { this.#endRound(); return; }
    }
  }

  #endRound() {
    const s = this.state;
    if (s.winner) return;
    // expira efeitos do evento e tréguas, descarta evento, limpa "Exportou", passa 1º jogador
    s.event = null;
    for (const f of this.families) { s.players[f].exported = false; s.players[f].truce = false; s.players[f].accesses = []; s.players[f].oath.demandedThisRound = false; }
    s.firstIdx = (s.firstIdx + 1) % s.order.length;
    s.order = [...s.order.slice(s.firstIdx), ...s.order.slice(0, s.firstIdx)];
    s.turnIdx = 0; s.circuit = 1;
    this.log(`— Fim da rodada ${s.round}. ${s.order[0]} é o primeiro jogador. —`);
    this.startRound();
  }

  // ---------- negociação (só no turno do jogador ativo, antes/depois da ação) ----------
  #negotiationOpen() { return this.state.phase === 'acoes'; }

  offer(from, offer) {
    const s = this.state;
    if (!this.#negotiationOpen()) return { ok: false, error: 'Negociação só no turno do jogador ativo' };
    if (this.current() !== from) return { ok: false, error: 'Só o jogador ativo propõe' };
    if (!this.families.includes(offer.to) || offer.to === from) return { ok: false, error: 'Destinatário inválido' };
    const p = s.players[from];
    if ((offer.give?.money || 0) > p.money || (offer.give?.lemons || 0) > p.lemons) return { ok: false, error: 'Recursos insuficientes na oferta' };
    for (const porto of (offer.give?.portos || [])) {
      const d = s.districts[porto]; if (!d || d.owner !== from || idx(porto).tipo !== 'Porto') return { ok: false, error: 'Porto inválido' };
    }
    s.pendingOffer = { from, ...offer };
    this.log(`🤝 ${from} propôs negociação a ${offer.to}.`);
    return { ok: true };
  }

  respond(to, accept) {
    const s = this.state;
    const o = s.pendingOffer;
    if (!o || o.to !== to) return { ok: false, error: 'Nenhuma oferta para você' };
    s.pendingOffer = null;
    if (!accept) { this.log(`${to} recusou a oferta de ${o.from}.`); return { ok: true }; }
    const give = o.give || {}, want = o.want || {};
    const a = s.players[o.from], b = s.players[to];
    a.money -= give.money || 0; b.money += give.money || 0;
    a.lemons -= give.lemons || 0; b.lemons = Math.min(MAX_LEMONS, b.lemons + (give.lemons || 0));
    b.money -= want.money || 0; a.money += want.money || 0;
    b.lemons -= want.lemons || 0; a.lemons = Math.min(MAX_LEMONS, a.lemons + (want.lemons || 0));
    for (const porto of (give.portos || [])) if (!b.accesses.includes(porto)) b.accesses.push(porto);
    for (const porto of (want.portos || [])) if (!a.accesses.includes(porto)) a.accesses.push(porto);
    this.log(`✅ Negócio fechado entre ${o.from} e ${to}.`);
    return { ok: true };
  }

  // ---------- juramento ----------
  oathIssue(f, target) {
    const s = this.state, p = s.players[f];
    if (s.phase !== 'acoes') return { ok: false, error: 'Juramento só durante as ações' };
    if (p.oath.issuedTo) return { ok: false, error: 'Moeda de Juramento já emitida' };
    if (!this.families.includes(target) || target === f) return { ok: false, error: 'Alvo inválido' };
    p.oath.issuedTo = target; p.oath.roundIssued = s.round; p.oath.demandedThisRound = false;
    this.log(`🪙 ${f} emitiu sua Moeda de Juramento para ${target}.`);
    return { ok: true };
  }

  oathDemand(f, demand) {
    const s = this.state, p = s.players[f];
    if (p.oath.issuedTo !== demand.target) return { ok: false, error: 'Juramento não emitido para este alvo' };
    if (s.round <= p.oath.roundIssued) return { ok: false, error: 'Só a partir da rodada seguinte' };
    if (p.oath.demandedThisRound) return { ok: false, error: 'Máx. 1 cobrança de juramento por rodada' };
    const t = s.players[demand.target];
    if (demand.type === 'pagamento') {
      const amt = clamp(demand.amount || 2, 1, 2);
      const paid = Math.min(amt, t.money); t.money -= paid; p.money += paid;
      this.log(`🪙 ${f} cobrou o juramento: ${targetPaid(demand.target)} pagou ${paid}$ (obrigação não recusável).`);
    } else if (demand.type === 'tregua') {
      t.truce = true;
      this.log(`🪙 ${f} exigiu Trégua de ${demand.target} até o fim da rodada.`);
    } else return { ok: false, error: 'Tipo de cobrança inválido' };
    p.oath.demandedThisRound = true;
    return { ok: true };
    function targetPaid(t) { return t; }
  }

  // ---------- as seis ações ----------
  /** Executa a ação do jogador ativo. Retorna {ok, error?, winner?} */
  act(f, action) {
    const s = this.state;
    if (s.winner) return { ok: false, error: 'Partida encerrada' };
    if (s.phase !== 'acoes') return { ok: false, error: 'Fora da fase de ações' };
    if (this.current() !== f) return { ok: false, error: 'Não é seu turno' };
    if (s.pendingOffer) return { ok: false, error: 'Resolva a negociação pendente' };
    if (s.dispute) return { ok: false, error: 'Disputa em andamento' };
    let r;
    switch (action.type) {
      case 'influenciar': r = this.#aInfluenciar(f, action); break;
      case 'exportar':    r = this.#aExportar(f, action); break;
      case 'cobranca':    r = this.#aCobranca(f, action); break;
      case 'avancar':     r = this.#aAvancar(f, action); break;   // pode abrir disputa (não consome turno ainda)
      case 'recrutar':    r = this.#aRecrutar(f, action); break;
      case 'fazer_caixa': r = this.#aFazerCaixa(f); break;
      default: return { ok: false, error: 'Ação desconhecida' };
    }
    if (r && r.ok && !s.dispute) this.#pushHistory();
    return r || { ok: false, error: 'Ação falhou' };
  }

  #aInfluenciar(f, a) {
    const s = this.state, p = s.players[f];
    const custo = a.com === 'respeito' ? { respeito: 3 } : { money: 6 };
    if (a.com !== 'respeito' && a.com !== 'dinheiro') return { ok: false, error: 'Escolha dinheiro ou respeito' };
    if (custo.money && p.money < 6) return { ok: false, error: 'Precisa de 6$' };
    if (custo.respeito && p.respect < 3) return { ok: false, error: 'Precisa de 3 Respeito' };
    if (custo.money) p.money -= 6; else p.respect -= 3;
    p.influence += 1;
    this.log(`🎭 ${f} influenciou (+1 Influência).`);
    this.#pushHistory();
    this.#checkWin(f);
    this.endTurnActions();
    return { ok: true, winner: s.winner };
  }

  #aExportar(f, a) {
    const s = this.state, p = s.players[f];
    if (p.exported) return { ok: false, error: 'Exportação já usada nesta rodada' };
    if (p.lemons < 2) return { ok: false, error: 'Precisa de 2 limões' };
    let ganho = 0, respeito = 0;
    if (a.modo === 'mercado') ganho = 4;
    else if (a.modo === 'cadeia') {
      const pomar = p.districts.find(d => idx(d).tipo === 'Pomar' && s.districts[d].open);
      const porto = p.districts.find(d => idx(d).tipo === 'Porto' && s.districts[d].open);
      if (!pomar || !porto) return { ok: false, error: 'Cadeia própria inválida (pomar e porto próprios e abertos)' };
      ganho = 6; respeito = 1;
    } else if (a.modo === 'negociado') {
      const d = s.districts[a.porto];
      if (!d || d.owner === f || idx(a.porto).tipo !== 'Porto' || !d.open) return { ok: false, error: 'Porto negociado inválido' };
      if (!p.accesses.includes(a.porto)) return { ok: false, error: 'Sem acesso negociado a este porto' };
      const tarifa = clamp(a.tarifa || 0, 0, 2);
      ganho = 4 - tarifa;
      s.players[d.owner].money += tarifa;
      this.log(`🚢 ${f} pagou ${tarifa}$ de tarifa a ${d.owner}.`);
    } else return { ok: false, error: 'Modo de exportação inválido' };
    if (s.event && s.event.id === 'encomenda') ganho += 2;
    p.lemons -= 2; p.money += ganho; p.respect = clamp(p.respect + respeito, 0, MAX_RESPECT);
    p.exported = true;
    this.log(`🍋 ${f} exportou 2 limões (+${ganho}$${respeito ? ', +1 Respeito' : ''}).`);
    this.endTurnActions();
    return { ok: true };
  }

  #aCobranca(f, a) {
    const s = this.state, p = s.players[f];
    const d = s.districts[a.district];
    if (!d || d.owner !== f) return { ok: false, error: 'Distrito não é seu' };
    if (!d.open) return { ok: false, error: 'Distrito fechado' };
    if ((d.troops[f] || 0) < 2) return { ok: false, error: 'Precisa de ≥2 capangas no distrito' };
    if (p.money < 2) return { ok: false, error: 'Precisa de 2$' };
    if (Object.values(s.districts).filter(x => x.charge && x.charge.owner === f).length >= 2) return { ok: false, error: 'Máx. 2 cobranças por família' };
    p.money -= 2; d.charge = { owner: f, rate: p.taxPref };
    this.log(`💰 ${f} estabeleceu cobrança em ${idx(d.id).nome}.`);
    this.endTurnActions();
    return { ok: true };
  }

  #aRecrutar(f, a) {
    const s = this.state, p = s.players[f];
    const d = s.districts[a.district];
    const n = clamp(a.n || 2, 1, 2);
    if (!d || d.owner !== f) return { ok: false, error: 'Distrito não é seu' };
    if (p.money < 2) return { ok: false, error: 'Precisa de 2$' };
    if (p.reserve < n) return { ok: false, error: 'Reserva insuficiente' };
    if ((d.troops[f] || 0) + n > MAX_DISTRICT_TROOPS) return { ok: false, error: 'Máx. 6 capangas por distrito' };
    if (this.totalTroops(f) + n > MAX_TROOPS) return { ok: false, error: 'Máx. 12 capangas no total' };
    p.money -= 2; p.reserve -= n; d.troops[f] = (d.troops[f] || 0) + n;
    this.log(`🖐 ${f} recrutou ${n} capanga(s) em ${idx(d.id).nome}.`);
    this.endTurnActions();
    return { ok: true };
  }

  #aFazerCaixa(f) {
    const s = this.state;
    s.players[f].money += 3;
    this.log(`💼 ${f} fez caixa (+3$).`);
    this.endTurnActions();
    return { ok: true };
  }

  #aAvancar(f, a) {
    const s = this.state, p = s.players[f];
    const from = a.from, to = a.to;
    if (p.money < 1) return { ok: false, error: 'Precisa de 1$' };
    if (!idx(from) || !idx(to) || from === to || !isAdjacent(from, to)) return { ok: false, error: 'Ligação inválida' };
    const df = s.districts[from], dt = s.districts[to];
    const enviados = clamp(a.troops || 0, 0, df.troops[f] || 0);
    if (enviados < 1 || (df.troops[f] || 0) - enviados < 1) return { ok: false, error: 'Deixe ≥1 capanga na origem' };
    // último distrito de uma família não pode ser atacado
    if (dt.owner !== f && this.ownDistricts(dt.owner).length <= 1) return { ok: false, error: 'Último distrito de uma família não pode ser atacado' };
    if (s.players[f].truce) return { ok: false, error: 'Você está em trégua até o fim da rodada' };
    if (s.event && (s.event.id === 'paz' || s.event.id === 'tregua_imposta') && dt.owner !== f) return { ok: false, error: 'Evento impede disputas nesta rodada' };

    if (dt.owner === f) {
      // movimento simples dentro do próprio território
      if ((dt.troops[f] || 0) + enviados > MAX_DISTRICT_TROOPS) return { ok: false, error: 'Destino lotado (máx. 6)' };
      p.money -= 1;
      df.troops[f] -= enviados; dt.troops[f] += enviados;
      this.log(`🚶 ${f} moveu ${enviados} capanga(s) de ${idx(from).nome} para ${idx(to).nome}.`);
      this.endTurnActions();
      return { ok: true };
    }
    // movimento hostil: paga 1$ e abre a disputa (5 passos)
    p.money -= 1;
    s.dispute = { attacker: f, defender: dt.owner, from, to, troops: enviados, bets: {}, stage: 'apostas' };
    this.log(`⚔️ ${f} avança com ${enviados} capanga(s) sobre ${idx(to).nome} (${dt.owner})! Apostas secretas...`);
    return { ok: true, dispute: true };
  }

  /** Passos 2–3: apostas secretas 0/1/2 (só o que consegue pagar). */
  disputeBet(f, bet) {
    const s = this.state, D = s.dispute;
    if (!D || D.stage !== 'apostas') return { ok: false, error: 'Sem disputa em apostas' };
    if (f !== D.attacker && f !== D.defender) return { ok: false, error: 'Você não participa' };
    bet = clamp(bet || 0, 0, 2);
    bet = Math.min(bet, s.players[f].money);
    D.bets[f] = bet;
    this.log(`🎲 ${f} registrou sua aposta.`);
    if (D.bets[D.attacker] !== undefined && D.bets[D.defender] !== undefined) this.#resolveDispute();
    return { ok: true };
  }

  #resolveDispute() {
    const s = this.state, D = s.dispute;
    const at = D.attacker, df = D.defender;
    const apA = D.bets[at] || 0, apD = D.bets[df] || 0;
    s.players[at].money -= apA; s.players[df].money -= apD; // passo 3: pagar ao banco
    const destino = s.districts[D.to];
    const forcaA = D.troops + apA;
    const forcaD = (destino.troops[df] || 0) + 1 + apD;   // +1 defesa local
    const vencedor = forcaA > forcaD ? at : df;            // empate favorece o defensor
    this.log(`⚔️ Forças — ${at}: ${forcaA} vs ${df}: ${forcaD}. ${vencedor === at ? at : df} vence a disputa em ${idx(D.to).nome}.`);
    // atacante sempre perde 1 capanga (volta à reserva)
    s.players[at].reserve = Math.min(MAX_TROOPS, s.players[at].reserve + 1);
    const origem = s.districts[D.from];
    let atacantesSobreviventes = D.troops - 1;
    if (vencedor === at) {
      // defensor perde 1 (reserva), recua o resto para distrito próprio adjacente ou reserva
      s.players[df].reserve = Math.min(MAX_TROOPS, s.players[df].reserve + 1);
      const restantes = (destino.troops[df] || 0) - 1;
      destino.troops[df] = 0;
      let recuo = restantes;
      for (const adjId of EDES_ADJ(D.to)) {
        const adj = s.districts[adjId];
        if (adj.owner === df) {
          const espaco = MAX_DISTRICT_TROOPS - (adj.troops[df] || 0);
          const move = Math.min(espaco, recuo);
          if (move > 0) { adj.troops[df] = (adj.troops[df] || 0) + move; recuo -= move; }
        }
      }
      s.players[df].reserve = Math.min(MAX_TROOPS, s.players[df].reserve + recuo);
      // sobreviventes do atacante ocupam o destino
      destino.troops[at] = atacantesSobreviventes;
      origem.troops[at] -= D.troops;
      // transferência do distrito e remoção da cobrança antiga
      destino.owner = at;
      s.players[df].districts = s.players[df].districts.filter(x => x !== D.to);
      s.players[at].districts.push(D.to);
      destino.charge = null;
      s.players[at].respect = clamp(s.players[at].respect + 1, 0, MAX_RESPECT);
      this.log(`🏴 ${at} conquistou ${idx(D.to).nome} (+1 Respeito).`);
    } else {
      // defensor vence: atacantes sobreviventes recuam para a origem
      destino.troops[at] = 0;
      origem.troops[at] -= D.troops;
      origem.troops[at] += atacantesSobreviventes;
      s.players[df].respect = clamp(s.players[df].respect + 1, 0, MAX_RESPECT);
    }
    s.dispute = null;
    this.#pushHistory();
    this.endTurnActions();
  }
}

// adjacências de um distrito
function EDES_ADJ(id) {
  const out = [];
  for (const [x, y] of EDGES) { if (x === id) out.push(y); else if (y === id) out.push(x); }
  return out;
}

module.exports = { Game, isAdjacent, EDGES_ADJ: EDES_ADJ };

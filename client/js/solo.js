/**
 * Motor SOLO client-side — roda NO NAVEGADOR as partidas contra robôs usando
 * as MESMAS classes do servidor (server/game/engine.js + server/game/bots.js),
 * carregadas via bundle esbuild (client/js/engine.bundle.js → CosaServerGame).
 *
 * Esta classe espelha a orquestração de server/game/rooms.js (salas + botTick),
 * mas sem rede, WebSocket, long-polling ou Vercel Blob: tudo em memória local.
 * O código de multiplayer (rooms.js, api/*, cloudstore.js) permanece intacto
 * para reativação futura — nada aqui chama /api/*.
 */

function CSG() { return globalThis.CosaServerGame; }
const delayMs = () => {
  const v = parseInt(globalThis.CN_BOT_DELAY_MS, 10);
  return Number.isFinite(v) && v >= 0 ? v : CSG().bots.botDelay();
};

/** Estado visível: segredos (apostas da disputa, baralho) removidos — igual ao server. */
export function publicState(game) {
  const s = JSON.parse(JSON.stringify(game.st));
  if (s.dispute) s.dispute = { ...s.dispute, bets: undefined, _betsSet: Object.keys(s.dispute.bets || {}) };
  s.eventDeck = undefined;
  return s;
}

export class LocalSolo {
  constructor({ name, tableSize, bots, difficulty, onEvent }) {
    this.targetPlayers = tableSize;
    this.bots = bots;                    // nº de robôs (mesma semântica de Room.bots)
    this.difficulty = ['facil', 'medio', 'dificil'].includes(difficulty) ? difficulty : 'medio';
    this.onEvent = onEvent || (() => {});
    this.clients = [];
    for (let i = 1; i <= this.bots; i++)
      this.clients.push({ name: `Bot 🤖 ${i}`, family: null, ready: true, connected: true, bot: true });
    this.human = { name, family: null, ready: false, connected: true, bot: false };
    this.clients.push(this.human);       // humano entra automaticamente
    this.game = null;
    this.my = null;                      // família do humano
    this.timer = 0; this.turnDeadline = 0;
    this.botFingerprint = null; this.botNextAt = 0;
    // mesma sequência de eventos do fluxo de rede (joined → ready → start_game)
    this.onEvent({ type: 'joined', code: 'LOCAL', spectator: false });
    this.iv = setInterval(() => this.tick(), 250);
  }

  stop() { if (this.iv) { clearInterval(this.iv); this.iv = null; } }

  playersInfo() { return this.clients.map(c => ({ name: c.name, family: c.family, ready: c.ready, connected: c.connected })); }

  emit(type, data = {}) {
    this.onEvent(type === 'state'
      ? { type, state: data.state, players: data.players, config: data.config, you: this.my }
      : { type, ...data });
  }

  emitState() {
    this.emit('state', {
      state: this.game ? publicState(this.game) : null,
      players: this.playersInfo(),
      config: { timer: this.timer, targetPlayers: this.targetPlayers, bots: this.bots, difficulty: this.difficulty },
    });
  }

  /** Entrada de mensagens — mesma superfície de rooms.handleMessage (local). */
  handleMessage(m = {}) {
    const t = m.type;
    const err = (error) => { this.emit('error', { error }); return { ok: false, error }; };
    if (t === 'ready') { this.human.ready = !!m.ready; this.emitState(); return { ok: true }; }
    if (t === 'start_game') {
      if (this.game) return err('Partida já iniciada');
      const fams = [...CSG().FAMILIES].sort(() => Math.random() - 0.5).slice(0, this.clients.length);
      this.clients.forEach((c, i) => { c.family = fams[i]; c.ready = true; });
      this.my = this.human.family = fams.find((f, i) => !this.clients.some((c, j) => c.bot && c.family === f));
      this.game = new (CSG().Game)(fams);
      this.emit('chat', { from: 'sistema', text: `Partida iniciada! Primeiro jogador: ${fams[0]}` });
      this.emitState();
      return { ok: true };
    }
    const acts = ['set_tax', 'action', 'dispute_bet', 'oath_issue', 'oath_demand', 'negotiate_offer', 'negotiate_respond'];
    if (acts.includes(t)) {
      if (!this.game) return err('Partida não iniciada');
      const f = this.human.family, g = this.game;
      this.botTick(); // lazyTick: bots podem ter decisões pendentes
      let r;
      if (t === 'set_tax') r = g.setTax(f, m.rate);
      else if (t === 'action') r = g.act(f, m.action);
      else if (t === 'dispute_bet') r = g.disputeBet(f, m.bet);
      else if (t === 'oath_issue') r = g.oathIssue(f, m.target);
      else if (t === 'oath_demand') r = g.oathDemand(f, m.demand);
      else if (t === 'negotiate_offer') r = g.offer(f, { to: m.to, give: m.give, want: m.want });
      else r = g.respond(f, m.accept);
      if (!r || !r.ok) return err((r && r.error) || 'ação inválida');
      this.emitState();
      if (g.st.winner) this.emit('victory', { winner: g.st.winner });
      return { ok: true };
    }
    return err('Mensagem desconhecida: ' + t);
  }

  /**
   * IA dos robôs — MESMA lógica de rooms.botTick, usando a IA do bundle.
   * Decisão com fingerprint + delay natural (~1,2s) entre ações.
   */
  botTick() {
    if (!this.game || !this.bots || this.game.st.winner) return;
    const g = this.game, s = g.st;
    const { bots } = CSG();
    const botFam = (f) => this.clients.some(c => c.bot && c.family === f);
    const diff = this.difficulty;
    let fp = null, exec = null;
    if (s.phase === 'renda' && s.pendingIncome) {
      const f = Object.keys(s.pendingIncome).find(x => botFam(x) && !s.pendingIncome[x]);
      if (f) { fp = `taxa:${s.round}:${f}`; exec = () => { g.setTax(f, bots.botTax(diff, f, s)); this.emitState(); }; }
    } else if (s.dispute && s.dispute.stage === 'apostas') {
      const f = [s.dispute.attacker, s.dispute.defender].find(x => botFam(x) && s.dispute.bets[x] === undefined);
      if (f) { fp = `aposta:${s.round}:${s.dispute.to}:${f}`; exec = () => { g.disputeBet(f, bots.botBet(diff, f, s, s.dispute)); this.emitState(); }; }
    } else if (s.pendingOffer && botFam(s.pendingOffer.to)) {
      const o = s.pendingOffer;
      fp = `oferta:${s.round}:${o.from}:${o.to}`;
      exec = () => { g.respond(o.to, bots.botRespond(diff, o)); this.emitState(); };
    } else if (s.phase === 'acoes' && !s.dispute && !s.pendingOffer) {
      const cur = g.current();
      if (botFam(cur)) {
        fp = `acao:${s.round}:${s.circuit}:${s.turnIdx}`;
        exec = () => {
          const cands = bots.botActionCandidates(diff, this, cur);
          let done = false;
          for (const a of cands) { if (g.act(cur, a).ok) { done = true; break; } }
          if (!done) g.act(cur, { type: 'fazer_caixa' });
          this.emitState();
          if (g.st.winner) { this.emit('victory', { winner: g.st.winner }); this.stop(); }
        };
      }
    }
    if (!fp || !exec) { this.botFingerprint = null; return; }
    if (fp !== this.botFingerprint) { this.botFingerprint = fp; this.botNextAt = Date.now() + delayMs(); return; }
    if (Date.now() < this.botNextAt) return;
    this.botFingerprint = null;
    try { exec(); } catch (e) { console.error('[solo] erro na ação do bot:', e); }
  }

  tick() { this.botTick(); }
}

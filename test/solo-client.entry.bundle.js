var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/game/data.js
var require_data = __commonJS({
  "server/game/data.js"(exports2, module2) {
    var FAMILIES2 = ["Romano", "Vitale", "Bellini", "Conti"];
    var FAMILY_COLORS = {
      Romano: 9051164,
      // vinho profundo
      Vitale: 2047339,
      // azul-noite
      Bellini: 1924159,
      // verde-oliva escuro
      Conti: 5913111
      // couro envelhecido
    };
    var DISTRICTS = [
      { id: 1, nome: "Trapani", tipo: "Porto" },
      { id: 2, nome: "Marsala", tipo: "Pomar" },
      { id: 3, nome: "Palermo", tipo: "Porto" },
      { id: 4, nome: "Caltanissetta", tipo: "Pomar" },
      { id: 5, nome: "Messina", tipo: "Porto" },
      { id: 6, nome: "Enna", tipo: "Mercado" },
      { id: 7, nome: "Catania", tipo: "Porto" },
      { id: 8, nome: "Agrigento", tipo: "Pomar" },
      { id: 9, nome: "Gela", tipo: "Mercado" },
      { id: 10, nome: "Siracusa", tipo: "Mercado" },
      { id: 11, nome: "Ragusa", tipo: "Pomar" },
      { id: 12, nome: "Modica", tipo: "Mercado" }
    ];
    var EDGES = [
      [1, 2],
      [1, 3],
      [2, 4],
      [3, 4],
      [3, 5],
      [4, 6],
      [5, 6],
      [5, 7],
      [6, 7],
      [6, 8],
      [7, 9],
      [8, 9],
      [7, 10],
      [9, 10],
      [10, 11],
      [8, 11],
      [11, 12],
      [9, 12]
    ];
    var GOLD_ROUTE = [3, 5];
    var EVENTS = [
      { id: "bom_negocio", nome: "Bom Neg\xF3cio", timing: "imediato", desc: "Todas as fam\xEDlias recebem +3$ imediatamente." },
      { id: "traicao", nome: "Trai\xE7\xE3o na Fam\xEDlia", timing: "imediato", desc: "Cada fam\xEDlia retorna 1 capanga de um distrito \xE0 reserva." },
      { id: "paz", nome: "Paz entre Fam\xEDlias", timing: "rodada", desc: "Nenhuma disputa \xE9 permitida nesta rodada." },
      { id: "greve_portos", nome: "Greve nos Portos", timing: "renda", desc: "Nesta renda, os Portos n\xE3o produzem $." },
      { id: "instabilidade", nome: "Instabilidade Local", timing: "renda", desc: "Nesta renda, todas as cobran\xE7as rendem 1$ a menos (m\xEDnimo 0)." },
      { id: "fiscalizacao", nome: "Fiscaliza\xE7\xE3o", timing: "imediato", desc: "Cada fam\xEDlia com cobran\xE7a ativa paga 2$; sem dinheiro, perde 1 Respeito." },
      { id: "reconciliacao", nome: "Reconcilia\xE7\xE3o Interna", timing: "imediato", desc: "Cada fam\xEDlia traz 1 capanga da reserva de volta a um distrito pr\xF3prio." },
      { id: "desercao", nome: "Deser\xE7\xE3o", timing: "imediato", desc: "Cada fam\xEDlia retorna 1 capanga do distrito mais populoso \xE0 reserva." },
      { id: "roubo", nome: "Roubo nos Neg\xF3cios", timing: "imediato", desc: "Cada fam\xEDlia perde 2$ (m\xEDnimo 0)." },
      { id: "safra_ruim", nome: "Safra Ruim", timing: "renda", desc: "Nesta renda, os Pomares n\xE3o produzem lim\xF5es." },
      { id: "safra_abundante", nome: "Safra Abundante", timing: "renda", desc: "Nesta renda, os Pomares produzem +1 lim\xE3o (total 2)." },
      { id: "encomenda", nome: "Encomenda Internacional", timing: "rodada", desc: "Nesta rodada, cada exporta\xE7\xE3o rende +2$." },
      { id: "comercio_aquecido", nome: "Com\xE9rcio Aquecido", timing: "renda", desc: "Nesta renda, os Mercados produzem +1$ (total 2)." },
      { id: "tregua_imposta", nome: "Tr\xE9gua Imposta", timing: "rodada", desc: "Nenhuma disputa \xE9 permitida nesta rodada." },
      { id: "credito", nome: "Cr\xE9dito Emergencial", timing: "imediato", desc: "Todas as fam\xEDlias recebem +2$ imediatamente." },
      { id: "dia_pagamento", nome: "Dia de Pagamento", timing: "renda", desc: "Nesta renda, as cobran\xE7as rendem +1$." },
      { id: "confianca", nome: "Confian\xE7a nos Bairros", timing: "imediato", desc: "Cada fam\xEDlia reduz 1 de Tens\xE3o em todos os seus distritos." },
      { id: "resistencia", nome: "Resist\xEAncia Civil", timing: "renda", desc: "Nesta renda, todas as cobran\xE7as geram +1 de Tens\xE3o adicional." }
    ];
    var TAXES = {
      baixa: { valor: 1, tensao: -1 },
      normal: { valor: 2, tensao: 1 },
      alta: { valor: 3, tensao: 2 }
    };
    module2.exports = { FAMILIES: FAMILIES2, FAMILY_COLORS, DISTRICTS, EDGES, GOLD_ROUTE, EVENTS, TAXES };
  }
});

// server/game/engine.js
var require_engine = __commonJS({
  "server/game/engine.js"(exports2, module2) {
    var { FAMILIES: FAMILIES2, DISTRICTS, EDGES, EVENTS, TAXES } = require_data();
    var WIN_INFLUENCE = 10;
    var MAX_LEMONS = 6;
    var MAX_RESPECT = 6;
    var MAX_DISTRICT_TROOPS = 6;
    var MAX_TROOPS = 12;
    var INITIAL_TROOPS = 8;
    var shuffle = (a) => {
      const r = [...a];
      for (let i = r.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [r[i], r[j]] = [r[j], r[i]];
      }
      return r;
    };
    var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    var idx = (id) => DISTRICTS.find((d) => d.id === id);
    var isAdjacent = (a, b) => EDGES.some(([x, y]) => x === a && y === b || x === a && y === b || x === b && y === a);
    var Game2 = class {
      constructor(families, opts = {}) {
        this.families = families;
        this.rng = opts.rng || Math.random;
        if (opts.rawState) {
          this.state = opts.rawState;
          return;
        }
        this.state = this.#initState();
        this.state.round = 0;
        this.startRound();
        this.log("Partida iniciada. Fam\xEDlias: " + families.join(", "));
      }
      log(msg) {
        this.state.log.push({ t: Date.now(), msg });
        if (this.state.log.length > 400) this.state.log.shift();
      }
      #initState() {
        const fams = this.families;
        const deck = shuffle(DISTRICTS.map((d) => d.id));
        const per = fams.length === 3 ? 4 : 3;
        const districts = {};
        DISTRICTS.forEach((d) => districts[d.id] = { id: d.id, owner: null, troops: {}, tension: 0, charge: null, open: true, justReopened: false });
        const players = {};
        fams.forEach((f, i) => {
          const mine = deck.slice(i * per, (i + 1) * per);
          mine.forEach((id) => {
            districts[id].owner = f;
            districts[id].troops[f] = 0;
          });
          players[f] = {
            money: 6,
            lemons: 1,
            respect: 2,
            influence: 0,
            reserve: MAX_TROOPS - INITIAL_TROOPS,
            // 4 na reserva
            districts: mine,
            exported: false,
            oath: { issuedTo: null, roundIssued: 0, demandedThisRound: false },
            truce: false,
            taxPref: "normal",
            accesses: []
            // acessos a portos negociados nesta rodada
          };
          const dist = this.#randomTroopDistribution(mine, INITIAL_TROOPS);
          dist.forEach((n, k) => {
            districts[mine[k]].troops[f] = n;
          });
        });
        return {
          players,
          districts,
          eventDeck: shuffle(EVENTS.map((e) => e.id)),
          event: null,
          round: 1,
          firstIdx: 0,
          order: fams,
          circuit: 1,
          turnIdx: 0,
          phase: "evento",
          // evento | renda | acoes | fim
          pendingIncome: {},
          // fam -> taxa escolhida (renda)
          dispute: null,
          pendingOffer: null,
          // oferta de negociação aberta
          winner: null,
          log: [],
          history: []
        };
      }
      #randomTroopDistribution(districtIds, total) {
        const n = districtIds.length;
        for (let tries = 0; tries < 500; tries++) {
          const d = Array(n).fill(1);
          let rest = total - n;
          while (rest > 0) {
            const k = Math.floor(this.rng() * n);
            if (d[k] < 6) {
              d[k]++;
              rest--;
            }
          }
          if (d.every((v) => v >= 1 && v <= 6)) return d;
        }
        return Array(n).fill(Math.floor(total / n));
      }
      // ---------- helpers de estado ----------
      get st() {
        return this.state;
      }
      famList() {
        return this.families;
      }
      current() {
        return this.state.order[this.state.turnIdx % this.state.order.length];
      }
      totalTroops(f) {
        let n = this.state.players[f].reserve;
        for (const d of Object.values(this.state.districts)) n += d.troops[f] || 0;
        return n;
      }
      ownDistricts(f) {
        return this.state.players[f].districts;
      }
      snapshot() {
        const { log, history, eventDeck, ...rest } = this.state;
        return JSON.parse(JSON.stringify(rest));
      }
      #pushHistory() {
        this.state.history.push({ round: this.state.round, phase: this.state.phase, snap: this.snapshot() });
        if (this.state.history.length > 500) this.state.history.shift();
      }
      #checkWin(f) {
        if (this.state.players[f].influence >= WIN_INFLUENCE) {
          this.state.winner = f;
          this.state.phase = "fim";
          this.log(`\u{1F3C6} ${f} alcan\xE7ou ${WIN_INFLUENCE} de Influ\xEAncia e venceu!`);
          return true;
        }
        return false;
      }
      // ---------- ciclo da rodada ----------
      startRound() {
        const s = this.state;
        s.round++;
        if (s.eventDeck.length === 0) s.eventDeck = shuffle(EVENTS.map((e) => e.id));
        const id = s.eventDeck.shift();
        s.event = { id, timing: EVENTS.find((e) => e.id === id).timing };
        const ev = EVENTS.find((e) => e.id === id);
        this.log(`\u{1F4DC} Evento revelado: ${ev.nome} \u2014 ${ev.desc}`);
        this.#applyImmediateEvent(id);
        s.phase = "renda";
        s.pendingIncome = {};
        for (const f of this.families) {
          const hasCharge = Object.values(s.districts).some((d) => d.charge && d.charge.owner === f && d.open);
          if (hasCharge) s.pendingIncome[f] = this.state.players[f].taxPref;
        }
        if (Object.keys(s.pendingIncome).length === 0 || Object.values(s.pendingIncome).every((v) => v)) this.#applyIncome();
      }
      #applyImmediateEvent(id) {
        const s = this.state;
        const each = (fn) => this.families.forEach(fn);
        switch (id) {
          case "bom_negocio":
            each((f) => s.players[f].money += 3);
            break;
          case "traicao":
            each((f) => {
              for (const dId of s.players[f].districts) {
                const d = s.districts[dId];
                if ((d.troops[f] || 0) > 0) {
                  d.troops[f]--;
                  s.players[f].reserve = Math.min(MAX_TROOPS, s.players[f].reserve + 1);
                  break;
                }
              }
            });
            break;
          case "fiscalizacao":
            each((f) => {
              const has = Object.values(s.districts).some((d) => d.charge && d.charge.owner === f);
              if (has) {
                if (s.players[f].money >= 2) s.players[f].money -= 2;
                else s.players[f].respect = Math.max(0, s.players[f].respect - 1);
              }
            });
            break;
          case "reconciliacao":
            each((f) => {
              const p = s.players[f];
              if (p.reserve > 0) {
                const dId = p.districts.find((d) => (s.districts[d].troops[f] || 0) < MAX_DISTRICT_TROOPS);
                if (dId) {
                  p.reserve--;
                  s.districts[dId].troops[f] = (s.districts[dId].troops[f] || 0) + 1;
                }
              }
            });
            break;
          case "desercao":
            each((f) => {
              let best = null, bestN = -1;
              for (const dId of s.players[f].districts) {
                const n = s.districts[dId].troops[f] || 0;
                if (n > bestN) {
                  bestN = n;
                  best = dId;
                }
              }
              if (best && bestN > 0) {
                s.districts[best].troops[f]--;
                s.players[f].reserve = Math.min(MAX_TROOPS, s.players[f].reserve + 1);
              }
            });
            break;
          case "roubo":
            each((f) => s.players[f].money = Math.max(0, s.players[f].money - 2));
            break;
          case "credito":
            each((f) => s.players[f].money += 2);
            break;
          case "confianca":
            each((f) => {
              for (const dId of s.players[f].districts) s.districts[dId].tension = Math.max(0, s.districts[dId].tension - 1);
            });
            break;
        }
      }
      /** Aplica a taxa escolhida para a renda (jogador com cobrança confirma; padrão = preferência). */
      setTax(f, rate) {
        const s = this.state;
        if (s.phase !== "renda" || !(f in s.pendingIncome)) return { ok: false, error: "Fora da fase de renda" };
        if (!TAXES[rate]) return { ok: false, error: "Taxa inv\xE1lida" };
        s.pendingIncome[f] = rate;
        s.players[f].taxPref = rate;
        this.log(`\u{1F4B5} ${f} escolheu taxa ${rate} para suas cobran\xE7as.`);
        if (Object.values(s.pendingIncome).every((v) => v)) this.#applyIncome();
        return { ok: true };
      }
      #applyIncome() {
        const s = this.state;
        const evId = s.event && s.event.id;
        for (const d of Object.values(s.districts)) {
          if (!d.open) {
            d.open = true;
            d.tension = 0;
            d.justReopened = true;
          }
        }
        for (const f of this.families) {
          const p = s.players[f];
          p.money += 2;
          for (const dId of p.districts) {
            const d = s.districts[dId];
            if (!d.open || d.justReopened) continue;
            const tipo = idx(dId).tipo;
            if (tipo === "Porto") {
              if (evId !== "greve_portos") p.money += 1;
            } else if (tipo === "Mercado") {
              p.money += evId === "comercio_aquecido" ? 2 : 1;
            } else if (tipo === "Pomar") {
              let L = evId === "safra_abundante" ? 2 : evId === "safra_ruim" ? 0 : 1;
              p.lemons = Math.min(MAX_LEMONS, p.lemons + L);
            }
          }
        }
        for (const d of Object.values(s.districts)) {
          if (!d.charge || !d.open) continue;
          const owner = d.charge.owner;
          const p = s.players[owner];
          let rate = s.pendingIncome[owner] || p.taxPref;
          let val = TAXES[rate].valor, ten = TAXES[rate].tensao;
          if (evId === "instabilidade") val = Math.max(0, val - 1);
          if (evId === "dia_pagamento") val += 1;
          let extraT = evId === "resistencia" ? 1 : 0;
          p.money += val;
          d.tension = clamp(d.tension + ten + extraT, 0, 3);
          if (d.tension >= 3) {
            d.charge = null;
            d.open = false;
            d.justReopened = false;
            this.log(`\u{1F512} ${idx(d.id).nome} fechou (Tens\xE3o 3). Cobran\xE7a retirada.`);
          }
        }
        for (const d of Object.values(s.districts)) {
          if (d.open && !d.charge && !d.justReopened) d.tension = Math.max(0, d.tension - 1);
        }
        for (const f of this.families) {
          const p = s.players[f];
          const custo = Math.floor(this.totalTroops(f) / 3) + Math.max(0, p.districts.length - 4);
          p.money = Math.max(0, p.money - custo);
        }
        for (const d of Object.values(s.districts)) d.justReopened = false;
        this.log(`\u{1F4B0} Renda da rodada ${s.round} aplicada.`);
        s.phase = "acoes";
        s.circuit = 1;
        s.turnIdx = 0;
        this.#pushHistory();
      }
      endTurnActions() {
        const s = this.state;
        s.turnIdx++;
        if (s.turnIdx >= s.order.length) {
          if (s.circuit === 1) {
            s.circuit = 2;
            s.turnIdx = 0;
            this.log("\u21BB Segundo circuito de a\xE7\xF5es.");
          } else {
            this.#endRound();
            return;
          }
        }
      }
      #endRound() {
        const s = this.state;
        if (s.winner) return;
        s.event = null;
        for (const f of this.families) {
          s.players[f].exported = false;
          s.players[f].truce = false;
          s.players[f].accesses = [];
          s.players[f].oath.demandedThisRound = false;
        }
        s.firstIdx = (s.firstIdx + 1) % s.order.length;
        s.order = [...s.order.slice(s.firstIdx), ...s.order.slice(0, s.firstIdx)];
        s.turnIdx = 0;
        s.circuit = 1;
        this.log(`\u2014 Fim da rodada ${s.round}. ${s.order[0]} \xE9 o primeiro jogador. \u2014`);
        this.startRound();
      }
      // ---------- negociação (só no turno do jogador ativo, antes/depois da ação) ----------
      #negotiationOpen() {
        return this.state.phase === "acoes";
      }
      offer(from, offer) {
        const s = this.state;
        if (!this.#negotiationOpen()) return { ok: false, error: "Negocia\xE7\xE3o s\xF3 no turno do jogador ativo" };
        if (this.current() !== from) return { ok: false, error: "S\xF3 o jogador ativo prop\xF5e" };
        if (!this.families.includes(offer.to) || offer.to === from) return { ok: false, error: "Destinat\xE1rio inv\xE1lido" };
        const p = s.players[from];
        if ((offer.give?.money || 0) > p.money || (offer.give?.lemons || 0) > p.lemons) return { ok: false, error: "Recursos insuficientes na oferta" };
        for (const porto of offer.give?.portos || []) {
          const d = s.districts[porto];
          if (!d || d.owner !== from || idx(porto).tipo !== "Porto") return { ok: false, error: "Porto inv\xE1lido" };
        }
        s.pendingOffer = { from, ...offer };
        this.log(`\u{1F91D} ${from} prop\xF4s negocia\xE7\xE3o a ${offer.to}.`);
        return { ok: true };
      }
      respond(to, accept) {
        const s = this.state;
        const o = s.pendingOffer;
        if (!o || o.to !== to) return { ok: false, error: "Nenhuma oferta para voc\xEA" };
        s.pendingOffer = null;
        if (!accept) {
          this.log(`${to} recusou a oferta de ${o.from}.`);
          return { ok: true };
        }
        const give = o.give || {}, want = o.want || {};
        const a = s.players[o.from], b = s.players[to];
        a.money -= give.money || 0;
        b.money += give.money || 0;
        a.lemons -= give.lemons || 0;
        b.lemons = Math.min(MAX_LEMONS, b.lemons + (give.lemons || 0));
        b.money -= want.money || 0;
        a.money += want.money || 0;
        b.lemons -= want.lemons || 0;
        a.lemons = Math.min(MAX_LEMONS, a.lemons + (want.lemons || 0));
        for (const porto of give.portos || []) if (!b.accesses.includes(porto)) b.accesses.push(porto);
        for (const porto of want.portos || []) if (!a.accesses.includes(porto)) a.accesses.push(porto);
        this.log(`\u2705 Neg\xF3cio fechado entre ${o.from} e ${to}.`);
        return { ok: true };
      }
      // ---------- juramento ----------
      oathIssue(f, target) {
        const s = this.state, p = s.players[f];
        if (s.phase !== "acoes") return { ok: false, error: "Juramento s\xF3 durante as a\xE7\xF5es" };
        if (p.oath.issuedTo) return { ok: false, error: "Moeda de Juramento j\xE1 emitida" };
        if (!this.families.includes(target) || target === f) return { ok: false, error: "Alvo inv\xE1lido" };
        p.oath.issuedTo = target;
        p.oath.roundIssued = s.round;
        p.oath.demandedThisRound = false;
        this.log(`\u{1FA99} ${f} emitiu sua Moeda de Juramento para ${target}.`);
        return { ok: true };
      }
      oathDemand(f, demand) {
        const s = this.state, p = s.players[f];
        if (p.oath.issuedTo !== demand.target) return { ok: false, error: "Juramento n\xE3o emitido para este alvo" };
        if (s.round <= p.oath.roundIssued) return { ok: false, error: "S\xF3 a partir da rodada seguinte" };
        if (p.oath.demandedThisRound) return { ok: false, error: "M\xE1x. 1 cobran\xE7a de juramento por rodada" };
        const t = s.players[demand.target];
        if (demand.type === "pagamento") {
          const amt = clamp(demand.amount || 2, 1, 2);
          const paid = Math.min(amt, t.money);
          t.money -= paid;
          p.money += paid;
          this.log(`\u{1FA99} ${f} cobrou o juramento: ${targetPaid(demand.target)} pagou ${paid}$ (obriga\xE7\xE3o n\xE3o recus\xE1vel).`);
        } else if (demand.type === "tregua") {
          t.truce = true;
          this.log(`\u{1FA99} ${f} exigiu Tr\xE9gua de ${demand.target} at\xE9 o fim da rodada.`);
        } else return { ok: false, error: "Tipo de cobran\xE7a inv\xE1lido" };
        p.oath.demandedThisRound = true;
        return { ok: true };
        function targetPaid(t2) {
          return t2;
        }
      }
      // ---------- as seis ações ----------
      /** Executa a ação do jogador ativo. Retorna {ok, error?, winner?} */
      act(f, action) {
        const s = this.state;
        if (s.winner) return { ok: false, error: "Partida encerrada" };
        if (s.phase !== "acoes") return { ok: false, error: "Fora da fase de a\xE7\xF5es" };
        if (this.current() !== f) return { ok: false, error: "N\xE3o \xE9 seu turno" };
        if (s.pendingOffer) return { ok: false, error: "Resolva a negocia\xE7\xE3o pendente" };
        if (s.dispute) return { ok: false, error: "Disputa em andamento" };
        let r;
        switch (action.type) {
          case "influenciar":
            r = this.#aInfluenciar(f, action);
            break;
          case "exportar":
            r = this.#aExportar(f, action);
            break;
          case "cobranca":
            r = this.#aCobranca(f, action);
            break;
          case "avancar":
            r = this.#aAvancar(f, action);
            break;
          // pode abrir disputa (não consome turno ainda)
          case "recrutar":
            r = this.#aRecrutar(f, action);
            break;
          case "fazer_caixa":
            r = this.#aFazerCaixa(f);
            break;
          default:
            return { ok: false, error: "A\xE7\xE3o desconhecida" };
        }
        if (r && r.ok && !s.dispute) this.#pushHistory();
        return r || { ok: false, error: "A\xE7\xE3o falhou" };
      }
      #aInfluenciar(f, a) {
        const s = this.state, p = s.players[f];
        const custo = a.com === "respeito" ? { respeito: 3 } : { money: 6 };
        if (a.com !== "respeito" && a.com !== "dinheiro") return { ok: false, error: "Escolha dinheiro ou respeito" };
        if (custo.money && p.money < 6) return { ok: false, error: "Precisa de 6$" };
        if (custo.respeito && p.respect < 3) return { ok: false, error: "Precisa de 3 Respeito" };
        if (custo.money) p.money -= 6;
        else p.respect -= 3;
        p.influence += 1;
        this.log(`\u{1F3AD} ${f} influenciou (+1 Influ\xEAncia).`);
        this.#pushHistory();
        this.#checkWin(f);
        this.endTurnActions();
        return { ok: true, winner: s.winner };
      }
      #aExportar(f, a) {
        const s = this.state, p = s.players[f];
        if (p.exported) return { ok: false, error: "Exporta\xE7\xE3o j\xE1 usada nesta rodada" };
        if (p.lemons < 2) return { ok: false, error: "Precisa de 2 lim\xF5es" };
        let ganho = 0, respeito = 0;
        if (a.modo === "mercado") ganho = 4;
        else if (a.modo === "cadeia") {
          const pomar = p.districts.find((d) => idx(d).tipo === "Pomar" && s.districts[d].open);
          const porto = p.districts.find((d) => idx(d).tipo === "Porto" && s.districts[d].open);
          if (!pomar || !porto) return { ok: false, error: "Cadeia pr\xF3pria inv\xE1lida (pomar e porto pr\xF3prios e abertos)" };
          ganho = 6;
          respeito = 1;
        } else if (a.modo === "negociado") {
          const d = s.districts[a.porto];
          if (!d || d.owner === f || idx(a.porto).tipo !== "Porto" || !d.open) return { ok: false, error: "Porto negociado inv\xE1lido" };
          if (!p.accesses.includes(a.porto)) return { ok: false, error: "Sem acesso negociado a este porto" };
          const tarifa = clamp(a.tarifa || 0, 0, 2);
          ganho = 4 - tarifa;
          s.players[d.owner].money += tarifa;
          this.log(`\u{1F6A2} ${f} pagou ${tarifa}$ de tarifa a ${d.owner}.`);
        } else return { ok: false, error: "Modo de exporta\xE7\xE3o inv\xE1lido" };
        if (s.event && s.event.id === "encomenda") ganho += 2;
        p.lemons -= 2;
        p.money += ganho;
        p.respect = clamp(p.respect + respeito, 0, MAX_RESPECT);
        p.exported = true;
        this.log(`\u{1F34B} ${f} exportou 2 lim\xF5es (+${ganho}$${respeito ? ", +1 Respeito" : ""}).`);
        this.endTurnActions();
        return { ok: true };
      }
      #aCobranca(f, a) {
        const s = this.state, p = s.players[f];
        const d = s.districts[a.district];
        if (!d || d.owner !== f) return { ok: false, error: "Distrito n\xE3o \xE9 seu" };
        if (!d.open) return { ok: false, error: "Distrito fechado" };
        if ((d.troops[f] || 0) < 2) return { ok: false, error: "Precisa de \u22652 capangas no distrito" };
        if (p.money < 2) return { ok: false, error: "Precisa de 2$" };
        if (Object.values(s.districts).filter((x) => x.charge && x.charge.owner === f).length >= 2) return { ok: false, error: "M\xE1x. 2 cobran\xE7as por fam\xEDlia" };
        p.money -= 2;
        d.charge = { owner: f, rate: p.taxPref };
        this.log(`\u{1F4B0} ${f} estabeleceu cobran\xE7a em ${idx(d.id).nome}.`);
        this.endTurnActions();
        return { ok: true };
      }
      #aRecrutar(f, a) {
        const s = this.state, p = s.players[f];
        const d = s.districts[a.district];
        const n = clamp(a.n || 2, 1, 2);
        if (!d || d.owner !== f) return { ok: false, error: "Distrito n\xE3o \xE9 seu" };
        if (p.money < 2) return { ok: false, error: "Precisa de 2$" };
        if (p.reserve < n) return { ok: false, error: "Reserva insuficiente" };
        if ((d.troops[f] || 0) + n > MAX_DISTRICT_TROOPS) return { ok: false, error: "M\xE1x. 6 capangas por distrito" };
        if (this.totalTroops(f) + n > MAX_TROOPS) return { ok: false, error: "M\xE1x. 12 capangas no total" };
        p.money -= 2;
        p.reserve -= n;
        d.troops[f] = (d.troops[f] || 0) + n;
        this.log(`\u{1F590} ${f} recrutou ${n} capanga(s) em ${idx(d.id).nome}.`);
        this.endTurnActions();
        return { ok: true };
      }
      #aFazerCaixa(f) {
        const s = this.state;
        s.players[f].money += 3;
        this.log(`\u{1F4BC} ${f} fez caixa (+3$).`);
        this.endTurnActions();
        return { ok: true };
      }
      #aAvancar(f, a) {
        const s = this.state, p = s.players[f];
        const from = a.from, to = a.to;
        if (p.money < 1) return { ok: false, error: "Precisa de 1$" };
        if (!idx(from) || !idx(to) || from === to || !isAdjacent(from, to)) return { ok: false, error: "Liga\xE7\xE3o inv\xE1lida" };
        const df = s.districts[from], dt = s.districts[to];
        const enviados = clamp(a.troops || 0, 0, df.troops[f] || 0);
        if (enviados < 1 || (df.troops[f] || 0) - enviados < 1) return { ok: false, error: "Deixe \u22651 capanga na origem" };
        if (dt.owner !== f && this.ownDistricts(dt.owner).length <= 1) return { ok: false, error: "\xDAltimo distrito de uma fam\xEDlia n\xE3o pode ser atacado" };
        if (s.players[f].truce) return { ok: false, error: "Voc\xEA est\xE1 em tr\xE9gua at\xE9 o fim da rodada" };
        if (s.event && (s.event.id === "paz" || s.event.id === "tregua_imposta") && dt.owner !== f) return { ok: false, error: "Evento impede disputas nesta rodada" };
        if (dt.owner === f) {
          if ((dt.troops[f] || 0) + enviados > MAX_DISTRICT_TROOPS) return { ok: false, error: "Destino lotado (m\xE1x. 6)" };
          p.money -= 1;
          df.troops[f] -= enviados;
          dt.troops[f] += enviados;
          this.log(`\u{1F6B6} ${f} moveu ${enviados} capanga(s) de ${idx(from).nome} para ${idx(to).nome}.`);
          this.endTurnActions();
          return { ok: true };
        }
        p.money -= 1;
        s.dispute = { attacker: f, defender: dt.owner, from, to, troops: enviados, bets: {}, stage: "apostas" };
        this.log(`\u2694\uFE0F ${f} avan\xE7a com ${enviados} capanga(s) sobre ${idx(to).nome} (${dt.owner})! Apostas secretas...`);
        return { ok: true, dispute: true };
      }
      /** Passos 2–3: apostas secretas 0/1/2 (só o que consegue pagar). */
      disputeBet(f, bet) {
        const s = this.state, D = s.dispute;
        if (!D || D.stage !== "apostas") return { ok: false, error: "Sem disputa em apostas" };
        if (f !== D.attacker && f !== D.defender) return { ok: false, error: "Voc\xEA n\xE3o participa" };
        bet = clamp(bet || 0, 0, 2);
        bet = Math.min(bet, s.players[f].money);
        D.bets[f] = bet;
        this.log(`\u{1F3B2} ${f} registrou sua aposta.`);
        if (D.bets[D.attacker] !== void 0 && D.bets[D.defender] !== void 0) this.#resolveDispute();
        return { ok: true };
      }
      #resolveDispute() {
        const s = this.state, D = s.dispute;
        const at = D.attacker, df = D.defender;
        const apA = D.bets[at] || 0, apD = D.bets[df] || 0;
        s.players[at].money -= apA;
        s.players[df].money -= apD;
        const destino = s.districts[D.to];
        const forcaA = D.troops + apA;
        const forcaD = (destino.troops[df] || 0) + 1 + apD;
        const vencedor = forcaA > forcaD ? at : df;
        this.log(`\u2694\uFE0F For\xE7as \u2014 ${at}: ${forcaA} vs ${df}: ${forcaD}. ${vencedor === at ? at : df} vence a disputa em ${idx(D.to).nome}.`);
        s.players[at].reserve = Math.min(MAX_TROOPS, s.players[at].reserve + 1);
        const origem = s.districts[D.from];
        let atacantesSobreviventes = D.troops - 1;
        if (vencedor === at) {
          s.players[df].reserve = Math.min(MAX_TROOPS, s.players[df].reserve + 1);
          const restantes = (destino.troops[df] || 0) - 1;
          destino.troops[df] = 0;
          let recuo = restantes;
          for (const adjId of EDES_ADJ(D.to)) {
            const adj = s.districts[adjId];
            if (adj.owner === df) {
              const espaco = MAX_DISTRICT_TROOPS - (adj.troops[df] || 0);
              const move = Math.min(espaco, recuo);
              if (move > 0) {
                adj.troops[df] = (adj.troops[df] || 0) + move;
                recuo -= move;
              }
            }
          }
          s.players[df].reserve = Math.min(MAX_TROOPS, s.players[df].reserve + recuo);
          destino.troops[at] = atacantesSobreviventes;
          origem.troops[at] -= D.troops;
          destino.owner = at;
          s.players[df].districts = s.players[df].districts.filter((x) => x !== D.to);
          s.players[at].districts.push(D.to);
          destino.charge = null;
          s.players[at].respect = clamp(s.players[at].respect + 1, 0, MAX_RESPECT);
          this.log(`\u{1F3F4} ${at} conquistou ${idx(D.to).nome} (+1 Respeito).`);
        } else {
          destino.troops[at] = 0;
          origem.troops[at] -= D.troops;
          origem.troops[at] += atacantesSobreviventes;
          s.players[df].respect = clamp(s.players[df].respect + 1, 0, MAX_RESPECT);
        }
        s.dispute = null;
        this.#pushHistory();
        this.endTurnActions();
      }
    };
    function EDES_ADJ(id) {
      const out = [];
      for (const [x, y] of EDGES) {
        if (x === id) out.push(y);
        else if (y === id) out.push(x);
      }
      return out;
    }
    module2.exports = { Game: Game2, isAdjacent, EDGES_ADJ: EDES_ADJ };
  }
});

// server/game/bots.js
var require_bots = __commonJS({
  "server/game/bots.js"(exports2, module2) {
    var { DISTRICTS, EDGES, TAXES } = require_data();
    var idx = (id) => DISTRICTS.find((d) => d.id === id);
    var adj = (id) => {
      const o = [];
      for (const [x, y] of EDGES) {
        if (x === id) o.push(y);
        else if (y === id) o.push(x);
      }
      return o;
    };
    var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    var pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    function botDelay() {
      const v = parseInt("1200", 10);
      return Number.isFinite(v) && v >= 0 ? v : 1200;
    }
    function botFamilies(room) {
      return room.clients.filter((c) => c.bot && c.family).map((c) => c.family);
    }
    function humanFamily(room) {
      const h = room.clients.find((c) => !c.bot && c.family);
      return h ? h.family : null;
    }
    function botTax(difficulty, f, s) {
      if (difficulty === "facil") return pick(["baixa", "normal", "alta"]);
      const tensaoMedia = s.players[f].districts.reduce((a, d) => a + (s.districts[d].tension || 0), 0) / Math.max(1, s.players[f].districts.length);
      if (difficulty === "dificil") return tensaoMedia >= 1.5 ? "normal" : "alta";
      return "normal";
    }
    function botBet(difficulty, f, s, D) {
      const p = s.players[f];
      const destino = s.districts[D.to];
      if (difficulty === "facil") return Math.min(p.money, pick([0, 0, 1, 2]));
      if (f === D.attacker) {
        const defesa = (destino.troops[D.defender] || 0) + 1;
        const preciso2 = clamp(defesa + 2 - D.troops, 0, 2);
        const bet2 = difficulty === "dificil" ? preciso2 : clamp(defesa + 1 - D.troops, 0, 1);
        return Math.min(bet2, p.money);
      }
      const ataque = D.troops + 2;
      const preciso = clamp(ataque - ((destino.troops[f] || 0) + 1), 0, 2);
      const bet = difficulty === "dificil" ? preciso : clamp(D.troops - (destino.troops[f] || 0), 0, 1);
      return Math.min(bet, p.money);
    }
    function botRespond(difficulty, o) {
      const ganho = o.give && o.give.money || 0, custo = o.want && o.want.money || 0;
      if (difficulty === "facil") return ganho > 0;
      return ganho > custo;
    }
    function botActionCandidates(difficulty, room, f) {
      const g = room.game, s = g.st, p = s.players[f];
      const out = [];
      const isHuman = (fam) => fam && fam === humanFamily(room);
      if (difficulty === "facil") {
        if (p.lemons >= 2) out.push({ type: "exportar", modo: "mercado" });
        if (Math.random() < 0.25 && p.money >= 6) out.push({ type: "influenciar", com: "dinheiro" });
        if (Math.random() < 0.3 && p.money >= 2) {
          const d = pick(p.districts.filter((id) => s.districts[id].open && (s.districts[id].troops[f] || 0) < 6));
          if (d) out.push({ type: "recrutar", district: d, n: 1 });
        }
        out.push({ type: "fazer_caixa" });
        return out;
      }
      if (p.lemons >= 2) {
        const pomar = p.districts.find((d) => idx(d).tipo === "Pomar" && s.districts[d].open);
        const porto = p.districts.find((d) => idx(d).tipo === "Porto" && s.districts[d].open);
        if (pomar && porto) out.push({ type: "exportar", modo: "cadeia" });
        out.push({ type: "exportar", modo: "mercado" });
      }
      if (difficulty === "dificil") {
        if (p.money >= 4 && p.districts.filter((id) => s.districts[id].charge && s.districts[id].charge.owner === f).length < 2) {
          const alvo = p.districts.filter((id) => s.districts[id].open && !s.districts[id].charge && (s.districts[id].troops[f] || 0) >= 2).sort((a, b) => (idx(b).tipo === "Mercado" ? 1 : 0) - (idx(a).tipo === "Mercado" ? 1 : 0))[0];
          if (alvo) out.push({ type: "cobranca", district: alvo });
        }
        if (p.money >= 2 && p.reserve >= 1) {
          const ameaca = p.districts.find((id) => {
            const d = s.districts[id];
            if (!d.open || (d.troops[f] || 0) >= 6) return false;
            return adj(id).some((aid) => {
              const a = s.districts[aid];
              return a.owner && a.owner !== f && (a.troops[a.owner] || 0) >= (d.troops[f] || 0) + 2;
            });
          });
          if (ameaca) out.push({ type: "recrutar", district: ameaca, n: Math.min(2, 6 - (s.districts[ameaca].troops[f] || 0), p.reserve) });
        }
        const hf = humanFamily(room);
        if (p.money >= 1) {
          for (const fromId of p.districts) {
            const df = s.districts[fromId];
            if ((df.troops[f] || 0) < 3) continue;
            for (const toId of adj(fromId)) {
              const dt = s.districts[toId];
              if (!dt.owner || dt.owner === f) continue;
              if (!isHuman(dt.owner) && difficulty === "dificil") continue;
              if (dt.owner !== f && s.players[dt.owner].districts.length <= 1) continue;
              if (s.event && (s.event.id === "paz" || s.event.id === "tregua_imposta")) continue;
              const vantagem = (df.troops[f] || 0) - 1 - ((dt.troops[dt.owner] || 0) + 1);
              if (vantagem >= 1) out.push({ type: "avancar", from: fromId, to: toId, troops: Math.min((df.troops[f] || 0) - 1, (dt.troops[dt.owner] || 0) + 2) });
            }
          }
        }
        if (p.money >= 6) out.push({ type: "influenciar", com: "dinheiro" });
        if (p.respect >= 3) out.push({ type: "influenciar", com: "respeito" });
      } else {
        if (p.money >= 4 && Math.random() < 0.5) {
          const alvo = p.districts.find((id) => s.districts[id].open && !s.districts[id].charge && (s.districts[id].troops[f] || 0) >= 2);
          if (alvo) out.push({ type: "cobranca", district: alvo });
        }
        if (p.money >= 6 && Math.random() < 0.6) out.push({ type: "influenciar", com: "dinheiro" });
        if (p.respect >= 3 && Math.random() < 0.6) out.push({ type: "influenciar", com: "respeito" });
        if (p.money >= 2 && p.reserve >= 1 && Math.random() < 0.3) {
          const d = p.districts.find((id) => s.districts[id].open && (s.districts[id].troops[f] || 0) < 6);
          if (d) out.push({ type: "recrutar", district: d, n: 1 });
        }
      }
      out.push({ type: "fazer_caixa" });
      return out;
    }
    module2.exports = { botDelay, botFamilies, humanFamily, botTax, botBet, botRespond, botActionCandidates };
  }
});

// test/solo-client-entry.js
var solo_client_entry_exports = {};
__export(solo_client_entry_exports, {
  runTests: () => runTests
});
module.exports = __toCommonJS(solo_client_entry_exports);

// client/js/solo.js
function CSG() {
  return globalThis.CosaServerGame;
}
var delayMs = () => {
  const v = parseInt(globalThis.CN_BOT_DELAY_MS, 10);
  return Number.isFinite(v) && v >= 0 ? v : CSG().bots.botDelay();
};
function publicState(game) {
  const s = JSON.parse(JSON.stringify(game.st));
  if (s.dispute) s.dispute = { ...s.dispute, bets: void 0, _betsSet: Object.keys(s.dispute.bets || {}) };
  s.eventDeck = void 0;
  return s;
}
var LocalSolo = class {
  constructor({ name, tableSize, bots: bots2, difficulty, onEvent }) {
    this.targetPlayers = tableSize;
    this.bots = bots2;
    this.difficulty = ["facil", "medio", "dificil"].includes(difficulty) ? difficulty : "medio";
    this.onEvent = onEvent || (() => {
    });
    this.clients = [];
    for (let i = 1; i <= this.bots; i++)
      this.clients.push({ name: `Bot \u{1F916} ${i}`, family: null, ready: true, connected: true, bot: true });
    this.human = { name, family: null, ready: false, connected: true, bot: false };
    this.clients.push(this.human);
    this.game = null;
    this.my = null;
    this.timer = 0;
    this.turnDeadline = 0;
    this.botFingerprint = null;
    this.botNextAt = 0;
    this.onEvent({ type: "joined", code: "LOCAL", spectator: false });
    this.iv = setInterval(() => this.tick(), 250);
  }
  stop() {
    if (this.iv) {
      clearInterval(this.iv);
      this.iv = null;
    }
  }
  playersInfo() {
    return this.clients.map((c) => ({ name: c.name, family: c.family, ready: c.ready, connected: c.connected }));
  }
  emit(type, data = {}) {
    this.onEvent(type === "state" ? { type, state: data.state, players: data.players, config: data.config, you: this.my } : { type, ...data });
  }
  emitState() {
    this.emit("state", {
      state: this.game ? publicState(this.game) : null,
      players: this.playersInfo(),
      config: { timer: this.timer, targetPlayers: this.targetPlayers, bots: this.bots, difficulty: this.difficulty }
    });
  }
  /** Entrada de mensagens — mesma superfície de rooms.handleMessage (local). */
  handleMessage(m = {}) {
    const t = m.type;
    const err = (error) => {
      this.emit("error", { error });
      return { ok: false, error };
    };
    if (t === "ready") {
      this.human.ready = !!m.ready;
      this.emitState();
      return { ok: true };
    }
    if (t === "start_game") {
      if (this.game) return err("Partida j\xE1 iniciada");
      const fams = [...CSG().FAMILIES].sort(() => Math.random() - 0.5).slice(0, this.clients.length);
      this.clients.forEach((c, i) => {
        c.family = fams[i];
        c.ready = true;
      });
      this.my = this.human.family = fams.find((f, i) => !this.clients.some((c, j) => c.bot && c.family === f));
      this.game = new (CSG()).Game(fams);
      this.emit("chat", { from: "sistema", text: `Partida iniciada! Primeiro jogador: ${fams[0]}` });
      this.emitState();
      return { ok: true };
    }
    const acts = ["set_tax", "action", "dispute_bet", "oath_issue", "oath_demand", "negotiate_offer", "negotiate_respond"];
    if (acts.includes(t)) {
      if (!this.game) return err("Partida n\xE3o iniciada");
      const f = this.human.family, g = this.game;
      this.botTick();
      let r;
      if (t === "set_tax") r = g.setTax(f, m.rate);
      else if (t === "action") r = g.act(f, m.action);
      else if (t === "dispute_bet") r = g.disputeBet(f, m.bet);
      else if (t === "oath_issue") r = g.oathIssue(f, m.target);
      else if (t === "oath_demand") r = g.oathDemand(f, m.demand);
      else if (t === "negotiate_offer") r = g.offer(f, { to: m.to, give: m.give, want: m.want });
      else r = g.respond(f, m.accept);
      if (!r || !r.ok) return err(r && r.error || "a\xE7\xE3o inv\xE1lida");
      this.emitState();
      if (g.st.winner) this.emit("victory", { winner: g.st.winner });
      return { ok: true };
    }
    return err("Mensagem desconhecida: " + t);
  }
  /**
   * IA dos robôs — MESMA lógica de rooms.botTick, usando a IA do bundle.
   * Decisão com fingerprint + delay natural (~1,2s) entre ações.
   */
  botTick() {
    if (!this.game || !this.bots || this.game.st.winner) return;
    const g = this.game, s = g.st;
    const { bots: bots2 } = CSG();
    const botFam = (f) => this.clients.some((c) => c.bot && c.family === f);
    const diff = this.difficulty;
    let fp = null, exec = null;
    if (s.phase === "renda" && s.pendingIncome) {
      const f = Object.keys(s.pendingIncome).find((x) => botFam(x) && !s.pendingIncome[x]);
      if (f) {
        fp = `taxa:${s.round}:${f}`;
        exec = () => {
          g.setTax(f, bots2.botTax(diff, f, s));
          this.emitState();
        };
      }
    } else if (s.dispute && s.dispute.stage === "apostas") {
      const f = [s.dispute.attacker, s.dispute.defender].find((x) => botFam(x) && s.dispute.bets[x] === void 0);
      if (f) {
        fp = `aposta:${s.round}:${s.dispute.to}:${f}`;
        exec = () => {
          g.disputeBet(f, bots2.botBet(diff, f, s, s.dispute));
          this.emitState();
        };
      }
    } else if (s.pendingOffer && botFam(s.pendingOffer.to)) {
      const o = s.pendingOffer;
      fp = `oferta:${s.round}:${o.from}:${o.to}`;
      exec = () => {
        g.respond(o.to, bots2.botRespond(diff, o));
        this.emitState();
      };
    } else if (s.phase === "acoes" && !s.dispute && !s.pendingOffer) {
      const cur = g.current();
      if (botFam(cur)) {
        fp = `acao:${s.round}:${s.circuit}:${s.turnIdx}`;
        exec = () => {
          const cands = bots2.botActionCandidates(diff, this, cur);
          let done = false;
          for (const a of cands) {
            if (g.act(cur, a).ok) {
              done = true;
              break;
            }
          }
          if (!done) g.act(cur, { type: "fazer_caixa" });
          this.emitState();
          if (g.st.winner) {
            this.emit("victory", { winner: g.st.winner });
            this.stop();
          }
        };
      }
    }
    if (!fp || !exec) {
      this.botFingerprint = null;
      return;
    }
    if (fp !== this.botFingerprint) {
      this.botFingerprint = fp;
      this.botNextAt = Date.now() + delayMs();
      return;
    }
    if (Date.now() < this.botNextAt) return;
    this.botFingerprint = null;
    try {
      exec();
    } catch (e) {
      console.error("[solo] erro na a\xE7\xE3o do bot:", e);
    }
  }
  tick() {
    this.botTick();
  }
};

// test/solo-client-entry.js
var import_engine = __toESM(require_engine());
var bots = __toESM(require_bots());
var import_data = __toESM(require_data());
globalThis.CosaServerGame = { Game: import_engine.Game, bots, FAMILIES: import_data.FAMILIES };
globalThis.CN_BOT_DELAY_MS = process.env.CN_BOT_DELAY_MS || "1200";
function runTests() {
  const DIFFS = ["facil", "medio", "dificil"];
  const results = [];
  globalThis.fetch = (url) => {
    throw new Error(`CHAMADA DE REDE PROIBIDA: ${url}`);
  };
  const XHR = class XMLHttpRequest {
    open() {
      throw new Error("CHAMADA DE REDE PROIBIDA (XHR)");
    }
  };
  globalThis.XMLHttpRequest = XHR;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function runSolo(difficulty) {
    const t0 = Date.now();
    let state = null, my = null, winner = null, botActions = 0, apiTouched = false;
    const solo = new LocalSolo({
      name: "HumanoTeste",
      tableSize: 4,
      bots: 3,
      difficulty,
      onEvent: (ev) => {
        if (ev.type === "state") {
          state = ev.state;
          my = ev.you;
        }
        if (ev.type === "victory") winner = ev.winner;
      }
    });
    solo.handleMessage({ type: "ready", ready: true });
    solo.handleMessage({ type: "start_game" });
    const deadline = Date.now() + 12 * 60 * 1e3;
    while (!winner && Date.now() < deadline) {
      if (!state) {
        await sleep(100);
        continue;
      }
      const s = state;
      botActions = (s.log || []).filter((l) => /(?:recrutou|exportou|influenciou|cobrança|avança|avançou|vence a disputa|escolheu taxa)/.test(l.msg)).length;
      if (s.phase === "renda" && s.pendingIncome && my in s.pendingIncome && !s.pendingIncome[my]) {
        solo.handleMessage({ type: "set_tax", rate: "normal" });
      } else if (s.dispute && (my === s.dispute.attacker || my === s.dispute.defender) && !(s.dispute._betsSet || []).includes(my)) {
        solo.handleMessage({ type: "dispute_bet", bet: 0 });
      } else if (s.phase === "acoes" && !s.dispute && !s.pendingOffer && s.order[s.turnIdx % s.order.length] === my) {
        solo.handleMessage({ type: "action", action: { type: "fazer_caixa" } });
      }
      await sleep(30);
    }
    solo.stop();
    if (!winner) throw new Error(`[${difficulty}] partida n\xE3o terminou em 12 min`);
    const resumo = Object.entries(state.players).map(([f, p]) => `${f}: \u{1F451}${p.influence} \u{1F4B0}${p.money} \u{1F396}${p.respect}`).join(" | ");
    return { difficulty, winner, rounds: state.round, ms: Date.now() - t0, botActions, resumo };
  }
  (async () => {
    console.log("=== E2E client-side (bundle do motor) \u2014 3 dificuldades ===");
    for (const d of DIFFS) {
      const r = await runSolo(d);
      results.push(r);
      console.log(`\u2714 [${d}] vencedor: ${r.winner} | rodadas: ${r.rounds} | ${Math.round(r.ms / 1e3)}s | a\xE7\xF5es de bot no log: ${r.botActions}`);
      console.log(`   estado final \u2192 ${r.resumo}`);
    }
    const ok = results.length === 3 && results.every((r) => r.winner);
    console.log(ok ? "\n\u2705 3 partidas solo (client-side) terminaram com vencedor; zero chamadas /api/*." : "\n\u274C FALHA");
    process.exit(ok ? 0 : 1);
  })().catch((e) => {
    console.error("\u274C", e.message);
    process.exit(1);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runTests
});

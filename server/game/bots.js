/**
 * IA dos robôs "Cosa Nostra" — roda 100% no LADO SERVIDOR (motor autoritativo).
 * Três níveis de dificuldade:
 *  - facil:   decisões simples/aleatórias, erros econômicos (não prioriza renda/proteção).
 *  - medio:   heurística razoável (paga proteção, tenta famílias, escolhe melhor negócio).
 *  - dificil: heurística agressiva/otimizada (maximiza renda, protege, bloqueia o humano).
 */
const { DISTRICTS, EDGES, TAXES } = require('./data');

const idx = (id) => DISTRICTS.find(d => d.id === id);
const adj = (id) => { const o = []; for (const [x, y] of EDGES) { if (x === id) o.push(y); else if (y === id) o.push(x); } return o; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Atraso entre ações dos bots (ms) — configurável para testes. */
function botDelay() {
  const v = parseInt(process.env.BOT_DELAY_MS || '1200', 10);
  return Number.isFinite(v) && v >= 0 ? v : 1200;
}

/** Lista de famílias controladas por bots nesta sala. */
function botFamilies(room) {
  return room.clients.filter(c => c.bot && c.family).map(c => c.family);
}
/** Família do jogador humano (para o bot "dificil" bloquear). */
function humanFamily(room) {
  const h = room.clients.find(c => !c.bot && c.family);
  return h ? h.family : null;
}

// ---------- decisões ----------

/** Taxa de cobrança preferida pelo bot na fase de renda. */
function botTax(difficulty, f, s) {
  if (difficulty === 'facil') return pick(['baixa', 'normal', 'alta']);
  const tensaoMedia = s.players[f].districts.reduce((a, d) => a + (s.districts[d].tension || 0), 0) / Math.max(1, s.players[f].districts.length);
  if (difficulty === 'dificil') return tensaoMedia >= 1.5 ? 'normal' : 'alta';
  return 'normal';
}

/** Aposta em disputa (0–2, limitada ao dinheiro). */
function botBet(difficulty, f, s, D) {
  const p = s.players[f];
  const destino = s.districts[D.to];
  if (difficulty === 'facil') return Math.min(p.money, pick([0, 0, 1, 2]));
  if (f === D.attacker) {
    // precisa vencer: forcaA = troops + aposta > defesa local + aposta do defensor
    const defesa = (destino.troops[D.defender] || 0) + 1;
    const preciso = clamp(defesa + 2 - D.troops, 0, 2); // assume aposta máxima do defensor
    const bet = difficulty === 'dificil' ? preciso : clamp(defesa + 1 - D.troops, 0, 1);
    return Math.min(bet, p.money);
  }
  // defensor: garantir forcaD >= forcaA
  const ataque = D.troops + 2; // aposta máxima do atacante
  const preciso = clamp(ataque - ((destino.troops[f] || 0) + 1), 0, 2);
  const bet = difficulty === 'dificil' ? preciso : clamp(D.troops - (destino.troops[f] || 0), 0, 1);
  return Math.min(bet, p.money);
}

/** Resposta a uma oferta de negociação (bots não propõem; só respondem). */
function botRespond(difficulty, o) {
  const ganho = (o.give && o.give.money) || 0, custo = (o.want && o.want.money) || 0;
  if (difficulty === 'facil') return ganho > 0;
  return ganho > custo; // medio/dificil só aceitam negócio vantajoso em dinheiro
}

/**
 * Candidatos de ação (ordenados por prioridade) para o bot `f` na fase de ações.
 * O executor tenta cada um; se todos falharem, faz "fazer_caixa".
 */
function botActionCandidates(difficulty, room, f) {
  const g = room.game, s = g.st, p = s.players[f];
  const out = [];
  const isHuman = (fam) => fam && fam === humanFamily(room);

  if (difficulty === 'facil') {
    // decisões simples/aleatórias; erros econômicos (não prioriza renda/proteção)
    if (p.lemons >= 2) out.push({ type: 'exportar', modo: 'mercado' });
    if (Math.random() < 0.25 && p.money >= 6) out.push({ type: 'influenciar', com: 'dinheiro' });
    if (Math.random() < 0.3 && p.money >= 2) {
      const d = pick(p.districts.filter(id => s.districts[id].open && (s.districts[id].troops[f] || 0) < 6));
      if (d) out.push({ type: 'recrutar', district: d, n: 1 });
    }
    out.push({ type: 'fazer_caixa' });
    return out;
  }

  // medio e dificil: exportação (cadeia própria rende mais)
  if (p.lemons >= 2) {
    const pomar = p.districts.find(d => idx(d).tipo === 'Pomar' && s.districts[d].open);
    const porto = p.districts.find(d => idx(d).tipo === 'Porto' && s.districts[d].open);
    if (pomar && porto) out.push({ type: 'exportar', modo: 'cadeia' });
    out.push({ type: 'exportar', modo: 'mercado' });
  }

  if (difficulty === 'dificil') {
    // maximiza renda: cobrança em distrito aberto e guarnecido
    if (p.money >= 4 && p.districts.filter(id => s.districts[id].charge && s.districts[id].charge.owner === f).length < 2) {
      const alvo = p.districts
        .filter(id => s.districts[id].open && !s.districts[id].charge && (s.districts[id].troops[f] || 0) >= 2)
        .sort((a, b) => (idx(b).tipo === 'Mercado' ? 1 : 0) - (idx(a).tipo === 'Mercado' ? 1 : 0))[0];
      if (alvo) out.push({ type: 'cobranca', district: alvo });
    }
    // protege: recruta onde há ameaça rival adjacente
    if (p.money >= 2 && p.reserve >= 1) {
      const ameaca = p.districts.find(id => {
        const d = s.districts[id];
        if (!d.open || (d.troops[f] || 0) >= 6) return false;
        return adj(id).some(aid => { const a = s.districts[aid]; return a.owner && a.owner !== f && (a.troops[a.owner] || 0) >= (d.troops[f] || 0) + 2; });
      });
      if (ameaca) out.push({ type: 'recrutar', district: ameaca, n: Math.min(2, 6 - (s.districts[ameaca].troops[f] || 0), p.reserve) });
    }
    // bloqueia o jogador humano: ataca distrito do humano quando tem vantagem
    const hf = humanFamily(room);
    if (p.money >= 1) {
      for (const fromId of p.districts) {
        const df = s.districts[fromId];
        if ((df.troops[f] || 0) < 3) continue;
        for (const toId of adj(fromId)) {
          const dt = s.districts[toId];
          if (!dt.owner || dt.owner === f) continue;
          if (!isHuman(dt.owner) && difficulty === 'dificil') continue; // dificil foca no humano
          if ((dt.owner !== f && s.players[dt.owner].districts.length <= 1)) continue;
          if (s.event && (s.event.id === 'paz' || s.event.id === 'tregua_imposta')) continue;
          const vantagem = (df.troops[f] || 0) - 1 - ((dt.troops[dt.owner] || 0) + 1);
          if (vantagem >= 1) out.push({ type: 'avancar', from: fromId, to: toId, troops: Math.min((df.troops[f] || 0) - 1, (dt.troops[dt.owner] || 0) + 2) });
        }
      }
    }
    // influencia agressivamente quando pode
    if (p.money >= 6) out.push({ type: 'influenciar', com: 'dinheiro' });
    if (p.respect >= 3) out.push({ type: 'influenciar', com: 'respeito' });
  } else {
    // medio: heurística razoável
    if (p.money >= 4 && Math.random() < 0.5) {
      const alvo = p.districts.find(id => s.districts[id].open && !s.districts[id].charge && (s.districts[id].troops[f] || 0) >= 2);
      if (alvo) out.push({ type: 'cobranca', district: alvo });
    }
    if (p.money >= 6 && Math.random() < 0.6) out.push({ type: 'influenciar', com: 'dinheiro' });
    if (p.respect >= 3 && Math.random() < 0.6) out.push({ type: 'influenciar', com: 'respeito' });
    if (p.money >= 2 && p.reserve >= 1 && Math.random() < 0.3) {
      const d = p.districts.find(id => s.districts[id].open && (s.districts[id].troops[f] || 0) < 6);
      if (d) out.push({ type: 'recrutar', district: d, n: 1 });
    }
  }

  out.push({ type: 'fazer_caixa' });
  return out;
}

module.exports = { botDelay, botFamilies, humanFamily, botTax, botBet, botRespond, botActionCandidates };

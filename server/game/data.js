/**
 * Dados estáticos do jogo "Cosa Nostra – O Ouro Amarelo da Sicília".
 * Distritos, conexões, famílias e as 18 cartas de Evento.
 */

const FAMILIES = ['Romano', 'Vitale', 'Bellini', 'Conti'];
const FAMILY_COLORS = {
  Romano: 0x8a1c1c,   // vinho profundo
  Vitale: 0x1f3d6b,   // azul-noite
  Bellini: 0x1d5c3f,  // verde-oliva escuro
  Conti: 0x5a3a17,    // couro envelhecido
};

/** 12 distritos: 4 Portos, 4 Pomares, 4 Mercados. IDs 3 e 5 = Palermo–Messina (rota tracejada). */
const DISTRICTS = [
  { id: 1,  nome: 'Trapani',       tipo: 'Porto' },
  { id: 2,  nome: 'Marsala',       tipo: 'Pomar' },
  { id: 3,  nome: 'Palermo',       tipo: 'Porto' },
  { id: 4,  nome: 'Caltanissetta', tipo: 'Pomar' },
  { id: 5,  nome: 'Messina',       tipo: 'Porto' },
  { id: 6,  nome: 'Enna',          tipo: 'Mercado' },
  { id: 7,  nome: 'Catania',       tipo: 'Porto' },
  { id: 8,  nome: 'Agrigento',     tipo: 'Pomar' },
  { id: 9,  nome: 'Gela',          tipo: 'Mercado' },
  { id: 10, nome: 'Siracusa',      tipo: 'Mercado' },
  { id: 11, nome: 'Ragusa',        tipo: 'Pomar' },
  { id: 12, nome: 'Modica',        tipo: 'Mercado' },
];

/** Ligações físicas entre distritos (grafo da ilha). A ligação 3–5 é a "rota dourada". */
const EDGES = [
  [1, 2], [1, 3], [2, 4], [3, 4], [3, 5], [4, 6],
  [5, 6], [5, 7], [6, 7], [6, 8], [7, 9], [8, 9],
  [7, 10], [9, 10], [10, 11], [8, 11], [11, 12], [9, 12],
];

/** Rota tracejada especial Palermo–Messina (ligação 3–5). */
const GOLD_ROUTE = [3, 5];

/**
 * As 18 cartas de Evento únicas.
 * timing: 'imediato' | 'renda' (efeito na renda desta rodada) | 'rodada' (válido até o fim da rodada)
 */
const EVENTS = [
  { id: 'bom_negocio',          nome: 'Bom Negócio',          timing: 'imediato', desc: 'Todas as famílias recebem +3$ imediatamente.' },
  { id: 'traicao',              nome: 'Traição na Família',   timing: 'imediato', desc: 'Cada família retorna 1 capanga de um distrito à reserva.' },
  { id: 'paz',                  nome: 'Paz entre Famílias',   timing: 'rodada',   desc: 'Nenhuma disputa é permitida nesta rodada.' },
  { id: 'greve_portos',         nome: 'Greve nos Portos',     timing: 'renda',    desc: 'Nesta renda, os Portos não produzem $.' },
  { id: 'instabilidade',        nome: 'Instabilidade Local',  timing: 'renda',    desc: 'Nesta renda, todas as cobranças rendem 1$ a menos (mínimo 0).' },
  { id: 'fiscalizacao',         nome: 'Fiscalização',         timing: 'imediato', desc: 'Cada família com cobrança ativa paga 2$; sem dinheiro, perde 1 Respeito.' },
  { id: 'reconciliacao',        nome: 'Reconciliação Interna',timing: 'imediato', desc: 'Cada família traz 1 capanga da reserva de volta a um distrito próprio.' },
  { id: 'desercao',             nome: 'Deserção',             timing: 'imediato', desc: 'Cada família retorna 1 capanga do distrito mais populoso à reserva.' },
  { id: 'roubo',                nome: 'Roubo nos Negócios',   timing: 'imediato', desc: 'Cada família perde 2$ (mínimo 0).' },
  { id: 'safra_ruim',           nome: 'Safra Ruim',           timing: 'renda',    desc: 'Nesta renda, os Pomares não produzem limões.' },
  { id: 'safra_abundante',      nome: 'Safra Abundante',      timing: 'renda',    desc: 'Nesta renda, os Pomares produzem +1 limão (total 2).' },
  { id: 'encomenda',            nome: 'Encomenda Internacional', timing: 'rodada', desc: 'Nesta rodada, cada exportação rende +2$.' },
  { id: 'comercio_aquecido',    nome: 'Comércio Aquecido',    timing: 'renda',    desc: 'Nesta renda, os Mercados produzem +1$ (total 2).' },
  { id: 'tregua_imposta',       nome: 'Trégua Imposta',       timing: 'rodada',   desc: 'Nenhuma disputa é permitida nesta rodada.' },
  { id: 'credito',              nome: 'Crédito Emergencial',  timing: 'imediato', desc: 'Todas as famílias recebem +2$ imediatamente.' },
  { id: 'dia_pagamento',        nome: 'Dia de Pagamento',     timing: 'renda',    desc: 'Nesta renda, as cobranças rendem +1$.' },
  { id: 'confianca',            nome: 'Confiança nos Bairros',timing: 'imediato', desc: 'Cada família reduz 1 de Tensão em todos os seus distritos.' },
  { id: 'resistencia',          nome: 'Resistência Civil',    timing: 'renda',    desc: 'Nesta renda, todas as cobranças geram +1 de Tensão adicional.' },
];

const TAXES = {
  baixa:  { valor: 1, tensao: -1 },
  normal: { valor: 2, tensao: +1 },
  alta:   { valor: 3, tensao: +2 },
};

module.exports = { FAMILIES, FAMILY_COLORS, DISTRICTS, EDGES, GOLD_ROUTE, EVENTS, TAXES };

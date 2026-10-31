// Dados compartilhados para o cliente (espelho de server/game/data.js)
export const DISTRICTS = [
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
export const EDGES = [
  [1,2],[1,3],[2,4],[3,4],[3,5],[4,6],[5,6],[5,7],[6,7],[6,8],[7,9],[8,9],
  [7,10],[9,10],[10,11],[8,11],[11,12],[9,12],
];
export const GOLD_ROUTE = [3, 5];
export const FAMILY_COLORS = { Romano: 0x8a1c1c, Vitale: 0x1f3d6b, Bellini: 0x1d5c3f, Conti: 0x5a3a17 };
export const DIST_TYPES = { 1:'Porto',2:'Pomar',3:'Porto',4:'Pomar',5:'Porto',6:'Mercado',7:'Porto',8:'Pomar',9:'Mercado',10:'Mercado',11:'Pomar',12:'Mercado' };

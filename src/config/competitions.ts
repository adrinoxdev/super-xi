// Nomes ficticios (decisao N1); T37 refina o catalogo.
export const CONTINENTAL_RIVALS: Array<{ id: string; name: string; power: number }> = [
  { id: 'con_1', name: 'Club Atlético Rio Dulce', power: 76 },
  { id: 'con_2', name: 'Deportivo Puerto Azul', power: 75 },
  { id: 'con_3', name: 'Club Sportivo Carbonero', power: 73 },
  { id: 'con_4', name: 'Unión Pampa Oriental', power: 72 },
  { id: 'con_5', name: 'Sociedad Altiplano Alto', power: 72 },
  { id: 'con_6', name: 'Atlético Valle Verde', power: 74 },
  { id: 'con_7', name: 'Ciudad Costanera FC', power: 75 },
  { id: 'con_8', name: 'Club Pehuén Andino', power: 73 }
]

import type { MundialConfed } from '@/types/competitions'

// ===== Copa dos Continentes (docs/plano-fase-8-mundial-patrocinador.md, secoes 3, 4 e 10) =====
export const MUNDIAL_LABEL = 'Copa dos Continentes'
export const MUNDIAL_EVERY = 4
export const MUNDIAL_SLOTS: Record<MundialConfed, number> = { europa: 12, sulamerica: 6, asia: 4, africa: 4, norte: 4, oceania: 1, sede: 1 }

// Nomes ficticios. Etiquetas: 'Campeão da Liga Boreal' (europa), Eclipse (asia), Cometa (africa), Polar (norte), Fênix (oceania).
export const MUNDIAL_RIVALS = {
  europa: { minOver: 74, maxOver: 83, label: 'Liga Boreal', names: [
    'Real Montanha FC', 'Atlético Fiorde', 'Union Nordhaven', 'Sporting Castelmar',
    'Dinamo Verdália', 'FC Aurelion', 'Borealis United', 'Stella Argenta',
    'Olimpia Kronberg', 'Racing Valmonte', 'AS Belvedere', 'Wolfram Rovers',
    'Athletic Lunaris', 'Torre Alta CF', 'Esperia Calcio', 'Vanguard Ostrava'
  ] },
  asia: { minOver: 66, maxOver: 72, label: 'Liga Eclipse', names: [
    'Tora FC', 'Akari United', 'Lótus Dourado SC', 'Meihua Dragons', 'Sunrise Kyoten', 'Jade Tigers'
  ] },
  africa: { minOver: 65, maxOver: 71, label: 'Liga Cometa', names: [
    'Savana Stars', 'Baobá FC', 'Kilima United', 'Sahel Eagles', 'Jua Mkuu SC', 'Delta Lions'
  ] },
  norte: { minOver: 65, maxOver: 71, label: 'Liga Polar', names: [
    'Pinheiral Rangers', 'Lagos del Norte FC', 'Caribe Sol SC', 'Gélido Wolves', 'Mesa Roja Club', 'Costa Azteca FC'
  ] },
  oceania: { minOver: 56, maxOver: 60, label: 'Liga Fênix', names: [
    'Coral Bay FC', 'Kiwi Ridge United', 'Maré Austral SC'
  ] }
}

export interface MundialHost { id: string; name: string; power?: number; user?: boolean }
export const MUNDIAL_HOSTS: MundialHost[] = [
  { id: 'hoshi', name: 'Ilhas Hoshi', power: 67 },
  { id: 'najm', name: 'Emirado de Najm', power: 66 },
  { id: 'nyota', name: 'Reino de Nyota', power: 65 },
  { id: 'casa', name: 'Brasil', user: true }
]

export const RANKING_CONTINENTAL = {
  ouro: { groups: 0, qf: 3, sf: 6, runnerUp: 9, champion: 12 },
  prata: { groups: 0, qf: 0, sf: 1, runnerUp: 2, champion: 4 },
  serieA: { champion: 8, top4: 2, top6: 0 },
  cup: { champion: 3, runnerUp: 1 },
  recopa: 1,
  supercup: 1,
  cutoff: 38
}

export type EcoNode =
  | 'serieD' | 'serieC' | 'serieB' | 'serieA' | 'cup' | 'ouro' | 'prata'
  | 'supercup' | 'recopa' | 'ranking' | 'mundial'

export const ECOSYSTEM_LINKS: Array<{ from: EcoNode; to: EcoNode; rule: string }> = [
  { from: 'serieD', to: 'serieC', rule: '4 sobem' },
  { from: 'serieD', to: 'supercup', rule: 'campeão' },
  { from: 'serieD', to: 'cup', rule: 'todos disputam' },
  { from: 'serieC', to: 'serieB', rule: '4 sobem' },
  { from: 'serieC', to: 'serieD', rule: '4 caem' },
  { from: 'serieC', to: 'supercup', rule: 'campeão' },
  { from: 'serieB', to: 'serieA', rule: '4 sobem' },
  { from: 'serieB', to: 'serieC', rule: '4 caem' },
  { from: 'serieB', to: 'supercup', rule: 'campeão' },
  { from: 'serieA', to: 'ouro', rule: '1º a 4º' },
  { from: 'serieA', to: 'prata', rule: '5º e 6º' },
  { from: 'serieA', to: 'supercup', rule: 'campeão' },
  { from: 'serieA', to: 'mundial', rule: 'campeão, no ano em que o país é sede' },
  { from: 'serieA', to: 'ranking', rule: '1º a 6º' },
  { from: 'serieA', to: 'serieB', rule: '4 caem' },
  { from: 'cup', to: 'prata', rule: 'campeão, se não estiver na Ouro' },
  { from: 'cup', to: 'supercup', rule: 'campeão' },
  { from: 'cup', to: 'mundial', rule: 'suplente da vaga da sede' },
  { from: 'cup', to: 'ranking', rule: 'campeão e vice' },
  { from: 'ouro', to: 'recopa', rule: 'campeão' },
  { from: 'ouro', to: 'mundial', rule: 'campeões do ciclo' },
  { from: 'ouro', to: 'ranking', rule: 'todas as fases' },
  { from: 'prata', to: 'recopa', rule: 'campeão' },
  { from: 'prata', to: 'ranking', rule: 'todas as fases' },
  { from: 'supercup', to: 'ranking', rule: 'campeão: 1' },
  { from: 'recopa', to: 'ranking', rule: 'campeão: 1' },
  { from: 'ranking', to: 'mundial', rule: 'vagas sul-americanas que sobram' }
]

// ===== Balanceamento v2 (docs/plano-balanceamento.md) =====
/** OVER de time típico de cada série (chave = divisão: 4 = D ... 1 = A). Mesma unidade do OVER do usuário. */
export const SERIE_TYPICAL_OVER: Record<number, number> = { 4: 50, 3: 57, 2: 64, 1: 71 }

export const PRIZES = {
  // Sem cota base: só recebe quem sobe, avança no mata-mata ou fica no G-16 da A. Rebaixado e eliminado cedo = 0.
  // Copa e continental pagam por fase/jogo. Escada: série de cima paga estritamente mais na colocação comparável.
  cup: { rounds: [10000, 20000, 40000, 260000], finalLoss: 70000, thirdWin: 25000, thirdLoss: 10000 },
  continental: { win: 30000, other: 10000, champion: 180000, runnerUp: 70000, third: 30000 },
  supercup: { champion: 40000, runnerUp: 15000 },
  recopa: { champion: 60000, runnerUp: 25000 },
  // Copa dos Continentes: pago ao alcançar cada fase, sem cota base (plano fase 8, secao 7).
  mundial: { r16: 120000, qf: 180000, sf: 250000, thirdWin: 190000, thirdLoss: 60000, finalLoss: 350000, champion: 950000 },
  serieD: { groups: 0, r64: 8000, r32: 15000, r16: 24000, qf: 34000, fourth: 52000, third: 60000, runnerUp: 68000, champion: 80000 },
  serieC: { relegated: 0, stayed: 0, quadElim: 0, fourth: 85000, third: 100000, runnerUp: 115000, champion: 140000 },
  serieB: { relegated: 0, stayed: 0, promotion: 150000, fourth: 150000, third: 170000, runnerUp: 200000, champion: 240000 },
  serieA: {
    relegated: 0,
    champion: 300000,
    // 1º ao 16º (índice = colocação - 1), proporções da pesquisa; 17º a 20º não recebem
    byRank: [300000, 285000, 270000, 255000, 240000, 225000, 210000, 195000, 180000, 165000, 129000, 120000, 111000, 108000, 105000, 102000]
  }
} as const

// NAME_MIGRATION_MAP:start
// Textos antigos gravados em save -> textos novos (plano fase 8, secao 10.2). Troca exata e idempotente.
export const NAME_MIGRATION_MAP: Record<string, string> = {
  'Taça Cacique': 'Taça do Povo',
  'Campeão da Taça Cacique': 'Campeão da Taça do Povo',
  'Vice da Taça Cacique': 'Vice da Taça do Povo',
  'Final da Taça Cacique': 'Final da Taça do Povo',
  'Supercopa Soberana': 'Supercopa Zênite',
  'Campeão da Supercopa Soberana': 'Campeão da Supercopa Zênite',
  'Recopa Condor': 'Recopa dos Condores',
  'Campeão da Recopa Condor': 'Campeão da Recopa dos Condores',
  'Tupinambá EC': 'Lua Nova EC',
  'Noroeste do Vale': 'Vale do Sol',
  'Operário Araucário': 'Pinhal Celeste',
  'Oeste Catarinense': 'Poente FC',
  'Farroupilha AC': 'Meridiano AC',
  'Ferrovia Paulista': 'Via Láctea FC',
  'São Bento do Vale': 'Serra do Luar',
  'Esperança de Lagarto': 'Estrela do Agreste'
}
/** Clubes renomeados, pelo id interno (que não muda). */
export const CLUB_RENAME_BY_ID: Record<string, string> = {
  d_18: 'Lua Nova EC', b_10: 'Vale do Sol', b_14: 'Pinhal Celeste', b_16: 'Poente FC',
  a_8: 'Meridiano AC', c_8: 'Via Láctea FC', c_9: 'Serra do Luar', c_11: 'Estrela do Agreste'
}
/** Nome antigo da final da Taça nos históricos de save antigo. */
export const LEGACY_CUP_FINAL_NAME = 'Final da Taça Cacique'
// NAME_MIGRATION_MAP:end

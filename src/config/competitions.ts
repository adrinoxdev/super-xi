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

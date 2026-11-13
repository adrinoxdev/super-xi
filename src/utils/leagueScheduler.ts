import { PRIZES } from './constants'
import type { CompetitionStageType, LeagueFixture, LeagueStandingRow, LeagueTeam } from '../types/league'

export type SerieCode = 'D' | 'C' | 'B' | 'A'

export const SERIE_META: Record<number, {
  code: SerieCode
  name: string
  championPrize: number
  formatSummary: string
}> = {
  4: {
    code: 'D',
    name: 'Liga Aurora — Série D',
    championPrize: PRIZES.serieD.champion,
    formatSummary: '1ª Fase (Grupos de 6 • 10 rodadas, G-4 avança) → Mata-mata Ida/Volta (vencedores das quartas sobem: 4 sobem) • Prêmio só a partir da 2ª fase'
  },
  3: {
    code: 'C',
    name: 'Liga Aurora — Série C',
    championPrize: PRIZES.serieC.champion,
    formatSummary: '1ª Fase (20 clubes • 19 rodadas, G-8 avança, Z-4 cai) → Quadrangulares (6 rodadas, 4 sobem) → Final (ida e volta) e disputa de 3º • Prêmio só para os 4 que sobem'
  },
  2: {
    code: 'B',
    name: 'Liga Aurora — Série B',
    championPrize: PRIZES.serieB.champion,
    formatSummary: 'Pontos Corridos • 20 clubes • 38 rodadas (Turno e Returno) • G-4 sobe (só eles recebem prêmio) • Z-4 cai'
  },
  1: {
    code: 'A',
    name: 'Liga Aurora — Série A',
    championPrize: PRIZES.serieA.champion,
    formatSummary: 'Pontos Corridos • 20 clubes • 38 rodadas (Turno e Returno) • Campeão + G-6 Continental • Prêmio do 1º ao 16º • Z-4 cai'
  }
}

export const STAGE_NAMES: Record<CompetitionStageType, string> = {
  D_GROUPS: 'Série D — 1ª Fase (Grupo A1)',
  D_R64: 'Série D — 2ª Fase (Ida e Volta)',
  D_R32: 'Série D — 3ª Fase (Ida e Volta)',
  D_R16: 'Série D — Oitavas de Final',
  D_QF: 'Série D — Quartas de Final (Vale Acesso)',
  D_SF: 'Série D — Semifinal',
  D_FINAL: 'Série D — Final Nacional',
  D_THIRD: 'Série D — Disputa de 3º Lugar',
  C_FIRST_STAGE: 'Série C — 1ª Fase (19 Rodadas)',
  C_QUADRANGULAR: 'Série C — Quadrangular do Acesso',
  C_FINAL: 'Série C — Final Nacional',
  C_THIRD: 'Série C — Disputa de 3º Lugar',
  POINTS_38: 'Pontos Corridos (38 Rodadas)'
}

export const KNOCKOUT_STAGES: CompetitionStageType[] = [
  'D_R64', 'D_R32', 'D_R16', 'D_QF', 'D_SF', 'D_FINAL', 'D_THIRD', 'C_FINAL', 'C_THIRD'
]


export const LEAGUE_CLUBS_POOL: Record<number, Array<{ id: string; name: string; basePower: number; style: string }>> = {
  4: [
    { id: 'd_1', name: 'Serra Dourada FC', basePower: 47, style: 'Contra-Ataque' },
    { id: 'd_2', name: 'Rio Claro do Norte', basePower: 52, style: 'Ofensivo Total' },
    { id: 'd_3', name: 'Lusitano de Vargem', basePower: 50, style: 'Pressão Alta' },
    { id: 'd_4', name: 'Pouso Fundo', basePower: 48, style: 'Retranca' },
    { id: 'd_5', name: 'Nova Santa Rita', basePower: 53, style: 'Posse de Bola' },
    { id: 'd_6', name: 'Planaltina Real', basePower: 49, style: 'Posse de Bola' },
    { id: 'd_7', name: 'Mangabeira EC', basePower: 51, style: 'Equilibrado' },
    { id: 'd_8', name: 'Tabuleiro EC', basePower: 50, style: 'Jogo Aéreo' },
    { id: 'd_9', name: 'Jaguatirica FC', basePower: 48, style: 'Retranca' },
    { id: 'd_10', name: 'Pampeiro EC', basePower: 52, style: 'Ofensivo Total' },
    { id: 'd_11', name: 'Pindorama Atlético', basePower: 54, style: 'Tiki-Taka' },
    { id: 'd_12', name: 'Iguaçu do Sul', basePower: 53, style: 'Transição Rápida' },
    { id: 'd_13', name: 'Goianira FC', basePower: 47, style: 'Equilibrado' },
    { id: 'd_14', name: 'Riachuelo-SE', basePower: 49, style: 'Contra-Ataque' },
    { id: 'd_15', name: 'Oeiras Atlético', basePower: 51, style: 'Jogo Aéreo' },
    { id: 'd_16', name: 'Sete de Setembro-RS', basePower: 53, style: 'Pressão Alta' },
    { id: 'd_17', name: 'Clube do Retiro Novo', basePower: 46, style: 'Posse de Bola' },
    { id: 'd_18', name: 'Tupinambá EC', basePower: 50, style: 'Transição Rápida' },
    { id: 'd_19', name: 'Penedo Atlético', basePower: 49, style: 'Equilibrado' }
  ],
  3: [
    { id: 'c_1', name: 'Tapajós Esporte', basePower: 54, style: 'Pressão Alta' },
    { id: 'c_2', name: 'Ribeirinho AC', basePower: 55, style: 'Posse de Bola' },
    { id: 'c_3', name: 'Barra Velha EC', basePower: 56, style: 'Equilibrado' },
    { id: 'c_4', name: 'Araucária Real', basePower: 57, style: 'Contra-Ataque' },
    { id: 'c_5', name: 'Guaribas EC', basePower: 58, style: 'Ofensivo Total' },
    { id: 'c_6', name: 'Barra do Sul FC', basePower: 59, style: 'Tiki-Taka' },
    { id: 'c_7', name: 'Caiçara FC', basePower: 59, style: 'Transição Rápida' },
    { id: 'c_8', name: 'Ferrovia Paulista', basePower: 60, style: 'Posse de Bola' },
    { id: 'c_9', name: 'São Bento do Vale', basePower: 61, style: 'Pressão Alta' },
    { id: 'c_10', name: 'Atlético Serrano', basePower: 61, style: 'Ofensivo Total' },
    { id: 'c_11', name: 'Esperança de Lagarto', basePower: 54, style: 'Retranca' },
    { id: 'c_12', name: 'Estrela de Malta EC', basePower: 55, style: 'Jogo Aéreo' },
    { id: 'c_13', name: 'Tombo Velho', basePower: 56, style: 'Equilibrado' },
    { id: 'c_14', name: 'Aliança Potiguar', basePower: 57, style: 'Contra-Ataque' },
    { id: 'c_15', name: 'Florestal EC', basePower: 54, style: 'Retranca' },
    { id: 'c_16', name: 'Maranhense do Cais', basePower: 58, style: 'Transição Rápida' },
    { id: 'c_17', name: 'Santa Rosa da Mata', basePower: 57, style: 'Pressão Alta' },
    { id: 'c_18', name: 'Aurora Capixaba', basePower: 55, style: 'Equilibrado' },
    { id: 'c_19', name: 'Trilhos do Ceará', basePower: 57, style: 'Contra-Ataque' }
  ],
  2: [
    { id: 'b_1', name: 'Porto Praiano', basePower: 68, style: 'Tiki-Taka' },
    { id: 'b_2', name: 'Capibaribe SC', basePower: 68, style: 'Pressão Alta' },
    { id: 'b_3', name: 'Jangadeiros FC', basePower: 67, style: 'Transição Rápida' },
    { id: 'b_4', name: 'Pinhais AC', basePower: 66, style: 'Posse de Bola' },
    { id: 'b_5', name: 'Cerrado Esporte', basePower: 65, style: 'Contra-Ataque' },
    { id: 'b_6', name: 'Sabará Mineiro', basePower: 65, style: 'Equilibrado' },
    { id: 'b_7', name: 'Ilhéu Catarinense', basePower: 64, style: 'Jogo Aéreo' },
    { id: 'b_8', name: 'Vila Hermínia', basePower: 64, style: 'Retranca' },
    { id: 'b_9', name: 'Mirante Paulista', basePower: 65, style: 'Posse de Bola' },
    { id: 'b_10', name: 'Noroeste do Vale', basePower: 64, style: 'Pressão Alta' },
    { id: 'b_11', name: 'Bandeirante de Campinas', basePower: 63, style: 'Equilibrado' },
    { id: 'b_12', name: 'Mogiana Alvinegra', basePower: 62, style: 'Contra-Ataque' },
    { id: 'b_13', name: 'Alagoano do Mar', basePower: 63, style: 'Transição Rápida' },
    { id: 'b_14', name: 'Operário Araucário', basePower: 63, style: 'Retranca' },
    { id: 'b_15', name: 'Guajará Esporte', basePower: 62, style: 'Jogo Aéreo' },
    { id: 'b_16', name: 'Oeste Catarinense', basePower: 61, style: 'Equilibrado' },
    { id: 'b_17', name: 'Selva Amazônica FC', basePower: 62, style: 'Contra-Ataque' },
    { id: 'b_18', name: 'Camboriú Real', basePower: 61, style: 'Retranca' },
    { id: 'b_19', name: 'Ituverava FC', basePower: 62, style: 'Ofensivo Total' }
  ],
  1: [
    { id: 'a_1', name: 'Soberano FC', basePower: 76, style: 'Ofensivo Total' },
    { id: 'a_2', name: 'Esmeralda Paulista', basePower: 76, style: 'Pressão Alta' },
    { id: 'a_3', name: 'Sol Nascente EC', basePower: 75, style: 'Transição Rápida' },
    { id: 'a_4', name: 'Atlético Montanhês', basePower: 74, style: 'Posse de Bola' },
    { id: 'a_5', name: 'Pampa Sport Clube', basePower: 73, style: 'Pressão Alta' },
    { id: 'a_6', name: 'Bandeirantes FC', basePower: 72, style: 'Equilibrado' },
    { id: 'a_7', name: 'Cais do Porto', basePower: 71, style: 'Tiki-Taka' },
    { id: 'a_8', name: 'Farroupilha AC', basePower: 71, style: 'Contra-Ataque' },
    { id: 'a_9', name: 'Minas Celeste', basePower: 70, style: 'Posse de Bola' },
    { id: 'a_10', name: 'Mucuripe FC', basePower: 71, style: 'Transição Rápida' },
    { id: 'a_11', name: 'Recôncavo Atlético', basePower: 70, style: 'Tiki-Taka' },
    { id: 'a_12', name: 'Tatuapé FC', basePower: 71, style: 'Contra-Ataque' },
    { id: 'a_13', name: 'Caravela FC', basePower: 69, style: 'Jogo Aéreo' },
    { id: 'a_14', name: 'Ventania PR', basePower: 70, style: 'Pressão Alta' },
    { id: 'a_15', name: 'Alto Tietê FC', basePower: 69, style: 'Ofensivo Total' },
    { id: 'a_16', name: 'Barra Nova EC', basePower: 68, style: 'Retranca' },
    { id: 'a_17', name: 'Vale Verde EC', basePower: 68, style: 'Jogo Aéreo' },
    { id: 'a_18', name: 'Carvoeiro FC', basePower: 67, style: 'Equilibrado' },
    { id: 'a_19', name: 'Pantanal Esporte', basePower: 67, style: 'Retranca' }
  ]
}

export function buildRoundRobin(
  teamIds: string[],
  stage: CompetitionStageType,
  group: string | undefined,
  doubleRound: boolean,
  startRound = 1
): LeagueFixture[] {
  const list = [...teamIds]
  if (list.length % 2 !== 0) list.push('BYE')
  const n = list.length
  const roundsPerHalf = n - 1
  const fixed = list[0]
  let rotating = list.slice(1)
  const firstHalf: LeagueFixture[] = []

  for (let r = 0; r < roundsPerHalf; r++) {
    const order = [fixed, ...rotating]
    const roundNum = startRound + r
    for (let i = 0; i < n / 2; i++) {
      const t1 = order[i]
      const t2 = order[n - 1 - i]
      if (t1 === 'BYE' || t2 === 'BYE') continue
      const flip = (r + i) % 2 === 1
      firstHalf.push({
        id: `fx_${stage}_${group ?? 'all'}_r${roundNum}_${i}`,
        round: roundNum,
        stage,
        group,
        homeId: flip ? t2 : t1,
        awayId: flip ? t1 : t2,
        homeScore: null,
        awayScore: null,
        played: false
      })
    }
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)]
  }

  if (!doubleRound) return firstHalf

  const secondHalf: LeagueFixture[] = firstHalf.map((fx, idx) => ({
    id: `fx_${stage}_${group ?? 'all'}_r${fx.round + roundsPerHalf}_${idx}`,
    round: fx.round + roundsPerHalf,
    stage,
    group,
    homeId: fx.awayId,
    awayId: fx.homeId,
    homeScore: null,
    awayScore: null,
    played: false
  }))

  return [...firstHalf, ...secondHalf]
}

export function zoneBadgeClass(stage: CompetitionStageType, rank: number, division = 2): string {
  // Depois da fase de grupos/quadrangular, a tabela exibida continua sendo a dela: mantém as mesmas zonas.
  if (stage.startsWith('D_')) stage = 'D_GROUPS'
  if (stage === 'C_FINAL' || stage === 'C_THIRD') stage = 'C_QUADRANGULAR'

  if (stage === 'D_GROUPS') {
    return rank <= 4 ? 'bg-emeraldpro text-white' : 'bg-dangerpro text-white'
  }
  if (stage === 'C_FIRST_STAGE') {
    if (rank <= 8) return 'bg-emeraldpro text-white'
    if (rank >= 17) return 'bg-dangerpro text-white'
    return 'bg-subtle text-ink'
  }
  if (stage === 'C_QUADRANGULAR') {
    return rank <= 2 ? 'bg-emeraldpro text-white' : 'bg-dangerpro text-white'
  }
  // Série A: 1º-4º Copa Condor de Ouro, 5º-6º Copa Condor de Prata, 17º-20º rebaixamento.
  if (division === 1) {
    if (rank <= 4) return 'bg-emeraldpro text-white'
    if (rank <= 6) return 'bg-amberpro text-white'
    if (rank >= 17) return 'bg-dangerpro text-white'
    return 'bg-subtle text-ink'
  }
  // Série B: 1º-4º acesso, 17º-20º rebaixamento.
  if (rank <= 4) return 'bg-emeraldpro text-white'
  if (rank >= 17) return 'bg-dangerpro text-white'
  return 'bg-subtle text-ink'
}

export function computeStandings(
  teams: LeagueTeam[],
  fixtures: LeagueFixture[],
  stage: CompetitionStageType,
  userTeamName: string,
  groupOverride?: string
): LeagueStandingRow[] {
  // No mata-mata da Série D, a tabela é a da última fase de grupos (D_GROUPS, grupo A1).
  const dKnockout = stage.startsWith('D_') && stage !== 'D_GROUPS'
  const cQuadAfter = stage === 'C_FINAL' || stage === 'C_THIRD'
  const groupFilter =
    stage === 'D_GROUPS' || dKnockout ? 'A1' :
    stage === 'C_QUADRANGULAR' || cQuadAfter ? (groupOverride || teams.find((t) => t.id === 'user')?.group || 'B') :
    null
  const stageFilter: CompetitionStageType =
    dKnockout ? 'D_GROUPS' :
    cQuadAfter ? 'C_QUADRANGULAR' :
    stage === 'D_GROUPS' || stage === 'C_FIRST_STAGE' || stage === 'C_QUADRANGULAR' ? stage : 'POINTS_38'

  const map = new Map<string, Omit<LeagueStandingRow, 'rank'>>()
  for (const t of teams.filter((x) => !groupFilter || x.group === groupFilter)) {
    map.set(t.id, {
      teamId: t.id,
      name: t.isUser ? userTeamName : t.name,
      isUser: t.isUser,
      played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0
    })
  }

  for (const fx of fixtures) {
    if (!fx.played || fx.homeScore === null || fx.awayScore === null) continue
    if (fx.stage !== stageFilter) continue
    if (groupFilter && fx.group !== groupFilter) continue
    const h = map.get(fx.homeId)
    const a = map.get(fx.awayId)
    if (!h || !a) continue
    h.played++; a.played++
    h.gf += fx.homeScore; h.ga += fx.awayScore
    a.gf += fx.awayScore; a.ga += fx.homeScore
    if (fx.homeScore > fx.awayScore) { h.won++; h.points += 3; a.lost++ }
    else if (fx.homeScore < fx.awayScore) { a.won++; a.points += 3; h.lost++ }
    else { h.drawn++; a.drawn++; h.points++; a.points++ }
  }

  const rows = Array.from(map.values()).map((r) => ({ ...r, gd: r.gf - r.ga }))
  rows.sort((a, b) => (b.points - a.points) || (b.won - a.won) || (b.gd - a.gd) || (b.gf - a.gf))
  return rows.map((r, idx) => ({ ...r, rank: idx + 1 }))
}

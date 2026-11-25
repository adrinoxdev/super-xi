export type BracketCompetition = 'cup' | 'continental' | 'serieD' | 'serieC' | 'mundial'

/** Time participante da chave. Para o usuário, id = 'user' e o nome exibido vem sempre da store club. */
export interface BracketTeam {
  id: string
  name: string
  power: number        // OVER usado na simulação e exibido como "OVER 912"
  tag?: string         // origem curta: 'Série B', '1º Grupo A', '2º A7'
}

/** Um jogo do confronto. Placar nulo = não jogado (ou legado sem placar registrado). */
export interface BracketLeg {
  homeId: string
  awayId: string
  homeScore: number | null
  awayScore: number | null
  played: boolean
}

/** Pênaltis do confronto. 'home' é sempre o time em tie.homeId. */
export interface PenaltyShootout {
  home: number
  away: number
}

export interface BracketTie {
  id: string                 // 'cup_r2_t1', 'con_third', 'D_R16_t5'
  roundIndex: number         // índice da fase; -1 = disputa de 3º; -2 = lado (playoff)
  slot: number               // posição na fase (0-based); o vencedor vai para slot floor(slot/2) da fase seguinte
  homeId: string | null      // manda o ÚLTIMO (ou único) jogo; null = a definir
  awayId: string | null
  homeLabel: string          // texto quando homeId é null: 'Venc. Quartas 1', '1º Grupo B', '1º A1'
  awayLabel: string
  legCount: 1 | 2
  legs: BracketLeg[]         // [] enquanto os dois times não são conhecidos; depois tem exatamente legCount itens
  penalties: PenaltyShootout | null
  winnerId: string | null
  loserId: string | null
  walkover?: boolean         // usuário não jogou antes da virada de temporada (W.O.)
  legacy?: boolean           // resultado reconstruído de save antigo
}

export interface BracketRound {
  key: string                // 'R16' | 'QF' | 'SF' | 'FINAL' | 'D_R64' ...
  label: string              // 'Oitavas de Final'
  shortLabel: string         // 'Oitavas' (abas no celular)
  legCount: 1 | 2
  ties: BracketTie[]
}

/** Chave paralela alimentada por perdedores (Playoff de Acesso da Série D). */
export interface BracketSide {
  key: string
  label: string
  legCount: 1 | 2
  ties: BracketTie[]
}

export interface PodiumEntry {
  teamId: string
  name: string
  isUser: boolean
}

export interface Podium {
  competition: BracketCompetition
  competitionLabel: string   // 'Taça do Povo', 'Copa Condor de Ouro', 'Liga Aurora — Série D'
  season: number
  champion: PodiumEntry
  runnerUp: PodiumEntry
  third: PodiumEntry | null
  finalSummary: string       // 'Soberano FC 2 x 1 Porto Praiano' ou 'Agregado 3 x 3 (pên. 4 x 2)'
  thirdSummary: string | null
}

export interface Bracket {
  competition: BracketCompetition
  season: number
  label: string
  teams: Record<string, BracketTeam>
  rounds: BracketRound[]
  thirdPlace: BracketTie | null
  side: BracketSide | null
  podium: Podium | null
  /** Jogo em campo neutro (sem mando). */
  neutral?: boolean
}

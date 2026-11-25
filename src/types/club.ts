import type { Podium } from './bracket'

export interface ClubUpgrades {
  scoutingLevel: number
  squadCapacityLevel: number
  trainingCenterLevel: number
  medicalCenterLevel: number
  stadiumLevel: number
  financeLevel: number
}

export type TransferOperationType = 'sign' | 'sell' | 'loan_in' | 'loan_out' | 'renew' | 'release' | 'retire'

export interface TransferRecord {
  id: string
  season: number
  type: TransferOperationType
  playerName: string
  position: string
  overall: number
  amount: number
}

export interface TrophyRecord {
  id: string
  season: number
  type: 'title' | 'promotion'
  title: string
  prize: number
}

export interface Club {
  name: string
  reputation: number
  budget: number
  upgrades: ClubUpgrades
  season: number
  division: number
  shortName?: string
  stadiumName?: string
  crestShape?: CrestShape
  primaryColor?: string
  secondaryColor?: string
  crestPattern?: CrestPattern
  crestOrientation?: CrestOrientation
  crestStripes?: number
  crestTextColor?: string
  crestTextStroke?: string
}

export type CrestShape =
  | 'portugues'
  | 'frances'
  | 'ombros'
  | 'brasao'
  | 'medalhao'
  | 'oval'
  | 'losango'
  | 'coracao'
  | 'pergaminho'
  | 'chanfrado'

/** Formatos antigos (saves anteriores); migrados em normalizeCrestShape. */
export type LegacyCrestShape = 'modern' | 'classic' | 'round' | 'shield' | 'pennant'

export type CrestPattern = 'liso' | 'listras' | 'faixa' | 'metade' | 'xadrez'
export type CrestOrientation = 'vertical' | 'horizontal' | 'diagonal-esquerda' | 'diagonal-direita'

export interface ClubStaff {
  assistantCoach: boolean
  fitnessCoach: boolean
  chiefScout: boolean
  financeDirector: boolean
  marketAnalyst: boolean
  youthCoach: boolean
  physio: boolean
}

export type StaffKey = keyof ClubStaff

export interface CareerStatEntry {
  name: string
  position: string
  apps: number
  goals: number
  assists?: number
  yellows?: number
  reds?: number
}

export interface SeasonReview {
  season: number
  division: number
  overStart: number
  overEnd: number
  totalGain: number
  top: Array<{ name: string; gain: number; overall: number }>
  seen: boolean
}

export interface Milestone {
  id: string
  season: number
  title: string
}

/** Progresso e marcos da carreira (docs/plano-progressao.md, seção 9). */
export interface ClubProgress {
  /** OVER do time no início da temporada (1 casa). */
  seasonStartOver: number
  /** id do atleta -> OVER no início da temporada. */
  seasonStartPlayerOver: Record<string, number>
  /** id do atleta -> OVER ganho pela evolução nesta temporada. */
  seasonGains: Record<string, number>
  lastSeason?: SeasonReview
  milestones: Milestone[]
}

export type EcoPhase = 'groups' | 'qf' | 'sf' | 'runnerUp' | 'champion'
export interface EcoChampion { name: string; power: number }
export interface SeasonEcoRecord {
  season: number
  division: number
  leagueRank: number | null
  leagueTitle: boolean
  ouro: EcoPhase | null
  prata: EcoPhase | null
  cup: 'champion' | 'runnerUp' | null
  recopa: boolean
  supercup: boolean
  ouroChampion: EcoChampion | null
  prataChampion: EcoChampion | null
  cupChampion: EcoChampion | null
  serieAChampion: EcoChampion | null
}

export interface ClubSave {
  /** Histórico do ciclo para o Ranking Condor (últimas 8 temporadas). */
  ecoRecords?: SeasonEcoRecord[]
  name: string
  shortName: string
  stadiumName: string
  crestShape: CrestShape
  primaryColor: string
  secondaryColor: string
  crestPattern: CrestPattern
  crestOrientation: CrestOrientation
  crestStripes: number
  crestTextColor: string
  crestTextStroke: string
  reputation: number
  budget: number
  season: number
  division: number
  upgrades: ClubUpgrades
  /** Pódios das temporadas encerradas, mais recente primeiro, no máximo 12. */
  podiumArchive?: Podium[]
  /** Peneiras feitas na temporada atual (limite MAX_TRYOUTS_PER_SEASON); ausente em saves antigos = 0. */
  tryoutsThisSeason?: number
  /** Dia (meia-noite local, ms) em que os descansos foram contados e quantos já foram usados nele. */
  restDayStart?: number
  restUses?: number
  /** Instante (ms) até onde a recuperação natural de energia já foi aplicada. */
  staminaTickAt?: number
  /** Último instante (ms) em que o jogador esteve ativo; base da renda offline. Ausente em saves antigos = agora. */
  lastActiveAt?: number
  /** Ausente em saves antigos: vira o padrão ao carregar. */
  progress?: ClubProgress
}

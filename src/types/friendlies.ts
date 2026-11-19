/** Bot do ranking de amistosos. id 'fb_1'..'fb_100'. `over` é interno (só move o ranking), não é exibido. */
export interface FriendlyBot {
  id: string
  name: string
  over: number
  fame: number
}

/** Uma das 3 opções de um sorteio. `over` é o OVER do dia (exibido); `prize` já considera o limite diário. */
export interface FriendlyOption {
  botId: string
  name: string
  over: number
  fame: number
  rank: number
  prize: number
  fameWin: number
  fameDraw: number
  fameLoss: number
}

/** Desafio em andamento, gravado no apito inicial. */
export interface FriendlyChallenge {
  botId: string
  botName: string
  userOver: number
  oppOver: number
  prize: number
  rankBefore: number
  startedAt: number
}

/** Linha do histórico próprio (máx. 20, mais recente primeiro). */
export interface FriendlyResult {
  at: number
  botName: string
  oppOver: number
  userScore: number
  oppScore: number
  fameDelta: number
  prize: number
}

/** Resumo pós-jogo do amistoso (vai em LastMatchSummary.friendly). */
export interface FriendlySummary {
  prize: number
  fameDelta: number
  fameAfter: number
  rankBefore: number
  rankAfter: number
  paidCapReached: boolean
}

export interface FriendlyRankingView {
  top: Array<{ rank: number; name: string; fame: number; isUser: boolean }>
  user: { rank: number; fame: number }
}

export type FriendlyOutcome = 'win' | 'draw' | 'loss'

/** Dados do usuário que o sorteio precisa. `paidWinsLeft` pode ser Infinity (limite diário desligado). */
export interface FriendlyDrawContext {
  userOver: number
  userFame: number
  paidWinsLeft: number
}

/** Fonte dos adversários. Hoje: bots locais. Futuro: provedor remoto (jogadores reais), sem mudar a store. */
export interface FriendlyOpponentProvider {
  /** Avança o estado dos adversários até `now` (bots: simulação; futuro: busca remota). */
  refresh(now: number): void
  ranking(userFame: number): FriendlyRankingView
  drawOptions(ctx: FriendlyDrawContext, rng: () => number): FriendlyOption[]
  /** Aplica no adversário o efeito do resultado (bots: fama oposta). */
  reportResult(botId: string, userFameDelta: number): void
}

/** Campo `friendlies` do save principal (aditivo, sem migração numerada). */
export interface FriendliesSave {
  v: 1
  fame: number
  tokens: number
  tokenTickAt: number
  seed: number
  bots: FriendlyBot[]
  botsSimAt: number
  options: FriendlyOption[] | null
  /** 0..3 sorteios feitos no desafio atual; zera só em beginMatch. */
  drawsUsed: number
  selectedBotId: string | null
  active: FriendlyChallenge | null
  /** day = dayStart(ts) de src/config/time.ts */
  paidWins: { day: number; count: number }
  recent: FriendlyResult[]
}

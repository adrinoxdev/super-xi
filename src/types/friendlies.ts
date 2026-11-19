/** Estatísticas de amistoso (mesmas colunas da tabela da liga). `played` = won + drawn + lost. */
export interface FriendlyStats {
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
}

/** Quem entra no ranking: fama + estatísticas (FriendlyBot satisfaz por estrutura). */
export interface FriendlyStanding {
  fame: number
  stats: FriendlyStats
}

/** Bot do ranking de amistosos. id 'fb_1'..'fb_100'. `over` é interno (só move o ranking), não é exibido. */
export interface FriendlyBot {
  id: string
  name: string
  over: number
  fame: number
  stats: FriendlyStats
}

/**
 * Uma das 3 opções de um sorteio. Guarda o DESLOCAMENTO do rival (bônus de posição + variação), não o OVER absoluto:
 * o OVER do rival, o prêmio e a fama em jogo saem de quoteOption com o OVER do usuário (estimativa até o apito).
 */
export interface FriendlyOption {
  botId: string
  name: string
  fame: number
  rank: number
  offset: number
}

/** Valores de uma opção com um OVER do usuário: estimativa no cartão e no PreMatch; fixados no apito (beginMatch). */
export interface FriendlyQuote {
  oppOver: number
  /** Já considera o limite diário (0 se esgotado). */
  prize: number
  fameWin: number
  fameDraw: number
  fameLoss: number
}

/** Desafio em andamento, gravado no apito inicial (OVERs e prêmio já fixados). */
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

/** Linha da tabela de classificação dos amistosos. id = botId ou 'user'; gd = gf − ga. */
export interface FriendlyRankingRow {
  rank: number
  id: string
  name: string
  fame: number
  isUser: boolean
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
}

/** Top da tabela (usuário incluído na posição dele, se couber) + a linha do usuário. */
export interface FriendlyRankingView {
  top: FriendlyRankingRow[]
  user: FriendlyRankingRow
}

export type FriendlyOutcome = 'win' | 'draw' | 'loss'

/** Dados do usuário que o sorteio precisa: só a posição (o OVER entra depois, na cotação). */
export interface FriendlyDrawContext {
  user: FriendlyStanding
}

/** Resultado repassado ao provedor: delta de fama EFETIVAMENTE aplicado ao usuário e o placar do ponto de vista dele. */
export interface FriendlyReport {
  userFameDelta: number
  userScore: number
  oppScore: number
}

/** Fonte dos adversários. Hoje: bots locais. Futuro: provedor remoto (jogadores reais), sem mudar a store. */
export interface FriendlyOpponentProvider {
  /** Avança o estado dos adversários até `now` (bots: simulação; futuro: busca remota). Sem passo, não troca o array. */
  refresh(now: number): void
  ranking(user: FriendlyStanding): FriendlyRankingView
  drawOptions(ctx: FriendlyDrawContext, rng: () => number): FriendlyOption[]
  /** Aplica no adversário o efeito do resultado: fama oposta à aplicada ao usuário e o jogo nas estatísticas. */
  reportResult(botId: string, result: FriendlyReport): void
}

/** Campo `friendlies` do save principal (aditivo, sem migração numerada). */
export interface FriendliesSave {
  v: 1
  fame: number
  /** Campo novo (revisão do lote 1-7): ausente em save antigo → zerado. */
  stats: FriendlyStats
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

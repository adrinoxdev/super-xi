import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  FriendliesSave,
  FriendlyBot,
  FriendlyChallenge,
  FriendlyOption,
  FriendlyQuote,
  FriendlyResult,
  FriendlyStanding,
  FriendlyStats,
  FriendlySummary
} from '@/types/friendlies'
import { FRIENDLIES } from '@/config/friendlies'
import { dayStart } from '@/config/time'
import { clamp } from '@/utils/core/random'
import { msToNextToken, regenTokens as regenTokenState, spendToken, type TokenState } from '@/utils/friendlies/tokens'
import { applyFame, fameDelta, outcomeFromScore } from '@/utils/friendlies/fame'
import { quoteOption } from '@/utils/friendlies/draw'
import { generateBots, userRank } from '@/utils/friendlies/bots'
import { addResult, emptyStats, sanitizeStats } from '@/utils/friendlies/ranking'
import { createLocalBotProvider } from '@/utils/friendlies/localBotProvider'
import { useClubStore } from '@/stores/club'

function freshState(now: number): FriendliesSave {
  const seed = now
  return {
    v: 1,
    fame: FRIENDLIES.fame.start,
    stats: emptyStats(),
    tokens: FRIENDLIES.tokens.initial,
    tokenTickAt: now,
    seed,
    bots: generateBots(seed),
    botsSimAt: now,
    options: null,
    drawsUsed: 0,
    selectedBotId: null,
    active: null,
    paidWins: { day: 0, count: 0 },
    recent: []
  }
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const nums = (o: Record<string, unknown>, keys: string[]) => keys.every((k) => isNum(o[k]))

/** Bot do save: id/nome/OVER/fama válidos; OVER na faixa da geração, fama >= 0, estatísticas saneadas (save antigo sem `stats` → zeradas). */
function toBot(v: unknown): FriendlyBot | null {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object' || !isStr(o.id) || !isStr(o.name) || !isNum(o.over) || !isNum(o.fame)) return null
  const b = FRIENDLIES.bots
  return { id: o.id, name: o.name, over: clamp(Math.round(o.over), b.overFloor, b.overCeil), fame: Math.max(0, Math.round(o.fame)), stats: sanitizeStats(o.stats) }
}
/** Opção do save: só no formato com `offset` (a antiga, com `over`, é descartada); offset limitado à faixa possível do sorteio. */
function toOption(v: unknown): FriendlyOption | null {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object' || !isStr(o.botId) || !isStr(o.name) || !nums(o, ['fame', 'rank', 'offset'])) return null
  const d = FRIENDLIES.draw
  return { botId: o.botId, name: o.name, fame: o.fame as number, rank: o.rank as number, offset: clamp(o.offset as number, -d.spread, d.rankBonusMax + d.spread) }
}
function isChallenge(v: unknown): v is FriendlyChallenge {
  const o = v as Record<string, unknown> | null
  return !!o && isStr(o.botId) && isStr(o.botName) && nums(o, ['userOver', 'oppOver', 'prize', 'rankBefore', 'startedAt'])
}
function isResult(v: unknown): v is FriendlyResult {
  const o = v as Record<string, unknown> | null
  return !!o && isStr(o.botName) && nums(o, ['at', 'oppOver', 'userScore', 'oppScore', 'fameDelta', 'prize'])
}

export const useFriendliesStore = defineStore('friendlies', () => {
  const club = useClubStore()
  const init = freshState(Date.now())

  const fame = ref(init.fame)
  const stats = ref<FriendlyStats>(init.stats)
  const tokens = ref(init.tokens)
  const tokenTickAt = ref(init.tokenTickAt)
  const seed = ref(init.seed)
  const bots = ref<FriendlyBot[]>(init.bots)
  const botsSimAt = ref(init.botsSimAt)
  const options = ref<FriendlyOption[] | null>(init.options)
  const drawsUsed = ref(init.drawsUsed)
  const selectedBotId = ref<string | null>(init.selectedBotId)
  const active = ref<FriendlyChallenge | null>(init.active)
  const paidWins = ref(init.paidWins)
  const recent = ref<FriendlyResult[]>(init.recent)

  // A store só fala com a interface do provedor (spec §4.3); o local opera sobre bots/botsSimAt daqui.
  const provider = createLocalBotProvider({
    getBots: () => bots.value,
    setBots: (b) => (bots.value = b),
    getSimAt: () => botsSimAt.value,
    setSimAt: (t) => (botsSimAt.value = t),
    rng: Math.random
  })

  // Posição pela tabela de classificação (fama → vitórias → saldo → gols pró), como a liga.
  const standing = computed<FriendlyStanding>(() => ({ fame: fame.value, stats: stats.value }))
  const rank = computed(() => userRank(standing.value, bots.value))
  const ranking = computed(() => provider.ranking(standing.value))
  const drawsLeft = computed(() => Math.max(0, FRIENDLIES.draw.maxDraws - drawsUsed.value))
  const selectedOption = computed(() => options.value?.find((o) => o.botId === selectedBotId.value) ?? null)
  // club.clubNow é atualizado a cada 1 s pelo ticker (useScouting): o contador da tela anda sozinho.
  const msToNext = computed(() => msToNextToken({ tokens: tokens.value, tokenTickAt: tokenTickAt.value }, club.clubNow))

  function setTokens(s: TokenState) {
    if (s.tokens !== tokens.value) tokens.value = s.tokens
    if (s.tokenTickAt !== tokenTickAt.value) tokenTickAt.value = s.tokenTickAt
  }

  /** Vitórias pagas que ainda restam no dia de `now` (Infinity com o limite desligado). */
  function paidWinsLeft(now: number): number {
    const cap = FRIENDLIES.prize.paidWinsPerDay
    if (cap <= 0) return Number.POSITIVE_INFINITY
    const used = paidWins.value.day === dayStart(now) ? paidWins.value.count : 0
    return Math.max(0, cap - used)
  }

  /** Cotação de uma opção com o OVER informado: estimativa na tela e no PreMatch; o apito usa a mesma conta (beginMatch). */
  function quote(opt: FriendlyOption, userOver: number, now: number): FriendlyQuote {
    return quoteOption(opt.offset, userOver, paidWinsLeft(now))
  }

  function regenTokens(now: number) {
    setTokens(regenTokenState({ tokens: tokens.value, tokenTickAt: tokenTickAt.value }, now))
  }

  /** Avança o ranking dos bots até agora (chamado ao abrir /friendlies; sem timer em segundo plano). */
  function refresh(now: number) {
    provider.refresh(now)
  }

  /** Um sorteio do desafio atual (depende só da posição). Recusa com 3 já feitos ou com amistoso em andamento. Não exige ficha. */
  function draw(): boolean {
    if (active.value) return false
    if (drawsUsed.value >= FRIENDLIES.draw.maxDraws) return false
    options.value = provider.drawOptions({ user: standing.value }, Math.random)
    drawsUsed.value += 1
    selectedBotId.value = null
    return true
  }

  function select(botId: string): boolean {
    if (!options.value?.some((o) => o.botId === botId)) return false
    selectedBotId.value = botId
    return true
  }

  /**
   * Apito inicial: gasta 1 ficha, fixa o OVER do rival pelo OVER do time que vai a campo (não o do sorteio: fecha a brecha
   * de sortear com reservas e jogar com titulares), recalcula prêmio (com a virada do dia) e fama, grava o desafio e zera
   * o contador de sorteios. Devolve false sem opção escolhida, com OVER inválido, sem ficha ou com outro amistoso em andamento.
   */
  function beginMatch(userOver: number, now: number): boolean {
    const opt = selectedOption.value
    if (!opt || active.value || !Number.isFinite(userOver)) return false
    const regen = regenTokenState({ tokens: tokens.value, tokenTickAt: tokenTickAt.value }, now)
    const spent = spendToken(regen, now)
    if (!spent) {
      setTokens(regen)
      return false
    }
    setTokens(spent)
    const q = quote(opt, userOver, now)
    active.value = {
      botId: opt.botId,
      botName: opt.name,
      userOver,
      oppOver: q.oppOver,
      prize: q.prize,
      rankBefore: rank.value,
      startedAt: now
    }
    options.value = null
    selectedBotId.value = null
    drawsUsed.value = 0
    return true
  }

  /**
   * Fim do amistoso: fama (Elo com os OVERs do apito), estatísticas, prêmio da vitória (creditado no clube), bot com a
   * fama oposta à aplicada e o jogo espelhado, histórico próprio. Nunca toca em club.reputation (spec §2.12).
   */
  function settle(userScore: number, oppScore: number, now: number): FriendlySummary | null {
    const a = active.value
    if (!a) return null
    const outcome = outcomeFromScore(userScore, oppScore)
    const before = fame.value
    fame.value = applyFame(before, fameDelta(a.userOver, a.oppOver, outcome))
    const applied = fame.value - before
    stats.value = addResult(stats.value, userScore, oppScore)
    let prize = 0
    if (outcome === 'win' && a.prize > 0) {
      prize = a.prize
      const today = dayStart(now)
      paidWins.value = { day: today, count: (paidWins.value.day === today ? paidWins.value.count : 0) + 1 }
      club.earn(prize)
    }
    // Soma zero pelo que o usuário EFETIVAMENTE ganhou ou perdeu (o piso 0 pode cortar o delta calculado).
    provider.reportResult(a.botId, { userFameDelta: applied, userScore, oppScore })
    recent.value = [
      { at: now, botName: a.botName, oppOver: a.oppOver, userScore, oppScore, fameDelta: applied, prize },
      ...recent.value
    ].slice(0, FRIENDLIES.recentMax)
    active.value = null
    return {
      prize,
      fameDelta: applied,
      fameAfter: fame.value,
      rankBefore: a.rankBefore,
      rankAfter: rank.value,
      paidCapReached: outcome === 'win' && a.prize === 0 && FRIENDLIES.prize.paidWinsPerDay > 0
    }
  }

  /** Boot: desafio gravado sem partida ao vivo (save ao vivo perdido) não conta. Devolve true se limpou. */
  function resolveOrphan(isLive: boolean): boolean {
    if (!active.value || isLive) return false
    active.value = null
    return true
  }

  function apply(s: FriendliesSave) {
    fame.value = s.fame
    stats.value = s.stats
    tokens.value = s.tokens
    tokenTickAt.value = s.tokenTickAt
    seed.value = s.seed
    bots.value = s.bots
    botsSimAt.value = s.botsSimAt
    options.value = s.options
    drawsUsed.value = s.drawsUsed
    selectedBotId.value = s.selectedBotId
    active.value = s.active
    paidWins.value = s.paidWins
    recent.value = s.recent
  }

  function toSave(): FriendliesSave {
    return {
      v: 1,
      fame: fame.value,
      stats: stats.value,
      tokens: tokens.value,
      tokenTickAt: tokenTickAt.value,
      seed: seed.value,
      bots: bots.value,
      botsSimAt: botsSimAt.value,
      options: options.value,
      drawsUsed: drawsUsed.value,
      selectedBotId: selectedBotId.value,
      active: active.value,
      paidWins: paidWins.value,
      recent: recent.value
    }
  }

  /** Campo ausente ou de outra versão: estado novo. Presente: valida campo a campo com Number.isFinite (spec §5, Persistência). */
  function fromSave(raw: unknown) {
    const now = Date.now()
    const d = raw as Partial<Record<keyof FriendliesSave, unknown>> | null | undefined
    if (!d || typeof d !== 'object' || d.v !== 1) {
      apply(freshState(now))
      return
    }
    const seedV = isNum(d.seed) ? d.seed : now
    // Bot inválido ou quantidade errada: regenera os bots (fama e estatísticas do usuário ficam).
    const botList = Array.isArray(d.bots) ? d.bots.map(toBot) : []
    const botsV = botList.length === FRIENDLIES.bots.count && botList.every((b): b is FriendlyBot => b !== null) ? botList : generateBots(seedV)
    const optList = Array.isArray(d.options) ? d.options.map(toOption) : []
    const optionsV = optList.length > 0 && optList.every((o): o is FriendlyOption => o !== null) ? optList : null
    // Sem opções não há desafio em curso: o contador volta a 0 (o usuário não fica travado sem nada para escolher).
    const drawsV = optionsV && isNum(d.drawsUsed) ? clamp(Math.round(d.drawsUsed), 0, FRIENDLIES.draw.maxDraws) : 0
    const pw = d.paidWins as { day?: unknown; count?: unknown } | null | undefined
    apply({
      v: 1,
      fame: isNum(d.fame) ? Math.max(0, Math.round(d.fame)) : 0,
      stats: sanitizeStats(d.stats),
      tokens: isNum(d.tokens) ? clamp(Math.floor(d.tokens), 0, FRIENDLIES.tokens.max) : FRIENDLIES.tokens.initial,
      tokenTickAt: isNum(d.tokenTickAt) ? Math.min(d.tokenTickAt, now) : now,
      seed: seedV,
      bots: botsV,
      botsSimAt: isNum(d.botsSimAt) ? Math.min(d.botsSimAt, now) : now,
      options: optionsV,
      drawsUsed: drawsV,
      selectedBotId: optionsV && isStr(d.selectedBotId) && optionsV.some((o) => o.botId === d.selectedBotId) ? d.selectedBotId : null,
      active: isChallenge(d.active) ? d.active : null,
      paidWins: pw && isNum(pw.day) && isNum(pw.count) ? { day: pw.day, count: Math.max(0, Math.round(pw.count)) } : { day: 0, count: 0 },
      recent: Array.isArray(d.recent) ? (d.recent.filter(isResult) as FriendlyResult[]).slice(0, FRIENDLIES.recentMax) : []
    })
  }

  /** Nova carreira (clearSave): volta ao estado novo. */
  function reset() {
    apply(freshState(Date.now()))
  }

  return {
    fame,
    stats,
    standing,
    tokens,
    tokenTickAt,
    seed,
    bots,
    botsSimAt,
    options,
    drawsUsed,
    selectedBotId,
    active,
    paidWins,
    recent,
    rank,
    ranking,
    drawsLeft,
    selectedOption,
    msToNext,
    paidWinsLeft,
    quote,
    regenTokens,
    refresh,
    draw,
    select,
    beginMatch,
    settle,
    resolveOrphan,
    toSave,
    fromSave,
    reset
  }
})

import type { FriendlyBot, FriendlyOutcome, FriendlyRankingRow, FriendlyRankingView, FriendlyStanding, FriendlyStats } from '@/types/friendlies'
import { FRIENDLIES, FRIENDLY_BOT_NAME_PARTS } from '@/config/friendlies'
import { clamp, mulberry32, shuffle, type Rng } from '@/utils/core/random'
import { addResult, emptyStats, goalDiff, rankedBots, userRank } from './ranking'
import { randIntWith, safeRng } from './rng'

export { userRank }

/** Todas as combinações prefixo + lugar (200). */
export function allBotNames(): string[] {
  return FRIENDLY_BOT_NAME_PARTS.prefixes.flatMap((p) => FRIENDLY_BOT_NAME_PARTS.places.map((pl) => `${p} ${pl}`))
}

/**
 * 100 bots determinísticos pela semente: fama em curva (topo ~1800, 100º ~10), OVER interno ligado à fama e
 * estatísticas zeradas (a tabela começa junto com o usuário).
 */
export function generateBots(seed: number): FriendlyBot[] {
  const b = FRIENDLIES.bots
  const rng = safeRng(mulberry32(seed))
  const names = shuffle(allBotNames(), rng).slice(0, b.count)
  return Array.from({ length: b.count }, (_, i) => {
    const fame = Math.max(b.fameMinStart, Math.round(b.fameTop * (1 - i / b.count) ** b.fameCurve) + randIntWith(rng, -b.fameJitter, b.fameJitter))
    const over = clamp(Math.round(b.overMin + (b.overSpan * fame) / b.fameTop) + randIntWith(rng, -b.overJitter, b.overJitter), b.overFloor, b.overCeil)
    return { id: `fb_${i + 1}`, name: names[i], over, fame, stats: emptyStats() }
  })
}

/** Placar plausível para o resultado de um passo simulado (gf = gols do bot simulado). */
export function simScore(outcome: FriendlyOutcome, rng: Rng): { gf: number; ga: number } {
  const b = FRIENDLIES.bots
  if (outcome === 'draw') {
    const g = randIntWith(rng, 0, b.simDrawGoalsMax)
    return { gf: g, ga: g }
  }
  const winner = randIntWith(rng, 1, b.simWinGoalsMax)
  const loser = randIntWith(rng, 0, winner - 1)
  return outcome === 'win' ? { gf: winner, ga: loser } : { gf: loser, ga: winner }
}

/**
 * Evolução dos bots desde `lastSimAt`: um passo por hora inteira, no máximo 72 (o excedente é descartado, o resto de
 * tempo fica). Cada passo é um jogo por bot: ruído ± e puxão de volta ao alvo do OVER interno decidem a variação de
 * fama, e o resultado e o placar seguem essa variação. Não muta a entrada. Sem passo a dar, devolve o mesmo array
 * (a store não troca `bots`: nada reativo dispara e o save não muda à toa).
 */
export function simulateBots(bots: FriendlyBot[], lastSimAt: number, now: number, rng: Rng): { bots: FriendlyBot[]; simAt: number } {
  const b = FRIENDLIES.bots
  const elapsed = Math.floor((now - lastSimAt) / b.simStepMs)
  if (!(elapsed > 0)) return { bots, simAt: now < lastSimAt ? now : lastSimAt }
  const r = safeRng(rng)
  const steps = Math.min(b.simMaxSteps, elapsed)
  const next = bots.map((x) => ({ ...x }))
  for (let s = 0; s < steps; s++) {
    for (const bot of next) {
      // Piso no alvo: bot de OVER interno baixo não afunda até 0 e fica preso lá.
      const target = Math.max(b.fameMinStart, ((bot.over - b.overMin) / b.overSpan) * b.fameTop)
      const delta = randIntWith(r, -b.simNoise, b.simNoise) + randIntWith(r, -b.simNoise, b.simNoise) + Math.round((target - bot.fame) * b.simPull)
      // Resultado coerente com a fama: sobe na vitória, cai na derrota, mexe no máximo simDrawBand no empate.
      const outcome: FriendlyOutcome = delta > b.simDrawBand ? 'win' : delta < -b.simDrawBand ? 'loss' : 'draw'
      const score = simScore(outcome, r)
      bot.fame = Math.max(0, bot.fame + delta)
      bot.stats = addResult(bot.stats, score.gf, score.ga)
    }
  }
  return { bots: next, simAt: lastSimAt + elapsed * b.simStepMs }
}

function toRow(rank: number, id: string, name: string, fame: number, isUser: boolean, s: FriendlyStats): FriendlyRankingRow {
  return { rank, id, name, fame, isUser, played: s.played, won: s.won, drawn: s.drawn, lost: s.lost, gf: s.gf, ga: s.ga, gd: goalDiff(s) }
}

/** Tabela de classificação: topo (usuário incluído na posição dele, se couber) + a linha do usuário. */
export function rankingView(bots: readonly FriendlyBot[], user: FriendlyStanding & { name: string }): FriendlyRankingView {
  const uRank = userRank(user, bots)
  const userRow = toRow(uRank, 'user', user.name, user.fame, true, user.stats)
  const rows = rankedBots(bots, user).map(({ bot, rank }) => toRow(rank, bot.id, bot.name, bot.fame, false, bot.stats))
  rows.splice(uRank - 1, 0, userRow)
  return { top: rows.slice(0, FRIENDLIES.rankingTop), user: userRow }
}

import type { Bracket, BracketTie, ContinentalState, ContinentalTeam, ContinentalTier, CupState } from '@/types'
import { completeBracket, propagate, userFinalPosition, userPendingTie } from '@/utils/bracket/bracket'
import { seedContinentalGroups } from '@/utils/bracket/bracketSeeding'
import { shuffle } from '@/utils/core/random'
import { CONTINENTAL_ROUND_LABELS, OLD_CUP_NAMES, legacyRivalId, legacyUserResult, renameBracketTeam, scoreFromText } from './legacyBracket'

export interface LegacyCupDeps {
  getClubName: () => string
  buildCupBracket: (excludeId?: string) => Bracket
  rivalFromTie: (bracket: Bracket, tie: BracketTie | null) => CupState['currentRival']
}

export interface LegacyContinentalDeps {
  getClubName: () => string
  initContinentalForSeason: (qualified: boolean, tier?: ContinentalTier) => void
  playGroupRound: (round: number, userScore: [number, number] | null, onlyOthers?: boolean) => void
  buildContinentalBracket: (tier: ContinentalTier, groups: ContinentalTeam[][]) => Bracket
  seedContinentalKnockout: (forceUserTop2?: boolean) => void
}

/** Taça do Povo de save antigo: reconstrói a chave alinhada ao roundIndex, ao histórico e ao rival atual. */
export function migrateLegacyCup(cup: CupState, deps: LegacyCupDeps): void {
  if (cup.bracket) return
  const rival = cup.currentRival
  const rivalId = rival ? legacyRivalId(rival.name) : null
  const b = deps.buildCupBracket(rivalId ?? undefined)
  const last = b.rounds.length - 1
  const pending = Math.min(cup.roundIndex, last)
  const scoreOf = (r: number) =>
    scoreFromText(
      cup.history.find((h) => h.roundName === OLD_CUP_NAMES[r] || h.roundName === b.rounds[r].label)?.summary
    )
  const wins = cup.champion ? last + 1 : pending
  for (let r = 0; r < wins; r++) legacyUserResult(b, r, true, scoreOf(r))
  if (!cup.champion && rival && rivalId) {
    const tie = userPendingTie(b)
    const oppId = tie ? (tie.homeId === 'user' ? tie.awayId : tie.homeId) : null
    if (tie && oppId) {
      renameBracketTeam(b, oppId, rivalId, {
        id: rivalId,
        name: rival.name,
        power: rival.power,
        ...(rival.serieCode ? { tag: rival.serieCode } : {})
      })
    }
  }
  if (cup.eliminated && !cup.champion) legacyUserResult(b, pending, false, scoreOf(pending))
  b.teams.user.name = deps.getClubName()
  cup.bracket = b
  if (cup.champion) {
    completeBracket(b)
    cup.finalPosition = 1
    cup.thirdPlace = false
    cup.currentRival = null
  } else if (cup.eliminated) {
    if (pending === 2) {
      // Regra nova aplicada a quem caiu na semi: abre a disputa de 3º.
      cup.eliminated = false
      cup.thirdPlace = true
      cup.currentRival = deps.rivalFromTie(b, userPendingTie(b))
    } else {
      completeBracket(b)
      if (pending === last) cup.finalPosition = 2
      cup.currentRival = null
    }
  } else {
    propagate(b, { userHosts: true })
    if (!cup.currentRival) cup.currentRival = deps.rivalFromTie(b, userPendingTie(b))
  }
}

/** Continental de save antigo: cria os grupos B, C e D, a chave e as fases já jogadas. */
export function migrateLegacyContinental(c: ContinentalState, deps: LegacyContinentalDeps): void {
  if (!c.qualified || (c.bracket && c.otherGroups.length)) return
  if (!c.teams.length) {
    deps.initContinentalForSeason(true, c.tier)
    return
  }
  const seed = seedContinentalGroups(deps.getClubName(), Math.random)
  const aIds = new Set(c.teams.map((t) => t.id))
  const pool = shuffle(
    [...seed.others.flatMap((g) => g.teams), ...seed.groupA.filter((t) => !t.isUser)].filter((t) => !aIds.has(t.id)),
    Math.random
  )
  c.otherGroups = ['B', 'C', 'D'].map((id, g) => ({ id, teams: pool.slice(g * 4, g * 4 + 4) }))
  const groupsDone = c.stage !== 'GROUPS' || c.eliminated
  const rounds = groupsDone ? 6 : Math.max(0, c.groupRound - 1)
  for (let r = 1; r <= rounds; r++) deps.playGroupRound(r, null, true)
  const b = deps.buildContinentalBracket(c.tier, [c.teams, ...c.otherGroups.map((g) => g.teams)])
  c.bracket = b
  if (!groupsDone) return
  c.groupRound = 6
  deps.seedContinentalKnockout(c.stage !== 'GROUPS')
  const idx = ({ QF: 0, SF: 1, FINAL: 2 } as Record<string, number | undefined>)[c.stage]
  if (idx !== undefined) {
    const scoreOf = (r: number) =>
      scoreFromText(c.history.find((h) => h.summary.startsWith(`${CONTINENTAL_ROUND_LABELS[r]}:`))?.summary)
    const wins = c.champion ? 3 : idx
    for (let r = 0; r < wins; r++) legacyUserResult(b, r, true, scoreOf(r))
    if (c.eliminated && !c.champion) legacyUserResult(b, idx, false, scoreOf(idx))
  }
  if (c.champion) {
    completeBracket(b)
    c.finalPosition = 1
  } else if (c.eliminated && c.stage === 'SF') {
    c.stage = 'THIRD'
    c.eliminated = false
  } else if (c.eliminated) {
    completeBracket(b)
    c.finalPosition = userFinalPosition(b)
  }
}

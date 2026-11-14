import { computed } from 'vue'
import type { Ref } from 'vue'
import type { ContinentalState, ContinentalTeam, ContinentalTier } from '@/types'
import { CONTINENTAL_RIVALS, PRIZES } from '@/config'
import type { Bracket, BracketTeam, Podium } from '@/types'
import {
  completeBracket,
  createBracket,
  playLeg,
  propagate,
  fillTieTeams,
  resolveTie,
  simulateMatchScore,
  simulatePhaseExceptUser,
  simulateTie,
  userFinalPosition,
  userPendingTie
} from '@/utils/bracket/bracket'
import { CONTINENTAL_QF_TEMPLATE, seedContinentalGroups, seedContinentalQuarterFinals } from '@/utils/bracket/bracketSeeding'
import { migrateLegacyContinental } from '@/migrations/legacyCompetitions'
import { sortGroup, GROUP_SCHEDULE, applyGroupMatch } from './groups'
import { emptyContinental } from './defaults'
import type { CompetitionToast, CompetitionsClub } from './types'

export function createContinental(ctx: { continentalState: Ref<ContinentalState>; club: CompetitionsClub }) {
  const { continentalState, club } = ctx
  const clubStore = club

  const continentalStageLabel = computed(() => {
    const c = continentalState.value
    if (c.stage === 'GROUPS') return `Fase de Grupos • Rodada ${c.groupRound}/6`
    if (c.stage === 'QF') return 'Quartas de Final Continental'
    if (c.stage === 'SF') return 'Semifinal Continental'
    if (c.stage === 'THIRD') return 'Disputa de 3º Lugar Continental'
    return 'Final Continental'
  })

  const continentalStandings = computed(() => sortGroup(continentalState.value.teams))

  const continentalOpponent = computed(() => {
    const cs = continentalState.value
    if (cs.stage !== 'GROUPS' && cs.bracket) {
      const tie = userPendingTie(cs.bracket)
      if (tie) {
        const oppId = tie.homeId === 'user' ? tie.awayId : tie.homeId
        const team = oppId ? cs.bracket.teams[oppId] : null
        if (team) return { name: team.name, power: team.power, style: 'Copa Condor' }
      }
    }
    const rivals = continentalState.value.teams.filter((t) => !t.isUser)
    const r =
      rivals[(continentalState.value.groupRound - 1) % Math.max(1, rivals.length)] ||
      CONTINENTAL_RIVALS[0]
    return { name: r.name, power: r.power, style: 'Copa Condor' }
  })

  function buildContinentalBracket(tier: ContinentalTier, groups: ContinentalTeam[][]): Bracket {
    const teams: BracketTeam[] = groups.flat().map((t) => ({
      id: t.id,
      name: t.id === 'user' ? clubStore.name : t.name,
      power: t.power
    }))
    return createBracket({
      competition: 'continental',
      season: clubStore.season,
      label: tier === 'libertadores' ? 'Copa Condor de Ouro' : 'Copa Condor de Prata',
      teams,
      rounds: [
        { key: 'QF', label: 'Quartas de Final', shortLabel: 'Quartas', legCount: 1 },
        { key: 'SF', label: 'Semifinal', shortLabel: 'Semi', legCount: 1 },
        { key: 'FINAL', label: 'Final', shortLabel: 'Final', legCount: 1 }
      ],
      firstRound: CONTINENTAL_QF_TEMPLATE.map((): [string | null, string | null] => [null, null]),
      firstRoundLabels: CONTINENTAL_QF_TEMPLATE,
      thirdPlace: true,
      thirdLegCount: 1
    })
  }

  function initContinentalForSeason(qualified: boolean, tier: ContinentalTier = 'sulamericana') {
    if (!qualified) {
      continentalState.value = emptyContinental()
      return
    }
    const { groupA, others } = seedContinentalGroups(clubStore.name, Math.random)
    continentalState.value = {
      qualified: true,
      tier,
      stage: 'GROUPS',
      groupRound: 1,
      eliminated: false,
      champion: false,
      teams: groupA,
      history: [],
      otherGroups: others,
      bracket: buildContinentalBracket(tier, [groupA, ...others.map((g) => g.teams)]),
      finalPosition: null
    }
  }

  /**
   * Joga a rodada dos 4 grupos. userScore = gols do usuário e do adversário;
   * null = usuário sem jogar (W.O. 0 x 3, só no fim da temporada).
   */
  function playGroupRound(round: number, userScore: [number, number] | null, onlyOthers = false) {
    const c = continentalState.value
    const sched = GROUP_SCHEDULE[(round - 1) % 3]
    const swap = round > 3
    const groups: Array<{ id: string; teams: ContinentalTeam[] }> = [
      ...(onlyOthers ? [] : [{ id: 'A', teams: c.teams }]),
      ...c.otherGroups
    ]
    for (const g of groups) {
      for (const [i, j] of sched) {
        const [hi, ai] = swap ? [j, i] : [i, j]
        const home = g.teams[hi]
        const away = g.teams[ai]
        if (!home || !away) continue
        if (home.isUser || away.isUser) {
          const [u, o] = userScore ?? [0, 3]
          if (home.isUser) applyGroupMatch(home, away, u, o)
          else applyGroupMatch(home, away, o, u)
          continue
        }
        const s = simulateMatchScore(home.power, away.power)
        applyGroupMatch(home, away, s.home, s.away)
      }
    }
  }

  /** Após a 6ª rodada: preenche as quartas com os classificados e marca a origem de cada time. */
  function seedContinentalKnockout(forceUserTop2 = false) {
    const c = continentalState.value
    const b = c.bracket
    if (!b) return
    const sorted: Record<'A' | 'B' | 'C' | 'D', string[]> = { A: [], B: [], C: [], D: [] }
    const all: Array<['A' | 'B' | 'C' | 'D', ContinentalTeam[]]> = [
      ['A', c.teams],
      ...c.otherGroups.map((g): ['A' | 'B' | 'C' | 'D', ContinentalTeam[]] => [
        g.id as 'B' | 'C' | 'D',
        g.teams
      ])
    ]
    for (const [id, teams] of all) {
      sorted[id] = sortGroup(teams).map((t) => t.id)
      if (forceUserTop2 && id === 'A') {
        const ui = sorted.A.indexOf('user')
        if (ui > 1) [sorted.A[1], sorted.A[ui]] = [sorted.A[ui], sorted.A[1]]
      }
      sorted[id].forEach((tid, k) => {
        if (b.teams[tid]) b.teams[tid].tag = `${k + 1}º Grupo ${id}`
      })
    }
    seedContinentalQuarterFinals(sorted).forEach(([h, a], i) => {
      const tie = b.rounds[0].ties[i]
      if (a === 'user') fillTieTeams(tie, a, h)
      else fillTieTeams(tie, h, a)
    })
    b.teams.user.name = clubStore.name
    propagate(b, { userHosts: true })
  }

  /** Fim da temporada: continental não concluído vira W.O. do usuário e o resto da chave é simulado. */
  function finishContinentalForSeason(): Podium | null {
    const c = continentalState.value
    if (!c.qualified || !c.bracket) return null
    if (!c.bracket.podium) {
      if (c.stage === 'GROUPS') {
        for (let r = c.groupRound; r <= 6; r++) playGroupRound(r, null)
        c.groupRound = 6
        seedContinentalKnockout()
      }
      c.bracket.teams.user.name = clubStore.name
      completeBracket(c.bracket, Math.random, { forfeitUser: true })
    }
    if (!c.champion) c.eliminated = true
    c.finalPosition = c.finalPosition ?? userFinalPosition(c.bracket)
    return c.bracket.podium
  }

  // ---- Migração de saves antigos (sem chave) ----

  function migrateContinental() {
    migrateLegacyContinental(continentalState.value, {
      getClubName: () => clubStore.name, initContinentalForSeason, playGroupRound, buildContinentalBracket, seedContinentalKnockout
    })
  }

  function applyContinentalResult(
    uGoals: number,
    oGoals: number,
    clubName: string,
    rivalName: string,
    userPens?: { user: number; opp: number } | null
  ): CompetitionToast | null {
    if (continentalState.value.qualified && (!continentalState.value.bracket || !continentalState.value.otherGroups.length)) {
      migrateContinental()
    }
    const c = continentalState.value
    const prize = uGoals > oGoals ? PRIZES.continental.win : PRIZES.continental.other
    let result: CompetitionToast | null = null

    if (c.stage === 'GROUPS') {
      clubStore.earn(prize)
      playGroupRound(c.groupRound, [uGoals, oGoals])
      c.history.unshift({
        summary: `Rodada ${c.groupRound}: ${clubName} ${uGoals} x ${oGoals} ${rivalName}`,
        prize
      })
      if (c.groupRound >= 6) {
        const rank = continentalStandings.value.findIndex((t) => t.isUser) + 1
        seedContinentalKnockout()
        if (rank <= 2) {
          c.stage = 'QF'
          result = { toast: 'Classificado ao Mata-Mata Continental!', toastType: 'success' }
        } else {
          c.eliminated = true
          if (c.bracket) {
            completeBracket(c.bracket)
            c.finalPosition = userFinalPosition(c.bracket)
          }
          result = { toast: 'Eliminado na fase de grupos continental.', toastType: 'warning' }
        }
      } else {
        c.groupRound += 1
      }
      return result
    }

    const b = c.bracket
    const tie = b ? userPendingTie(b) : null
    if (!b || !tie) return { toast: 'Competição já encerrada.', toastType: 'warning' }
    clubStore.earn(prize)
    b.teams.user.name = clubName
    const stageLabel = continentalStageLabel.value
    const isThird = tie === b.thirdPlace
    const idx = tie.roundIndex
    const userIsHome = tie.homeId === 'user'
    playLeg(tie, 0, userIsHome ? uGoals : oGoals, userIsHome ? oGoals : uGoals)
    resolveTie(tie, b.teams, Math.random, 0.55, userPens)
    const userWon = tie.winnerId === 'user'
    let scoreLabel = `${uGoals} x ${oGoals}`
    if (tie.penalties) {
      const pu = userIsHome ? tie.penalties.home : tie.penalties.away
      const po = userIsHome ? tie.penalties.away : tie.penalties.home
      scoreLabel += ` (Pênaltis ${pu}x${po}: ${userWon ? 'Classificado' : 'Eliminado'})`
    }
    c.history.unshift({ summary: `${stageLabel}: ${clubName} ${scoreLabel} ${rivalName}`, prize })
    const final = b.rounds[b.rounds.length - 1].ties[0]
    if (isThird) simulateTie(final, b.teams)
    else simulatePhaseExceptUser(b, idx)
    propagate(b, { userHosts: true })

    const bonus = (amount: number, text: string) => {
      if (amount <= 0) return
      clubStore.earn(amount)
      c.history.unshift({ summary: text, prize: amount })
    }
    const finish = (position: 1 | 2 | 3 | 4) => {
      c.finalPosition = position
      c.eliminated = true
    }

    if (isThird) {
      if (userWon) bonus(PRIZES.continental.third, 'Bônus de 3º lugar continental')
      finish(userWon ? 3 : 4)
      return userWon
        ? { toast: '3º LUGAR NA COPA CONDOR!', toastType: 'success' }
        : { toast: '4º lugar na Copa Condor.', toastType: 'info' }
    }
    if (!userWon) {
      if (idx === 2) {
        bonus(PRIZES.continental.runnerUp, 'Bônus de vice-campeão continental')
        finish(2)
        return { toast: 'Vice-campeão continental.', toastType: 'info' }
      }
      if (idx === 1) {
        c.stage = 'THIRD'
        return {
          toast: 'Eliminado na semifinal continental. Dispute o 3º lugar!',
          toastType: 'warning'
        }
      }
      c.eliminated = true
      completeBracket(b)
      c.finalPosition = userFinalPosition(b)
      return { toast: 'Eliminado no mata-mata continental.', toastType: 'warning' }
    }
    if (idx === 0) {
      c.stage = 'SF'
      return { toast: 'Avançou para a Semifinal Continental!', toastType: 'success' }
    }
    if (idx === 1) {
      c.stage = 'FINAL'
      return { toast: 'Na Final Continental!', toastType: 'success' }
    }
    c.champion = true
    c.finalPosition = 1
    const title =
      c.tier === 'libertadores' ? 'Campeão da Copa Condor de Ouro' : 'Campeão da Copa Condor de Prata'
    clubStore.recordTrophy('title', title, PRIZES.continental.champion)
    bonus(PRIZES.continental.champion, 'Bônus de campeão continental')
    return { toast: `${title.toUpperCase()}!`, toastType: 'success' }
  }

  return {
    continentalStageLabel,
    continentalStandings,
    continentalOpponent,
    buildContinentalBracket,
    initContinentalForSeason,
    playGroupRound,
    seedContinentalKnockout,
    finishContinentalForSeason,
    migrateContinental,
    applyContinentalResult
  }
}

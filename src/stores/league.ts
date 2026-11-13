import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  CompetitionStageType,
  LeagueFixture,
  LeagueSave,
  LeagueTeam,
  StageOutcome,
  StageToastType
} from '@/types/league'
import {
  buildRoundRobin,
  computeStandings,
  KNOCKOUT_STAGES,
  LEAGUE_CLUBS_POOL,
  SERIE_META,
  STAGE_NAMES,
  zoneBadgeClass
} from '@/utils/league/leagueScheduler'
import { PRIZES, SERIE_TYPICAL_OVER } from '@/config'
import { simulateMatchScore } from '@/utils/bracket/bracket'
import { seedSerieDR64 } from '@/utils/bracket/bracketSeeding'
import { EXTRA_D_CLUBS } from '@/utils/league/extraClubs'
import {
  PARALLEL_STAGES,
  SINGLE_LEG_STAGES,
  STAGE_TIE_COUNT,
  buildKnockoutFixtures,
  buildLeagueBracketView,
  resolveStageTies,
  stageTieResults
} from '@/utils/league/leagueKnockout'
import { shuffle } from '@/utils/core/random'
import { useClubStore } from './club'

export const useLeagueStore = defineStore('league', () => {
  const clubStore = useClubStore()

  const competitionStage = ref<CompetitionStageType>('D_GROUPS')
  const leagueTeams = ref<LeagueTeam[]>([])
  const leagueFixtures = ref<LeagueFixture[]>([])
  const selectedRound = ref(1)

  const serieMeta = computed(() => SERIE_META[clubStore.division] ?? SERIE_META[4])
  const currentStageLabel = computed(() => STAGE_NAMES[competitionStage.value] ?? serieMeta.value.name)

  const leagueStandings = computed(() =>
    computeStandings(leagueTeams.value, leagueFixtures.value, competitionStage.value, clubStore.name)
  )
  const userLeagueRow = computed(() => leagueStandings.value.find((r) => r.isUser))
  const userLeagueRank = computed(() => userLeagueRow.value?.rank || 1)
  const userLeaguePoints = computed(() => userLeagueRow.value?.points || 0)

  const nextUserFixture = computed(() =>
    leagueFixtures.value.find(
      (f) => f.stage === competitionStage.value && !f.played && (f.homeId === 'user' || f.awayId === 'user')
    ) || null
  )

  const currentRound = computed(() => {
    if (nextUserFixture.value) return nextUserFixture.value.round
    const list = leagueFixtures.value.filter((f) => f.stage === competitionStage.value)
    return list.length ? Math.max(...list.map((f) => f.round)) : 1
  })

  const maxStageRounds = computed(() => {
    const list = leagueFixtures.value.filter((f) => f.stage === competitionStage.value)
    return list.length ? Math.max(...list.map((f) => f.round)) : 1
  })

  const fixturesForSelectedRound = computed(() =>
    leagueFixtures.value.filter((f) => f.stage === competitionStage.value && f.round === selectedRound.value)
  )

  const isKnockoutStage = computed(() => KNOCKOUT_STAGES.includes(competitionStage.value))

  function getTeamName(id: string): string {
    if (id === 'user') return clubStore.name
    const t = leagueTeams.value.find((x) => x.id === id)
    return t ? t.name : 'Clube'
  }

  const knockoutAggregateScore = computed(() => {
    const tie = leagueFixtures.value.filter(
      (f) => f.stage === competitionStage.value && (f.homeId === 'user' || f.awayId === 'user')
    )
    let user = 0
    let opp = 0
    let rivalId = ''
    for (const fx of tie) {
      if (fx.homeId === 'user') {
        user += fx.homeScore || 0
        opp += fx.awayScore || 0
        rivalId = fx.awayId
      } else {
        user += fx.awayScore || 0
        opp += fx.homeScore || 0
        rivalId = fx.homeId
      }
    }
    return { user, opp, rivalName: getTeamName(rivalId) }
  })

  const knockoutBracket = computed(() =>
    buildLeagueBracketView({
      division: clubStore.division,
      season: clubStore.season,
      stage: competitionStage.value,
      fixtures: leagueFixtures.value,
      teams: leagueTeams.value,
      clubName: clubStore.name
    })
  )
  const knockoutPodium = computed(() => knockoutBracket.value?.podium ?? null)

  /** Tabela da última fase de grupos: A1 na Série D, quadrangular do usuário na Série C. */
  const groupStageStandings = computed(() => {
    if (clubStore.division === 4) {
      return computeStandings(leagueTeams.value, leagueFixtures.value, 'D_GROUPS', clubStore.name)
    }
    if (clubStore.division === 3 && leagueFixtures.value.some((f) => f.stage === 'C_QUADRANGULAR')) {
      return computeStandings(leagueTeams.value, leagueFixtures.value, 'C_QUADRANGULAR', clubStore.name)
    }
    return leagueStandings.value
  })

  /** Tabela do outro quadrangular da Série C (vazia fora dele). */
  const otherQuadrangularStandings = computed(() => {
    if (clubStore.division !== 3 || !leagueFixtures.value.some((f) => f.stage === 'C_QUADRANGULAR')) return []
    const mine = leagueTeams.value.find((t) => t.id === 'user')?.group
    if (mine !== 'B' && mine !== 'C') return []
    return computeStandings(leagueTeams.value, leagueFixtures.value, 'C_QUADRANGULAR', clubStore.name, mine === 'B' ? 'C' : 'B')
  })

  const nextFixtureIsHome = computed(() => !nextUserFixture.value || nextUserFixture.value.homeId === 'user')

  const nextOpponent = computed<{ name: string; power: number; style: string }>(() => {
    if (!nextUserFixture.value) {
      const fallback = leagueTeams.value.find((t) => !t.isUser)
      return fallback || { name: 'Rival Nacional', power: typicalOver(), style: 'Equilibrado' }
    }
    const rivalId =
      nextUserFixture.value.homeId === 'user' ? nextUserFixture.value.awayId : nextUserFixture.value.homeId
    return leagueTeams.value.find((t) => t.id === rivalId) || { name: 'Adversário', power: typicalOver(), style: 'Equilibrado' }
  })

  function typicalOver(): number {
    return SERIE_TYPICAL_OVER[clubStore.division] ?? SERIE_TYPICAL_OVER[4]
  }

  function getZoneBadgeClass(rank: number): string {
    return zoneBadgeClass(competitionStage.value, rank, clubStore.division)
  }

  function initLeagueSeason(division: number, seasonNumber: number) {
    const pool = LEAGUE_CLUBS_POOL[division] || LEAGUE_CLUBS_POOL[4]
    const mk = (c: (typeof pool)[number], group?: string): LeagueTeam => ({
      id: c.id,
      name: c.name,
      power: c.basePower,
      style: c.style,
      isUser: false,
      ...(group ? { group } : {})
    })
    if (division === 4) {
      const grp = pool.slice(0, 5)
      const rest = pool.slice(5)
      leagueTeams.value = [
        { id: 'user', name: clubStore.name, power: SERIE_TYPICAL_OVER[4], style: 'Super XI', isUser: true, group: 'A1' },
        ...grp.map((c) => mk(c, 'A1')),
        ...rest.map((c) => mk(c, 'OUTROS'))
      ]
      competitionStage.value = 'D_GROUPS'
      leagueFixtures.value = buildRoundRobin(['user', ...grp.map((c) => c.id)], 'D_GROUPS', 'A1', true, 1)
      selectedRound.value = 1
      return
    }
    if (division === 3) {
      leagueTeams.value = [
        { id: 'user', name: clubStore.name, power: SERIE_TYPICAL_OVER[3], style: 'Super XI', isUser: true },
        ...pool.map((c) => mk(c))
      ]
      competitionStage.value = 'C_FIRST_STAGE'
      leagueFixtures.value = buildRoundRobin(leagueTeams.value.map((t) => t.id), 'C_FIRST_STAGE', undefined, false, 1)
      selectedRound.value = 1
      return
    }
    leagueTeams.value = [
      { id: 'user', name: clubStore.name, power: SERIE_TYPICAL_OVER[division] ?? SERIE_TYPICAL_OVER[1], style: 'Super XI', isUser: true },
      ...pool.map((c) => mk(c))
    ]
    competitionStage.value = 'POINTS_38'
    leagueFixtures.value = buildRoundRobin(leagueTeams.value.map((t) => t.id), 'POINTS_38', undefined, true, 1)
    selectedRound.value = 1
  }

  function recordRoundResults(uGoals: number, oGoals: number) {
    const round = currentRound.value
    for (const fx of leagueFixtures.value) {
      const inStage =
        fx.stage === competitionStage.value || !!(fx.stage && PARALLEL_STAGES[competitionStage.value]?.includes(fx.stage))
      if (!inStage || fx.round !== round || fx.played) continue
      if (fx.homeId === 'user' || fx.awayId === 'user') {
        fx.homeScore = fx.homeId === 'user' ? uGoals : oGoals
        fx.awayScore = fx.awayId === 'user' ? uGoals : oGoals
        fx.played = true
      } else {
        simulateOther(fx)
      }
    }
    selectedRound.value = currentRound.value
  }

  function simulateOther(fx: LeagueFixture) {
    const h = leagueTeams.value.find((t) => t.id === fx.homeId)
    const a = leagueTeams.value.find((t) => t.id === fx.awayId)
    // Todos os jogos da IA usam a mesma curva do motor.
    const sc = simulateMatchScore(h?.power ?? typicalOver(), a?.power ?? typicalOver())
    fx.homeScore = sc.home
    fx.awayScore = sc.away
    fx.played = true
  }

  const powerOf = (id: string) => leagueTeams.value.find((t) => t.id === id)?.power ?? typicalOver()

  /** G-4 do A1 + 15 grupos virtuais (14 de OUTROS + 46 extras) formam os 64 do R64. */
  function startSerieDKnockout() {
    const a1Top4 = leagueStandings.value.slice(0, 4).map((r) => r.teamId)
    for (const c of EXTRA_D_CLUBS) {
      if (leagueTeams.value.some((t) => t.id === c.id)) continue
      leagueTeams.value.push({
        id: c.id, name: c.name, power: c.basePower, style: c.style, isUser: false, group: 'MM'
      })
    }
    const virtualPool = leagueTeams.value.filter((t) => t.group === 'OUTROS' || t.group === 'MM').map((t) => t.id)
    const powers: Record<string, { power: number }> = {}
    leagueTeams.value.forEach((t) => { powers[t.id] = { power: t.power } })
    const { pairs, tags } = seedSerieDR64({
      season: clubStore.season, a1Top4, virtualPool, teams: powers, rng: Math.random
    })
    leagueTeams.value.forEach((t) => { if (tags[t.id]) t.tag = tags[t.id] })
    leagueFixtures.value.push(...buildKnockoutFixtures('D_R64', pairs))
  }

  /** Simula as pernas restantes da fase e das paralelas, exceto jogos do usuário. */
  function completeParallelStages(stage: CompetitionStageType) {
    const stages = [stage, ...(PARALLEL_STAGES[stage] ?? [])]
    for (const fx of leagueFixtures.value) {
      if (fx.played || !fx.stage || !stages.includes(fx.stage)) continue
      if (fx.homeId === 'user' || fx.awayId === 'user') continue
      simulateOther(fx)
    }
  }

  /** Forma os dois quadrangulares (B e C) com o G-8 da 1ª fase da Série C. */
  function startSerieCQuadrangular() {
    const top8 = leagueStandings.value.slice(0, 8)
    const grpB = [top8[1], top8[2], top8[5], top8[6]].map((r) => r.teamId)
    // Correção D1: 1º, 4º, 5º e 8º formam o grupo C, para que todo classificado jogue um quadrangular.
    const grpC = [top8[0], top8[3], top8[4], top8[7]].map((r) => r.teamId)
    leagueTeams.value.forEach((t) => {
      if (grpB.includes(t.id)) t.group = 'B'
      else if (grpC.includes(t.id)) t.group = 'C'
    })
    leagueFixtures.value.push(
      ...buildRoundRobin(grpB, 'C_QUADRANGULAR', 'B', true, 1),
      ...buildRoundRobin(grpC, 'C_QUADRANGULAR', 'C', true, 1)
    )
  }

  const NEXT_D: Partial<Record<CompetitionStageType, CompetitionStageType>> = {
    D_R64: 'D_R32', D_R32: 'D_R16', D_R16: 'D_QF'
  }

  /** Idempotente: só cria a fase se ainda não existir. */
  function generateNextStages(stage: CompetitionStageType) {
    const fx = leagueFixtures.value
    const has = (s: CompetitionStageType) => fx.some((f) => f.stage === s)
    const userFirst = (a: string, b: string): [string, string] => (b === 'user' ? [b, a] : [a, b])
    const pairUp = (ids: string[]) => {
      const out: Array<[string, string]> = []
      for (let k = 0; k + 1 < ids.length; k += 2) out.push(userFirst(ids[k], ids[k + 1]))
      return out
    }
    const make = (s: CompetitionStageType, pairs: Array<[string, string]>) => {
      if (!has(s)) fx.push(...buildKnockoutFixtures(s, pairs))
    }
    const next = NEXT_D[stage]
    if (next) {
      const r = stageTieResults(fx, stage)
      if (r) make(next, pairUp(r.map((t) => t.winnerId)))
      return
    }
    if (stage === 'C_QUADRANGULAR') {
      const quad = fx.filter((f) => f.stage === 'C_QUADRANGULAR')
      if (!quad.length || quad.some((f) => !f.played)) return
      const rows = (g: string) => computeStandings(leagueTeams.value, fx, 'C_QUADRANGULAR', clubStore.name, g)
      const b = rows('B')
      const c = rows('C')
      const better = (x: (typeof b)[number], y: (typeof b)[number]) =>
        (x.points - y.points) || (x.won - y.won) || (x.gd - y.gd) || (x.gf - y.gf)
      // Manda a volta (ou o jogo único) o usuário; senão a melhor campanha no quadrangular.
      const order = (x: (typeof b)[number], y: (typeof b)[number]): [string, string] => {
        if (y.isUser) return [y.teamId, x.teamId]
        if (x.isUser) return [x.teamId, y.teamId]
        return better(x, y) >= 0 ? [x.teamId, y.teamId] : [y.teamId, x.teamId]
      }
      make('C_FINAL', [order(b[0], c[0])])
      make('C_THIRD', [order(b[1], c[1])])
      return
    }
    if (stage === 'D_QF') {
      const r = stageTieResults(fx, 'D_QF')
      if (r) {
        make('D_SF', pairUp(r.map((t) => t.winnerId)))
      }
      return
    }
    if (stage === 'D_SF') {
      const sf = stageTieResults(fx, 'D_SF')
      if (sf) {
        make('D_FINAL', pairUp(sf.map((t) => t.winnerId)))
        make('D_THIRD', pairUp(sf.map((t) => t.loserId)))
      }
    }
  }

  const D_ALL: CompetitionStageType[] = ['D_R64', 'D_R32', 'D_R16', 'D_QF', 'D_SF', 'D_FINAL', 'D_THIRD']

  /** Simula e resolve tudo o que falta da Série D até FINAL e THIRD estarem resolvidos. */
  function completeLeaguePostseason() {
    if (clubStore.division === 3) {
      if (!leagueFixtures.value.some((f) => f.stage === 'C_QUADRANGULAR')) {
        for (const fx of leagueFixtures.value) if (fx.stage === 'C_FIRST_STAGE' && !fx.played) simulateOther(fx)
        startSerieCQuadrangular()
      }
      for (const fx of leagueFixtures.value) if (fx.stage === 'C_QUADRANGULAR' && !fx.played) simulateOther(fx)
      generateNextStages('C_QUADRANGULAR')
      for (const s of ['C_FINAL', 'C_THIRD'] as CompetitionStageType[]) {
        for (const fx of leagueFixtures.value) if (fx.stage === s && !fx.played) simulateOther(fx)
        resolveStageTies(leagueFixtures.value, s, powerOf)
      }
      return
    }
    if (clubStore.division !== 4) return
    for (let guard = 0; guard < 30; guard++) {
      for (const s of D_ALL) {
        if (!leagueFixtures.value.some((f) => f.stage === s)) continue
        for (const fx of leagueFixtures.value) if (fx.stage === s && !fx.played) simulateOther(fx)
        resolveStageTies(leagueFixtures.value, s, powerOf)
        generateNextStages(s)
      }
      if (stageTieResults(leagueFixtures.value, 'D_FINAL') && stageTieResults(leagueFixtures.value, 'D_THIRD')) return
    }
  }

  function advance(toast: string, toastType: StageToastType): StageOutcome {
    selectedRound.value = 1
    return { kind: 'advance', toast, toastType }
  }

  function end(
    nextDivision: number,
    bonus: number,
    toast: string,
    toastType: StageToastType,
    trophyType?: 'title' | 'promotion',
    trophyTitle?: string
  ): StageOutcome {
    return { kind: 'endSeason', nextDivision, bonus, toast, toastType, trophyType, trophyTitle }
  }

  function evaluateStageProgression(): StageOutcome | null {
    const remaining = leagueFixtures.value.some((f) => f.stage === competitionStage.value && !f.played)
    if (remaining) return null

    const div = clubStore.division

    if (div === 4) {
      const P = PRIZES.serieD
      const st = competitionStage.value
      if (st === 'D_GROUPS') {
        if (userLeagueRank.value > 4) {
          startSerieDKnockout()
          completeLeaguePostseason()
          return end(4, P.groups, 'Eliminado na 1ª Fase da Série D. Nova temporada iniciada!', 'warning')
        }
        startSerieDKnockout()
        competitionStage.value = 'D_R64'
        return advance('Classificado ao Mata-Mata da Série D!', 'success')
      }
      completeParallelStages(st)
      for (const s of [st, ...(PARALLEL_STAGES[st] ?? [])]) resolveStageTies(leagueFixtures.value, s, powerOf)
      const mine = stageTieResults(leagueFixtures.value, st)?.find((t) => t.winnerId === 'user' || t.loserId === 'user')
      const userWon = mine?.winnerId === 'user'
      generateNextStages(st)
      const promo = 'Acesso Série D -> Série C'

      if (st === 'D_R64' || st === 'D_R32' || st === 'D_R16') {
        if (!userWon) {
          completeLeaguePostseason()
          const phasePrize = st === 'D_R64' ? P.r64 : st === 'D_R32' ? P.r32 : P.r16
          return end(4, phasePrize, 'Eliminado no Mata-Mata da Série D. Nova temporada!', 'warning')
        }
        const nextSt = NEXT_D[st] as CompetitionStageType
        competitionStage.value = nextSt
        return advance(`Avançou para: ${STAGE_NAMES[nextSt]}!`, 'success')
      }
      if (st === 'D_QF') {
        if (userWon) {
          competitionStage.value = 'D_SF'
          return advance(`Avançou para: ${STAGE_NAMES.D_SF}!`, 'success')
        }
        completeLeaguePostseason()
        return end(4, P.qf, 'Eliminado nas Quartas de Final da Série D. Tente novamente!', 'warning')
      }
      if (st === 'D_SF') {
        if (userWon) {
          competitionStage.value = 'D_FINAL'
          return advance('Na Final Nacional da Série D! Acesso garantido.', 'success')
        }
        competitionStage.value = 'D_THIRD'
        return advance('Acesso garantido! Dispute o 3º lugar da Série D.', 'success')
      }
      if (st === 'D_FINAL') {
        completeLeaguePostseason()
        return userWon
          ? end(3, P.champion, 'CAMPEÃO NACIONAL DA SÉRIE D!', 'success', 'title', 'Campeão da Série D')
          : end(3, P.runnerUp, 'Vice-campeão da Série D. Acesso garantido!', 'success', 'promotion', promo)
      }
      if (st === 'D_THIRD') {
        completeLeaguePostseason()
        return userWon
          ? end(3, P.third, '3º LUGAR NA SÉRIE D! ACESSO GARANTIDO!', 'success', 'promotion', promo)
          : end(3, P.fourth, '4º lugar na Série D. Acesso garantido!', 'success', 'promotion', promo)
      }
      return null
    }

    if (div === 3) {
      const P = PRIZES.serieC
      const st = competitionStage.value
      if (st === 'C_FIRST_STAGE') {
        const rank = userLeagueRank.value
        if (rank >= 17) {
          completeLeaguePostseason()
          return end(4, P.relegated, 'Rebaixado para a Série D.', 'danger')
        }
        if (rank > 8) {
          completeLeaguePostseason()
          return end(3, P.stayed, 'Permaneceu na Série C. Nova temporada!', 'warning')
        }
        startSerieCQuadrangular()
        competitionStage.value = 'C_QUADRANGULAR'
        return advance('Classificado ao Quadrangular do Acesso da Série C!', 'success')
      }
      if (st === 'C_QUADRANGULAR') {
        const rank = userLeagueRank.value
        generateNextStages('C_QUADRANGULAR')
        if (rank > 2) {
          completeLeaguePostseason()
          return end(3, P.quadElim, 'Eliminado no Quadrangular da Série C.', 'warning')
        }
        if (rank === 2) {
          competitionStage.value = 'C_THIRD'
          return advance('Acesso garantido! Dispute o 3º lugar da Série C.', 'success')
        }
        competitionStage.value = 'C_FINAL'
        return advance('Acesso garantido! Agora, a Final Nacional da Série C.', 'success')
      }
      if (st === 'C_FINAL' || st === 'C_THIRD') {
        completeParallelStages(st)
        for (const s of [st, ...(PARALLEL_STAGES[st] ?? [])]) resolveStageTies(leagueFixtures.value, s, powerOf)
        const mine = stageTieResults(leagueFixtures.value, st)?.find((t) => t.winnerId === 'user' || t.loserId === 'user')
        const userWon = mine?.winnerId === 'user'
        const promo = 'Acesso Série C -> Série B'
        if (st === 'C_FINAL') {
          return userWon
            ? end(2, P.champion, 'CAMPEÃO NACIONAL DA SÉRIE C!', 'success', 'title', 'Campeão da Série C')
            : end(2, P.runnerUp, 'Vice-campeão da Série C. Acesso para a Série B!', 'success', 'promotion', promo)
        }
        return userWon
          ? end(2, P.third, '3º lugar na Série C! Acesso para a Série B!', 'success', 'promotion', promo)
          : end(2, P.fourth, '4º lugar na Série C. Acesso para a Série B!', 'success', 'promotion', promo)
      }
      return null
    }

    const rank = userLeagueRank.value
    if (div === 2) {
      if (rank === 1) return end(1, PRIZES.serieB.champion, 'CAMPEÃO DA SÉRIE B! RUMO À ELITE!', 'success', 'title', 'Campeão da Série B')
      if (rank <= 4) {
        const promoPrize = rank === 2 ? PRIZES.serieB.runnerUp : rank === 3 ? PRIZES.serieB.third : PRIZES.serieB.fourth
        return end(1, promoPrize, 'ACESSO CONQUISTADO PARA A SÉRIE A!', 'success', 'promotion', 'Acesso Série B -> Série A')
      }
      if (rank >= 17) return end(3, PRIZES.serieB.relegated, 'Rebaixado para a Série C.', 'danger')
      return end(2, PRIZES.serieB.stayed, 'Temporada da Série B concluída!', 'success')
    }
    if (div === 1) {
      if (rank === 1) return end(1, PRIZES.serieA.champion, 'CAMPEÃO NACIONAL DA SÉRIE A!', 'success', 'title', 'Campeão da Série A')
      if (rank >= 17) return end(2, PRIZES.serieA.relegated, 'Rebaixado para a Série B.', 'danger')
      // 2º ao 16º: tabela por colocação; 17º em diante já saiu acima (rebaixado, 0).
      return end(1, PRIZES.serieA.byRank[rank - 1] ?? 0, `Série A concluída em ${rank}º lugar!`, 'success')
    }
    return null
  }

  /**
   * Save antigo: a fase do mata-mata só tem os jogos do usuário, sem `tie`. Numera os jogos do usuário
   * (confronto 0), cria os outros confrontos e as fases paralelas e simula as idas já "jogadas".
   */
  function ensureKnockoutTies() {
    const st = competitionStage.value
    if (!KNOCKOUT_STAGES.includes(st)) return
    const fx = leagueFixtures.value
    const stageFx = fx.filter((f) => f.stage === st)
    if (!stageFx.length || stageFx.every((f) => f.tie !== undefined)) return
    const mine = stageFx
      .filter((f) => f.tie === undefined && (f.homeId === 'user' || f.awayId === 'user'))
      .sort((a, b) => a.round - b.round)
    if (!mine.length) return
    const single = SINGLE_LEG_STAGES.includes(st)
    const rivalId = mine[0].homeId === 'user' ? mine[0].awayId : mine[0].homeId
    const userFixtures: LeagueFixture[] = single
      ? [{ ...mine[0], tie: 0, id: `fx_${st}_t0` }]
      : mine.slice(0, 2).map((f, i) => ({ ...f, tie: 0, leg: (i + 1) as 1 | 2, id: `fx_${st}_t0_l${i + 1}` }))
    if (single) delete userFixtures[0].leg
    if (!single && userFixtures.length === 1) {
      const first = userFixtures[0]
      userFixtures.push({
        id: `fx_${st}_t0_l2`, stage: st, round: first.round + 1, leg: 2, tie: 0,
        homeId: first.awayId, awayId: first.homeId, homeScore: null, awayScore: null, played: false
      })
    }
    const userLegOnePlayed = userFixtures[0].played
    // Remove os jogos antigos do usuário nesta fase e coloca os numerados no lugar.
    const keep = fx.filter((f) => !(f.stage === st && f.tie === undefined))
    // Clubes disponíveis para os outros confrontos (sem usuário e sem rival), completados com os extras da Série D.
    const stages: CompetitionStageType[] = [st, ...(PARALLEL_STAGES[st] ?? [])]
    const missing = stages.filter((s) => s === st || !keep.some((f) => f.stage === s))
    const needed = missing.reduce(
      (n, s) => n + 2 * ((STAGE_TIE_COUNT[s] ?? 1) - (s === st ? 1 : 0)),
      0
    )
    const used = new Set<string>(['user', rivalId])
    keep.filter((f) => stages.includes(f.stage as CompetitionStageType)).forEach((f) => {
      used.add(f.homeId)
      used.add(f.awayId)
    })
    let pool = shuffle(leagueTeams.value.filter((t) => !used.has(t.id)).map((t) => t.id), Math.random)
    if (pool.length < needed) {
      for (const c of EXTRA_D_CLUBS) {
        if (pool.length >= needed) break
        if (used.has(c.id) || leagueTeams.value.some((t) => t.id === c.id)) continue
        leagueTeams.value.push({
          id: c.id, name: c.name, power: c.basePower, style: c.style, isUser: false, group: 'MM'
        })
        pool.push(c.id)
      }
    }
    pool = pool.slice(0, needed)
    const take = (n: number): Array<[string, string]> => {
      const out: Array<[string, string]> = []
      for (let k = 0; k < n; k++) {
        const a = pool.shift()
        const b = pool.shift()
        if (a && b) out.push([a, b])
      }
      return out
    }
    const created: LeagueFixture[] = []
    for (const s of missing) {
      const count = STAGE_TIE_COUNT[s] ?? 1
      if (s === st) {
        const others = buildKnockoutFixtures(s, take(count - 1)).map((f) => ({
          ...f, tie: (f.tie ?? 0) + 1, id: (f.id ?? '').replace(/_t(\d+)/, (_m, n) => `_t${Number(n) + 1}`)
        }))
        created.push(...userFixtures, ...others)
      } else {
        created.push(...buildKnockoutFixtures(s, take(count)))
      }
    }
    leagueFixtures.value = [...keep, ...created]
    // Se a ida do usuário já foi jogada, as idas dos outros confrontos também.
    if (userLegOnePlayed && !single) {
      for (const f of created) {
        if (!f.played && f.leg === 1 && f.homeId !== 'user' && f.awayId !== 'user') simulateOther(f)
      }
    }
  }

  function toSave(): LeagueSave {
    return {
      competitionStage: competitionStage.value,
      leagueTeams: leagueTeams.value,
      leagueFixtures: leagueFixtures.value
    }
  }

  function fromSave(p: Partial<LeagueSave>) {
    competitionStage.value = p.competitionStage || 'D_GROUPS'
    leagueTeams.value = p.leagueTeams || []
    leagueFixtures.value = p.leagueFixtures || []
  }

  return {
    competitionStage,
    leagueTeams,
    leagueFixtures,
    selectedRound,
    serieMeta,
    currentStageLabel,
    leagueStandings,
    userLeagueRow,
    userLeagueRank,
    userLeaguePoints,
    nextUserFixture,
    currentRound,
    maxStageRounds,
    fixturesForSelectedRound,
    isKnockoutStage,
    knockoutAggregateScore,
    knockoutBracket,
    knockoutPodium,
    groupStageStandings,
    otherQuadrangularStandings,
    nextFixtureIsHome,
    nextOpponent,
    getTeamName,
    getZoneBadgeClass,
    initLeagueSeason,
    recordRoundResults,
    evaluateStageProgression,
    toSave,
    fromSave,
    ensureKnockoutTies
  }
})

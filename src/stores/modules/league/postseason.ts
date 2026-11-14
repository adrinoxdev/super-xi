import type { ComputedRef, Ref } from 'vue'
import type { CompetitionStageType, LeagueFixture, LeagueStandingRow, LeagueTeam } from '@/types/league'
import { buildRoundRobin, computeStandings } from '@/utils/league/leagueScheduler'
import { seedSerieDR64 } from '@/utils/bracket/bracketSeeding'
import { EXTRA_D_CLUBS } from '@/utils/league/extraClubs'
import { buildKnockoutFixtures, resolveStageTies, stageTieResults } from '@/utils/league/leagueKnockout'
import { NEXT_D, D_ALL } from './stages'
import type { LeagueClub } from './types'

export function createPostseason(ctx: {
  leagueTeams: Ref<LeagueTeam[]>
  leagueFixtures: Ref<LeagueFixture[]>
  club: LeagueClub
  leagueStandings: ComputedRef<LeagueStandingRow[]>
  simulateOther: (fx: LeagueFixture) => void
  powerOf: (id: string) => number
}) {
  const { leagueTeams, leagueFixtures, leagueStandings, simulateOther, powerOf } = ctx
  const clubStore = ctx.club

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

  return { startSerieDKnockout, startSerieCQuadrangular, generateNextStages, completeLeaguePostseason }
}

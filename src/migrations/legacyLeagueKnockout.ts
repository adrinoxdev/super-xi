import type { CompetitionStageType, LeagueFixture, LeagueTeam } from '@/types/league'
import { KNOCKOUT_STAGES } from '@/utils/league/leagueScheduler'
import {
  PARALLEL_STAGES,
  SINGLE_LEG_STAGES,
  STAGE_TIE_COUNT,
  buildKnockoutFixtures
} from '@/utils/league/leagueKnockout'
import { EXTRA_D_CLUBS } from '@/utils/league/extraClubs'
import { shuffle } from '@/utils/core/random'

export interface LegacyKnockoutDeps {
  getStage: () => CompetitionStageType
  getFixtures: () => LeagueFixture[]
  setFixtures: (fixtures: LeagueFixture[]) => void
  getTeams: () => LeagueTeam[]
  simulateOther: (fx: LeagueFixture) => void
}

/**
 * Save antigo: a fase do mata-mata só tem os jogos do usuário, sem `tie`. Numera os jogos do usuário
 * (confronto 0), cria os outros confrontos e as fases paralelas e simula as idas já "jogadas".
 */
export function migrateLegacyKnockoutTies(deps: LegacyKnockoutDeps): void {
  const st = deps.getStage()
  if (!KNOCKOUT_STAGES.includes(st)) return
  const fx = deps.getFixtures()
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
  let pool = shuffle(deps.getTeams().filter((t) => !used.has(t.id)).map((t) => t.id), Math.random)
  if (pool.length < needed) {
    for (const c of EXTRA_D_CLUBS) {
      if (pool.length >= needed) break
      if (used.has(c.id) || deps.getTeams().some((t) => t.id === c.id)) continue
      deps.getTeams().push({
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
  deps.setFixtures([...keep, ...created])
  // Se a ida do usuário já foi jogada, as idas dos outros confrontos também.
  if (userLegOnePlayed && !single) {
    for (const f of created) {
      if (!f.played && f.leg === 1 && f.homeId !== 'user' && f.awayId !== 'user') deps.simulateOther(f)
    }
  }
}

import { createPinia, setActivePinia } from 'pinia'
import { useCompetitionsStore } from '@/stores/competitions'
import { useClubStore } from '@/stores/club'
import { CONTINENTAL_RIVALS } from '@/config'
import { TEAM_ID_BY_NAME } from '@/utils/identity/teamIdentities'
import { mulberry32 } from '@/utils/core/random'
import type { MatchCompetition } from '@/types/match'

type Comp = ReturnType<typeof useCompetitionsStore>
type Club = ReturnType<typeof useClubStore>
const COMPS: MatchCompetition[] = ['league', 'cup', 'continental', 'supercup', 'recopa']
const SCORES: Array<[number, number]> = [[2, 1], [1, 1], [0, 2], [3, 0], [1, 1], [2, 2], [0, 1], [4, 1], [1, 0], [2, 3]]
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v ?? null))

function boot(seed: number) {
  Math.random = mulberry32(seed)
  Date.now = () => 1_700_000_000_000
  setActivePinia(createPinia())
  return { club: useClubStore(), comp: useCompetitionsStore() }
}

function snap(label: string, comp: Comp, club: Club, extra: unknown = null) {
  return clone({
    label,
    extra,
    save: comp.toSave(),
    getters: {
      cupRoundLabel: comp.cupRoundLabel,
      continentalStageLabel: comp.continentalStageLabel,
      continentalStandings: comp.continentalStandings.map((t) => t.id),
      continentalOpponent: comp.continentalOpponent,
      hasPendingFinal: comp.hasPendingFinal,
      hasPendingThirdPlace: comp.hasPendingThirdPlace,
      playable: COMPS.map((c) => comp.isCompetitionPlayable(c))
    },
    club: { budget: club.budget, trophies: club.trophyGallery.map((t) => t.title) }
  })
}

/** Chaves públicas do store (sem $ e _) com o typeof de cada uma. */
function apiShape() {
  const { comp } = boot(0)
  return Object.keys(comp)
    .filter((k) => !k.startsWith('$') && !k.startsWith('_'))
    .sort()
    .map((k) => `${k}:${typeof (comp as any)[k]}`)
}

function playSeason(seed: number, maxSteps = Infinity) {
  const { club, comp } = boot(seed)
  const out: unknown[] = []
  let i = 0
  const score = () => SCORES[(seed * 7 + i++) % SCORES.length]
  comp.initCupForSeason()
  comp.initContinentalForSeason(true, seed % 2 ? 'libertadores' : 'sulamericana')
  comp.qualifySupercup()
  comp.qualifyRecopa()
  out.push(snap(`s${seed}:init`, comp, club))
  for (let s = 0; s < Math.min(10, maxSteps) && comp.isCompetitionPlayable('cup'); s++) {
    const [u, o] = score()
    out.push(snap(`s${seed}:cup${s}`, comp, club, comp.applyCupResult(u, o, club.name)))
  }
  for (let s = 0; s < Math.min(15, maxSteps) && comp.isCompetitionPlayable('continental'); s++) {
    const [u, o] = score()
    const rival = comp.continentalOpponent.name
    out.push(snap(`s${seed}:con${s}`, comp, club, comp.applyContinentalResult(u, o, club.name, rival)))
  }
  for (const kind of ['supercup', 'recopa'] as const) {
    if (!comp.isCompetitionPlayable(kind)) continue
    const [u, o] = score()
    out.push(snap(`s${seed}:${kind}`, comp, club, comp.applyFinalResult(kind, u, o)))
  }
  const podiums = { cup: comp.finishCupForSeason(), con: comp.finishContinentalForSeason() }
  out.push(snap(`s${seed}:finish`, comp, club, podiums))
  // ida e volta pelo save
  const saved = clone(comp.toSave())
  const b = boot(seed + 1000)
  b.comp.fromSave(saved)
  b.comp.ensureBrackets()
  out.push(snap(`s${seed}:roundtrip`, b.comp, b.club))
  comp.resetFinals()
  out.push(snap(`s${seed}:resetFinals`, comp, club))
  return out
}

function notQualified() {
  const { club, comp } = boot(50)
  comp.initCupForSeason()
  comp.initContinentalForSeason(false)
  return [snap('nq', comp, club, { con: comp.finishContinentalForSeason() })]
}

function cupWithoutBracket() {
  const { club, comp } = boot(51)
  return [snap('cupNoBracket', comp, club, comp.applyCupResult(2, 0, club.name))]
}

const RIVAL_NAME = Object.keys(TEAM_ID_BY_NAME)[0]
const hist = (names: string[]) =>
  names.map((roundName, k) => ({ roundName, summary: `Super XI FC ${k + 2} x ${k} Rival`, prize: 1000 }))
const cupLegacy = (over: Record<string, unknown>) => ({
  roundIndex: 0,
  eliminated: false,
  champion: false,
  currentRival: { name: RIVAL_NAME, power: 70, serieCode: 'Série C' },
  history: [],
  ...over
})
const CUP_CASES: Record<string, unknown> = {
  r16Pending: cupLegacy({}),
  qfPending: cupLegacy({ roundIndex: 1, history: hist(['Oitavas de Final']) }),
  r16Lost: cupLegacy({ eliminated: true, history: [{ roundName: 'Oitavas de Final', summary: 'Super XI FC 1 x 2 Rival', prize: 0 }] }),
  sfLost: cupLegacy({
    roundIndex: 2,
    eliminated: true,
    history: [{ roundName: 'Semifinal', summary: 'Super XI FC 0 x 1 Rival', prize: 0 }, ...hist(['Quartas de Final', 'Oitavas de Final'])]
  }),
  finalLost: cupLegacy({
    roundIndex: 3,
    eliminated: true,
    history: [{ roundName: 'Final da Taça Cacique', summary: 'Super XI FC 1 x 3 Rival', prize: 0 }, ...hist(['Semifinal', 'Quartas de Final', 'Oitavas de Final'])]
  }),
  champion: cupLegacy({ roundIndex: 3, champion: true, currentRival: null, history: hist(['Final da Taça Cacique', 'Semifinal', 'Quartas de Final', 'Oitavas de Final']) }),
  unknownRival: cupLegacy({ roundIndex: 1, currentRival: { name: 'Time Inexistente FC', power: 66, serieCode: '' } })
}

const conTeam = (id: string, name: string, power: number, isUser = false) =>
  ({ id, name, power, isUser, points: 0, played: 0, won: 0, gf: 0, ga: 0 })
const groupA = () => [conTeam('user', 'Super XI FC', 70, true), ...CONTINENTAL_RIVALS.slice(0, 3).map((r) => conTeam(r.id, r.name, r.power))]
const conLegacy = (over: Record<string, unknown>) => ({
  qualified: true, tier: 'sulamericana', stage: 'GROUPS', groupRound: 1, eliminated: false, champion: false,
  teams: groupA(), history: [], ...over
})
const CON_CASES: Record<string, unknown> = {
  groupsR3: conLegacy({ groupRound: 3 }),
  groupsOut: conLegacy({ groupRound: 6, eliminated: true }),
  qf: conLegacy({ stage: 'QF', groupRound: 6 }),
  sfLost: conLegacy({
    stage: 'SF', groupRound: 6, eliminated: true,
    history: [
      { summary: 'Semifinal Continental: Super XI FC 0 x 2 X', prize: 0 },
      { summary: 'Quartas de Final Continental: Super XI FC 2 x 1 Y', prize: 0 }
    ]
  }),
  finalChampion: conLegacy({ stage: 'FINAL', groupRound: 6, champion: true, tier: 'libertadores' }),
  noTeams: conLegacy({ teams: [] }),
  notQualified: { qualified: false }
}

function legacyCase(label: string, seed: number, data: Record<string, unknown>) {
  const { club, comp } = boot(seed)
  comp.fromSave(data as any)
  comp.ensureBrackets()
  const out = [snap(`${label}:loaded`, comp, club)]
  if (comp.isCompetitionPlayable('cup')) out.push(snap(`${label}:cup`, comp, club, comp.applyCupResult(2, 1, club.name)))
  if (comp.isCompetitionPlayable('continental')) {
    const rival = comp.continentalOpponent.name
    out.push(snap(`${label}:con`, comp, club, comp.applyContinentalResult(1, 0, club.name, rival)))
  }
  return out
}

function legacyCases() {
  let seed = 100
  return [
    ...Object.entries(CUP_CASES).map(([k, cupState]) => legacyCase(`cup:${k}`, seed++, { cupState })),
    ...Object.entries(CON_CASES).map(([k, continentalState]) => legacyCase(`con:${k}`, seed++, { continentalState })),
    legacyCase('both:sfLost', seed++, { cupState: CUP_CASES.sfLost, continentalState: CON_CASES.sfLost }),
    legacyCase('finalsOnly', seed++, {
      supercupState: { qualified: true, played: false, won: false, scoreText: '', rivalName: 'X', rivalPower: 70 }
    })
  ]
}


function winAll(seed: number, uGoals: number, oGoals: number, afterClose: boolean) {
  const { club, comp } = boot(seed)
  const out: unknown[] = []
  comp.initCupForSeason()
  comp.initContinentalForSeason(true, 'libertadores')
  for (let s = 0; s < 12 && comp.isCompetitionPlayable('cup'); s++)
    out.push(snap(`w${seed}:cup${s}`, comp, club, comp.applyCupResult(uGoals, oGoals, club.name)))
  for (let s = 0; s < 20 && comp.isCompetitionPlayable('continental'); s++) {
    const rival = comp.continentalOpponent.name
    out.push(snap(`w${seed}:con${s}`, comp, club, comp.applyContinentalResult(uGoals, oGoals, club.name, rival)))
  }
  if (afterClose) {
    out.push(snap(`w${seed}:cupAfter`, comp, club, comp.applyCupResult(1, 0, club.name)))
    out.push(snap(`w${seed}:conAfter`, comp, club, comp.applyContinentalResult(1, 0, club.name, 'X')))
  }
  out.push(snap(`w${seed}:finish`, comp, club, { cup: comp.finishCupForSeason(), con: comp.finishContinentalForSeason() }))
  return out
}

function afterCloseNoBracket() {
  const { club, comp } = boot(60)
  comp.initCupForSeason()
  comp.initContinentalForSeason(true, 'sulamericana')
  const out: unknown[] = []
  for (let s = 0; s < 12; s++) comp.applyCupResult(0, 2, club.name)
  out.push(snap('closed:cup', comp, club, comp.applyCupResult(1, 0, club.name)))
  for (let s = 0; s < 20; s++) comp.applyContinentalResult(0, 2, club.name, comp.continentalOpponent.name)
  out.push(snap('closed:con', comp, club, comp.applyContinentalResult(1, 0, club.name, 'X')))
  return out
}

export function run() {
  return {
    api: apiShape(),
    seasons: [1, 2, 3, 4, 5, 6, 7, 8].map((s) => playSeason(s)),
    early: [playSeason(10, 1), playSeason(11, 2), playSeason(12, 0)],
    winAll: [winAll(70, 3, 0, true), winAll(71, 2, 1, true), winAll(72, 1, 1, true), winAll(73, 0, 0, true), winAll(74, 5, 0, false)],
    closed: afterCloseNoBracket(),
    notQualified: notQualified(),
    cupWithoutBracket: cupWithoutBracket(),
    legacy: legacyCases()
  }
}

import { createPinia, setActivePinia } from 'pinia'
import { useLeagueStore } from '@/stores/league'
import { useClubStore } from '@/stores/club'
import { STORAGE_KEY } from '@/config'
import { mulberry32 } from '@/utils/core/random'
import type { CompetitionStageType, LeagueFixture, StageOutcome } from '@/types/league'

type League = ReturnType<typeof useLeagueStore>
type Club = ReturnType<typeof useClubStore>
type Res = 'W' | 'D' | 'L'
/** Sequencia de resultados do usuario por fase (cicla); 'default' vale para fases nao listadas. */
type Plan = Partial<Record<CompetitionStageType | 'default', string>>
const GOALS: Record<Res, [number, number]> = { W: [2, 0], D: [1, 1], L: [0, 2] }
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v ?? null))
const fnv = (s: string) => {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(16)
}
const EXPECTED_ORDER = [
  'competitionStage', 'leagueTeams', 'leagueFixtures', 'selectedRound', 'serieMeta', 'currentStageLabel',
  'leagueStandings', 'userLeagueRow', 'userLeagueRank', 'userLeaguePoints', 'nextUserFixture', 'currentRound',
  'maxStageRounds', 'fixturesForSelectedRound', 'isKnockoutStage', 'knockoutAggregateScore', 'knockoutBracket',
  'knockoutPodium', 'groupStageStandings', 'otherQuadrangularStandings', 'nextFixtureIsHome', 'nextOpponent',
  'getTeamName', 'getZoneBadgeClass', 'initLeagueSeason', 'recordRoundResults', 'evaluateStageProgression',
  'toSave', 'fromSave', 'ensureKnockoutTies'
]

function boot(seed: number, division = 4, season = 1) {
  Math.random = mulberry32(seed)
  Date.now = () => 1_700_000_000_000
  setActivePinia(createPinia())
  const club = useClubStore()
  const league = useLeagueStore()
  club.division = division
  club.season = season
  return { club, league }
}

const fxKey = (f: LeagueFixture) => f.id ?? `${f.stage}:${f.round}:${f.homeId}-${f.awayId}`

function view(l: League) {
  const firstOther = l.leagueTeams.find((t) => !t.isUser)?.id ?? ''
  return {
    stage: l.competitionStage,
    selectedRound: l.selectedRound,
    serie: l.serieMeta,
    label: l.currentStageLabel,
    standings: l.leagueStandings.map((r) => `${r.rank}:${r.teamId}:${r.points}:${r.won}:${r.gd}:${r.gf}`),
    userRow: l.userLeagueRow ?? null,
    rank: l.userLeagueRank,
    points: l.userLeaguePoints,
    next: l.nextUserFixture,
    currentRound: l.currentRound,
    maxStageRounds: l.maxStageRounds,
    roundFx: l.fixturesForSelectedRound.map(fxKey),
    isKnockout: l.isKnockoutStage,
    aggregate: l.knockoutAggregateScore,
    bracketHash: fnv(JSON.stringify(l.knockoutBracket ?? null)),
    podium: l.knockoutPodium,
    groupStage: l.groupStageStandings.map((r) => `${r.rank}:${r.teamId}:${r.points}`),
    otherQuad: l.otherQuadrangularStandings.map((r) => `${r.rank}:${r.teamId}:${r.points}`),
    home: l.nextFixtureIsHome,
    opponent: l.nextOpponent,
    names: [l.getTeamName('user'), l.getTeamName(firstOther), l.getTeamName('__nao_existe__')],
    zones: [1, 2, 3, 4, 5, 8, 9, 16, 17, 20].map((r) => l.getZoneBadgeClass(r))
  }
}

/** full = true grava o save e a chave completos (transicoes e fim); senao so hashes. */
function snap(label: string, l: League, club: Club, extra: unknown = null, full = false) {
  const save = l.toSave()
  return clone({
    label,
    extra,
    saveHash: fnv(JSON.stringify(save)),
    save: full ? save : null,
    bracket: full ? l.knockoutBracket ?? null : null,
    view: view(l),
    club: { division: club.division, season: club.season }
  })
}

function apiShape() {
  const { league } = boot(0)
  const keys = Object.keys(league).filter((k) => !k.startsWith('$') && !k.startsWith('_'))
  return {
    order: keys,
    shape: [...keys].sort().map((k) => `${k}:${typeof (league as any)[k]}`)
  }
}

/** Joga ate endSeason (ou maxSteps). Cada passo = recordRoundResults + evaluateStageProgression, como o app. */
function playUntilEnd(tag: string, l: League, club: Club, plan: Plan, out: unknown[], maxSteps = 120): StageOutcome | null {
  const perStage: Record<string, number> = {}
  for (let step = 0; step < maxSteps; step++) {
    const st = l.competitionStage
    const k = (perStage[st] = (perStage[st] ?? -1) + 1)
    const seq = plan[st] ?? plan.default ?? 'W'
    const [u, o] = GOALS[seq[k % seq.length] as Res]
    l.recordRoundResults(u, o)
    const outcome = l.evaluateStageProgression()
    out.push(snap(`${tag}:${step}:${st}`, l, club, outcome, !!outcome))
    if (outcome?.kind === 'endSeason') return outcome
  }
  out.push(snap(`${tag}:${maxSteps < 120 ? 'cut' : 'maxSteps'}`, l, club, null, true))
  return null
}

function season(tag: string, seed: number, division: number, plan: Plan, seasonNo = 1) {
  const { club, league } = boot(seed, division, seasonNo)
  league.initLeagueSeason(division, seasonNo)
  const out: unknown[] = [snap(`${tag}:init`, league, club, null, true)]
  playUntilEnd(tag, league, club, plan, out)
  return out
}

/** Carreira encadeada: virada como useSeason (season+1, division=next, initLeagueSeason). */
function career(tag: string, seed: number, plan: Plan, seasons: number) {
  const { club, league } = boot(seed, 4, 1)
  league.initLeagueSeason(4, 1)
  const out: unknown[] = [snap(`${tag}:init`, league, club, null, true)]
  for (let s = 0; s < seasons; s++) {
    const o = playUntilEnd(`${tag}:t${s}`, league, club, plan, out)
    if (!o || o.kind !== 'endSeason') break
    club.season += 1
    club.division = o.nextDivision
    league.initLeagueSeason(o.nextDivision, club.season)
    out.push(snap(`${tag}:t${s}:virada`, league, club, null, true))
  }
  return out
}

/** Mesmo fluxo de usePersistence.loadGame para a liga. */
function loadFlow(l: League, club: Club, p: any) {
  l.fromSave(p)
  if (!l.leagueFixtures.length) l.initLeagueSeason(club.division, club.season)
  l.ensureKnockoutTies()
  l.selectedRound = l.currentRound
}

/** Joga ate a fase alvo (e opcionalmente a ida), salva, recarrega em outro boot e termina a temporada. */
function roundtrip(tag: string, seed: number, division: number, plan: Plan, stop: (l: League, step: number) => boolean) {
  const a = boot(seed, division, 1)
  a.league.initLeagueSeason(division, 1)
  for (let step = 0; step < 120 && !stop(a.league, step); step++) {
    const st = a.league.competitionStage
    const seq = plan[st] ?? plan.default ?? 'W'
    const [u, o] = GOALS[seq[step % seq.length] as Res]
    a.league.recordRoundResults(u, o)
    if (a.league.evaluateStageProgression()?.kind === 'endSeason') break
  }
  const saved = clone({ ...a.league.toSave(), cupState: { lixo: true } })
  const b = boot(seed + 1000, division, 1)
  loadFlow(b.league, b.club, saved)
  const out: unknown[] = [snap(`${tag}:loaded`, b.league, b.club, null, true)]
  playUntilEnd(tag, b.league, b.club, plan, out)
  return out
}

// ---------- cenarios ----------
const D_CASES: Record<string, Plan> = {
  dGroupsOut: { default: 'L' },
  dR64Out: { D_R64: 'L' },
  dR32Out: { D_R32: 'L' },
  dR16Out: { D_R16: 'L' },
  dQFOut: { D_QF: 'L' },
  dChampion: { default: 'W' },
  dVice: { D_FINAL: 'L' },
  dThirdWin: { D_SF: 'L' },
  dFourth: { D_SF: 'L', D_THIRD: 'L' },
  dPens: { D_GROUPS: 'W', default: 'D' }
}
const C_SECOND = 'WWDDWL'
const C_CASES: Record<string, Plan> = {
  cRelegated: { default: 'L' },
  cStayedA: { C_FIRST_STAGE: 'WLD' },
  cStayedB: { C_FIRST_STAGE: 'DWL' },
  cStayedC: { C_FIRST_STAGE: 'LWD' },
  cQuadOut: { C_QUADRANGULAR: 'L' },
  cChampion: { default: 'W' },
  cVice: { C_FINAL: 'L' },
  cThirdWin: { C_QUADRANGULAR: C_SECOND },
  cFourth: { C_QUADRANGULAR: C_SECOND, C_THIRD: 'L' },
  cPens: { C_FINAL: 'D' }
}
const POINTS_PATTERNS = ['W', 'L', 'WLD', 'WWWD', 'WWWWD', 'WWWL', 'WWDWL', 'WDWL', 'DLW', 'WWLL', 'WLWL', 'WWWLLL', 'WWDDL', 'WWLLL']

function loadCases() {
  const out: unknown[] = []
  const finish = (tag: string, b: ReturnType<typeof boot>) => {
    const steps: unknown[] = [snap(`${tag}:loaded`, b.league, b.club, null, true)]
    playUntilEnd(tag, b.league, b.club, { default: 'W' }, steps, 5)
    out.push({ name: tag, steps })
  }
  {
    const b = boot(31, 3)
    loadFlow(b.league, b.club, {})
    finish('load:empty', b)
  }
  {
    const b = boot(32, 2)
    loadFlow(b.league, b.club, { competitionStage: 'POINTS_38' })
    finish('load:partial', b)
  }
  {
    const src = boot(33, 2)
    src.league.initLeagueSeason(2, 1)
    const save: any = clone(src.league.toSave())
    const me = save.leagueFixtures.find((f: LeagueFixture) => f.homeId === 'user' || f.awayId === 'user')
    if (me.homeId === 'user') me.awayId = 'fantasma'
    else me.homeId = 'fantasma'
    const b = boot(33, 2)
    loadFlow(b.league, b.club, save)
    finish('load:fantasma', b)
  }
  {
    const src = boot(34, 4)
    src.league.initLeagueSeason(4, 1)
    for (let i = 0; i < 3; i++) { src.league.recordRoundResults(2, 0); src.league.evaluateStageProgression() }
    const save = clone({ ...src.league.toSave(), cupState: { lixo: true }, outra: 1 })
    const b = boot(35, 4)
    loadFlow(b.league, b.club, save)
    finish('load:full', b)
  }
  return out
}

/** Remove tie/leg/id/pens dos jogos do usuario na fase e apaga os outros confrontos dela (formato pre-tie). */
function toLegacy(save: any, stage: CompetitionStageType, opts: { onlyFirst?: boolean; trimTeams?: boolean; dropStages?: string[] } = {}) {
  const mine = save.leagueFixtures
    .filter((f: LeagueFixture) => f.stage === stage && (f.homeId === 'user' || f.awayId === 'user'))
    .map((f: any) => { const c = { ...f }; delete c.tie; delete c.leg; delete c.id; delete c.homePens; delete c.awayPens; return c })
  const others = save.leagueFixtures.filter((f: LeagueFixture) => f.stage !== stage && !(opts.dropStages ?? []).includes(f.stage as string))
  const teams = opts.trimTeams ? save.leagueTeams.filter((t: any) => t.group === 'A1' || t.isUser) : save.leagueTeams
  return {
    competitionStage: stage,
    leagueTeams: teams.map((t: any) => { const c = { ...t }; delete c.tag; return c }),
    leagueFixtures: [...others, ...(opts.onlyFirst ? mine.slice(0, 1) : mine)]
  }
}

interface LegacyCase {
  name: string
  seed: number
  div: number
  target: CompetitionStageType
  plan?: Plan
  legOnePlayed?: boolean
  opts?: { onlyFirst?: boolean; trimTeams?: boolean; dropStages?: string[] }
  /** transforma o save antes de carregar; default: toLegacy */
  build?: (save: any) => any
}

const LEGACY: LegacyCase[] = [
  { name: 'koR64', seed: 41, div: 4, target: 'D_R64' },
  { name: 'koR64leg1', seed: 42, div: 4, target: 'D_R64', legOnePlayed: true },
  { name: 'koR64trim', seed: 43, div: 4, target: 'D_R64', opts: { trimTeams: true } },
  { name: 'koR16only1', seed: 44, div: 4, target: 'D_R16', opts: { onlyFirst: true } },
  { name: 'koThird', seed: 45, div: 4, target: 'D_THIRD', plan: { D_SF: 'L' } },
  { name: 'koDFinalNoThird', seed: 46, div: 4, target: 'D_FINAL', opts: { dropStages: ['D_THIRD'] } },
  { name: 'koCFinal', seed: 47, div: 3, target: 'C_FINAL' },
  { name: 'noopGroups', seed: 48, div: 4, target: 'D_GROUPS', build: (s) => s },
  { name: 'noopNumbered', seed: 49, div: 4, target: 'D_R64', build: (s) => s },
  {
    name: 'noopEmptyStage', seed: 50, div: 4, target: 'D_R64',
    build: (s) => ({ ...s, leagueFixtures: s.leagueFixtures.filter((f: LeagueFixture) => f.stage !== 'D_R64') })
  },
  {
    name: 'noopNoUser', seed: 51, div: 4, target: 'D_R64',
    build: (s) => ({
      ...s,
      leagueFixtures: s.leagueFixtures
        .filter((f: LeagueFixture) => f.stage !== 'D_R64' || (f.homeId !== 'user' && f.awayId !== 'user'))
        .map((f: any) => { if (f.stage === 'D_R64') { const c = { ...f }; delete c.tie; return c } return f })
    })
  }
]

function legacyCases() {
  return LEGACY.map((c) => {
    const src = boot(c.seed, c.div)
    src.league.initLeagueSeason(c.div, 1)
    const plan = c.plan ?? { default: 'W' }
    for (let step = 0; step < 120 && src.league.competitionStage !== c.target; step++) {
      const st = src.league.competitionStage
      const seq = plan[st] ?? plan.default ?? 'W'
      const [u, o] = GOALS[seq[step % seq.length] as Res]
      src.league.recordRoundResults(u, o)
      if (src.league.evaluateStageProgression()?.kind === 'endSeason') break
    }
    if (c.legOnePlayed) src.league.recordRoundResults(2, 0)
    const base: any = clone(src.league.toSave())
    const legacy = c.build ? c.build(base) : toLegacy(base, c.target, c.opts)
    const b = boot(c.seed + 500, c.div)
    b.league.fromSave(clone(legacy))
    if (!b.league.leagueFixtures.length) b.league.initLeagueSeason(b.club.division, b.club.season)
    const before = fnv(JSON.stringify(b.league.toSave()))
    b.league.ensureKnockoutTies()
    b.league.selectedRound = b.league.currentRound
    const after = fnv(JSON.stringify(b.league.toSave()))
    const steps: unknown[] = [
      snap(`legacy:${c.name}:loaded`, b.league, b.club, { changed: before !== after, reached: b.league.competitionStage === c.target }, true)
    ]
    b.league.ensureKnockoutTies()
    steps.push(snap(`legacy:${c.name}:again`, b.league, b.club, { changed: fnv(JSON.stringify(b.league.toSave())) !== after }, false))
    playUntilEnd(`legacy:${c.name}`, b.league, b.club, { default: 'W' }, steps, c.name === 'noopNoUser' ? 5 : 120)
    return { name: c.name, steps }
  })
}

export function run() {
  return {
    storageKey: STORAGE_KEY,
    api: apiShape(),
    empty: (() => { const { club, league } = boot(1); return [snap('empty', league, club, null, true)] })(),
    serieD: Object.entries(D_CASES).flatMap(([k, p]) => (k === 'dPens' ? [1, 2, 3, 4] : [1]).map((s) => season(`D:${k}:${s}`, s, 4, p))),
    serieC: Object.entries(C_CASES).flatMap(([k, p]) => (k === 'cPens' ? [1, 2, 3] : [1, 2]).map((s) => season(`C:${k}:${s}`, s, 3, p))),
    serieB: POINTS_PATTERNS.flatMap((pat) => [1, 2].map((s) => season(`B:${pat}:${s}`, s, 2, { default: pat }))),
    serieA: POINTS_PATTERNS.flatMap((pat) => [1, 2].map((s) => season(`A:${pat}:${s}`, s, 1, { default: pat }))),
    otherDivision: season('div5', 5, 5, { default: 'W' }),
    seasonNumber: season('D:season3', 1, 4, { default: 'W' }, 3),
    career: career('career', 9, { default: 'W' }, 5),
    roundtrip: [
      roundtrip('rt:dGroups', 21, 4, { default: 'W' }, (_l, s) => s === 3),
      roundtrip('rt:dR64leg1', 22, 4, { default: 'W' }, (l) => l.competitionStage === 'D_R64' && l.leagueFixtures.some((f) => f.stage === 'D_R64' && f.played)),
      roundtrip('rt:cQuad', 23, 3, { default: 'W' }, (l) => l.competitionStage === 'C_QUADRANGULAR' && l.leagueFixtures.some((f) => f.stage === 'C_QUADRANGULAR' && f.played)),
      roundtrip('rt:points', 24, 2, { default: 'WLD' }, (_l, s) => s === 20),
      roundtrip('rt:ended', 25, 1, { default: 'W' }, () => false)
    ],
    loads: loadCases(),
    legacy: legacyCases()
  }
}

// ---------- cobertura ----------
const TOASTS = [
  'Eliminado na 1ª Fase da Série D. Nova temporada iniciada!', 'Classificado ao Mata-Mata da Série D!',
  'Avançou para: Série D — 3ª Fase (Ida e Volta)!', 'Avançou para: Série D — Oitavas de Final!',
  'Avançou para: Série D — Quartas de Final (Vale Acesso)!', 'Avançou para: Série D — Semifinal!',
  'Eliminado no Mata-Mata da Série D. Nova temporada!', 'Eliminado nas Quartas de Final da Série D. Tente novamente!',
  'Na Final Nacional da Série D! Acesso garantido.', 'Acesso garantido! Dispute o 3º lugar da Série D.',
  'CAMPEÃO NACIONAL DA SÉRIE D!', 'Vice-campeão da Série D. Acesso garantido!', '3º LUGAR NA SÉRIE D! ACESSO GARANTIDO!',
  '4º lugar na Série D. Acesso garantido!',
  'Rebaixado para a Série D.', 'Permaneceu na Série C. Nova temporada!',
  'Classificado ao Quadrangular do Acesso da Série C!', 'Eliminado no Quadrangular da Série C.',
  'Acesso garantido! Dispute o 3º lugar da Série C.', 'Acesso garantido! Agora, a Final Nacional da Série C.',
  'CAMPEÃO NACIONAL DA SÉRIE C!', 'Vice-campeão da Série C. Acesso para a Série B!',
  '3º lugar na Série C! Acesso para a Série B!', '4º lugar na Série C. Acesso para a Série B!',
  'CAMPEÃO DA SÉRIE B! RUMO À ELITE!', 'ACESSO CONQUISTADO PARA A SÉRIE A!', 'Rebaixado para a Série C.',
  'Temporada da Série B concluída!',
  'CAMPEÃO NACIONAL DA SÉRIE A!', 'Rebaixado para a Série B.'
]

export function coverage(result: any): string[] {
  const missing: string[] = []
  const snaps: any[] = []
  const walk = (v: any) => {
    if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') {
      if (typeof v.label === 'string' && v.view) snaps.push(v)
      else Object.values(v).forEach(walk)
    }
  }
  walk(result)
  const outcomes: any[] = snaps.map((s) => s.extra).filter((e) => e && typeof e === 'object' && typeof e.toast === 'string')
  const has = (t: string) => outcomes.some((o) => o.toast === t)
  for (const t of TOASTS) if (!has(t)) missing.push(`toast ausente: ${t}`)
  if (!outcomes.some((o) => o.toast.startsWith('Série A concluída em '))) missing.push('toast ausente: Série A concluída em ...')
  const distinct = (pred: (o: any) => boolean) => new Set(outcomes.filter(pred).map((o) => o.bonus)).size
  if (distinct((o) => o.toast === 'Eliminado no Mata-Mata da Série D. Nova temporada!') < 3) missing.push('bonus distintos < 3 em "Eliminado no Mata-Mata da Série D" (R64/R32/R16)')
  if (distinct((o) => o.toast === 'ACESSO CONQUISTADO PARA A SÉRIE A!') < 3) missing.push('bonus distintos < 3 em "ACESSO CONQUISTADO PARA A SÉRIE A!" (2o/3o/4o)')
  if (new Set(outcomes.filter((o) => o.toast.startsWith('Série A concluída em ')).map((o) => o.toast)).size < 2) missing.push('menos de 2 colocacoes distintas em "Série A concluída em"')
  if (!outcomes.some((o) => o.trophyType === 'title')) missing.push("nenhum trophyType 'title'")
  if (!outcomes.some((o) => o.trophyType === 'promotion')) missing.push("nenhum trophyType 'promotion'")
  if (!outcomes.some((o) => o.kind === 'advance')) missing.push("nenhum kind 'advance'")
  if (!snaps.some((s) => s.extra === null && /:\d+:/.test(s.label))) missing.push('nenhum passo com extra === null')

  const pens = (pred: (st: string) => boolean) =>
    snaps.some((s) => s.save && s.save.leagueFixtures.some((f: any) => f.homePens != null && pred(f.stage ?? '')))
  if (!pens((st) => st.startsWith('D_'))) missing.push('penaltis em fase D_* ausentes')
  if (!pens((st) => st === 'C_FINAL' || st === 'C_THIRD')) missing.push('penaltis em C_FINAL/C_THIRD ausentes')
  if (!snaps.some((s) => s.view.otherQuad.length > 0)) missing.push('view.otherQuad sempre vazio')
  if (!snaps.some((s) => s.view.podium != null)) missing.push('view.podium sempre nulo')
  if (!snaps.some((s) => s.view.opponent?.name === 'Rival Nacional')) missing.push("opponent 'Rival Nacional' ausente")
  if (!snaps.some((s) => s.view.opponent?.name === 'Adversário')) missing.push("opponent 'Adversário' ausente")
  if (!snaps.some((s) => s.view.names.includes('Clube'))) missing.push("names sem 'Clube'")

  const legacy: any[] = result.legacy ?? []
  for (const c of LEGACY) {
    const r = legacy.find((x) => x.name === c.name)
    if (!r) { missing.push(`legacy ausente: ${c.name}`); continue }
    const ch = r.steps[0]?.extra?.changed
    if (c.name.startsWith('ko') && ch !== true) missing.push(`legacy ${c.name}: esperado changed=true, veio ${ch}`)
    if (c.name.startsWith('noop') && ch !== false) missing.push(`legacy ${c.name}: esperado changed=false, veio ${ch}`)
    if (r.steps[0]?.extra?.reached !== true) missing.push(`legacy ${c.name}: fase alvo ${c.target} nao alcancada no save`)
  }

  const api = result.api
  if (JSON.stringify(api?.order) !== JSON.stringify(EXPECTED_ORDER)) missing.push('api.order difere de EXPECTED_ORDER')
  if (api?.shape?.length !== 30) missing.push(`api.shape tem ${api?.shape?.length} entradas (esperado 30)`)
  for (const s of snaps) {
    if (s.label.endsWith(':maxSteps') && !s.label.startsWith('div5')) missing.push(`maxSteps atingido: ${s.label}`)
  }
  return [...new Set(missing)]
}

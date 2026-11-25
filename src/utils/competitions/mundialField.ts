import {
  CONTINENTAL_RIVALS, MUNDIAL_EVERY, MUNDIAL_HOSTS, MUNDIAL_RIVALS, MUNDIAL_SLOTS
} from '@/config/competitions'
import type { MundialHost } from '@/config/competitions'
import type { Podium } from '@/types'
import type { SeasonEcoRecord } from '@/types/club'
import type { GroupTeam, MundialConfed, MundialEntry } from '@/types/competitions'
import { LEAGUE_CLUBS_POOL } from '@/utils/league/leagueScheduler'
import { shuffle, type Rng } from '@/utils/core/random'
import { drawGroups } from '@/utils/groups/groupStage'
import { userMundialEntry } from '@/utils/competitions/rankingCondor'

export interface MundialLocalClub { name: string; power: number }

export interface BuildMundialFieldArgs {
  /** Temporada da edição (múltipla de `MUNDIAL_EVERY`). */
  season: number
  rng: Rng
  records: SeasonEcoRecord[]
  podiumArchive?: Podium[]
  userName: string
  userPower: number
  /** Vice da Série A da temporada anterior (quando o usuário não for ele). */
  serieARunnerUp?: MundialLocalClub | null
}

export type MundialHostSource = 'serieA' | 'cup' | 'serieARunnerUp' | 'ia' | 'foreign'

export interface MundialField {
  teams: GroupTeam[]
  groups: Array<{ id: string; teams: GroupTeam[] }>
  hostId: string
  hostSource: MundialHostSource
  userEntry: MundialEntry | null
  /** Sorteio precisou relaxar a restrição de confederação. */
  relaxed: boolean
}

const USER_KEY = '__user'
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
const keyOf = (name: string) => slug(name)

const KNOWN: Array<{ id: string; name: string }> = [
  ...Object.values(LEAGUE_CLUBS_POOL).flat().map((c) => ({ id: c.id, name: c.name })),
  ...CONTINENTAL_RIVALS.map((c) => ({ id: c.id, name: c.name }))
]
const idForName = (name: string) => KNOWN.find((c) => c.name === name)?.id ?? `ext_${slug(name)}`

const mk = (
  id: string, name: string, power: number, isUser: boolean, confed: MundialConfed, tag: string
): GroupTeam => ({ id, name, power, isUser, points: 0, played: 0, won: 0, gf: 0, ga: 0, confed, tag })

/**
 * Monta os 32 clubes da Copa dos Continentes: campeões da Ouro do ciclo, sede, ranking e as
 * confederações estrangeiras (`MUNDIAL_RIVALS`), sem clube duplicado, e sorteia os grupos.
 * Pura e determinística dado `rng`.
 */
export function buildMundialField(args: BuildMundialFieldArgs): MundialField {
  const { season, rng, records, podiumArchive = [], userName, userPower, serieARunnerUp = null } = args
  const used = new Set<string>()
  const teams: GroupTeam[] = []
  const add = (t: GroupTeam): boolean => {
    const k = t.isUser ? USER_KEY : keyOf(t.name)
    if (used.has(k)) return false
    used.add(k)
    teams.push(t)
    return true
  }
  const userTeam = (confed: MundialConfed, tag: string) => mk('user', userName, userPower, true, confed, tag)
  const cycle = records.filter((r) => r.season >= season - MUNDIAL_EVERY && r.season < season)

  // 1) Campeões da Ouro do ciclo (bicampeão ocupa uma vaga só).
  const ouroPodium = (s: number) => podiumArchive.find(
    (p) => p.season === s && p.competition === 'continental' && !/prata/i.test(p.competitionLabel)
  )
  const ouroTag = 'Campeão da Copa Condor de Ouro'
  for (let s = season - MUNDIAL_EVERY; s < season; s++) {
    const rec = cycle.find((r) => r.season === s)
    const pod = ouroPodium(s)
    if (rec?.ouro === 'champion' || pod?.champion.isUser) { add(userTeam('sulamerica', ouroTag)); continue }
    let champ: MundialLocalClub | null = rec?.ouroChampion ?? null
    if (!champ && pod) {
      const known = CONTINENTAL_RIVALS.find((c) => c.name === pod.champion.name)
      champ = { name: pod.champion.name, power: known?.power ?? 74 }
    }
    if (!champ && rec) {
      const r = shuffle(CONTINENTAL_RIVALS, rng)[0]
      champ = { name: r.name, power: r.power }
    }
    if (champ) add(mk(idForName(champ.name), champ.name, champ.power, false, 'sulamerica', ouroTag))
  }
  const userInOuro = used.has(USER_KEY)

  // 2) Sede: rotação de países; no seu país, campeão da A, depois da Taça, depois vice da A.
  const edition = Math.round(season / MUNDIAL_EVERY)
  const host: MundialHost = MUNDIAL_HOSTS[(edition - 1 + MUNDIAL_HOSTS.length) % MUNDIAL_HOSTS.length]
  let hostId = ''
  let hostSource: MundialHostSource = 'foreign'
  const taken = (name: string, isUser: boolean) => used.has(isUser ? USER_KEY : keyOf(name))
  const hostTag = 'Sede'
  const place = (t: GroupTeam, src: MundialHostSource): boolean => {
    if (!add(t)) return false
    hostId = t.id
    hostSource = src
    return true
  }
  if (host.user) {
    const prev = records.find((r) => r.season === season - 1)
    const cands: Array<{ src: MundialHostSource; isUser: boolean; club: MundialLocalClub | null }> = [
      { src: 'serieA', isUser: !!prev && prev.division === 1 && (prev.leagueTitle || prev.leagueRank === 1), club: prev?.serieAChampion ?? null },
      { src: 'cup', isUser: prev?.cup === 'champion', club: prev?.cupChampion ?? null },
      { src: 'serieARunnerUp', isUser: !!prev && prev.division === 1 && prev.leagueRank === 2 && !prev.leagueTitle, club: serieARunnerUp }
    ]
    for (const c of cands) {
      if (hostId) break
      if (c.isUser) {
        if (!taken(userName, true)) place(userTeam('sede', hostTag), c.src)
      } else if (c.club && !taken(c.club.name, false)) {
        place(mk(idForName(c.club.name), c.club.name, c.club.power, false, 'sede', hostTag), c.src)
      }
    }
    if (!hostId) {
      const pool = [...LEAGUE_CLUBS_POOL[1]].sort((a, b) => b.basePower - a.basePower)
      const c = pool.find((x) => !used.has(keyOf(x.name)))
      if (c) place(mk(c.id, c.name, c.basePower, false, 'sede', hostTag), 'ia')
    }
  } else {
    place(mk(`host_${host.id}`, host.name, host.power ?? 66, false, 'sede', hostTag), 'foreign')
  }
  const userInHost = hostId === 'user'

  // 3) Ranking: o usuário (se passar o corte) e a IA completam as vagas sul-americanas.
  const entry: MundialEntry | null = userInOuro ? 'ouro' : userMundialEntry(records, season, userInHost)
  if (entry === 'ranking' && !userInOuro) add(userTeam('sulamerica', 'Ranking Condor'))
  const pool = [
    ...LEAGUE_CLUBS_POOL[1].map((c) => ({ id: c.id, name: c.name, power: c.basePower })),
    ...CONTINENTAL_RIVALS
  ]
    .filter((c) => !used.has(keyOf(c.name)))
    .map((c) => ({ c, s: c.power + rng() * 4 }))
    .sort((a, b) => b.s - a.s)
  for (const { c } of pool) {
    if (teams.filter((t) => t.confed === 'sulamerica').length >= MUNDIAL_SLOTS.sulamerica) break
    add(mk(c.id, c.name, c.power, false, 'sulamerica', 'Ranking Condor'))
  }

  // 4) Confederações estrangeiras, com OVER nas faixas aprovadas.
  const foreign: MundialConfed[] = ['europa', 'asia', 'africa', 'norte', 'oceania']
  for (const confed of foreign) {
    const cfg = MUNDIAL_RIVALS[confed as keyof typeof MUNDIAL_RIVALS]
    const n = MUNDIAL_SLOTS[confed]
    const names = shuffle(cfg.names, rng).slice(0, n)
    names.forEach((name, i) => {
      // Europa: 4 do topo entre 80 e 83; o resto entre o mínimo e 79.
      const top = confed === 'europa' && i < 4
      const lo = top ? 80 : cfg.minOver
      const hi = top ? cfg.maxOver : confed === 'europa' ? 79 : cfg.maxOver
      const power = lo + Math.floor(rng() * (hi - lo + 1))
      add(mk(`mr_${confed}_${slug(name)}`, name, power, false, confed, `Campeão da ${cfg.label}`))
    })
  }

  const { groups, relaxed } = drawGroups(teams, rng, { hostId })
  return { teams, groups, hostId, hostSource, userEntry: entry, relaxed }
}

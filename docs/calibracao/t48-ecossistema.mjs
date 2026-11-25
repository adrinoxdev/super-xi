// T48 - Checagem do ecossistema (grafo + cenarios da virada).  Uso: node docs/calibracao/t48-ecossistema.mjs
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../../', import.meta.url)).split(String.fromCharCode(92)).join('/').replace(/\/+$/, '')
const store = new Map()
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }
globalThis.confirm = () => true
globalThis.window = globalThis
globalThis.location = { pathname: '/', search: '', hash: '', href: 'http://x/', origin: 'http://x' }
globalThis.history = { state: {}, pushState() {}, replaceState() {}, length: 1 }
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}
globalThis.document = { querySelector: () => null, addEventListener() {} }
const vs = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const V = []
const ok = (c, m) => { if (!c) { V.push(m); console.log('VIOLACAO', m) } else console.log('OK', m) }
const load = (p) => vs.ssrLoadModule(p)
const { router } = await load('/src/router/index.ts')
router.push = () => new Promise(() => {})
const { useSeason } = await load('/src/composables/useSeason.ts')
const { useClubStore } = await load('/src/stores/club.ts')
const { useCompetitionsStore } = await load('/src/stores/competitions.ts')
const { useLeagueStore } = await load('/src/stores/league.ts')
const { useSquadStore } = await load('/src/stores/squad.ts')
const { checkEcosystemGraph } = await load('/src/utils/competitions/ecosystem.ts')
const { buildMundialField } = await load('/src/utils/competitions/mundialField.ts')
const { ECOSYSTEM_LINKS } = await load('/src/config/competitions.ts')
const D = await load('/src/stores/modules/competitions/defaults.ts')

// ===== 1) Grafo =====
const g = checkEcosystemGraph(ECOSYSTEM_LINKS)
ok(g.orphans.length === 0, '1a nenhum no orfao (inalcancavel da Serie D): ' + g.orphans.join(','))
ok(g.deadEnds.length === 0, '1b nenhum beco sem saida (exceto mundial): ' + g.deadEnds.join(','))
// pares da coluna "Alimenta" da tabela da secao 3 do plano
const TABLE = {
  serieD: ['serieC', 'supercup', 'cup'], serieC: ['serieB', 'serieD', 'supercup'], serieB: ['serieA', 'serieC', 'supercup'],
  serieA: ['ouro', 'prata', 'supercup', 'mundial', 'ranking', 'serieB'], cup: ['prata', 'supercup', 'mundial', 'ranking'],
  ouro: ['recopa', 'mundial', 'ranking'], prata: ['recopa', 'ranking'], supercup: ['ranking'], recopa: ['ranking'], ranking: ['mundial']
}
for (const [from, tos] of Object.entries(TABLE)) for (const to of tos)
  ok(ECOSYSTEM_LINKS.some((l) => l.from === from && l.to === to), `1c ligacao ${from} -> ${to}`)
ok(ECOSYSTEM_LINKS.length === Object.values(TABLE).flat().length, '1d ECOSYSTEM_LINKS sem ligacao fora da tabela')

// ===== helpers de cenario =====
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const br = (champ, ru, power) => ({
  teams: { [champ.teamId]: { id: champ.teamId, name: champ.name, power }, [ru.teamId]: { id: ru.teamId, name: ru.name, power: 58 } }, rounds: [],
  podium: { champion: champ, runnerUp: ru, third: null }
})
const IA = (id, name) => ({ teamId: id, name, isUser: false })
function fresh() {
  setActivePinia(createPinia()); store.clear()
  const club = useClubStore(), comp = useCompetitionsStore(), season = useSeason(), league = useLeagueStore()
  season.initializeFreshCareer()
  return { club, comp, season, league }
}
/** Forca o usuario a ficar em `rank` na tabela da Serie A (jogos de pontos corridos ja jogados). */
function setRank(league, rank) {
  league.competitionStage = 'POINTS_38'
  const others = league.leagueTeams.filter((t) => t.id !== 'user')
  const high = others.slice(0, rank - 1), low = others.slice(rank - 1)
  const fx = []
  const add = (h, a, hs, as) => fx.push({ stage: 'POINTS_38', round: 1, homeId: h, awayId: a, homeScore: hs, awayScore: as, played: true })
  for (const h of high) { add(h.id, 'user', 1, 0); for (const l of low) add(h.id, l.id, 1, 0) }
  for (const l of low) add('user', l.id, 1, 0)
  league.leagueFixtures = fx
}

// ===== 2a) campeao da A, da Taca e da Ouro; sede no seu pais (temporada 16 = 4a edicao, sede 'casa') =====
{
  const { club, comp, season, league } = fresh()
  club.season = 15; club.division = 1
  setRank(league, 1)
  const vice = league.leagueStandings.find((r) => r.rank === 2)
  ok(league.userLeagueRank === 1, '2a preparo: usuario 1o na tabela')
  const U = { teamId: 'user', name: club.name, isUser: true }
  comp.continentalState = { ...D.emptyContinental(), qualified: true, tier: 'libertadores', champion: true, finalPosition: 1, bracket: br(U, IA('x', 'X'), 80) }
  comp.cupState = { ...D.emptyCup(), champion: true, finalPosition: 1, bracket: br(U, IA('v', 'Vice Real'), 80) }
  season.startNewSeason(1, 0, 't', 'success', 'title', 'Campeao')
  ok(club.season === 16, '2a temporada 16')
  ok(comp.continentalState.tier === 'libertadores', '2a Ouro (nao Prata) no continental: ' + comp.continentalState.tier)
  ok(comp.supercupState.qualified && comp.supercupState.rivalName === 'Vice Real', '2a Supercopa contra o vice da Taca: ' + comp.supercupState.rivalName)
  const rec = club.ecoRecords.find((x) => x.season === 15)
  ok(comp.recopaState.qualified && !!rec.prataChampion && comp.recopaState.rivalName === rec.prataChampion.name && comp.recopaState.rivalName !== club.name, '2a Recopa contra o campeao da Prata: ' + comp.recopaState.rivalName)
  const m = comp.mundialState
  ok(m.qualified && m.userEntry === 'ouro', '2a edicao aberta com vaga unica do usuario "ouro": ' + m.userEntry)
  const teams = m.groups.flatMap((x) => x.teams)
  ok(teams.filter((t) => t.isUser).length === 1, '2a usuario aparece uma vez no campo')
  ok(m.hostId !== 'user' && teams.length === 32, `2a sede nao e o usuario (hostId=${m.hostId}, campo=${teams.length})`)
  if (vice && !vice.isUser) {
    const h = teams.find((t) => t.id === m.hostId)
    ok(!!h && h.name === vice.name, `2a sede e o vice da A (${vice.name}): ${h?.name}`)
  } else ok(false, '2a vice da A nao encontrado na tabela de teste')
}

// ===== 2b) campeao da Taca na Serie D =====
{
  const { club, comp, season } = fresh()
  club.season = 5; club.division = 4
  const U = { teamId: 'user', name: club.name, isUser: true }
  comp.cupState = { ...D.emptyCup(), champion: true, finalPosition: 1, bracket: br(U, IA('v', 'Vice Real'), 80) }
  season.startNewSeason(4, 0, 't', 'success')
  const rec = club.ecoRecords.find((x) => x.season === 5)
  ok(comp.continentalState.tier === 'sulamericana' && comp.continentalState.qualified, '2b Prata: ' + comp.continentalState.tier)
  ok(comp.supercupState.qualified && !!rec.serieAChampion && comp.supercupState.rivalName === rec.serieAChampion.name, '2b Supercopa contra o campeao da A gravado: ' + comp.supercupState.rivalName)
  ok(!comp.mundialState.qualified && !comp.recopaState.qualified, '2b sem Mundial nem Recopa')
}

// ===== 2c) 5o da A sem titulo =====
{
  const { club, comp, season, league } = fresh()
  club.season = 5; club.division = 1
  setRank(league, 5)
  ok(league.userLeagueRank === 5, '2c preparo: usuario 5o')
  season.startNewSeason(1, 0, 't', 'success')
  ok(comp.continentalState.tier === 'sulamericana' && comp.continentalState.qualified, '2c Prata: ' + comp.continentalState.tier)
  ok(!comp.supercupState.qualified && !comp.recopaState.qualified, '2c nenhuma final')
}

// ===== 2d) 500 viradas com sementes variadas =====
{
  const { club, comp, season, league } = fresh()
  const squad = useSquadStore()
  const realRandom = Math.random
  const bad = new Set()
  const note = (seed, msg) => { if (bad.size < 40) bad.add(`seed=${seed} ${msg}`) }
  let editions = 0
  for (let seed = 1; seed <= 500; seed++) {
    const r = mulberry(seed * 7919)
    Math.random = mulberry(seed)
    const div = 1 + Math.floor(r() * 4)
    club.division = div
    club.season = r() < 0.4 ? 4 * (1 + Math.floor(r() * 6)) - 1 : 1 + Math.floor(r() * 30)
    league.initLeagueSeason(div, club.season)
    const rank = 1 + Math.floor(r() * 20)
    setRank(league, rank)
    const U = { teamId: 'user', name: club.name, isUser: true }
    const userCup = r() < 0.3, userCont = r() < 0.3
    comp.initCupForSeason(); comp.initContinentalForSeason(r() < 0.6, r() < 0.5 ? 'libertadores' : 'sulamericana')
    if (userCup) comp.cupState = { ...D.emptyCup(), champion: true, finalPosition: 1, bracket: br(U, IA('v', 'Vice Real'), 70) }
    if (userCont && comp.continentalState.qualified) comp.continentalState = { ...comp.continentalState, champion: true, finalPosition: 1, bracket: br(U, IA('x', 'X'), 78) }
    const title = div === 1 && league.userLeagueRank === 1
    const prevRank = league.userLeagueRank
    const nextDiv = Math.max(1, Math.min(4, div + (r() < 0.3 ? -1 : r() < 0.3 ? 1 : 0)))
    season.startNewSeason(nextDiv, 0, 't', 'success', title ? 'title' : null, title ? 'T' : '')
    const un = club.name
    if (comp.supercupState.qualified && comp.supercupState.rivalName === un) note(seed, `rival da Supercopa e o usuario (${un})`)
    if (comp.recopaState.qualified && comp.recopaState.rivalName === un) note(seed, `rival da Recopa e o usuario (${un})`)
    // um unico estado continental: Ouro e Prata ao mesmo tempo seria top4 da A com tier Prata (ou vice-versa)
    const c = comp.continentalState
    if (c.qualified && div === 1 && prevRank <= 4 && c.tier !== 'libertadores') note(seed, `top4 da A (rank ${prevRank}) com tier ${c.tier}`)
    if (c.qualified && c.tier === 'libertadores' && !(div === 1 && prevRank <= 4)) note(seed, `Ouro sem top4 da A (div ${div}, rank ${prevRank})`)
    if (club.season % 4 === 0) {
      editions++
      const f = buildMundialField({ season: club.season, rng: mulberry(seed + 99), records: club.ecoRecords, podiumArchive: club.podiumArchive, userName: un, userPower: squad.teamStrength.rating })
      const chk = (teams, tag) => {
        const names = teams.map((t) => t.name), ids = teams.map((t) => t.id)
        if (new Set(names).size !== names.length) note(seed, `${tag}: nome duplicado ${names.find((n, i) => names.indexOf(n) !== i)}`)
        if (new Set(ids).size !== ids.length) note(seed, `${tag}: id duplicado ${ids.find((n, i) => ids.indexOf(n) !== i)}`)
        if (teams.filter((t) => t.isUser).length > 1) note(seed, `${tag}: usuario duas vezes`)
        if (teams.length !== 32) note(seed, `${tag}: campo com ${teams.length} clubes`)
      }
      chk(f.teams, 'campo(buildMundialField)')
      const m = comp.mundialState
      if (m.qualified) chk(m.groups.flatMap((x) => x.teams), 'campo(estado)')
    }
  }
  Math.random = realRandom
  ok(editions > 20, '2d edicoes verificadas: ' + editions)
  ok(bad.size === 0, '2d 500 viradas sem violacao' + (bad.size ? ':\n  ' + [...bad].join('\n  ') : ''))
}

await vs.close()
if (V.length) { console.log('FALHOU t48-ecossistema, violacoes:'); V.forEach((v) => console.log(' -', v)); process.exit(1) }
console.log('OK t48-ecossistema')

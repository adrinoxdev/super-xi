// T45 - Virada de temporada com a Copa dos Continentes.  Uso: node docs/calibracao/t45-mundial-season.mjs
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
const fail = async (m) => { console.log('FAIL', m); await vs.close(); process.exit(1) }
const ok = async (c, m) => { if (!c) await fail(m); console.log('OK', m) }
const load = (p) => vs.ssrLoadModule(p)
const { router } = await load('/src/router/index.ts')
router.push = () => new Promise(() => {})
const { useSeason } = await load('/src/composables/useSeason.ts')
const { useClubStore } = await load('/src/stores/club.ts')
const { useCompetitionsStore } = await load('/src/stores/competitions.ts')
const D = await load('/src/stores/modules/competitions/defaults.ts')

const rec = (season, o = {}) => ({
  season, division: 1, leagueRank: null, leagueTitle: false, ouro: null, prata: null, cup: null,
  recopa: false, supercup: false, ouroChampion: null, prataChampion: null, cupChampion: null, serieAChampion: null, ...o
})
const fakeBracket = (champ, power) => ({
  teams: { [champ.teamId]: { id: champ.teamId, name: champ.name, power } }, rounds: [],
  podium: { champion: champ, runnerUp: { teamId: 'x', name: 'X', isUser: false }, third: null }
})
function fresh() {
  setActivePinia(createPinia()); store.clear()
  const club = useClubStore(), comp = useCompetitionsStore(), season = useSeason()
  season.initializeFreshCareer()
  return { club, comp, season }
}

// 1) o registro grava fases e campeoes (virada da temporada 3 para a 4)
{
  const { club, comp, season } = fresh()
  club.season = 3; club.division = 1
  comp.continentalState = { ...D.emptyContinental(), qualified: true, tier: 'libertadores', champion: true, finalPosition: 1,
    bracket: fakeBracket({ teamId: 'user', name: club.name, isUser: true }, 80) }
  comp.cupState = { ...D.emptyCup(), finalPosition: 2, bracket: fakeBracket({ teamId: 'ia1', name: 'Rival da Taca', isUser: false }, 66) }
  comp.supercupState = { ...D.emptyFinal({ name: 'R', power: 60 }), qualified: true, played: true, won: true }
  season.startNewSeason(1, 0, 't', 'success', 'title', 'Campeao')
  const r = club.ecoRecords.find((x) => x.season === 3)
  await ok(!!r, '1a registro da temporada 3 gravado')
  await ok(r.division === 1 && r.leagueTitle === true && typeof r.leagueRank === 'number', '1b liga: serie e titulo')
  await ok(r.ouro === 'champion' && r.prata === null && r.ouroChampion?.name === club.name, '1c Ouro campea e campeao gravado')
  await ok(r.cup === 'runnerUp' && r.cupChampion?.name === 'Rival da Taca' && r.cupChampion.power === 66, '1d Taca vice e campeao da Taca')
  await ok(r.supercup === true && r.recopa === false, '1e Supercopa ganha, Recopa nao')
  await ok(r.serieAChampion && r.serieAChampion.name && r.serieAChampion.power > 0, '1f campeao da Serie A gravado')
}

// 2) edicao abre na temporada multipla de 4 com o usuario classificado; 3) W.O. e podio na virada seguinte
{
  const { club, comp, season } = fresh()
  club.season = 3; club.division = 1
  club.recordEcoSeason(rec(2, { ouro: 'champion', ouroChampion: { name: club.name, power: 80 } }))
  comp.continentalState = { ...D.emptyContinental(), qualified: true, tier: 'libertadores', champion: true, finalPosition: 1,
    bracket: fakeBracket({ teamId: 'user', name: club.name, isUser: true }, 80) }
  season.startNewSeason(1, 0, 't', 'success')
  const m = comp.mundialState
  await ok(club.season === 4 && m.qualified && m.stage === 'GROUPS' && m.season === 4 && m.edition === 1 && m.userEntry === 'ouro' && !!m.bracket, '2 edicao aberta na T4 com o usuario classificado')
  // virada seguinte sem jogar: W.O.
  season.startNewSeason(1, 0, 't', 'success')
  await ok(club.season === 5 && !comp.mundialState.qualified && comp.mundialState.bracket === null, '3a estado reiniciado')
  const pod = club.podiumArchive.find((p) => p.competition === 'mundial' && p.season === 4)
  await ok(!!pod && !!pod.champion.name && !!pod.runnerUp.name, '3b podio arquivado')
  await ok(pod.champion.isUser === false, '3c W.O.: usuario nao e campeao')
  await ok(club.ecoRecords.some((x) => x.season === 4), '3d registro da temporada 4 gravado')
}

// 4) nada fora do ano de edicao (sem vaga, nem na T8; temporadas 5 a 7 sem estado)
{
  const { club, comp, season } = fresh()
  club.season = 4; club.division = 4 // Serie D: sem pontos de ranking, logo sem vaga
  for (let s = 5; s <= 7; s++) {
    season.startNewSeason(4, 0, 't', 'success')
    await ok(club.season === s && !comp.mundialState.qualified && comp.mundialState.bracket === null, `4 temporada ${s}: sem Copa dos Continentes`)
  }
  season.startNewSeason(4, 0, 't', 'success')
  await ok(club.season === 8 && !comp.mundialState.qualified && comp.mundialState.bracket === null, '4 temporada 8 sem vaga do usuario: estado vazio')
  await ok(!club.podiumArchive.some((p) => p.competition === 'mundial'), '4 nenhum podio da Copa dos Continentes sem edicao')
}

await vs.close()
console.log('OK t45-mundial-season')

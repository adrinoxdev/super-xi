// T46 - Persistencia da Copa dos Continentes: save antigo, reconstrucao do ecoRecords, aviso unico.  Uso: node docs/calibracao/t46-mundial-save.mjs
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
const { usePersistence, STORAGE_KEY } = await load('/src/composables/usePersistence.ts')
const { useSeason } = await load('/src/composables/useSeason.ts')
const { useClubStore } = await load('/src/stores/club.ts')
const { useCompetitionsStore } = await load('/src/stores/competitions.ts')
const { useUiStore } = await load('/src/stores/ui.ts')
const D = await load('/src/stores/modules/competitions/defaults.ts')
const NOTICE = 'Nova competição: Copa dos Continentes, a cada 4 temporadas. Próxima edição na temporada 8. Seus títulos já contam para o Ranking Condor.'

function fresh() {
  setActivePinia(createPinia()); store.clear()
  useSeason().initializeFreshCareer()
  return { club: useClubStore(), comp: useCompetitionsStore(), ui: useUiStore(), P: usePersistence() }
}
function spy(ui) {
  const msgs = []
  const orig = ui.showToast
  ui.showToast = (m, t) => { msgs.push(m); return orig(m, t) }
  return msgs
}
const pod = (competition, competitionLabel, season, champ, runner, third = null) => ({
  competition, competitionLabel, season,
  champion: champ, runnerUp: runner, third, finalSummary: '1 x 0', thirdSummary: null
})
const e = (name, isUser = false) => ({ teamId: isUser ? 'user' : name, name, isUser })

// 1) save antigo (sem ecoRecords, sem mundialState) reconstroi e avisa uma vez
const A = fresh()
A.club.season = 4; A.club.division = 1
A.club.trophyGallery = [
  { id: 'a', season: 1, type: 'title', title: 'Campeão da Série A', prize: 1 },
  { id: 'b', season: 2, type: 'title', title: 'Campeão da Copa Condor de Prata', prize: 1 },
  { id: 'c', season: 2, type: 'title', title: 'Campeão da Supercopa Soberana', prize: 1 },
  { id: 'd', season: 3, type: 'title', title: 'Campeão da Taça Cacique', prize: 1 },
  { id: 'e', season: 3, type: 'title', title: 'Campeão da Recopa Condor', prize: 1 },
  { id: 'f', season: 3, type: 'promotion', title: 'Promovido', prize: 1 },
  { id: 'g', season: 4, type: 'title', title: 'Campeão da Taça Cacique', prize: 1 }
]
A.club.podiumArchive = [
  pod('continental', 'Copa Condor de Ouro', 3, e('Rival Ouro'), e(A.club.name, true)),
  pod('continental', 'Copa Condor de Ouro', 1, e(A.club.name, true), e('X')),
  pod('continental', 'Copa Condor de Prata', 2, e(A.club.name, true), e('Y')),
  pod('cup', 'Taça Cacique', 3, e(A.club.name, true), e('Z')),
  pod('cup', 'Taça Cacique', 2, e('Outro'), e('W'), e(A.club.name, true))
]
A.P.saveGame()
const old = JSON.parse(store.get(STORAGE_KEY))
delete old.club.ecoRecords; delete old.mundialState
const oldJson = JSON.stringify(old)

const B = fresh(); store.set(STORAGE_KEY, oldJson)
const msgs1 = spy(B.ui)
B.P.loadGame()
const rs = B.club.ecoRecords
const r = (s) => rs.find((x) => x.season === s)
await ok(rs.length === 3 && rs.every((x) => x.season < 4), '1a so temporadas encerradas com dado (1, 2, 3); a atual fica fora')
await ok(r(1).leagueTitle && r(1).division === 1 && r(1).leagueRank === 1 && r(1).ouro === 'champion' && r(1).ouroChampion.name === B.club.name, '1b temporada 1: titulo da A e Ouro campea (gallery + podio)')
await ok(r(2).prata === 'champion' && r(2).prataChampion.name === B.club.name && r(2).supercup === true && r(2).ouro === null && r(2).cup === null && r(2).cupChampion.name === 'Outro', '1c temporada 2: Prata campea, Supercopa, Taca com campeao alheio e fase null')
await ok(r(3).cup === 'champion' && r(3).recopa === true && r(3).ouro === 'runnerUp' && r(3).ouroChampion.name === 'Rival Ouro' && r(3).leagueTitle === false, '1d temporada 3: Taca, Recopa e vice na Ouro')
await ok(r(1).prata === null && r(1).serieAChampion === null && r(3).prata === null, '1e fases que nao sao titulo ficam null')
await ok(msgs1.filter((m) => m === NOTICE).length === 1, '1f aviso unico exato na primeira carga: ' + msgs1.join('|'))
await ok(JSON.stringify(B.comp.mundialState) === JSON.stringify(D.emptyMundial()), '1g save antigo usa emptyMundial()')
const afterFirst = JSON.stringify(B.club.ecoRecords)

// 2) segunda carga (save regravado): nada muda, sem novo aviso
const saved1 = store.get(STORAGE_KEY)
const C = fresh(); store.set(STORAGE_KEY, saved1)
const msgs2 = spy(C.ui)
C.P.loadGame()
await ok(JSON.stringify(C.club.ecoRecords) === afterFirst, '2a segunda carga nao muda o ecoRecords')
await ok(!msgs2.includes(NOTICE), '2b aviso nao repete')
const emptied = JSON.parse(saved1); emptied.club.ecoRecords = []
const E2 = fresh(); store.set(STORAGE_KEY, JSON.stringify(emptied)); E2.P.loadGame()
await ok(E2.club.ecoRecords.length === 0, '2c ecoRecords [] presente: nada reconstruido')

// 3) save novo: sem aviso
const F = fresh(); const msgs3 = spy(F.ui)
F.P.saveGame(); F.P.loadGame()
await ok(!msgs3.includes(NOTICE) && Array.isArray(JSON.parse(store.get(STORAGE_KEY)).club.ecoRecords), '3 save novo nao mostra o aviso')

// 4) Mundial no meio dos grupos recarrega igual; save, load, save identico; chaves
const G = fresh()
G.club.season = 3; G.club.division = 1
G.club.recordEcoSeason({ season: 2, division: 1, leagueRank: 1, leagueTitle: true, ouro: 'champion', prata: null, cup: null, recopa: false, supercup: false,
  ouroChampion: { name: G.club.name, power: 80 }, prataChampion: null, cupChampion: null, serieAChampion: null })
G.comp.continentalState = { ...D.emptyContinental(), qualified: true, tier: 'libertadores', champion: true, finalPosition: 1,
  bracket: { teams: { user: { id: 'user', name: G.club.name, power: 80 } }, rounds: [], podium: { champion: e(G.club.name, true), runnerUp: e('X'), third: null } } }
useSeason().startNewSeason(1, 0, 't', 'success')
const m = G.comp.mundialState
await ok(G.club.season === 4 && m.qualified && m.stage === 'GROUPS' && m.groups.length > 0, '4a edicao aberta na temporada 4')
const g0 = m.groups.find((g) => g.id === m.userGroupId) || m.groups[0]
g0.results.push({ round: 1, homeId: g0.teams[0].id, awayId: g0.teams[1].id, hg: 2, ag: 1 })
G.P.saveGame()
const s1 = store.get(STORAGE_KEY)
const H = fresh(); store.set(STORAGE_KEY, s1); H.P.loadGame()
await ok(JSON.stringify(H.comp.mundialState) === JSON.stringify(JSON.parse(s1).mundialState) && H.comp.mundialState.groups.length > 0, '4b Mundial no meio dos grupos recarrega igual')
H.P.saveGame()
const s2 = store.get(STORAGE_KEY)
const I = fresh(); store.set(STORAGE_KEY, s2); I.P.loadGame(); I.P.saveGame()
const strip = (s) => { const o = JSON.parse(s); delete o.club.lastActiveAt; return JSON.stringify(o) }
await ok(strip(store.get(STORAGE_KEY)) === strip(s2) && strip(s2) === strip(s1), '4c save, load, save identico')
const KEYS = ['club', 'squad', 'scouting', 'competitionStage', 'leagueTeams', 'leagueFixtures', 'transferHistory', 'trophyGallery', 'seasonGoals', 'seasonAssists', 'seasonApps', 'seasonYellows', 'seasonReds', 'careerStats', 'matchHistory', 'incomingOffers', 'youthAcademyProspects', 'staffContracts', 'supercupState', 'recopaState', 'cupState', 'continentalState', 'friendlies', 'prematchCompetition']
const keys = Object.keys(JSON.parse(s1))
await ok(KEYS.every((k) => keys.includes(k)) && keys.includes('mundialState') && keys.length === KEYS.length + 1, '4d chaves de antes (24) mais mundialState')

// 5) edicao sem o usuario: resumo persiste, save idempotente; save antigo sem o campo carrega
const J = fresh()
J.club.season = 7; J.club.division = 4
useSeason().startNewSeason(4, 0, 't', 'success')
const lastJ = J.comp.mundialState.last
await ok(J.club.season === 8 && !J.comp.mundialState.qualified && lastJ && lastJ.champion && lastJ.groups.length === 8, '5a edicao sem usuario guarda o resumo')
const j1 = store.get(STORAGE_KEY)
const K = fresh(); store.set(STORAGE_KEY, j1); K.P.loadGame(); K.P.saveGame()
await ok(JSON.stringify(K.comp.mundialState.last) === JSON.stringify(lastJ) && strip(store.get(STORAGE_KEY)) === strip(j1), '5b save, load, save identico com o resumo')
const oldSave = JSON.parse(j1); delete oldSave.mundialState.last
const Lw = fresh(); store.set(STORAGE_KEY, JSON.stringify(oldSave)); Lw.P.loadGame()
await ok(!Lw.comp.mundialState.last && Lw.comp.mundialState.groups.length === 0, '5c save antigo sem o campo carrega')

await vs.close()
console.log('OK t46-mundial-save')

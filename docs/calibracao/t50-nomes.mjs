// T50 - Nomes do universo (T15): save antigo migra, escudo mantido, idempotente, textos antigos sumiram de src/.  Uso: node docs/calibracao/t50-nomes.mjs
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
import { fileURLToPath } from 'node:url'
import { readdirSync, readFileSync, statSync } from 'node:fs'
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
const { usePersistence, STORAGE_KEY, reconstructEcoRecords } = await load('/src/composables/usePersistence.ts')
const { useSeason } = await load('/src/composables/useSeason.ts')
const { useClubStore } = await load('/src/stores/club.ts')
const { TEAM_ID_BY_NAME, getTeamIdentity } = await load('/src/utils/identity/teamIdentities.ts')
const { SERIE_META } = await load('/src/utils/league/leagueScheduler.ts')

const RENAMES = {
  d_18: ['Tupinambá EC', 'Lua Nova EC'], b_10: ['Noroeste do Vale', 'Vale do Sol'], b_14: ['Operário Araucário', 'Pinhal Celeste'],
  b_16: ['Oeste Catarinense', 'Poente FC'], a_8: ['Farroupilha AC', 'Meridiano AC'], c_8: ['Ferrovia Paulista', 'Via Láctea FC'],
  c_9: ['São Bento do Vale', 'Serra do Luar'], c_11: ['Esperança de Lagarto', 'Estrela do Agreste']
}
const e = (name, isUser = false) => ({ teamId: isUser ? 'user' : name, name, isUser })
const strip = (s) => { const o = JSON.parse(s); delete o.club.lastActiveAt; return JSON.stringify(o) }
const fresh = () => { setActivePinia(createPinia()); store.clear(); useSeason().initializeFreshCareer(); return { club: useClubStore(), P: usePersistence() } }

// 1) save antigo: clubes antigos, troféus antigos, pódio da Taça antigo
const A = fresh()
A.club.season = 4; A.club.division = 1
A.club.trophyGallery = [
  { id: 'a', season: 2, type: 'title', title: 'Campeão da Supercopa Soberana', prize: 1 },
  { id: 'b', season: 3, type: 'title', title: 'Campeão da Taça Cacique', prize: 1 },
  { id: 'c', season: 3, type: 'title', title: 'Campeão da Recopa Condor', prize: 1 },
  { id: 'd', season: 1, type: 'title', title: 'Campeão da Copa Condor de Ouro', prize: 1 }
]
A.club.podiumArchive = [{ competition: 'cup', competitionLabel: 'Taça Cacique', season: 3, champion: e(A.club.name, true), runnerUp: e('Farroupilha AC'), third: null, finalSummary: '1 x 0', thirdSummary: null }]
A.P.saveGame()
const old = JSON.parse(store.get(STORAGE_KEY))
delete old.club.ecoRecords
const ids = Object.keys(RENAMES)
for (const id of ids) { const t = old.leagueTeams.find((x) => x.id === id); if (t) t.name = RENAMES[id][0] }
// save realista: os 8 clubes na liga, chave da Taça vigente, finais pendentes, rival atual e Copa Condor com um dos 8
const baseTeams = old.leagueTeams
ids.forEach((id, i) => { const t = baseTeams[i]; t.id = id; t.name = RENAMES[id][0] })
old.cupState = old.cupState || {}
old.cupState.qualified = true
old.cupState.bracket = { label: 'Taça Cacique', teams: Object.fromEntries(ids.map((id) => [id, { id, name: RENAMES[id][0], power: 50 }])) }
old.cupState.currentRival = { name: 'Esperança de Lagarto', power: 55, serieCode: 'C' }
old.supercupState = { ...(old.supercupState || {}), rivalName: 'Farroupilha AC', rivalOrigin: 'Taça Cacique', rivalPower: 60 }
old.recopaState = { ...(old.recopaState || {}), rivalName: 'Ferrovia Paulista', rivalOrigin: 'Taça Cacique', rivalPower: 60 }
old.continentalState = { ...(old.continentalState || {}), qualified: true, teams: [{ id: 'a_8', name: 'Farroupilha AC', power: 70, isUser: false, points: 0, played: 0, won: 0, gf: 0 }], bracket: JSON.parse(JSON.stringify(old.cupState.bracket)), otherGroups: [{ id: 'B', teams: [{ id: 'c_9', name: 'São Bento do Vale', power: 60, isUser: false, points: 0, played: 0, won: 0, gf: 0 }] }] }
const present = ids.filter((id) => old.leagueTeams.some((x) => x.id === id))
old.matchHistory = [{ season: 3, competition: 'cup', label: 'Taça Cacique', opponent: 'Farroupilha AC' }]
const histBefore = JSON.stringify(old.matchHistory)
await ok(present.length >= 1, '1 save antigo com clubes antigos em leagueTeams (' + present.length + ' dos 8 na divisao do save)')

const B = fresh(); store.set(STORAGE_KEY, JSON.stringify(old)); B.P.loadGame(); B.P.saveGame()
const s1 = store.get(STORAGE_KEY)
const o1 = JSON.parse(s1)

// 2) nomes novos, mesmo escudo
await ok(present.every((id) => o1.leagueTeams.find((x) => x.id === id).name === RENAMES[id][1]), '2a clubes com os nomes novos nas leagueTeams')
let shield = true
for (const id of ids) {
  const [oldN, newN] = RENAMES[id]
  if (TEAM_ID_BY_NAME[oldN] !== id || TEAM_ID_BY_NAME[newN] !== id) shield = false
  if (JSON.stringify(getTeamIdentity(oldN)) !== JSON.stringify(getTeamIdentity(newN))) shield = false
}
await ok(shield, '2b nome novo e alias do antigo: mesmo id e mesmo escudo (8 clubes)')

await ok(ids.every((id) => o1.leagueTeams.find((x) => x.id === id)?.name === RENAMES[id][1]), '2c os 8 clubes migrados nas leagueTeams')
await ok(o1.cupState.bracket.label === 'Taça do Povo' && ids.every((id) => o1.cupState.bracket.teams[id].name === RENAMES[id][1]), '2d chave da Taça migrada (label e 8 times)')
await ok(o1.supercupState.rivalName === 'Meridiano AC' && o1.supercupState.rivalOrigin === 'Taça do Povo' && o1.recopaState.rivalName === 'Via Láctea FC' && o1.recopaState.rivalOrigin === 'Taça do Povo', '2e finais pendentes migradas')
await ok(o1.cupState.currentRival?.name === 'Estrela do Agreste', '2f cupState.currentRival migrado')
await ok(o1.continentalState.teams[0].name === 'Meridiano AC' && o1.continentalState.otherGroups[0].teams[0].name === 'Serra do Luar', '2g continentalState (teams e otherGroups) migrado')
// 3) galeria e pódio
const titles = o1.trophyGallery.map((t) => t.title)
await ok(titles.includes('Campeão da Taça do Povo') && titles.includes('Campeão da Supercopa Zênite') && titles.includes('Campeão da Recopa dos Condores') && titles.includes('Campeão da Copa Condor de Ouro'), '3a galeria com os nomes novos e a Ouro igual')
await ok(o1.club.podiumArchive[0].competitionLabel === 'Taça do Povo' && o1.club.podiumArchive[0].runnerUp.name === 'Meridiano AC', '3b podio mostra "Taça do Povo" e o clube renomeado')

// 4) matchHistory intacto
await ok(JSON.stringify(o1.matchHistory) === histBefore, '4 matchHistory intacto')

// 5) reconstrução conta antigos e novos
const rec = o1.club.ecoRecords
await ok(rec.find((r) => r.season === 3)?.cup === 'champion' && rec.find((r) => r.season === 3)?.recopa === true && rec.find((r) => r.season === 2)?.supercup === true, '5a reconstrucao do save antigo conta os titulos')
const T = (id, season, title) => ({ id, season, type: 'title', title, prize: 1 })
const rec2 = reconstructEcoRecords({ trophies: [
  T('n1', 1, 'Campeão da Taça do Povo'), T('n2', 1, 'Campeão da Supercopa Zênite'), T('n3', 1, 'Campeão da Recopa dos Condores'),
  T('o1', 2, 'Campeão da Taça Cacique'), T('o2', 2, 'Campeão da Supercopa Soberana'), T('o3', 2, 'Campeão da Recopa Condor')
], podiums: [], currentSeason: 3, currentDivision: 1, userName: 'X', userPower: 70 })
await ok(rec2.length === 2 && rec2.every((r) => r.cup === 'champion' && r.supercup && r.recopa), '5b reconstrucao reconhece textos novos e antigos')

// 6) segunda carga idempotente
const C = fresh(); store.set(STORAGE_KEY, s1); C.P.loadGame(); C.P.saveGame()
await ok(strip(store.get(STORAGE_KEY)) === strip(s1), '6 segunda carga: JSON identico')

// 7) textos antigos sumiram de src/
const files = []
const walk = (d) => { for (const n of readdirSync(d)) { const p = d + '/' + n; if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|vue|js|json|css)$/.test(n)) files.push(p) } }
walk(root + '/src')
const bad = []
for (const f of files) {
  let txt = readFileSync(f, 'utf8')
  txt = txt.replace(/\/\/ NAME_MIGRATION_MAP:start[\s\S]*?\/\/ NAME_MIGRATION_MAP:end/g, '')
  if (f.endsWith('teamIdentities.ts')) txt = txt.split('\n').filter((l) => !/alias do nome antigo/.test(l)).join('\n')
  txt.split('\n').forEach((l, i) => { if (/Cacique|Soberana|Recopa Condor/i.test(l)) bad.push(f.replace(root, '') + ':' + (i + 1) + ': ' + l.trim()) })
}
if (bad.length) console.log(bad.join('\n'))
await ok(bad.length === 0, '7 "Cacique", "Soberana" e "Recopa Condor" sumiram de src/ fora do NAME_MIGRATION_MAP e dos aliases')

// 8) séries
await ok(['Série A', 'Série B', 'Série C', 'Série D'].every((n) => Object.values(SERIE_META).some((m) => m.name.endsWith(n))), '8 series continuam Serie A a Serie D')

await vs.close()
console.log('OK t50-nomes')

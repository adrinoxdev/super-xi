// T47 - Supercopa e Recopa com campeoes reais.  Uso: node docs/calibracao/t47-finais-ecossistema.mjs
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
const { supercupRival, recopaRival } = await load('/src/utils/competitions/finalsRivals.ts')
const { ecoPoints } = await load('/src/utils/competitions/rankingCondor.ts')
const { PRIZES } = await load('/src/config/index.ts')
const D = await load('/src/stores/modules/competitions/defaults.ts')

const ch = (name, power) => ({ name, power })
const rec = (o = {}) => ({
  season: 1, division: 1, leagueRank: null, leagueTitle: false, ouro: null, prata: null, cup: null,
  recopa: false, supercup: false, ouroChampion: null, prataChampion: null, cupChampion: null, serieAChampion: null, ...o
})
const R = rec({ cupChampion: ch('Campeao Taca', 60), serieAChampion: ch('Campeao A', 78), ouroChampion: ch('Campeao Ouro', 75), prataChampion: ch('Campeao Prata', 64) })
const RU = ch('Vice Taca', 58)

// 1-3) Supercopa
let r = supercupRival(R, true, false, RU)
await ok(r.name === 'Campeao Taca' && r.power === 60 && /Taça/.test(r.origin), '1 liga campea enfrenta o campeao da Taca')
r = supercupRival(R, false, true, RU)
await ok(r.name === 'Campeao A' && r.power === 78 && /Série A/.test(r.origin), '2 campeao da Taca enfrenta o campeao da A')
r = supercupRival(R, true, true, RU)
await ok(r.name === 'Vice Taca' && /Vice/.test(r.origin), '3 campeao das duas enfrenta o vice da Taca')
// 4-5) Recopa
r = recopaRival(R, 'libertadores')
await ok(r.name === 'Campeao Prata' && /Prata/.test(r.origin), '4 campeao da Ouro enfrenta o da Prata')
r = recopaRival(R, 'sulamericana')
await ok(r.name === 'Campeao Ouro' && /Ouro/.test(r.origin), '5 campeao da Prata enfrenta o da Ouro')

// integracao: virada com Ouro + liga campea + Taca campea
setActivePinia(createPinia()); store.clear()
const club = useClubStore(), comp = useCompetitionsStore(), season = useSeason()
season.initializeFreshCareer()
club.season = 3; club.division = 1
const br = (champ, ru, power) => ({
  teams: { [champ.teamId]: { id: champ.teamId, name: champ.name, power }, [ru.teamId]: { id: ru.teamId, name: ru.name, power: 55 } }, rounds: [],
  podium: { champion: champ, runnerUp: ru, third: null }
})
const U = { teamId: 'user', name: club.name, isUser: true }
comp.continentalState = { ...D.emptyContinental(), qualified: true, tier: 'libertadores', champion: true, finalPosition: 1, bracket: br(U, { teamId: 'x', name: 'X', isUser: false }, 80) }
comp.cupState = { ...D.emptyCup(), champion: true, finalPosition: 1, bracket: br(U, { teamId: 'v', name: 'Vice Real', isUser: false }, 80) }
season.startNewSeason(1, 0, 't', 'success', 'title', 'Campeao')
const s = comp.supercupState, p = comp.recopaState
await ok(s.qualified && s.rivalName === 'Vice Real' && s.rivalOrigin && s.rivalName !== club.name, '6 virada: Supercopa com vice real e origem')
await ok(p.qualified && p.rivalName && p.rivalName !== club.name && p.rivalOrigin, '7 virada: Recopa com rival nao-usuario e origem')
const g = club.ecoRecords.find((x) => x.season === 3)
await ok(g.prataChampion && g.prataChampion.name === p.rivalName, '8 campeao da Prata gravado e usado')

// premios iguais
const before = club.budget
comp.applyFinalResult('supercup', 2, 0)
await ok(club.budget - before === PRIZES.supercup.champion, '9 premio de campeao da Supercopa intacto')
const b2 = club.budget
comp.applyFinalResult('recopa', 0, 2)
await ok(club.budget - b2 === PRIZES.recopa.runnerUp, '10 premio de vice da Recopa intacto')

// ponto de ranking
await ok(ecoPoints(rec({ supercup: true })) - ecoPoints(rec()) === 1 && ecoPoints(rec({ recopa: true })) - ecoPoints(rec()) === 1, '11 titulos de Supercopa e Recopa somam 1 ponto')

console.log('OK t47-finais-ecossistema')
await vs.close()

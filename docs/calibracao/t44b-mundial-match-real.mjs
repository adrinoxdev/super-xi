// T44b - Partidas da Copa dos Continentes pelo fluxo real (pinia real, prepareMatch, startLiveMatch, concludeMatch).
// Uso: node docs/calibracao/t44b-mundial-match-real.mjs
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
const { useMatchSimulation } = await load('/src/composables/useMatchSimulation.ts')
const { useClubStore } = await load('/src/stores/club.ts')
const { useCompetitionsStore } = await load('/src/stores/competitions.ts')
const { useMatchStore } = await load('/src/stores/match.ts')
const D = await load('/src/stores/modules/competitions/defaults.ts')
const MM = await load('/src/utils/competitions/mundialMatch.ts')
const { ECONOMY, PRIZES } = await load('/src/config/index.ts')
const P = PRIZES.mundial

setActivePinia(createPinia())
useSeason().initializeFreshCareer()
const club = useClubStore(), comp = useCompetitionsStore(), match = useMatchStore()
const sim = useMatchSimulation()
club.season = 3; club.division = 1
const e = (name, isUser = false) => ({ teamId: isUser ? 'user' : name, name, isUser })
club.recordEcoSeason({ season: 2, division: 1, leagueRank: 1, leagueTitle: true, ouro: 'champion', prata: null, cup: null, recopa: false, supercup: false,
  ouroChampion: { name: club.name, power: 80 }, prataChampion: null, cupChampion: null, serieAChampion: null })
comp.continentalState = { ...D.emptyContinental(), qualified: true, tier: 'libertadores', champion: true, finalPosition: 1,
  bracket: { teams: { user: { id: 'user', name: club.name, power: 80 } }, rounds: [], podium: { champion: e(club.name, true), runnerUp: e('X'), third: null } } }
useSeason().startNewSeason(1, 0, 't', 'success')
await ok(club.season === 4 && comp.mundialState.qualified && comp.mundialState.stage === 'GROUPS', '1 edicao aberta com o usuario')

// joga uma partida pelo fluxo real; forca placar (e penaltis, se pedido) antes do concludeMatch
async function play(u, o, { shootout = false } = {}) {
  const m0 = comp.mundialState
  const oppName = comp.mundialOpponent?.name
  const stage = m0.stage
  const expectLabel = MM.mundialMatchLabel(m0, comp.mundialStageLabel.split(': ')[1])
  sim.prepareMatch('mundial')
  sim.startLiveMatch()
  const st = match.sessions.mundial.matchState
  if (!st.isRunning) await fail('startLiveMatch nao iniciou')
  const opp = sim.opponentFor('mundial')
  await ok(opp.name === oppName && sim.labelFor('mundial') === expectLabel, `rotulo e adversario (${stage}): ${expectLabel} x ${oppName}`)
  await ok(sim.isHomeFor('mundial') === false && match.sessions.mundial.snapshot?.isHome === false, 'sem mando (campo neutro)')
  const income = club.projectedStadiumIncome
  st.userScore = u; st.opponentScore = o
  const needs = MM.mundialNeedsShootout(comp.mundialState, u, o)
  if (shootout) {
    const kicks = []
    for (let i = 0; i < 5; i++) { kicks.push({ side: 'user', scored: true }); kicks.push({ side: 'opp', scored: i < 4 }) }
    st.shootout = { kicks, first: 'user', done: true }
  }
  st.isRunning = false; st.isFinished = true
  const hist0 = comp.mundialState.history.length
  sim.concludeMatch()
  const sum = match.sessions.mundial.lastMatchSummary
  await ok(sum.ticket === Math.round(income * ECONOMY.awayTicketShare) && ECONOMY.awayTicketShare === 0.4, `bilheteria = 40% (${sum.ticket} de ${income})`)
  const added = comp.mundialState.history.slice(0, comp.mundialState.history.length - hist0)
  sim.finishMatchAndReturn()
  return { needs, summary: added[0]?.summary ?? '' }
}

// Grupos: vitoria, empate (sem penaltis), vitoria
let r = await play(2, 0)
await ok(!r.needs && !/Pênaltis/.test(r.summary), '2 grupos: vitoria sem penaltis')
r = await play(1, 1)
await ok(!r.needs && !/Pênaltis/.test(r.summary) && comp.mundialState.groupRound === 3, '3 grupos: empate sem penaltis, rodada avancou')
r = await play(2, 0)
const afterGroups = comp.mundialState
await ok(afterGroups.stage === 'KNOCKOUT' && afterGroups.history.filter((h) => h.roundName === 'Fase de Grupos' && h.prize === P.r16).length === 1, '4 classificado: cota das oitavas paga uma vez')

// Mata-mata: oitavas empatada com penaltis; depois vitorias ate o titulo
r = await play(1, 1, { shootout: true })
await ok(r.needs && /Pênaltis 5x4/.test(r.summary), '5 mata-mata: empate vai a penaltis e o resultado registra 5x4')
r = await play(2, 0)
r = await play(2, 0)
r = await play(2, 0)
await ok(!r.needs && !/Pênaltis/.test(r.summary), '6 vitoria no tempo normal sem penaltis')
const fin = comp.mundialState
await ok(fin.stage === 'DONE' && fin.champion && fin.finalPosition === 1, '7 campeao pelo fluxo real')
const paid = fin.history.filter((h) => h.prize > 0).reverse()
await ok(paid.map((h) => h.prize).join() === [P.r16, P.qf, P.sf, P.champion].join() && new Set(paid.map((h) => h.roundName)).size === paid.length, '8 premio por fase pago uma vez: ' + paid.map((h) => h.prize).join('+'))
await ok(fin.history.reduce((a, h) => a + h.prize, 0) === P.r16 + P.qf + P.sf + P.champion, '9 total de premios confere')
const mh = match.matchHistory ?? []
await ok(mh.filter((x) => x.competition === 'mundial').every((x) => x.isHome === false), '10 historico: todas as partidas do Mundial sem mando')

await vs.close()
console.log('OK t44b-mundial-match-real')

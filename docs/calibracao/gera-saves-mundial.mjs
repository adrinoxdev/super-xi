// Gera saves avancados (JSON de localStorage) com a Copa dos Continentes em varios estados, para conferencia visual.
// Uso: node docs/calibracao/gera-saves-mundial.mjs <pasta-de-saida>
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
const out = process.argv[2]
if (!out) { console.log('uso: node gera-saves-mundial.mjs <pasta>'); process.exit(1) }
fs.mkdirSync(out, { recursive: true })
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
const load = (p) => vs.ssrLoadModule(p)
const { router } = await load('/src/router/index.ts'); router.push = () => new Promise(() => {})
const { usePersistence, STORAGE_KEY } = await load('/src/composables/usePersistence.ts')
const { useSeason } = await load('/src/composables/useSeason.ts')
const { useClubStore } = await load('/src/stores/club.ts')
const { useCompetitionsStore } = await load('/src/stores/competitions.ts')
const D = await load('/src/stores/modules/competitions/defaults.ts')
const e = (name, isUser = false) => ({ teamId: isUser ? 'user' : name, name, isUser })

// Abre a edicao da temporada 4 com o usuario classificado pela porta Ouro (como no t46).
function aberta() {
  setActivePinia(createPinia()); store.clear()
  useSeason().initializeFreshCareer()
  const club = useClubStore(), comp = useCompetitionsStore(), P = usePersistence()
  club.season = 3; club.division = 1
  club.recordEcoSeason({ season: 2, division: 1, leagueRank: 1, leagueTitle: true, ouro: 'champion', prata: null, cup: null, recopa: false, supercup: false,
    ouroChampion: { name: club.name, power: 80 }, prataChampion: null, cupChampion: null, serieAChampion: null })
  comp.continentalState = { ...D.emptyContinental(), qualified: true, tier: 'libertadores', champion: true, finalPosition: 1,
    bracket: { teams: { user: { id: 'user', name: club.name, power: 80 } }, rounds: [], podium: { champion: e(club.name, true), runnerUp: e('X'), third: null } } }
  useSeason().startNewSeason(1, 0, 't', 'success')
  return { club, comp, P }
}
const jogar = (comp, club, u, o) => comp.applyMundialResult(u, o, club.name, comp.mundialOpponent?.name ?? 'Rival', null)
const salvar = (nome, P, extra) => { P.saveGame(); let j = JSON.parse(store.get(STORAGE_KEY)); if (extra) extra(j); fs.writeFileSync(`${out}/${nome}.json`, JSON.stringify(j)); console.log('save', nome, '->', Object.keys(j).length, 'chaves') }

// A) fase de grupos, uma rodada jogada (vitoria 2x0)
{ const { club, comp, P } = aberta(); console.log('A estagio', comp.mundialStageLabel); jogar(comp, club, 2, 0); console.log('A depois', comp.mundialStageLabel); salvar('a-grupos', P) }
// B) mata-mata: grupos vencidos e oitavas ganhas; para quando o rotulo muda para as quartas
{ const { club, comp, P } = aberta(); let n = 0
  while (!/Quartas/i.test(comp.mundialStageLabel) && comp.mundialState.stage !== 'DONE' && n++ < 12) jogar(comp, club, 2, 0)
  console.log('B estagio', comp.mundialStageLabel); salvar('b-quartas', P) }
// C) campeao
{ const { club, comp, P } = aberta(); let n = 0
  while (comp.mundialState.stage !== 'DONE' && n++ < 14) jogar(comp, club, 3, 0)
  console.log('C campeao', comp.mundialState.champion, 'pos', comp.mundialState.finalPosition); salvar('c-campeao', P)
  salvar('f-save-antigo', P, (j) => { delete j.club.ecoRecords; delete j.mundialState }) }
// D) eliminado na fase de grupos
{ const { club, comp, P } = aberta(); let n = 0
  while (comp.mundialState.stage !== 'DONE' && n++ < 14) jogar(comp, club, 0, 3)
  console.log('D eliminado', comp.mundialState.eliminated, 'pos', comp.mundialState.finalPosition); salvar('d-eliminado', P) }
// E) sem o usuario: virada da T7 para T8 com o clube na D; resumo da ultima edicao
{ setActivePinia(createPinia()); store.clear(); useSeason().initializeFreshCareer()
  const club = useClubStore(), comp = useCompetitionsStore(), P = usePersistence()
  club.season = 7; club.division = 4; useSeason().startNewSeason(4, 0, 't', 'success')
  console.log('E last', comp.mundialState.last?.season, comp.mundialState.last?.champion); salvar('e-sem-usuario', P) }
await vs.close()

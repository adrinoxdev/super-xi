// T49 - Interface da Copa dos Continentes (renderToString).  Uso: node docs/calibracao/t49-mundial-ui.mjs
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
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
const vs = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
globalThis.document = { querySelector: () => null, addEventListener() {} }
const fail = async (m) => { console.log('FAIL', m); await vs.close(); process.exit(1) }
const ok = async (c, m) => { if (!c) await fail(m); console.log('OK', m) }
const load = (p) => vs.ssrLoadModule(p)
const { router } = await load('/src/router/index.ts')
const { useClubStore } = await load('/src/stores/club.ts')
const { useCompetitionsStore } = await load('/src/stores/competitions.ts')
const { buildMundialField } = await load('/src/utils/competitions/mundialField.ts')
const { mulberry32 } = await load('/src/utils/core/random.ts')
const { ECOSYSTEM_LINKS, MUNDIAL_LABEL } = await load('/src/config/competitions.ts')
const Panel = (await load('/src/components/competitions/MundialPanel.vue')).default
const Card = (await load('/src/components/competitions/MundialCycleCard.vue')).default

const rec = (season, o = {}) => ({
  season, division: 1, leagueRank: null, leagueTitle: false, ouro: null, prata: null, cup: null,
  recopa: false, supercup: false, ouroChampion: null, prataChampion: null, cupChampion: null, serieAChampion: null, ...o
})
async function render(comp, setup) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const club = useClubStore()
  const competitions = useCompetitionsStore()
  setup({ club, competitions })
  const app = createSSRApp(comp)
  app.use(pinia).use(router)
  return renderToString(app)
}

// 1) Sem edicao na temporada: contagem regressiva, sede e pontos (Serie A 4o = 2 pts + Taca campea = 3 pts => 5)
let html = await render(Panel, ({ club }) => {
  club.season = 14
  club.recordEcoSeason(rec(12, { leagueRank: 4 }))
  club.recordEcoSeason(rec(13, { cup: 'champion' }))
})
await ok(html.includes('Daqui a') && html.includes('2 temporadas') && html.includes('temporada 16'), '1a contagem regressiva (2 temporadas, edicao 16)')
await ok(html.includes('Sede:') && html.includes('Ranking Condor (corte de 38)') && html.includes('5 pontos'), '1b sede e pontos do ranking (5 de 38)')
await ok(html.includes('Faltam 33 pontos'), '1c "Faltam 11 pontos"')
await ok(html.includes('Rumo à ' + MUNDIAL_LABEL) && html.includes('2 pts') && html.includes('3 pts'), '1d card do ciclo com pontos por competicao')

// 2) Caminhos lista as competicoes do ecossistema
const names = ['Série D', 'Série C', 'Série B', 'Série A', 'Taça do Povo', 'Copa Condor de Ouro', 'Copa Condor de Prata', 'Supercopa Zênite', 'Recopa dos Condores', 'Ranking Condor', MUNDIAL_LABEL]
const card = await render(Card, ({ club }) => { club.season = 14 })
await ok(card.includes('Caminhos') && names.every((n) => card.includes(n)), '2a "Caminhos" lista as 11 entradas (10 competicoes + Ranking)')
await ok(card.includes('Vem de:') && card.includes('Leva a:') && ECOSYSTEM_LINKS.every((l) => card.includes(l.rule.replace(/&/g, '&amp;'))), '2b regras de ECOSYSTEM_LINKS aparecem')
const gold = await render(Card, ({ club }) => { club.season = 14; club.recordEcoSeason(rec(13, { ouro: 'champion' })) })
await ok(!gold.includes('Faltam') && gold.includes('Vaga garantida'), '2c campeao da Ouro: sem "Faltam"')

// 3) Edicao com o usuario: grupo do usuario, os 8 grupos, chave de 16
html = await render(Panel, ({ club, competitions }) => {
  club.season = 16
  club.name = 'Meu Clube'
  const field = buildMundialField({
    season: 16, rng: mulberry32(7), records: [rec(15, { ouro: 'champion' }), rec(14), rec(13), rec(12)],
    userName: 'Meu Clube', userPower: 80
  })
  competitions.openMundialEdition(field)
})
const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
await ok(/Grupo [A-H]<\/h4>/.test(html) && html.includes('Meu Clube'), '3a grupo do usuario com o clube')
await ok(html.includes('Outros grupos') && letters.every((l) => html.includes('Grupo ' + l)), '3b os 8 grupos (o dele e as abas dos outros 7)')
await ok((html.match(/>\s*Grupo [A-H]\s*<\/button>/g) ?? []).length === 7, '3c 7 abas')
await ok(html.includes('Chave de 16') || html.includes('Oitavas'), '3d chave de 16 (BracketView)')
await ok(html.includes('Jogar') && html.includes('Prêmios:'), '3e botao de entrada e premios')

await vs.close()
console.log('OK t49-mundial-ui')

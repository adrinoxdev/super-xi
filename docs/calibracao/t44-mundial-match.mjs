// T44 - Partida da Copa dos Continentes.  Uso: node docs/calibracao/t44-mundial-match.mjs
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../../', import.meta.url)).split(String.fromCharCode(92)).join('/').replace(/\/+$/, '')
const vs = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const fail = async (m) => { console.log('FAIL', m); await vs.close(); process.exit(1) }
const ok = async (c, m) => { if (!c) await fail(m); console.log('OK', m) }
const load = (p) => vs.ssrLoadModule(p)
import { ref } from 'vue'
const M = await load('/src/stores/modules/competitions/mundial.ts')
const D = await load('/src/stores/modules/competitions/defaults.ts')
const SV = await load('/src/stores/modules/competitions/save.ts')
const F = await load('/src/utils/competitions/mundialField.ts')
const { mulberry32 } = await load('/src/utils/core/random.ts')
const C = await load('/src/config/competitions.ts')

const MM = await load('/src/utils/competitions/mundialMatch.ts')
const { ECONOMY } = await load('/src/config/index.ts')
const src = (await import('node:fs')).readFileSync(root + '/src/composables/useMatchSimulation.ts', 'utf8')

const rec = (season, o = {}) => ({
  season, division: 1, leagueRank: null, leagueTitle: false, ouro: null, prata: null, cup: null,
  recopa: false, supercup: false, ouroChampion: null, prataChampion: null, cupChampion: null, serieAChampion: null, ...o
})
const club = { name: 'Meu Clube', season: 16, earn() {}, recordTrophy() {} }
const mundialState = ref(D.emptyMundial())
const s = M.createMundial({ mundialState, club, rng: mulberry32(1) })
s.openMundialEdition(F.buildMundialField({ season: 16, rng: mulberry32(101), records: [rec(15, { ouro: 'champion' }), rec(14), rec(13), rec(12)], userName: 'Meu Clube', userPower: 80 }))
const m = mundialState.value

// adversario do grupo: um dos 3 outros clubes do grupo do usuario
const g = m.groups.find((x) => x.id === m.userGroupId)
const opp = s.mundialOpponent.value
await ok(opp && opp.name && g.teams.some((t) => !t.isUser && t.name === opp.name), '1 adversario da rodada 1 e do grupo do usuario')
await ok(MM.mundialMatchLabel(m, '') === `Copa dos Continentes • Grupo ${m.userGroupId}, 1ª rodada`, '2 rotulo do grupo')
await ok(/^Grupo [A-H]$/.test('Grupo ' + m.userGroupId), '2b letra do grupo')
await ok(!MM.mundialNeedsShootout(m, 1, 1), '3 grupos: empate sem penaltis')

// leva o usuario ate a chave
let guard = 0
while (mundialState.value.stage === 'GROUPS' && guard++ < 10) {
  const o = s.mundialOpponent.value
  s.applyMundialResult(2, 0, 'Meu Clube', o.name, null)
}
const k = mundialState.value
await ok(k.stage === 'KNOCKOUT', '4 usuario chegou ao mata-mata')
const kopp = s.mundialOpponent.value
await ok(kopp && kopp.name && k.bracket.teams && Object.values(k.bracket.teams).some((t) => t.name === kopp.name), '5 adversario da chave vem do bracket')
const kl = s.mundialStageLabel.value.split(': ')[1]
await ok(MM.mundialMatchLabel(k, kl) === 'Copa dos Continentes • Oitavas de Final', '6 rotulo das oitavas: ' + kl)
await ok(MM.mundialNeedsShootout(k, 1, 1) && !MM.mundialNeedsShootout(k, 2, 1), '7 penaltis so no mata-mata com empate')

// sem mando e bilheteria 40%
await ok(/comp === 'mundial'\) return false/.test(src), '8 rawIsHomeFor(mundial) = false')
await ok(src.includes("return comp === 'league' || comp === 'continental'"), '9 homeBonusApplies inalterado (mundial neutro)')
await ok(ECONOMY.awayTicketShare === 0.4, '10 awayTicketShare = 40%')
const ticket = (isHome, inc) => (isHome ? inc : Math.round(inc * ECONOMY.awayTicketShare))
await ok(ticket(false, 10000) === 4000, '11 bilheteria neutra do usuario = 40%')
await ok(src.includes('mundialMatchLabel(competitions') && src.includes('applyMundialResult(uGoals') && src.includes('mundialNeedsShootout(competitions'), '12 ligacoes em useMatchSimulation')

await vs.close()
console.log('OK t44-mundial-match')

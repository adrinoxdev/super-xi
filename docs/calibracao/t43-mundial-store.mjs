// T43 - Store da Copa dos Continentes.  Uso: node docs/calibracao/t43-mundial-store.mjs
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

// Tabela do plano (secao 7.1), total acumulado por desfecho.
const P = C.PRIZES.mundial
await ok(P.r16 === 120000 && P.r16 + P.qf === 300000 && P.r16 + P.qf + P.sf === 550000
  && P.r16 + P.qf + P.sf + P.thirdLoss === 610000 && P.r16 + P.qf + P.sf + P.thirdWin === 740000
  && P.r16 + P.qf + P.sf + P.finalLoss === 900000 && P.r16 + P.qf + P.sf + P.champion === 1500000, '0 PRIZES.mundial bate com a tabela 7.1')

const rec = (season, o = {}) => ({
  season, division: 1, leagueRank: null, leagueTitle: false, ouro: null, prata: null, cup: null,
  recopa: false, supercup: false, ouroChampion: null, prataChampion: null, cupChampion: null, serieAChampion: null, ...o
})

function make(seed = 1) {
  const club = {
    name: 'Meu Clube', season: 16, total: 0, trophies: [],
    earn(n) { this.total += n },
    recordTrophy(type, title, prize) { this.trophies.push({ type, title, prize }) }
  }
  const mundialState = ref(D.emptyMundial())
  const s = M.createMundial({ mundialState, club, rng: mulberry32(seed) })
  const field = F.buildMundialField({
    season: 16, rng: mulberry32(seed + 100), records: [rec(15, { ouro: 'champion' }), rec(14), rec(13), rec(12)],
    userName: 'Meu Clube', userPower: 80
  })
  s.openMundialEdition(field)
  return { club, mundialState, s, field, st: () => mundialState.value }
}

// Joga o proximo jogo do usuario; script(stageKey) devolve [gols do usuario, gols do rival].
function playNext(ctx, score) {
  const opp = ctx.s.mundialOpponent.value
  if (!opp) return null
  const m = ctx.st()
  const key = m.stage === 'GROUPS' ? 'G' : (ctx.s.hasPendingMundialThird.value ? 'T' : ctx.s.mundialStageLabel.value.split(': ')[1])
  const [u, o] = score(key, m)
  return ctx.s.applyMundialResult(u, o, 'Meu Clube', opp.name, u === o ? { user: 5, opp: 4 } : null)
}
const WIN = () => [2, 0]
const allPlayed = (m, n) => m.groups.every((g) => g.teams.every((t) => t.played === n))
const podOk = (m) => !!m.bracket.podium && m.bracket.podium.champion.name && m.bracket.podium.runnerUp.name && m.bracket.podium.third

// 1) abre a edicao
let c = make()
let m = c.st()
await ok(m.qualified && m.stage === 'GROUPS' && m.groupRound === 1 && m.edition === 4 && m.season === 16 && m.userEntry === 'ouro'
  && m.groups.length === 8 && m.groups.every((g) => g.teams.length === 4 && g.results.length === 0)
  && m.groups.some((g) => g.id === m.userGroupId && g.teams.some((t) => t.isUser))
  && m.bracket.neutral === true && Object.keys(m.bracket.teams).length === 32 && m.bracket.rounds[0].ties.length === 8, '1 abre a edicao: 8 grupos de 4, chave neutra de 32')
await ok(c.s.mundialOpponent.value && !c.s.mundialOpponent.value.name.includes('undefined') && c.s.mundialStageLabel.value.includes('Rodada 1/3'), '1 adversario e rotulo da rodada 1')
const emptyOnNoSpot = make()
emptyOnNoSpot.s.openMundialEdition({ ...emptyOnNoSpot.field, userEntry: null, teams: emptyOnNoSpot.field.teams.filter((t) => !t.isUser) })
await ok(!emptyOnNoSpot.st().qualified && emptyOnNoSpot.st().bracket === null, '1 sem vaga do usuario: estado vazio')

// 2) passa dos grupos: +120 mil, demais grupos completos
c = make(2)
for (let i = 0; i < 3; i++) playNext(c, WIN)
m = c.st()
await ok(c.club.total === P.r16 && m.stage === 'KNOCKOUT' && allPlayed(m, 3) && m.groups.every((g) => g.results.length === 6), '2 passou dos grupos: +120 mil e os 8 grupos completos')
await ok(m.bracket.rounds[0].ties.every((t) => t.homeId && t.awayId) && m.bracket.rounds[0].ties.some((t) => t.homeId === 'user' || t.awayId === 'user'), '2 oitavas preenchidas com o usuario')

// 3) campeao: 1,5 mi
c = make(3)
let jogos = 0
while (c.s.mundialOpponent.value) { playNext(c, WIN); jogos++ }
m = c.st()
await ok(c.club.total === 1500000 && m.champion && m.finalPosition === 1 && m.stage === 'DONE' && jogos === 7, '3 campeao: 1,5 mi no total em 7 jogos')
await ok(c.club.trophies.length === 1 && c.club.trophies[0].title.includes(C.MUNDIAL_LABEL) && podOk(m) && m.bracket.podium.champion.isUser, '3 troféu e pódio')
await ok(m.history.reduce((a, h) => a + h.prize, 0) === 1500000 && !c.s.hasPendingMundialThird.value, '3 historico soma 1,5 mi')

// 4) perde a semi e vence o 3o: 740 mil
c = make(4)
for (let i = 0; i < 3; i++) playNext(c, WIN)
playNext(c, WIN) // oitavas
playNext(c, WIN) // quartas
await ok(c.club.total === P.r16 + P.qf + P.sf, '4 na semi com 550 mil')
playNext(c, () => [0, 1]) // semi perdida
await ok(c.s.hasPendingMundialThird.value && c.s.mundialStageLabel.value.includes('3º') && c.s.mundialOpponent.value, '4 3o lugar pendente com adversario')
playNext(c, WIN)
m = c.st()
await ok(c.club.total === 740000 && m.finalPosition === 3 && m.stage === 'DONE' && m.eliminated && !m.champion && podOk(m), '4 vence o 3o: 740 mil, 3o lugar')
// 4b) perde o 3o: 610 mil
c = make(5)
for (let i = 0; i < 5; i++) playNext(c, WIN)
playNext(c, () => [0, 1]); playNext(c, () => [0, 1])
await ok(c.club.total === 610000 && c.st().finalPosition === 4, '4b perde o 3o: 610 mil, 4o lugar')
// 4c) vice 900 mil; quartas 300 mil
c = make(6)
for (let i = 0; i < 6; i++) playNext(c, WIN)
playNext(c, () => [0, 1])
await ok(c.club.total === 900000 && c.st().finalPosition === 2, '4c vice: 900 mil')
c = make(7)
for (let i = 0; i < 4; i++) playNext(c, WIN)
playNext(c, () => [0, 1])
await ok(c.club.total === 300000 && c.st().eliminated && c.st().stage === 'DONE' && podOk(c.st()) && c.st().finalPosition === null, '4d eliminado nas quartas: 300 mil, torneio fechado')
c = make(8)
for (let i = 0; i < 3; i++) playNext(c, WIN)
playNext(c, () => [1, 1]) // empate nas oitavas: penaltis 5x4 para o usuario
await ok(c.st().bracket.rounds[0].ties.find((t) => t.homeId === 'user' || t.awayId === 'user').penalties && c.club.total === 300000, '4e penaltis no mata-mata (usuario vence 5x4)')

// 5) eliminado nos grupos: 0 e torneio simulado ate o podio
c = make(9)
for (let i = 0; i < 3; i++) playNext(c, () => [0, 3])
m = c.st()
await ok(c.club.total === 0 && m.eliminated && m.stage === 'DONE' && m.finalPosition === null && allPlayed(m, 3) && podOk(m) && !m.bracket.podium.champion.isUser && c.s.mundialOpponent.value === null,
  '5 eliminado nos grupos: 0 e torneio simulado ate o podio')

// 6) W.O. no meio dos grupos
c = make(10)
playNext(c, WIN)
const pod = c.s.finishMundialForSeason()
m = c.st()
await ok(pod && podOk(m) && allPlayed(m, 3) && m.stage === 'DONE' && m.eliminated && c.club.total <= P.r16, '6 W.O. no meio dos grupos: grupos completos e podio')
await ok(m.groups.find((g) => g.id === m.userGroupId).results.filter((r) => r.homeId === 'user' || r.awayId === 'user').length === 3, '6 usuario com 3 jogos (2 por W.O.)')
await ok(c.s.finishMundialForSeason() === m.bracket.podium && c.club.total <= P.r16, '6 finish repetido nao muda nada')
// 6b) W.O. na chave
c = make(11)
for (let i = 0; i < 4; i++) playNext(c, WIN)
c.s.finishMundialForSeason()
m = c.st()
await ok(podOk(m) && m.eliminated && c.club.total === 300000 && Object.values(m.bracket.rounds).flatMap((r) => r.ties).some((t) => t.walkover), '6b W.O. nas quartas: pódio, 300 mil, confronto por W.O.')
// 6c) reset
c.s.resetMundial()
await ok(JSON.stringify((({ last, ...r }) => r)(c.st())) === JSON.stringify(D.emptyMundial()), '6c reset volta ao vazio (o campo last, aditivo, e preservado)')

// 7) save idempotente
function saveCtx() {
  return {
    cupState: ref(D.emptyCup()), continentalState: ref(D.emptyContinental()), mundialState: ref(D.emptyMundial()),
    supercupState: ref(D.emptyFinal(D.DEFAULT_SUPERCUP_RIVAL)), recopaState: ref(D.emptyFinal(D.DEFAULT_RECOPA_RIVAL))
  }
}
const roundTrip = (state) => {
  const a = saveCtx(); a.mundialState.value = state
  const j1 = JSON.stringify(SV.createSave(a).toSave())
  const b = saveCtx(); SV.createSave(b).fromSave(JSON.parse(j1))
  const j2 = JSON.stringify(SV.createSave(b).toSave())
  const d = saveCtx(); SV.createSave(d).fromSave(JSON.parse(j2))
  return j1 === j2 && j2 === JSON.stringify(SV.createSave(d).toSave()) && JSON.stringify(b.mundialState.value) === JSON.stringify(state)
}
c = make(12)
await ok(roundTrip(c.st()), '7 save idempotente na abertura')
playNext(c, WIN); playNext(c, WIN)
await ok(roundTrip(c.st()), '7 save idempotente no meio dos grupos')
playNext(c, WIN); playNext(c, WIN)
await ok(roundTrip(c.st()), '7 save idempotente no mata-mata')
while (c.s.mundialOpponent.value) playNext(c, WIN)
await ok(roundTrip(c.st()), '7 save idempotente ao final')
const old = saveCtx(); old.mundialState.value = c.st()
const legacy = JSON.parse(JSON.stringify(SV.createSave(old).toSave())); delete legacy.mundialState
const lc = saveCtx(); lc.mundialState.value = c.st(); SV.createSave(lc).fromSave(legacy)
await ok(JSON.stringify(lc.mundialState.value) === JSON.stringify(D.emptyMundial()), '7 save antigo sem a chave usa emptyMundial()')
const keys = Object.keys(SV.createSave(saveCtx()).toSave())
await ok(keys.includes('mundialState') && keys.length === 5, '7 mundialState e chave de topo aditiva')

console.log('OK t43-mundial-store')
await vs.close()

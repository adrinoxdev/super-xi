// T42 - Campo de 32 clubes da Copa dos Continentes.  Uso: node docs/calibracao/t42-mundial-field.mjs
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../../', import.meta.url)).split(String.fromCharCode(92)).join('/').replace(/\/+$/, '')
const vs = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const fail = async (m) => { console.log('FAIL', m); await vs.close(); process.exit(1) }
const ok = async (c, m) => { if (!c) await fail(m); console.log('OK', m) }
const load = (p) => vs.ssrLoadModule(p)
const F = await load('/src/utils/competitions/mundialField.ts')
const { mulberry32 } = await load('/src/utils/core/random.ts')
const C = await load('/src/config/competitions.ts')
const S = await load('/src/utils/bracket/bracketSeeding.ts')

const rec = (season, o = {}) => ({
  season, division: 1, leagueRank: null, leagueTitle: false, ouro: null, prata: null, cup: null,
  recopa: false, supercup: false, ouroChampion: null, prataChampion: null, cupChampion: null, serieAChampion: null, ...o
})
const ch = (name, power = 74) => ({ name, power })
const build = (season, records, extra = {}, seed = 1) =>
  F.buildMundialField({ season, rng: mulberry32(seed), records, userName: 'Meu Clube', userPower: 70, ...extra })
const count = (f, c) => f.teams.filter((t) => t.confed === c).length
const HOME = 16 // edição no país do usuário (4ª da rotação)
const base = (o) => [rec(15, o), rec(14), rec(13), rec(12)]

// 1) sempre 32 distintos, 12/6/4/4/4/1/1
const champs = ['Deportivo Puerto Azul', 'Club Sportivo Carbonero', 'Deportivo Puerto Azul', 'Unión Pampa Oriental']
for (let seed = 1; seed <= 300; seed++) {
  const season = 4 * (1 + (seed % 7))
  const records = [1, 2, 3, 4].map((k) => rec(season - k, {
    ouro: k === 1 && seed % 3 === 0 ? 'champion' : null,
    ouroChampion: ch(champs[k - 1]),
    serieAChampion: ch('Serra Dourada FC'), cupChampion: ch('Serra Dourada FC'),
    leagueTitle: seed % 5 === 0 && k === 1, leagueRank: seed % 5 === 0 && k === 1 ? 1 : 3, cup: seed % 4 === 0 && k === 1 ? 'champion' : null
  }))
  const f = build(season, records, {}, seed)
  const ids = new Set(f.teams.map((t) => t.id)), names = new Set(f.teams.map((t) => t.name))
  const dist = f.teams.length === 32 && ids.size === 32 && names.size === 32 && f.teams.filter((t) => t.isUser).length <= 1
  const slots = Object.keys(C.MUNDIAL_SLOTS).every((c) => count(f, c) === C.MUNDIAL_SLOTS[c])
  if (!dist || !slots || f.groups.length !== 8 || f.groups.some((g) => g.teams.length !== 4)) await fail(`1 semente ${seed}: ${f.teams.length}/${ids.size}/${names.size}`)
}
await ok(true, '1 300 sementes: 32 distintos, 12/6/4/4/4/1/1, 8 grupos de 4')

// 2) portas e casos da sede
let f = build(HOME, base({ ouro: 'champion' }))
await ok(f.userEntry === 'ouro' && f.teams.some((t) => t.isUser && t.tag === 'Campeão da Condor de Ouro'), "2 porta 'ouro'")
f = build(HOME, base({ serieAChampion: ch('Serra Dourada FC', 75) }))
await ok(f.hostSource === 'serieA' && f.hostId === 'd_1' && f.userEntry === null, '2 sede ao campeão da A (IA)')
f = build(HOME, base({ division: 1, leagueRank: 1, leagueTitle: true }))
await ok(f.hostSource === 'serieA' && f.hostId === 'user' && f.userEntry === 'sede', "2 porta 'sede' (usuário campeão da A)")
f = build(HOME, base({ division: 1, leagueRank: 1, leagueTitle: true, ouro: 'champion', cupChampion: ch('Rio Claro do Norte', 60) }))
await ok(f.userEntry === 'ouro' && f.hostSource === 'cup' && f.hostId !== 'user' && f.teams.filter((t) => t.isUser).length === 1, '2 campeão da A e da Ouro: sede vai ao campeão da Taça')
f = build(HOME, base({ division: 1, leagueRank: 1, leagueTitle: true, ouro: 'champion', cup: 'champion' }), { serieARunnerUp: ch('Vice da A FC', 71) })
await ok(f.userEntry === 'ouro' && f.hostSource === 'serieARunnerUp' && f.teams.find((t) => t.id === f.hostId).name === 'Vice da A FC', '2 A, Ouro e Taça do mesmo: sede ao vice da A')
f = build(HOME, base({ ouroChampion: ch('Serra Dourada FC', 75), serieAChampion: ch('Serra Dourada FC', 75), cupChampion: ch('Rio Claro do Norte', 52) }))
await ok(f.hostId === 'd_2' && f.hostSource === 'cup' && new Set(f.teams.map((t) => t.id)).size === 32, '2 campeão da A = campeão da Ouro (IA): sede à Taça, sem duplicata')
f = build(12, [rec(11, { ouro: 'qf', prata: 'champion', cup: 'champion', leagueRank: 3 }), rec(10, { ouro: 'qf', leagueRank: 3 }), rec(9, { ouro: 'sf', leagueRank: 2 }), rec(8, { prata: 'champion' })])
await ok(f.userEntry === 'ranking' && f.teams.filter((t) => t.isUser && t.tag === 'Ranking Condor').length === 1, "2 porta 'ranking'")
f = build(12, [rec(11, { leagueRank: 8 })])
await ok(f.userEntry === null && !f.teams.some((t) => t.isUser) && f.teams.length === 32, '2 sem vaga: usuário fora, ainda 32')
f = build(8, base({}))
await ok(f.hostSource === 'foreign' && f.teams.find((t) => t.id === f.hostId).name === C.MUNDIAL_HOSTS[1].name, '2 sede estrangeira pela rotação')
await ok(f.groups[0].teams[0].id === f.hostId, '2 sede em A1')

// 3) bicampeão uma vaga
f = build(HOME, [rec(15, { ouroChampion: ch('Deportivo Puerto Azul', 75) }), rec(14, { ouroChampion: ch('Deportivo Puerto Azul', 75) }), rec(13, { ouro: 'champion' }), rec(12, { ouro: 'champion' })])
await ok(f.teams.filter((t) => t.name === 'Deportivo Puerto Azul').length === 1 && f.teams.filter((t) => t.isUser).length === 1, '3 bicampeão ocupa uma vaga (IA e usuário)')
await ok(count(f, 'sulamerica') === 6, '3 sobra vai ao ranking: 6 sul-americanas')

// 4) campeões do ecoRecords ou do podiumArchive
const pod = (season, name, isUser = false, label = 'Copa Condor de Ouro') => ({
  competition: 'continental', competitionLabel: label, season,
  champion: { teamId: 'x', name, isUser }, runnerUp: { teamId: 'y', name: 'Outro', isUser: false }, third: null, finalSummary: '', thirdSummary: null
})
f = build(HOME, [rec(15, { ouroChampion: ch('Atlético Valle Verde', 74) }), rec(14), rec(13), rec(12)], {
  podiumArchive: [pod(14, 'Ciudad Costanera FC'), pod(13, 'Club Pehuén Andino'), pod(12, 'Sociedad Altiplano Alto', false, 'Copa Condor de Prata')]
})
const nm = (n) => f.teams.some((t) => t.name === n && t.tag === 'Campeão da Condor de Ouro')
await ok(nm('Atlético Valle Verde') && nm('Ciudad Costanera FC') && nm('Club Pehuén Andino'), '4 campeões do ecoRecords e do podiumArchive')
await ok(!nm('Sociedad Altiplano Alto'), '4 pódio da Prata não conta como campeão da Ouro')
f = build(HOME, [rec(15), rec(14), rec(13), rec(12)], { podiumArchive: [pod(15, 'Meu Clube', true)] })
await ok(f.userEntry === 'ouro', '4 usuário campeão pelo podiumArchive')

// 5) faixas de OVER
for (let seed = 1; seed <= 200; seed++) {
  const g = build(8, base({}), {}, seed)
  for (const c of ['europa', 'asia', 'africa', 'norte', 'oceania']) {
    const { minOver, maxOver } = C.MUNDIAL_RIVALS[c]
    for (const t of g.teams.filter((x) => x.confed === c)) if (t.power < minOver || t.power > maxOver) await fail(`5 ${c} ${t.name} OVER ${t.power}`)
  }
  const top = g.teams.filter((x) => x.confed === 'europa' && x.power >= 80).length
  if (top !== 4) await fail(`5 europa topo ${top}`)
}
await ok(true, '5 OVER de cada confederação na faixa; 4 europeus entre 80 e 83')

// extras: determinismo e oitavas
const a = JSON.stringify(build(HOME, base({ ouro: 'champion' }), {}, 7))
const b = JSON.stringify(build(HOME, base({ ouro: 'champion' }), {}, 7))
await ok(a === b, '6 determinístico dado o rng')
const sg = Object.fromEntries('ABCDEFGH'.split('').map((l) => [l, [`1${l}`, `2${l}`]]))
const r16 = S.seedMundialRoundOf16(sg)
await ok(r16.length === 8 && r16[0].join() === '1A,2B' && r16[4].join() === '1B,2A' && S.MUNDIAL_R16_TEMPLATE.length === 8, '6 oitavas seguem o modelo')
console.log('OK t42-mundial-field')
await vs.close()

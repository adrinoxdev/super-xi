// T41 - Histórico do ciclo e Ranking Condor.  Uso: node docs/calibracao/t41-ranking.mjs
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../../', import.meta.url)).split(String.fromCharCode(92)).join('/').replace(/\/+$/, '')
const vs = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const fail = async (m) => { console.log('FAIL', m); await vs.close(); process.exit(1) }
const ok = async (c, m) => { if (!c) await fail(m); console.log('OK', m) }
const load = (p) => vs.ssrLoadModule(p)
const R = await load('/src/utils/competitions/rankingCondor.ts')
const { setActivePinia, createPinia } = await import('pinia')
const { useClubStore } = await load('/src/stores/club.ts')

const rec = (season, o = {}) => ({
  season, division: 1, leagueRank: null, leagueTitle: false, ouro: null, prata: null, cup: null,
  recopa: false, supercup: false, ouroChampion: null, prataChampion: null, cupChampion: null, serieAChampion: null, ...o
})
const pts = (o) => R.ecoPoints(rec(1, o))

// 1) cada célula da tabela
const ouro = { groups: 2, qf: 4, sf: 6, runnerUp: 8, champion: 12 }
const prata = { groups: 1, qf: 2, sf: 3, runnerUp: 4, champion: 6 }
for (const [k, v] of Object.entries(ouro)) await ok(pts({ ouro: k }) === v, `1 Ouro ${k} = ${v}`)
for (const [k, v] of Object.entries(prata)) await ok(pts({ prata: k }) === v, `1 Prata ${k} = ${v}`)
await ok(pts({ leagueRank: 1, leagueTitle: true }) === 4, '1 Série A campeão = 4')
for (const r of [2, 3, 4]) await ok(pts({ leagueRank: r }) === 2, `1 Série A ${r}º = 2`)
for (const r of [5, 6]) await ok(pts({ leagueRank: r }) === 1, `1 Série A ${r}º = 1`)
await ok(pts({ leagueRank: 7 }) === 0 && pts({}) === 0, '1 Série A 7º e sem nada = 0')
await ok(pts({ division: 2, leagueRank: 1, leagueTitle: true }) === 0, '1 título fora da A não pontua na A')
await ok(pts({ cup: 'champion' }) === 3 && pts({ cup: 'runnerUp' }) === 1, '1 Taça campeã 3, vice 1')
await ok(pts({ recopa: true }) === 1 && pts({ supercup: true }) === 1, '1 Recopa 1, Supercopa 1')
await ok(pts({ ouro: 'champion', prata: 'qf', leagueRank: 3, cup: 'runnerUp', recopa: true, supercup: true }) === 12 + 2 + 2 + 1 + 1 + 1, '1 soma de competições na temporada')

// 2) soma só o ciclo (edição T8: temporadas 4 a 7)
const recs = [rec(3, { ouro: 'champion' }), rec(4, { ouro: 'qf' }), rec(7, { cup: 'champion' }), rec(8, { ouro: 'champion' })]
await ok(R.rankingPoints(recs, 8) === 4 + 3, '2 ciclo da T8 soma 4..7 (T3 e T8 fora)')
await ok(R.rankingPoints(recs, 12) === 12, '2 ciclo da T12 soma 8..11')

// 3) ordem das portas
const camp = [rec(5, { ouro: 'champion' })]
await ok(R.userMundialEntry(camp, 8, true) === 'ouro', '3 ouro vence sede')
await ok(R.userMundialEntry([rec(5, { ouro: 'qf' })], 8, true) === 'sede', '3 sede vence ranking')
const big = [rec(4, { ouro: 'runnerUp', prata: 'champion' }), rec(5, { ouro: 'sf', leagueRank: 1, leagueTitle: true })]
await ok(R.userMundialEntry(big, 8, true) === 'sede' && R.userMundialEntry(big, 8, false) === 'ranking', '3 ranking quando não há ouro nem sede')
await ok(R.userMundialEntry([], 8) === null, '3 sem nada = null')

// 4) corte 16
const c16 = [rec(4, { ouro: 'runnerUp' }), rec(5, { ouro: 'runnerUp' })]           // 16
const c15 = [rec(4, { ouro: 'runnerUp' }), rec(5, { ouro: 'sf', prata: 'groups', supercup: true })]  // 8+6+1+... = 15 ? 
await ok(R.rankingPoints(c16, 8) === 16 && R.userMundialEntry(c16, 8) === 'ranking', '4 16 pontos entra')
await ok(R.rankingPoints(c15, 8) === 16, '4 (conferência de base) 8+6+1+1 = 16')
const c15b = [rec(4, { ouro: 'runnerUp' }), rec(5, { ouro: 'sf', prata: 'groups' })]
await ok(R.rankingPoints(c15b, 8) === 15 && R.userMundialEntry(c15b, 8) === null, '4 15 pontos fica fora')

// 5) ecoRecords limitado a 8 e save idempotente
setActivePinia(createPinia())
const club = useClubStore()
for (let s = 1; s <= 12; s++) club.recordEcoSeason(rec(s, { ouro: s % 2 ? 'sf' : null }))
await ok(club.ecoRecords.length === 8 && club.ecoRecords[0].season === 5 && club.ecoRecords[7].season === 12, '5 ecoRecords fica com as 8 mais recentes')
club.recordEcoSeason(rec(12, { prata: 'champion' }))
await ok(club.ecoRecords.length === 8 && club.ecoRecords[7].prata === 'champion', '5 mesma temporada substitui')
const s1 = JSON.stringify(club.toSave())
club.fromSave(JSON.parse(s1))
const s2 = JSON.stringify(club.toSave())
club.fromSave(JSON.parse(s2))
const s3 = JSON.stringify(club.toSave())
const strip = (s) => { const o = JSON.parse(s); delete o.lastActiveAt; delete o.staminaTickAt; return JSON.stringify(o) }
await ok(strip(s1) === strip(s2) && strip(s2) === strip(s3), '5 save -> load -> save idêntico')
const old = JSON.parse(s1); delete old.ecoRecords
club.fromSave(old)
await ok(club.ecoRecords.length === 0, '5 save antigo sem o campo fica sem registros')
club.resetClub()
await ok(club.ecoRecords.length === 0, '5 reset limpa')
console.log('OK t41-ranking')
await vs.close()

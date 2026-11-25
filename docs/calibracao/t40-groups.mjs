// T40 - módulo genérico de grupos e jogo neutro.
// Uso: node docs/calibracao/t40-groups.mjs            (testes)
//      node docs/calibracao/t40-groups.mjs --baseline (regrava t40-baseline.json; só com o código ANTES da T3)
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync } from 'node:fs'
const root = fileURLToPath(new URL('../../', import.meta.url)).split(String.fromCharCode(92)).join('/').replace(/\/+$/, '')
const BASE = `${root}/docs/calibracao/t40-baseline.json`
const vs = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const fail = async (m) => { console.log('FAIL', m); await vs.close(); process.exit(1) }
const ok = async (c, m) => { if (!c) await fail(m); console.log('OK', m) }
const load = (p) => vs.ssrLoadModule(p)
const { mulberry32 } = await load('/src/utils/core/random.ts')
const BR = await load('/src/utils/bracket/bracket.ts')
const SEED = await load('/src/utils/bracket/bracketSeeding.ts')
const G = await load('/src/stores/modules/competitions/groups.ts')

const snap = (t) => ({ id: t.id, p: t.points, pl: t.played, w: t.won, gf: t.gf, ga: t.ga })
const podium = (b) => b.podium && { c: b.podium.champion.teamId, r: b.podium.runnerUp.teamId, t: b.podium.third?.teamId ?? null, f: b.podium.finalSummary, ts: b.podium.thirdSummary }

// Continental (grupos + chave) e Taça, só com funções puras.
function simContinental(seed) {
  const rng = mulberry32(seed)
  const { groupA, others } = SEED.seedContinentalGroups('Meu', rng)
  const groups = [{ id: 'A', teams: groupA }, ...others]
  for (let round = 1; round <= 6; round++) {
    const sched = G.GROUP_SCHEDULE[(round - 1) % 3]
    for (const g of groups) for (const [i, j] of sched) {
      const [hi, ai] = round > 3 ? [j, i] : [i, j]
      const home = g.teams[hi], away = g.teams[ai]
      const s = BR.simulateMatchScore(home.power, away.power, rng)
      G.applyGroupMatch(home, away, s.home, s.away)
    }
  }
  const sorted = {}
  for (const g of groups) sorted[g.id] = G.sortGroup(g.teams).map((t) => t.id)
  const b = BR.createBracket({
    competition: 'continental', season: 1, label: 'x',
    teams: groups.flatMap((g) => g.teams).map((t) => ({ id: t.id, name: t.name, power: t.power })),
    rounds: [
      { key: 'QF', label: 'Quartas', shortLabel: 'Quartas', legCount: 1 },
      { key: 'SF', label: 'Semi', shortLabel: 'Semi', legCount: 1 },
      { key: 'FINAL', label: 'Final', shortLabel: 'Final', legCount: 1 }],
    firstRound: SEED.CONTINENTAL_QF_TEMPLATE.map(() => [null, null]),
    firstRoundLabels: SEED.CONTINENTAL_QF_TEMPLATE, thirdPlace: true, thirdLegCount: 1,
  })
  SEED.seedContinentalQuarterFinals(sorted).forEach(([h, a], i) => BR.fillTieTeams(b.rounds[0].ties[i], h, a))
  BR.completeBracket(b, rng)
  return { tables: groups.map((g) => G.sortGroup(g.teams).map(snap)), podium: podium(b) }
}
function simCup(seed) {
  const rng = mulberry32(seed)
  const s = SEED.seedCup(rng)
  const b = BR.createBracket({
    competition: 'cup', season: 1, label: 'x', teams: s.teams,
    rounds: [
      { key: 'R16', label: 'Oitavas', shortLabel: 'Oitavas', legCount: 1 },
      { key: 'QF', label: 'Quartas', shortLabel: 'Quartas', legCount: 1 },
      { key: 'SF', label: 'Semi', shortLabel: 'Semi', legCount: 1 },
      { key: 'FINAL', label: 'Final', shortLabel: 'Final', legCount: 1 }],
    firstRound: s.firstRound, thirdPlace: true, thirdLegCount: 1,
  })
  BR.completeBracket(b, rng, { forfeitUser: true })
  return { podium: podium(b) }
}
const runAll = () => { const o = {}; for (let s = 1; s <= 20; s++) o[s] = { continental: simContinental(s), cup: simCup(s) }; return JSON.stringify(o) }

if (process.argv.includes('--baseline')) {
  writeFileSync(BASE, runAll())
  console.log('baseline gravada', BASE)
  await vs.close(); process.exit(0)
}

// 1) regressão byte a byte
await ok(runAll() === readFileSync(BASE, 'utf8'), '1 regressão byte a byte (continental e Taça, sementes 1-20)')

const GS = await load('/src/utils/groups/groupStage.ts')
await ok(GS.sortGroup === G.sortGroup && GS.applyGroupMatch === G.applyGroupMatch && GS.GROUP_SCHEDULE === G.GROUP_SCHEDULE, '1b groups.ts reexporta o módulo genérico')

// 2) sorteio de 32
const CONF = ['europa', 'sulamerica', 'asia', 'africa', 'norte', 'oceania', 'sede']
const SLOTS = { europa: 12, sulamerica: 6, asia: 4, africa: 4, norte: 4, oceania: 1, sede: 1 }
const mkField = (rng) => {
  const out = []
  let n = 0
  for (const c of CONF) for (let k = 0; k < SLOTS[c]; k++) {
    out.push({ id: `c${n}`, name: `C${n}`, power: Math.round(50 + rng() * 40), isUser: false, points: 0, played: 0, won: 0, gf: 0, ga: 0, confed: c })
    n++
  }
  return out
}
{
  let relaxed = 0, bad = 0
  for (let seed = 1; seed <= 1000; seed++) {
    const rng = mulberry32(seed)
    const field = mkField(rng)
    const host = field[field.length - 1]
    const r = GS.drawGroups(field, rng, { hostId: host.id })
    const groups = r.groups
    if (r.relaxed) relaxed++
    const ids = groups.flatMap((g) => g.teams.map((t) => t.id))
    if (groups.length !== 8 || groups.some((g) => g.teams.length !== 4) || new Set(ids).size !== 32) { bad++; continue }
    if (groups[0].teams[0].id !== host.id) { bad++; continue }
    if (!r.relaxed) for (const g of groups) {
      const cnt = {}
      for (const t of g.teams) cnt[t.confed] = (cnt[t.confed] ?? 0) + 1
      if (Object.entries(cnt).some(([c, v]) => v > (c === 'europa' ? 2 : 1))) { bad++; break }
    }
  }
  await ok(bad === 0, `2a sorteio de 32 válido em 1000 sementes (ruins: ${bad})`)
  await ok(relaxed / 1000 < 0.01, `2b relaxamento ${relaxed}/1000 (< 1%)`)
}

// 3) jogo neutro
{
  const N = 40000
  const rng = mulberry32(777)
  let hw = 0, aw = 0
  for (let i = 0; i < N; i++) { const s = BR.simulateMatchScore(75, 75, rng, 0); if (s.home > s.away) hw++; else if (s.away > s.home) aw++ }
  const ph = hw / N * 100, pa = aw / N * 100
  // Nota: com OVER igual e sem mando cada lado vence ~35% (empate ~30%); os 40% do plano são a vitória do MANDANTE com mando.
  await ok(Math.abs(ph - 35) <= 2 && Math.abs(pa - 35) <= 2 && Math.abs(ph - pa) <= 1.5, `3a neutro: vitória mandante ${ph.toFixed(1)}% e visitante ${pa.toFixed(1)}% (simétrico, 35 ± 2)`)
  const r2 = mulberry32(5); let h2 = 0, a2 = 0
  for (let i = 0; i < 40000; i++) { const s = BR.simulateMatchScore(75, 75, r2); if (s.home > s.away) h2++; else if (s.away > s.home) a2++ }
  await ok(Math.abs(h2 / 400 - 40) <= 2 && a2 < h2, `3b com mando padrão o mandante vence ${(h2 / 400).toFixed(1)}% (40 ± 2)`)
  // chave neutra: bracket.neutral tira o mando do resolveTie
  const r3 = mulberry32(9); let w = 0, wDef = 0
  const M = 20000
  for (const neutral of [true, false]) for (let i = 0; i < M; i++) {
    const br = BR.createBracket({ competition: 'cup', season: 1, label: 'x', teams: [{ id: 'a', name: 'A', power: 75 }, { id: 'b', name: 'B', power: 75 }], rounds: [{ key: 'F', label: 'F', shortLabel: 'F', legCount: 1 }], firstRound: [['a', 'b']], thirdPlace: false })
    if (neutral) br.neutral = true
    BR.completeBracket(br, r3)
    if (br.rounds[0].ties[0].winnerId === 'a') { if (neutral) w++; else wDef++ }
  }
  await ok(Math.abs(w / M - 0.5) < 0.02, `3c chave neutra: mandante avança ${(w / M * 100).toFixed(1)}% (50 ± 2)`)
  await ok(wDef / M > 0.52, `3d chave com mando: mandante avança ${(wDef / M * 100).toFixed(1)}% (> 52)`)
}

// 4) desempates de sortGroup
{
  const t = (id, points, gf, ga, power = 50) => ({ id, name: id, power, isUser: false, points, played: 3, won: 0, gf, ga })
  const ord = (a) => G.sortGroup(a).map((x) => x.id).join(',')
  await ok(ord([t('a', 4, 9, 9), t('b', 6, 1, 5), t('c', 4, 9, 9, 60), t('d', 1, 0, 0)]) === 'b,c,a,d', '4a pontos primeiro, OVER por último')
  await ok(ord([t('a', 4, 5, 4), t('b', 4, 6, 3)]) === 'b,a', '4b saldo de gols')
  await ok(ord([t('a', 4, 6, 4), t('b', 4, 5, 3)]) === 'a,b', '4c gols pró com saldo igual')
  await ok(ord([t('a', 4, 3, 3, 40), t('b', 4, 3, 3, 70)]) === 'b,a', '4d OVER')
  const arr = [t('a', 1, 0, 0), t('b', 2, 0, 0)]
  G.sortGroup(arr); await ok(arr[0].id === 'a', '4e não muta a entrada')
}
console.log('OK t40-groups')
await vs.close()

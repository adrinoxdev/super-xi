// Escada de progressão: carreira "viva" de N temporadas (OVER real: evolução, envelhecimento, contratos, scouting,
// base e ampliações pelo código real) para três perfis de gestor. Mede o OVER do time por temporada, a série,
// o caixa, as vitórias, o ritmo de evolução por idade e a raridade de 80+/85+/90+.
// Uso (copiar para a raiz do projeto): node _escada.mjs [N=30] [politicas=fraco,medio,forte] [--overlay DIR] [--runs R]
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
import fs from 'fs'; import path from 'path'
const root = (await import('node:url')).fileURLToPath(new URL('../../', import.meta.url)).split(String.fromCharCode(92)).join('/').replace(/\/+$/, '')
const args = process.argv.slice(2)
const oi = args.indexOf('--overlay'); const OVERLAY = oi >= 0 ? path.resolve(args[oi + 1]).replace(/\\/g, '/') : null; if (oi >= 0) args.splice(oi, 2)
const ri = args.indexOf('--runs'); const RUNS = ri >= 0 ? Number(args[ri + 1]) : 3; if (ri >= 0) args.splice(ri, 2)
const N = Number(args[0] || 30)
const POLICIES = (args[1] || 'fraco,medio,forte').split(',')
const OUT = process.env.ESCADA_OUT || path.join(process.cwd(), 'escada-results.json')
const store = new Map()
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }
globalThis.confirm = () => true; globalThis.window = globalThis
globalThis.location = { pathname: '/', search: '', hash: '', href: 'http://x/', origin: 'http://x' }
globalThis.history = { state: {}, pushState() {}, replaceState() {}, length: 1 }
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}
globalThis.document = { querySelector: () => null, addEventListener() {} }
const overlayPlugin = { name: 'ov', enforce: 'pre', load(id) {
  if (!OVERLAY) return null
  const clean = id.split('?')[0].replace(/\\/g, '/')
  const rel = clean.toLowerCase().startsWith(root.toLowerCase() + '/src/') ? clean.slice(root.length + 1) : null
  if (!rel) return null
  const f = path.join(OVERLAY, rel); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null } }
const vs = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', plugins: [overlayPlugin] })
const load = p => vs.ssrLoadModule(p)
const { router } = await load('/src/router/index.ts'); router.push = () => new Promise(() => {})
const { useSeason } = await load('/src/composables/useSeason.ts')
const { useMatchSimulation } = await load('/src/composables/useMatchSimulation.ts')
const { useSquad } = await load('/src/composables/useSquad.ts')
const { useScouting } = await load('/src/composables/useScouting.ts')
const S = {}
for (const n of ['club', 'squad', 'league', 'competitions', 'match', 'ui', 'scouting', 'market']) S[n] = (await load(`/src/stores/${n}.ts`))[`use${n[0].toUpperCase() + n.slice(1)}Store`]
const GP = await load('/src/utils/generatePlayer.ts')
const C = await load('/src/utils/constants.ts')
const { pickBestLineup } = await load('/src/utils/calculateTeamStrength.ts')
const TYP = C.SERIE_TYPICAL_OVER, DN = { 4: 'D', 3: 'C', 2: 'B', 1: 'A' }
const RES = { 4: 40000, 3: 100000, 2: 200000, 1: 350000 }
const SQUAD_N = { 4: 16, 3: 18, 2: 20, 1: 22 }
const KEY = C.POSITION_KEY_FOCUS ?? { GK: 'physical', CB: 'defending', LB: 'pace', RB: 'pace', CDM: 'defending', CM: 'passing', CAM: 'passing', LW: 'pace', RW: 'pace', ST: 'shooting' }
const MISSION = Object.fromEntries(C.SCOUT_MISSIONS.map(m => [m.type, m]))
const ageBand = a => a <= 19 ? '<=19' : a <= 21 ? '20-21' : a <= 23 ? '22-23' : a <= 26 ? '24-26' : a <= 29 ? '27-29' : '30+'


function bestLineup(squad, rating) {
  squad.setStarters(pickBestLineup(squad.players, squad.formation))
  for (let pass = 0; pass < 3; pass++) {
    let improved = false
    const pool = squad.players.filter(p => !p.isLoanedOut && !p.injury)
    for (let i = 0; i < squad.starterIds.length; i++) {
      for (const q of pool) {
        const ids = [...squad.starterIds]
        const j = ids.indexOf(q.id)
        if (j === i) continue
        const before = rating()
        if (j >= 0) { ids[j] = ids[i]; ids[i] = q.id } else ids[i] = q.id
        const old = squad.starterIds
        squad.setStarters(ids)
        if (rating() > before + 1e-9) improved = true
        else squad.setStarters(old)
      }
    }
    if (!improved) break
  }
}
async function run(policy) {
  setActivePinia(createPinia()); store.clear()
  const club = S.club(), squad = S.squad(), league = S.league(), comp = S.competitions(), match = S.match(), scouting = S.scouting(), market = S.market()
  const season = useSeason(), sim = useMatchSimulation(), SQ = useSquad(), SC = useScouting()
  season.initializeFreshCareer(); club.name = 'Teste FC'
  const rating = () => squad.teamStrength.rating ?? squad.teamStrength.total
  const R = { policy, seasons: [], errors: [], start: +rating().toFixed(1), startPlayers: squad.players.map(p => p.overall).sort((a, b) => a - b), evo: {} }
  const own = () => squad.players.filter(p => !p.isLoanedIn && !p.isLoanedOut)
  let cur, snap = new Map()
  const newCur = () => ({ season: club.season, div: club.division, start: club.budget, w: 0, d: 0, l: 0, m: 0, nBuy: 0, buy: 0, nSell: 0, upg: 0, staff: 0, ratingStart: +rating().toFixed(1) })
  const origEnd = squad.applyEndOfSeason
  squad.applyEndOfSeason = (...a) => {
    // ritmo de evolução da temporada (antes do envelhecimento)
    for (const p of own()) {
      const s0 = snap.get(p.id); if (!s0) continue
      const k = ageBand(s0.age) + (s0.gap >= 6 ? '|longe' : '|perto')
      const e = R.evo[k] ??= { n: 0, sum: 0, apps: 0 }
      e.n++; e.sum += p.overall - s0.ovr
    }
    const r = rating()
    for (const p of own().filter(p => p.contractYears === 1)) {
      const keep = p.age < C.AGING.retireAge - 1 && p.overall >= r - (policy === 'fraco' ? 12 : 8)
      if (keep) SQ.renewPlayerContract(p)
    }
    return origEnd(...a)
  }
  function scoutBuy(maxMissions, tierPick, targetFn) {
    for (let i = 0; i < maxMissions; i++) {
      bestLineup(squad, rating)
      if (rating() >= targetFn()) break
      let worst = null
      for (const s of squad.pitchSlots) if (s.player && (!worst || s.player.overall < worst.player.overall)) worst = s
      if (!worst) break
      const type = tierPick()
      const mi = MISSION[type]
      if (club.budget - mi.cost < RES[club.division]) break
      club.budget -= mi.cost
      const M = club.scoutingSpec.maxOvr, [lo, hi] = C.SCOUT_OVR_OFFSETS[type]
      let best = null
      for (let k = 0; k < C.SCOUT_REPORT_COUNT[type]; k++) {
        const p = GP.generatePlayer({ position: type === 'local' ? undefined : worst.role, minOvr: M + lo, maxOvr: M + hi, isYouth: type === 'youth', tail: true })
        if (!best || p.overall > best.overall) best = p
      }
      if (process.env.DBG) console.log('dbg', type, M, worst.player.overall, best?.overall, best?.value, club.budget, squad.players.length, club.maxSquadCapacity)
      if (!best || best.overall < worst.player.overall + 3 || club.budget - best.value < RES[club.division]) continue
      const cap = Math.min(club.maxSquadCapacity, policy === 'forte' ? 25 : SQUAD_N[club.division])
      if (squad.players.length >= cap) {
        const b = [...own()].filter(p => !squad.isStarter(p.id)).sort((a, b) => a.overall - b.overall)[0]
        if (!b || own().length <= 12) break
        const n = squad.players.length; SQ.sellSquadPlayer(b); if (squad.players.length === n) break
        cur.nSell++
      }
      const rep = { id: 'rep_' + Math.random(), player: best, estimatedOvr: best.overall, estimatedPotential: best.potential, isGem: false, status: 'new' }
      scouting.reports.unshift(rep)
      const b0 = club.budget, n0 = squad.players.length
      SC.signScoutedPlayer(rep)
      if (process.env.DBG) console.log('sign', squad.players.length, n0, S.ui().toast.message)
      if (squad.players.length > n0) { cur.nBuy++; cur.buy += b0 - club.budget; if (policy === 'forte') { const q = squad.players.at(-1); q.trainingFocus = KEY[q.position] } }
    }
    bestLineup(squad, rating)
  }
  function upgrades(order) {
    for (let g = 0; g < 12; g++) {
      const d = club.division, capL = C.SERIE_ECONOMY[d].levelCap
      const cand = Object.keys(C.UPGRADE_COSTS).filter(k => club.upgrades[k] < C.FACILITY_MAX_LEVEL[k] && !((k === 'stadiumLevel' || k === 'financeLevel') && club.upgrades[k] >= capL))
      const sorted = order(cand)
      const k = sorted.find(k => club.budget - RES[d] * (policy === 'fraco' ? 2 : 1) >= club.getUpgradeCost(k))
      if (!k || !club.upgradeFacility(k)) break
      cur.upg++
    }
  }
  function seasonStart() {
    const d = club.division, typ = TYP[d]
    bestLineup(squad, rating)
    const r = rating()
    // vende veteranos e encostados
    for (const p of [...own()].sort((a, b) => a.overall - b.overall)) {
      if (own().length <= 13 || squad.isStarter(p.id)) continue
      if (p.age >= (policy === 'forte' ? 31 : 34) || p.overall < r - 12) { SQ.sellSquadPlayer(p); cur.nSell++ }
    }
    const cap = Math.min(club.maxSquadCapacity, policy === 'forte' ? 25 : SQUAD_N[d])
    // base
    for (const kid of [...scouting.youthAcademyProspects]) {
      if (squad.players.length >= cap) break
      const ok = policy === 'fraco' ? squad.players.length < 14 : policy === 'medio' ? kid.potential >= typ + 4 : kid.potential >= r + 4
      if (ok) { SC.promoteYouthProspect(kid); if (policy === 'forte') kid.trainingFocus = KEY[kid.position] }
    }
    if (policy === 'forte') {
      for (let i = 0; i < C.MAX_TRYOUTS_PER_SEASON && squad.players.length < cap; i++) {
        if (club.budget < 30000 + RES[d]) break
        const b = club.budget; SC.runYouthAcademyTryout(); if (club.budget === b) break
        const kid = scouting.youthAcademyProspects[0]
        if (kid && kid.potential >= r + 4) { SC.promoteYouthProspect(kid); kid.trainingFocus = KEY[kid.position] }
      }
      for (const p of own()) p.trainingFocus = KEY[p.position]
    }
    // contratações
    if (policy === 'fraco') scoutBuy(1, () => 'local', () => typ - 2)
    else if (policy === 'medio') scoutBuy(4, () => 'position', () => typ + 2)
    else scoutBuy(6, () => club.upgrades.scoutingLevel >= 6 && club.budget > 400000 ? 'international' : club.budget > 200000 ? 'national' : 'position', () => r + 3)
    // ampliações
    if (policy === 'forte') upgrades(c => c.sort((a, b) => {
      const pri = k => (k === 'stadiumLevel' || k === 'financeLevel') ? 0 : k === 'trainingCenterLevel' || k === 'scoutingLevel' ? 1 : 2
      return pri(a) - pri(b) || club.getUpgradeCost(a) - club.getUpgradeCost(b)
    }))
    else if (policy === 'medio') upgrades(c => c.sort((a, b) => club.getUpgradeCost(a) - club.getUpgradeCost(b)))
    else upgrades(c => c.filter(k => k === 'stadiumLevel' || k === 'financeLevel').sort((a, b) => club.getUpgradeCost(a) - club.getUpgradeCost(b)))
    // comissão (forte): auxiliar e treinador de base, pagos a cada temporada
    if (policy === 'forte') {
      for (const key of ['assistantCoach', 'youthCoach']) {
        const base = C.STAFF_CATALOG.find(s => s.key === key).cost
        const cost = C.staffContractCost(base, d)
        club.staffContracts[key] = 0
        if (club.budget - cost >= RES[d] * 1.5 && club.hireStaff(key, cost)) cur.staff += cost
      }
    }
    bestLineup(squad, rating)
    cur.ratingStart = +rating().toFixed(1)
    snap = new Map(own().map(p => [p.id, { ovr: p.overall, age: p.age, gap: p.potential - p.overall }]))
  }
  const pickComp = () => ['cup', 'continental', 'supercup', 'recopa'].find(c => comp.isCompetitionPlayable(c)) ?? 'league'
  cur = newCur(); seasonStart()
  for (let s = 1; s <= N; s++) {
    const st = club.season; let g = 0
    while (club.season === st) {
      if (++g > 300) { R.errors.push('loop'); return R }
      const c = pickComp()
      if (c === 'league' && !league.nextUserFixture) { R.errors.push('sem partida'); return R }
      squad.replaceInjuredStarters?.()
      sim.prepareMatch(c); sim.startLiveMatch()
      for (let m = 2; m <= 90; m += 2) { match.matchState.minute = m; sim.simulateMatchTick(m) }
      match.matchState.isRunning = false; match.matchState.isFinished = true
      sim.concludeMatch(); sim.finishMatchAndReturn()
      const us = match.matchState.userScore, os = match.matchState.opponentScore
      cur.m++; if (us > os) cur.w++; else if (us === os) cur.d++; else cur.l++
      if (!Number.isFinite(club.budget)) { R.errors.push('NaN'); return R }
      for (const o of [...market.incomingOffers]) market.removeOffer(o.id)
      if (club.season !== st) {
        cur.end = club.budget
        const o = own()
        cur.top = Math.max(...o.map(p => p.overall)); cur.n80 = o.filter(p => p.overall >= 80).length; cur.n85 = o.filter(p => p.overall >= 85).length; cur.n90 = o.filter(p => p.overall >= 90).length
        cur.age = +(o.reduce((a, p) => a + p.age, 0) / o.length).toFixed(1)
        R.seasons.push(cur)
        cur.ratingEnd = +rating().toFixed(1) // após a virada (envelhecimento)
        if (s < N) { cur = newCur(); seasonStart() }
      } else if (cur.m % 4 === 0) bestLineup(squad, rating)
    }
  }
  return R
}
const all = {}
for (const pol of POLICIES) { all[pol] = []; for (let r = 0; r < RUNS; r++) { const t = Date.now(); try { all[pol].push(await run(pol)) } catch (e) { all[pol].push({ crashed: String(e.stack || e).split('\n').slice(0, 4).join(' / ') }) } console.log(`[${pol} #${r + 1}] ${Date.now() - t}ms ${all[pol].at(-1).crashed || ''}`) } }
const summ = {}
for (const [pol, runs] of Object.entries(all)) {
  const ok = runs.filter(r => r.seasons)
  const avg = f => ok.length ? +(ok.reduce((a, r) => a + f(r), 0) / ok.length).toFixed(1) : null
  const overBy = Array.from({ length: N }, (_, i) => avg(r => r.seasons[i]?.ratingStart ?? NaN))
  const first = (r, pred) => { const i = r.seasons.findIndex(pred); return i < 0 ? null : i + 1 }
  const marks = {}
  for (const [k, pred] of Object.entries({ C: s => s.div <= 3, B: s => s.div <= 2, A: s => s.div <= 1, t60: s => s.ratingStart >= 60, t70: s => s.ratingStart >= 70, t80: s => s.ratingStart >= 80, t85: s => s.ratingStart >= 85, t90: s => s.ratingStart >= 90, p80: s => s.top >= 80, p90: s => s.top >= 90 }))
    marks[k] = ok.map(r => first(r, pred))
  const per = {}
  for (const r of ok) for (const s of r.seasons) { const x = per[DN[s.div]] ??= { n: 0, w: 0, m: 0, saldo: 0 }; x.n++; x.w += s.w; x.m += s.m; x.saldo += s.end - s.start }
  for (const x of Object.values(per)) { x.vit = +(100 * x.w / x.m).toFixed(1); x.saldo = Math.round(x.saldo / x.n); x.jogos = +(x.m / x.n).toFixed(1); delete x.w; delete x.m }
  const evo = {}
  for (const r of ok) for (const [k, e] of Object.entries(r.evo)) { const x = evo[k] ??= { n: 0, sum: 0 }; x.n += e.n; x.sum += e.sum }
  for (const [k, x] of Object.entries(evo)) evo[k] = { n: x.n, porTemporada: +(x.sum / x.n).toFixed(2) }
  summ[pol] = { inicio: avg(r => r.start), overPorTemporada: overBy, marcos: marks, porSerie: per, evo, traj: ok.map(r => ({ series: r.seasons.map(s => DN[s.div]).join(''), over: r.seasons.map(s => Math.round(s.ratingStart)).join(','), caixa: r.seasons.map(s => Math.round(s.end / 1000)).join(','), top: r.seasons.map(s => s.top).join(',') })), crashes: runs.filter(r => r.crashed).map(r => r.crashed), erros: ok.flatMap(r => r.errors), elencoInicial: ok.map(r => r.startPlayers.join(',')) }
}
fs.writeFileSync(OUT, JSON.stringify({ overlay: OVERLAY, summ, all }, null, 1))
for (const [pol, v] of Object.entries(summ)) {
  console.log(`\n[${pol}] início ${v.inicio} erros ${v.erros.length} crashes ${v.crashes.length}`, v.crashes[0] || '')
  console.log('  OVER médio por temporada:', v.overPorTemporada.join(' '))
  console.log('  marcos (temporada):', Object.entries(v.marcos).map(([k, a]) => k + '=' + a.map(x => x ?? '-').join('/')).join('  '))
  for (const t of v.traj) console.log('   ', t.series, '| OVER', t.over, '| caixa', t.caixa, '| top', t.top)
  console.log('  por série:', Object.entries(v.porSerie).map(([d, x]) => `${d}: n=${x.n} vit=${x.vit}% saldo=${x.saldo} jogos=${x.jogos}`).join(' | '))
  console.log('  evolução por idade (OVER/temporada):', Object.entries(v.evo).sort().map(([k, x]) => `${k}:${x.porTemporada}(${x.n})`).join(' '))
}
await vs.close(); process.exit(0)

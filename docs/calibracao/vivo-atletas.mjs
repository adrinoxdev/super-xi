// Carreira "viva": OVER real (evolução, envelhecimento, contratos), contratações e vendas pelo código real.
// Uso (copiar para a raiz): node _vivo.mjs [N=20] [politicas=vivo,formador,flip] [--overlay DIR] [--runs R]
//  vivo     : técnico razoável (renova quem presta, promove a base, compra quando o OVER cai abaixo do típico + 2)
//  formador : vivo + 3 peneiras por temporada, segura os jovens 1 temporada e vende (mede lucro da base)
//  flip     : vivo + compra 1 atleta por temporada só para revender por proposta (mede arbitragem)
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
import fs from 'fs'; import path from 'path'
const root = (await import('node:url')).fileURLToPath(new URL('../../', import.meta.url)).split(String.fromCharCode(92)).join('/').replace(/\/+$/, '')
const args = process.argv.slice(2)
const oi = args.indexOf('--overlay'); const OVERLAY = oi >= 0 ? path.resolve(args[oi + 1]).replace(/\\/g, '/') : null; if (oi >= 0) args.splice(oi, 2)
const ri = args.indexOf('--runs'); const RUNS = ri >= 0 ? Number(args[ri + 1]) : 3; if (ri >= 0) args.splice(ri, 2)
const N = Number(args[0] || 20)
const POLICIES = (args[1] || 'vivo,formador,flip').split(',')
const OUT = process.env.VIVO_OUT || path.join(process.cwd(), 'vivo-results.json')
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
const { useSquad, sellPriceFor } = await load('/src/composables/useSquad.ts')
const { useScouting } = await load('/src/composables/useScouting.ts')
const S = {}
for (const n of ['club', 'squad', 'league', 'competitions', 'match', 'ui', 'scouting', 'market']) S[n] = (await load(`/src/stores/${n}.ts`))[`use${n[0].toUpperCase() + n.slice(1)}Store`]
const GP = await load('/src/utils/generatePlayer.ts')
const C = await load('/src/utils/constants.ts')
const { pickBestLineup } = await load('/src/utils/calculateTeamStrength.ts')
const NEWM = !!C.CONTRACT
const TYP = C.SERIE_TYPICAL_OVER, DN = { 4: 'D', 3: 'C', 2: 'B', 1: 'A' }
const RES = { 4: 60000, 3: 120000, 2: 250000, 1: 400000 }
const SQUAD_N = { 4: 16, 3: 18, 2: 20, 1: 22 }

async function run(policy) {
  setActivePinia(createPinia()); store.clear()
  const club = S.club(), squad = S.squad(), league = S.league(), comp = S.competitions(), match = S.match(), scouting = S.scouting(), market = S.market()
  const season = useSeason(), sim = useMatchSimulation(), SQ = useSquad(), SC = useScouting()
  season.initializeFreshCareer(); club.name = 'Teste FC'
  const rating = () => squad.teamStrength.rating ?? squad.teamStrength.total
  const R = { policy, seasons: [], errors: [] }
  let cur
  const newCur = () => ({ season: club.season, div: club.division, start: club.budget, w: 0, d: 0, l: 0, m: 0, buy: 0, nBuy: 0, sell: 0, nSell: 0, renew: 0, nRenew: 0, gone: 0, youthSale: 0, youthCost: 0, flipProfit: 0, upg: 0, ratingStart: +rating().toFixed(1), wages: 0, income: 0 })
  const own = () => squad.players.filter(p => !p.isLoanedIn && !p.isLoanedOut)
  const flips = new Map() // id -> custo
  // ---- antes da virada: renovações ----
  const origEnd = squad.applyEndOfSeason
  squad.applyEndOfSeason = (...a) => {
    if (NEWM) {
      const r = rating()
      for (const p of own().filter(p => p.contractYears === 1)) {
        if (flips.has(p.id)) continue
        const keep = p.age < C.AGING.retireAge - 1 && p.overall >= r - 8
        if (!keep) continue
        const b = club.budget; SQ.renewPlayerContract(p); if (club.budget < b) { cur.renew += b - club.budget; cur.nRenew++ }
      }
    }
    const n0 = squad.players.length
    const t = origEnd(...a)
    cur.gone += t ? t.departed.length + t.retired.length : 0
    return t
  }
  function signGenerated(opts, missionCost) {
    const p = GP.generatePlayer(opts)
    if (club.budget - p.value - missionCost < RES[club.division]) return null
    club.budget -= missionCost
    const rep = { id: 'rep_' + Math.random(), player: p, estimatedOvr: p.overall, estimatedPotential: p.potential, isGem: false, status: 'new' }
    scouting.reports.unshift(rep)
    const b = club.budget; const n = squad.players.length
    SC.signScoutedPlayer(rep)
    if (squad.players.length === n) { club.budget += missionCost; return null }
    cur.buy += b - club.budget + missionCost; cur.nBuy++
    return p
  }
  function sell(p) { const b = club.budget; const n = squad.players.length; SQ.sellSquadPlayer(p); if (squad.players.length < n) { cur.sell += club.budget - b; cur.nSell++; return club.budget - b } return null }
  function lineup() { squad.setStarters(pickBestLineup(squad.players, squad.formation)) }
  function seasonStart() {
    const d = club.division, typ = TYP[d], cap = policy === 'formador' ? club.maxSquadCapacity : Math.min(club.maxSquadCapacity, SQUAD_N[d])
    // vende veteranos e encostados
    lineup()
    const r = rating()
    for (const p of [...own()].sort((a, b) => a.overall - b.overall)) {
      if (own().length <= 13 || flips.has(p.id)) continue
      if (squad.isStarter(p.id)) continue
      if (p.age >= 34 || p.overall < r - 12) sell(p)
    }
    // elenco acima do alvo da série: vende os reservas mais fracos
    while (own().length > cap) { const b = [...own()].filter(p => !squad.isStarter(p.id) && !flips.has(p.id)).sort((a, b) => a.overall - b.overall)[0]; if (!b || sell(b) === null) break }
    // formador: vende os jovens que já passaram 1 temporada
    if (policy === 'formador') {
      for (const p of [...own()]) if (p.isYouth && p._formado && p._formado < club.season && !squad.isStarter(p.id) && own().length > 12) { const v = sell(p); if (v !== null) cur.youthSale += v }
    }
    // promove a base de graça
    for (const kid of [...scouting.youthAcademyProspects]) {
      if (squad.players.length >= cap) break
      if (policy !== 'formador' && kid.potential < typ + 4) continue
      SC.promoteYouthProspect(kid); kid._formado = club.season
    }
    if (policy === 'formador') {
      for (let i = 0; i < 3 && squad.players.length < cap; i++) {
        if (club.budget < 12000 + RES[d]) break
        const b = club.budget; SC.runYouthAcademyTryout(); if (club.budget === b) break
        cur.youthCost += 12000
        const kid = scouting.youthAcademyProspects[0]; SC.promoteYouthProspect(kid); kid._formado = club.season
      }
    }
    // compra: reforça a pior vaga até o OVER do time chegar ao típico + 2 (no máximo 3 por temporada)
    const spec = club.scoutingSpec
    for (let i = 0; i < 3; i++) {
      lineup()
      if (rating() >= typ + 2) break
      const slots = squad.pitchSlots
      let worst = null
      for (const s of slots) if (s.player && (!worst || s.player.overall < worst.player.overall)) worst = s
      if (!worst) break
      if (squad.players.length >= cap) { const b = [...own()].filter(p => !squad.isStarter(p.id) && !flips.has(p.id)).sort((a, b) => a.overall - b.overall)[0]; if (!b || own().length <= 12 || sell(b) === null) break }
      const lo = Math.min(spec.maxOvr - 2, worst.player.overall + 4), hi = Math.min(spec.maxOvr, worst.player.overall + 9)
      if (!signGenerated({ position: worst.role, minOvr: lo, maxOvr: hi, tail: true }, 14000)) break
    }
    // flip: compra 1 atleta no OVER típico para revender
    if (policy === 'flip' && squad.players.length < cap) {
      const p = signGenerated({ minOvr: typ, maxOvr: typ + 3 }, 14000)
      if (p) { const q = squad.players.find(x => x.id === p.id); q.marketStatus = 'transfer_listed'; flips.set(q.id, q.acquiredFee ?? p.value) }
    }
    // ampliações com reserva (inclui luvas das renovações que vêm)
    const renewRes = NEWM ? own().filter(p => p.contractYears === 1).reduce((a, p) => a + SQ.getRenewalCost(p), 0) : 0
    for (let g = 0; g < 10; g++) {
      const keys = Object.keys(C.UPGRADE_COSTS)
      const capL = C.SERIE_ECONOMY[d].levelCap
      const pri = ['stadiumLevel', 'financeLevel'].filter(k => club.upgrades[k] < Math.min(capL, C.FACILITY_MAX_LEVEL[k]))
      const rest = keys.filter(k => !['stadiumLevel', 'financeLevel'].includes(k) && club.upgrades[k] < C.FACILITY_MAX_LEVEL[k])
      const cand = [...pri, ...rest].sort((a, b) => club.getUpgradeCost(a) - club.getUpgradeCost(b))
      const k = cand.find(k => club.budget - RES[d] - renewRes >= club.getUpgradeCost(k))
      if (!k || !club.upgradeFacility(k)) break
      cur.upg++
    }
    lineup()
    cur.ratingStart = +rating().toFixed(1)
  }
  function handleOffers() {
    for (const o of [...market.incomingOffers]) {
      const cost = flips.get(o.playerId)
      if (policy === 'flip' && cost !== undefined && o.type === 'buy') {
        if (o.amount > cost) { const b = club.budget; SQ.acceptIncomingOffer(o); if (club.budget > b) { cur.flipProfit += club.budget - b - cost; flips.delete(o.playerId) } continue }
        if (!o.countered) { if (SQ.counterIncomingOffer(o) === undefined) {} continue }
      }
      market.removeOffer(o.id)
    }
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
      sim.concludeMatch(); const sm = match.lastMatchSummary; sim.finishMatchAndReturn()
      if (sm) { cur.wages += sm.wages; cur.income += sm.ticket + sm.sponsor + sm.winBonus }
      const us = match.matchState.userScore, os = match.matchState.opponentScore
      cur.m++; if (us > os) cur.w++; else if (us === os) cur.d++; else cur.l++
      if (!Number.isFinite(club.budget)) { R.errors.push('NaN'); return R }
      handleOffers()
      if (club.season !== st) {
        cur.end = club.budget; cur.ratingEnd = +rating().toFixed(1)
        cur.avgAge = +(own().reduce((a, p) => a + p.age, 0) / own().length).toFixed(1)
        cur.squadValue = own().reduce((a, p) => a + p.value, 0)
        R.seasons.push(cur)
        if (s < N) { cur = newCur(); seasonStart() }
      } else if (cur.m % 4 === 0) lineup()
    }
  }
  return R
}
const all = {}
for (const pol of POLICIES) { all[pol] = []; for (let r = 0; r < RUNS; r++) { const t = Date.now(); try { all[pol].push(await run(pol)) } catch (e) { all[pol].push({ crashed: String(e.stack || e).split('\n').slice(0, 4).join(' / ') }) } console.log(`[${pol} #${r + 1}] ${Date.now() - t}ms ${all[pol].at(-1).crashed || ''}`) } }
// resumo
const summ = {}
for (const [pol, runs] of Object.entries(all)) {
  const per = {}; const traj = []
  for (const R of runs) {
    if (!R.seasons) continue
    traj.push({ series: R.seasons.map(s => DN[s.div]).join(''), caixa: R.seasons.map(s => Math.round(s.end / 1000)), over: R.seasons.map(s => Math.round(s.ratingEnd)) })
    for (const s of R.seasons) {
      const x = per[DN[s.div]] ??= { n: 0, saldo: 0, w: 0, m: 0, buy: 0, nBuy: 0, sell: 0, nSell: 0, renew: 0, nRenew: 0, gone: 0, youthSale: 0, youthCost: 0, flip: 0, upg: 0, over: 0, age: 0, val: 0, wages: 0, income: 0 }
      x.n++; x.saldo += s.end - s.start; x.w += s.w; x.m += s.m; x.buy += s.buy; x.nBuy += s.nBuy; x.sell += s.sell; x.nSell += s.nSell; x.renew += s.renew; x.nRenew += s.nRenew; x.gone += s.gone; x.youthSale += s.youthSale; x.youthCost += s.youthCost; x.flip += s.flipProfit; x.upg += s.upg; x.over += s.ratingEnd; x.age += s.avgAge; x.val += s.squadValue; x.wages += s.wages; x.income += s.income
    }
  }
  for (const x of Object.values(per)) { const n = x.n; for (const k of Object.keys(x)) if (k !== 'n' && k !== 'w' && k !== 'm') x[k] = +(x[k] / n).toFixed(k === 'over' || k === 'age' || k.startsWith('n') || k === 'upg' || k === 'gone' ? 2 : 0); x.vit = +(100 * x.w / x.m).toFixed(1); x.jogos = +(x.m / n).toFixed(1); delete x.w; delete x.m }
  summ[pol] = { porSerie: per, traj }
}
fs.writeFileSync(OUT, JSON.stringify({ overlay: OVERLAY, summ, all }, null, 1))
for (const [pol, v] of Object.entries(summ)) {
  console.log(`\n[${pol}]`)
  for (const t of v.traj) console.log('  ', t.series, '| caixa', t.caixa.join(','), '| OVER', t.over.join(','))
  for (const [d, x] of Object.entries(v.porSerie)) console.log(`  ${d} temporadas=${x.n} saldo=${x.saldo} vit=${x.vit} jogos=${x.jogos} OVER=${x.over} idade=${x.age} valorElenco=${x.val} folha=${x.wages} receita=${x.income} compras=${x.nBuy}/${x.buy} vendas=${x.nSell}/${x.sell} luvas=${x.nRenew}/${x.renew} saidas=${x.gone} base:venda=${x.youthSale} peneira=${x.youthCost} flip=${x.flip} ampl=${x.upg}`)
}
await vs.close(); process.exit(0)

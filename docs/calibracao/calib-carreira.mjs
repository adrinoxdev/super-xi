// Calibração do balanceamento (poder do time + economia) rodando o FLUXO REAL do jogo (Pinia + stores + composables).
// Uso (a partir de qualquer pasta):  node calib-carreira.mjs [N=20] [politicas] [--overlay DIR]
//   --overlay DIR : serve os arquivos de DIR/src no lugar de src/ (constantes candidatas, sem tocar em src/).
//   Sem --overlay roda contra src/ (depois da implementação deve reproduzir os mesmos alvos).
//   --check       : verifica os alvos; exige n>=30 para os alvos de elenco máximo (maximoRot:120, já forçado pelo script).
// Saída: JSON em CALIB_OUT (padrão ./calib-results.json) + resumo no console.
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
import fs from 'fs'
import path from 'path'
const root = (await import('node:url')).fileURLToPath(new URL('../../', import.meta.url)).split(String.fromCharCode(92)).join('/').replace(/\/+$/, '')
const args = process.argv.slice(2)
const CHECK = args.includes('--check')
if (CHECK) args.splice(args.indexOf('--check'), 1)
const oi = args.indexOf('--overlay')
const OVERLAY = oi >= 0 ? path.resolve(args[oi + 1]).replace(/\\/g, '/') : null
if (oi >= 0) args.splice(oi, 2)
const N = Number(args[0] || 20)
// política[:N] — N próprio por política (ex.: tipicoRot:240,maximoRot:120)
// ATENÇÃO: o --check exige n>=30 (use maximoRot:120) nos alvos de elenco máximo; com n pequeno (10-20) a taxa de
// vitórias oscila e o teto de 82% falha por ruído (ex.: 86,2% com n=10; 76,4% com n=30). O script força n>=40 nessa política.
const POLICIES = (args[1] || 'curva,tipicoRot:240,maximoRot:120,tipico,tipicoD,forte,fraco,caroFraco,investidor').split(',')
const OUT = process.env.CALIB_OUT || path.join(process.cwd(), 'calib-results.json')

const store = new Map()
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }
globalThis.confirm = () => true
globalThis.window = globalThis
globalThis.location = { pathname: '/', search: '', hash: '', href: 'http://x/', origin: 'http://x' }
globalThis.history = { state: {}, pushState() {}, replaceState() {}, length: 1 }
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}
globalThis.document = { querySelector: () => null, addEventListener() {} }

const overlayPlugin = {
  name: 'calib-overlay', enforce: 'pre',
  load(id) {
    if (!OVERLAY) return null
    const clean = id.split('?')[0].replace(/\\/g, '/')
    const rel = clean.toLowerCase().startsWith(root.toLowerCase() + '/src/') ? clean.slice(root.length + 1) : null
    if (!rel) return null
    const f = path.join(OVERLAY, rel)
    return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null
  }
}
const vs = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', plugins: [overlayPlugin] })
const load = p => vs.ssrLoadModule(p)
const { router } = await load('/src/router/index.ts')
router.push = () => new Promise(() => {})
const { useSeason } = await load('/src/composables/useSeason.ts')
const { useMatchSimulation } = await load('/src/composables/useMatchSimulation.ts')
const S = {}
for (const n of ['club', 'squad', 'league', 'competitions', 'match', 'ui', 'scouting'])
  S[n] = (await load(`/src/stores/${n}.ts`))[`use${n[0].toUpperCase() + n.slice(1)}Store`]
const GP = await load('/src/utils/player/generatePlayer.ts')
const { useSquad } = await load('/src/composables/useSquad.ts')
const { pickBestLineup } = await load('/src/utils/match/calculateTeamStrength.ts')
const C = await load('/src/config/index.ts')
const BR = await load('/src/utils/bracket/bracket.ts')
const RK = await load('/src/utils/competitions/rankingCondor.ts')
const { UPGRADE_COSTS, FACILITY_MAX_LEVEL } = C
const NEW = !!C.SERIE_TYPICAL_OVER
const ATL = !!C.CONTRACT && process.env.ATL !== '0'
const TYP = C.SERIE_TYPICAL_OVER // escala nova (D 50, C 57, B 64, A 71): o clube típico, o forte (+15), o fraco (-15) e o máximo (88) saem daqui
const wageOf = GP.wageForOverall ?? (ov => Math.max(850, Math.round((780 + Math.max(0, ov - 55) * 58) / 25) * 25))
const CAP = d => (C.SERIE_ECONOMY ? C.SERIE_ECONOMY[d].levelCap : 10)
const SQUAD_N = { 4: 16, 3: 18, 2: 20, 1: 22 }
// Instalações do clube típico de cada série (estádio/finanças, scouting, alojamento, CT, médico)
const TYP_FAC = {
  4: { scoutingLevel: 1, squadCapacityLevel: 3, trainingCenterLevel: 1, medicalCenterLevel: 1, stadiumLevel: 1, financeLevel: 1 },
  3: { scoutingLevel: 3, squadCapacityLevel: 5, trainingCenterLevel: 2, medicalCenterLevel: 2, stadiumLevel: 3, financeLevel: 3 },
  2: { scoutingLevel: 5, squadCapacityLevel: 7, trainingCenterLevel: 3, medicalCenterLevel: 3, stadiumLevel: 4, financeLevel: 4 },
  1: { scoutingLevel: 7, squadCapacityLevel: 9, trainingCenterLevel: 4, medicalCenterLevel: 4, stadiumLevel: 6, financeLevel: 6 }
}
const ELITE = Number(process.env.ELITE || 88) // elenco máximo: 11 titulares ELITE + 7 reservas ELITE-8
const DN = { 4: 'D', 3: 'C', 2: 'B', 1: 'A' }
const ui0 = S.ui
const userRating = sq => sq.teamStrength.rating ?? sq.teamStrength.total

// ---------- curva por diferença de OVER (motor real: simulateMatchTick) ----------
async function runCurve() {
  setActivePinia(createPinia()); store.clear()
  const club = S.club(), squad = S.squad(), league = S.league(), match = S.match()
  useSeason().initializeFreshCareer()
  const sim = useMatchSimulation()
  const out = { user: {}, ai: {}, mentality: {} }
  const M = Number(process.env.CURVE_N || 3000)
  const deltas = [-30, -20, -15, -10, -5, 0, 5, 10, 15, 20, 30]
  const setAll = x => { for (const p of squad.players) { p.overall = x; p.potential = Math.max(p.potential, x); p.stamina = 100; delete p.injury } }
  function play(delta, ment = 'balanced') {
    match.selectedMentality = ment
    let w = 0, d = 0, gu = 0, go = 0
    for (let i = 0; i < M; i++) {
      // alterna mando: liga da Série D (rodada 1 em casa ou fora conforme o calendário) -> forçamos pelo calendário real
      const home = i % 2 === 0
      const fx = league.nextUserFixture
      if (fx && ((fx.homeId === 'user') !== home)) { const t = fx.homeId; fx.homeId = fx.awayId; fx.awayId = t }
      const opp = league.nextOpponent
      setAll(Math.max(40, Math.min(99, Math.round(opp.power + delta))))
      // ajuste fino: rating exato = opp + delta
      const r = userRating(squad); const k = (opp.power + delta) - r
      if (Math.abs(k) > 0.01) for (const p of squad.players) p.overall = p.overall + k
      // startLiveMatch zera cartões/expulsões (matchCards), congela adversário e mando e reinicia placar/estatísticas.
      // Sem ele (versão antiga do script) as expulsões acumulavam entre as 3000 partidas e a curva ficava plana em ~7%.
      match.activeMatchCompetition = 'league'
      sim.startLiveMatch()
      if (!match.matchState.isRunning) throw new Error('curva: startLiveMatch não iniciou a partida')
      for (let m = 2; m <= 90; m += 2) { match.matchState.minute = m; sim.simulateMatchTick(m) }
      const us = match.matchState.userScore, os = match.matchState.opponentScore
      match.matchState.isRunning = false; match.matchState.isFinished = true
      gu += us; go += os; if (us > os) w++; else if (us === os) d++
    }
    return { w: +(100 * w / M).toFixed(1), d: +(100 * d / M).toFixed(1), l: +(100 * (M - w - d) / M).toFixed(1), gols: `${(gu / M).toFixed(2)}x${(go / M).toFixed(2)}` }
  }
  for (const dl of deltas) out.user[dl] = play(dl)
  for (const ment of ['very_defensive', 'balanced', 'very_offensive']) out.mentality[ment] = { '-15': play(-15, ment), 0: play(0, ment), 15: play(15, ment) }
  const base = TYP[4]
  for (const dl of deltas) {
    let w = 0, d = 0
    for (let i = 0; i < M; i++) { const s = BR.simulateMatchScore(base + dl, base); if (s.home > s.away) w++; else if (s.home === s.away) d++ }
    out.ai[dl] = { w: +(100 * w / M).toFixed(1), d: +(100 * d / M).toFixed(1), l: +(100 * (M - w - d) / M).toFixed(1) }
  }
  match.selectedMentality = 'balanced'
  return out
}

// ---------- carreira ----------
async function runCareer(policy, N) {
  setActivePinia(createPinia()); store.clear()
  const club = S.club(), squad = S.squad(), league = S.league(), comp = S.competitions(), match = S.match()
  const season = useSeason(); const sim = useMatchSimulation()
  season.initializeFreshCareer(); club.name = 'Teste FC'
  const outcomes = []
  const SQ = useSquad()
  const atl = { renew: 0, nRenew: 0, depart: 0, retire: 0 }
  const refill = [] // posições de quem saiu (aposentadoria/contrato): a reposição grátis do fitSquad mantém a posição
  const renewDue = () => squad.players.filter(p => !p.isLoanedIn && p.contractYears === 1)
  if (ATL) {
    const origEnd = squad.applyEndOfSeason
    squad.applyEndOfSeason = (...a) => {
      for (const p of renewDue()) { GP.refreshPlayerEconomy(p); const b = club.budget; SQ.renewPlayerContract(p); if (club.budget < b) { atl.renew += b - club.budget; atl.nRenew++ } }
      const t = origEnd(...a); atl.depart += t.departed.length; atl.retire += t.retired.length; for (const q of [...t.departed, ...t.retired]) refill.push(q.position); return t
    }
  }
  const origEval = league.evaluateStageProgression
  league.evaluateStageProgression = (...a) => {
    const div = club.division, rank = league.userLeagueRank
    const o = origEval(...a)
    if (o && o.kind === 'endSeason') outcomes.push({ div, rank, bonus: o.bonus, next: o.nextDivision })
    return o
  }
  const R = { policy, seasons: [], errors: [], matches: 0, forcedSales: 0, minBudget: Infinity }
  const ROT = policy.endsWith('Rot')
  const offset = policy.startsWith('forte') ? 15 : policy.startsWith('fraco') ? -15 : policy.startsWith('caroFraco') ? 10 : 0
  const FORCE = { tipicoD: 4, tipicoC: 3, tipicoB: 2, tipicoA: 1 }[policy] // típico preso a uma série (mede ampliações/caixa por série)
  const buys = ['tipico', 'tipicoD', 'tipicoC', 'tipicoB', 'tipicoA', 'forte', 'fraco'].includes(policy)
  let X = 60
  const INV = policy === 'investidor'
  let Xabs = TYP[4] + 3 // investidor: OVER absoluto do time (o elenco inicial tem ~53)
  const RES = { 4: 80000, 3: 160000, 2: 300000, 1: 500000 } // reserva de caixa do investidor
  const valueOf = o => (C.VALUE.floor + Math.pow(Math.max(0, o - C.VALUE.ref), C.VALUE.exp) * C.VALUE.mult) * 1.1 * 1.05
  function invest() { // troca 2 titulares por atletas 5,5 OVER melhores (= +1 no OVER do time), ou vende se o caixa ficou negativo
    let n = 0
    for (let k = 0; k < 3; k++) {
      const cost = Math.round(2 * (valueOf(Xabs + 5.5) - 0.85 * valueOf(Xabs)))
      if (Xabs < 90 && club.budget - cost >= RES[club.division]) { club.budget -= cost; Xabs += 1; n++ } else break
    }
    if (club.budget < 0 && Xabs > TYP[4] + 1) { club.budget += Math.max(0, Math.round(2 * (0.85 * valueOf(Xabs) - valueOf(Xabs - 5.5)))); Xabs -= 1; n-- }
    return n
  }
  const setOver = (x, bench) => {
    for (const p of squad.players) { const ov = squad.starterIds.includes(p.id) ? x : Math.max(40, x - bench); p.overall = ov; p.potential = Math.max(p.potential, ov); p.stamina = 100 }
    // ajuste fino: OVER do time exatamente x (titular fora de posição/lesionado não derruba a medição)
    const k = x - userRating(squad)
    if (Math.abs(k) > 0.01) for (const p of squad.players) if (squad.starterIds.includes(p.id)) p.overall += k
  }
  const applyWages = () => { for (const p of squad.players) p.wage = wageOf(p.overall) }
  function fitSquad(n) {
    const hadRefill = refill.length > 0
    while (squad.players.length < n) squad.addPlayer(GP.generatePlayer({ position: refill.shift() ?? ['CM', 'CB', 'ST', 'LW', 'GK', 'RB'][squad.players.length % 6], minOvr: TYP[club.division] - 1, maxOvr: TYP[club.division] + 3 }))
    refill.length = 0
    if (hadRefill) squad.setStarters(pickBestLineup(squad.players, squad.formation))
    while (squad.players.length > n) { const b = squad.players.find(p => !squad.starterIds.includes(p.id)); if (!b) break; squad.removePlayer(b.id) }
  }
  function seasonSetup(first) {
    if (ROT) {
      const d = [4, 3, 2, 1][(club.season - 1) % 4]
      const elite = policy === 'maximoRot'
      if (club.division !== d || first) { club.division = d; league.initLeagueSeason(d, club.season); comp.initCupForSeason(); comp.initContinentalForSeason(elite && d === 1, 'libertadores') }
      club.budget = 1000000 // saldo neutro: mede só a variação da temporada
      Object.assign(club.upgrades, elite ? { ...FACILITY_MAX_LEVEL } : TYP_FAC[d])
    }
    if (FORCE && (club.division !== FORCE || first)) { club.division = FORCE; league.initLeagueSeason(FORCE, club.season); comp.initCupForSeason(); comp.initContinentalForSeason(false); if (first) Object.assign(club.upgrades, TYP_FAC[FORCE]) }
    const d = club.division
    const n = policy === 'caroFraco' ? 22 : policy === 'maximoRot' ? 18 : SQUAD_N[d]
    fitSquad(n)
    X = policy === 'maximoRot' ? ELITE : INV ? Xabs : TYP[d] + offset
    if (policy === 'caroFraco') { club.upgrades.stadiumLevel = 1; club.upgrades.financeLevel = 1 }
    setOver(X, policy === 'maximoRot' ? 8 : 4)
    // OVER exato do time = X (ajuste fino por causa de pesos/posições)
    applyWages()
  }
  function spendInv() { // investidor: instalação de receita só com retorno em até 6 temporadas; as outras só com folga de caixa
    const MATCHES = { 4: 17, 3: 26, 2: 42, 1: 42 }
    const eco = C.SERIE_ECONOMY[club.division], step = C.ECONOMY.facilityStep, rate = C.ECONOMY.maintenanceRate
    let n = 0
    for (let guard = 0; guard < 10; guard++) {
      const opts = []
      for (const k of Object.keys(UPGRADE_COSTS)) {
        if (club.upgrades[k] >= FACILITY_MAX_LEVEL[k]) continue
        const cost = club.getUpgradeCost(k)
        if (k === 'stadiumLevel' || k === 'financeLevel') {
          if (club.upgrades[k] >= eco.levelCap) continue
          const gain = step * (k === 'stadiumLevel' ? eco.ticketBase * 0.73 : eco.sponsorBase) - rate * cost
          if (gain <= 0 || cost / (gain * MATCHES[club.division]) > 6) continue
          if (club.budget - cost >= RES[club.division] * 0.5) opts.push([0, cost, k])
        } else if (club.budget - cost >= RES[club.division]) opts.push([1, cost, k])
      }
      opts.sort((a, b) => a[0] - b[0] || a[1] - b[1])
      if (!opts.length || !club.upgradeFacility(opts[0][2])) break
      n++
    }
    return n
  }
  function spend() {
    if (INV) return spendInv()
    if (!buys) return 0
    let n = 0
    for (let guard = 0; guard < 20; guard++) {
      const keys = Object.keys(UPGRADE_COSTS)
      const pri = ['stadiumLevel', 'financeLevel'].filter(k => club.upgrades[k] < Math.min(CAP(club.division), FACILITY_MAX_LEVEL[k]))
      const rest = keys.filter(k => !['stadiumLevel', 'financeLevel'].includes(k) && club.upgrades[k] < FACILITY_MAX_LEVEL[k])
      const cand = [...pri.sort((a, b) => club.getUpgradeCost(a) - club.getUpgradeCost(b)), ...rest.sort((a, b) => club.getUpgradeCost(a) - club.getUpgradeCost(b))]
      const reserve = ATL ? renewDue().reduce((a, p) => { GP.refreshPlayerEconomy(p); return a + SQ.getRenewalCost(p) }, 0) : 0
      const k = cand.find(k => club.budget - reserve >= club.getUpgradeCost(k))
      if (!k || !club.upgradeFacility(k)) break
      n++
    }
    return n
  }
  const pickComp = () => ['cup', 'continental', 'mundial', 'supercup', 'recopa'].find(c => comp.isCompetitionPlayable(c)) ?? 'league'
  seasonSetup(true)
  const startEd = () => club.season % 4 === 0 // temporada de edição da Copa dos Continentes (MUNDIAL_EVERY = 4)
  const info = () => ({ season: club.season, div: club.division, startBudget: club.budget, minBudget: club.budget, matches: 0, w: 0, d: 0, l: 0, bought: 0, over: X, rating: +userRating(squad).toFixed(1), wageBill: squad.totalWageBill, levels: `${club.upgrades.stadiumLevel}/${club.upgrades.financeLevel}`, income: 0, wages: 0, prizes: 0, sales: 0, interest: 0, maint: 0, ed: startEd(), mEntry: null, mPrize: 0, mGames: 0, mPts: startEd() ? RK.rankingPoints(club.ecoRecords, club.season) : null })
  let cur = info(); cur.bought = spend(); cur.startBudget = club.budget; cur.minBudget = club.budget
  for (let s = 1; s <= N; s++) {
    const startSeason = club.season
    let g = 0
    while (club.season === startSeason) {
      if (++g > 300) { R.errors.push('loop'); return R }
      const c = pickComp()
      if (c === 'league' && !league.nextUserFixture) { R.errors.push('sem partida ' + league.competitionStage); return R }
      if (policy !== 'caroFraco' || squad.players.length > 11) { setOver(X, policy === 'maximoRot' ? 8 : 4); applyWages() }
      if (c === 'mundial') { cur.mEntry = comp.mundialState.userEntry; cur.mGames++ }
      sim.prepareMatch(c); sim.startLiveMatch()
      for (let m = 2; m <= 90; m += 2) { match.matchState.minute = m; sim.simulateMatchTick(m) }
      match.matchState.isRunning = false; match.matchState.isFinished = true
      const b0 = club.budget, nPl = squad.players.length
      sim.concludeMatch()
      if (c === 'mundial') cur.mPrize = comp.mundialState.history.reduce((a, h) => a + h.prize, 0)
      const sm = match.lastMatchSummary
      sim.finishMatchAndReturn()
      R.matches++; cur.matches++
      const us = match.matchState.userScore, os = match.matchState.opponentScore
      if (us > os) cur.w++; else if (us === os) cur.d++; else cur.l++
      if (sm) { cur.income += sm.ticket + sm.sponsor + sm.winBonus; cur.wages += sm.wages; cur.interest += sm.interest || 0; cur.maint += sm.maintenance || 0; if (sm.forcedSale) { R.forcedSales++; cur.sales += sm.forcedSale.price } }
      if (!Number.isFinite(club.budget)) { R.errors.push('NaN'); return R }
      cur.minBudget = Math.min(cur.minBudget, club.budget); R.minBudget = Math.min(R.minBudget, club.budget)
      if (club.season !== startSeason) {
        const o = outcomes[outcomes.length - 1]
        cur.bonus = o?.bonus ?? 0; cur.rank = o?.rank; cur.next = o?.next
        cur.endBudget = club.budget
        cur.renew = atl.renew; cur.nRenew = atl.nRenew; cur.depart = atl.depart; cur.retire = atl.retire; atl.renew = 0; atl.nRenew = 0; atl.depart = 0; atl.retire = 0
        cur.prizes = club.budget - cur.startBudget - (cur.income - cur.wages - cur.interest - cur.maint + cur.sales - cur.renew) // prêmios de copa/continental/série
        R.seasons.push(cur)
        if (s < N) { const inv = INV ? invest() : 0; seasonSetup(false); cur = info(); cur.invest = inv; cur.bought = spend(); cur.startBudget = club.budget; cur.minBudget = club.budget }
      }
    }
  }
  return R
}

const t0 = Date.now()
const results = {}
for (const spec of POLICIES) {
  const [pol, nStr] = spec.split(':')
  const NP = Number(nStr || (CHECK && pol === 'maximoRot' ? Math.max(N, 120) : N))
  const t = Date.now()
  try { results[pol] = pol === 'curva' ? await runCurve() : await runCareer(pol, NP) } catch (e) { results[pol] = { crashed: String(e.stack || e).split('\n').slice(0, 5).join(' / ') } }
  console.log(`[${pol}] ${results[pol].crashed ? 'CRASH ' + results[pol].crashed : 'ok'} ${Date.now() - t}ms`)
}
// ---------- resumo ----------
const mund = {} // Copa dos Continentes por política (informativo)
const summary = { overlay: OVERLAY, novo: NEW, N, ms: Date.now() - t0 }
if (results.curva && !results.curva.crashed) summary.curva = results.curva
for (const [pol, r] of Object.entries(results)) {
  if (!r.seasons) continue
  const per = {}
  for (const s of r.seasons) {
    if (s.ed) { const mm = mund[pol] ??= { ed: 0, edA: 0, cls: 0, clsA: 0, door: { ouro: 0, sede: 0, ranking: 0 }, prize: 0, games: 0 }; mm.ed++; (mm.pts ??= []).push(s.mPts); if (s.div === 1) mm.edA++; if (s.mEntry) { mm.cls++; if (s.div === 1) mm.clsA++; mm.door[s.mEntry]++; mm.prize += s.mPrize; mm.games += s.mGames } }
    const x = per[DN[s.div]] ??= { n: 0, delta: 0, w: 0, d: 0, m: 0, prizes: 0, income: 0, wages: 0, maint: 0, bought: 0, renew: 0, nRenew: 0, depart: 0, retire: 0, minB: Infinity, desf: {} }
    x.renew += s.renew || 0; x.nRenew += s.nRenew || 0; x.depart += s.depart || 0; x.retire += s.retire || 0
    const PT = C.PRIZES[{ 4: 'serieD', 3: 'serieC', 2: 'serieB', 1: 'serieA' }[s.div]]
    const cat = s.bonus === PT.champion ? 'campeao' : s.next < s.div ? 'sobe' : s.next > s.div ? 'rebaixado' : (s.bonus || 0) === 0 ? 'semPremio' : 'meio'
    const dc = x.desf[cat] ??= { n: 0, saldo: 0 }; dc.n++; dc.saldo += s.endBudget - s.startBudget
    x.n++; x.delta += s.endBudget - s.startBudget; x.w += s.w; x.d += s.d; x.m += s.matches; x.prizes += s.prizes; x.income += s.income; x.wages += s.wages; x.maint += s.maint; x.bought += s.bought; x.minB = Math.min(x.minB, s.minBudget)
  }
  for (const x of Object.values(per)) {
    for (const dc of Object.values(x.desf)) { dc.saldo = Math.round(dc.saldo / dc.n) }
    Object.assign(x, { saldoSemPremio: Math.round((x.income - x.wages - x.maint) / x.n), saldoMedio: Math.round(x.delta / x.n), vit: +(100 * x.w / x.m).toFixed(1), emp: +(100 * x.d / x.m).toFixed(1), jogos: +(x.m / x.n).toFixed(1), premios: Math.round(x.prizes / x.n), receitaJogos: Math.round(x.income / x.n), folha: Math.round(x.wages / x.n), manutencao: Math.round(x.maint / x.n), fracPremio: +(x.prizes / (x.prizes + x.income)).toFixed(3), ampliacoes: +(x.bought / x.n).toFixed(2), luvas: Math.round(x.renew / x.n), renov: +(x.nRenew / x.n).toFixed(1), saidas: +(x.depart / x.n).toFixed(2), aposent: +(x.retire / x.n).toFixed(2) })
    for (const k of ['delta', 'w', 'd', 'm', 'prizes', 'income', 'wages', 'maint', 'bought', 'renew', 'nRenew', 'depart', 'retire']) delete x[k]
  }
  summary[pol] = { porSerie: per, series: r.seasons.map(s => DN[s.div]).join(''), caixaFim_mil: r.seasons.map(s => Math.round(s.endBudget / 1000)), over: r.seasons.map(s => Math.round(s.over)).join(','), niveis: r.seasons.map(s => s.levels).join(' '), ampliacoes: r.seasons.reduce((a, s) => a + s.bought, 0), vendasForcadas: r.forcedSales, caixaMinimo: Math.round(r.minBudget), erros: r.errors }
}
for (const [pol, mm] of Object.entries(mund)) { mm.premioPorEdicao = Math.round(mm.prize / mm.ed); mm.premioPorClassificado = mm.cls ? Math.round(mm.prize / mm.cls) : 0; mm.jogosMaisPorEdicao = +(mm.games / mm.ed).toFixed(2); mm.taxaClassifNaA = mm.edA ? +(100 * mm.clsA / mm.edA).toFixed(1) : null; if (summary[pol]) summary[pol].mundial = mm }
// ---------- verificação dos alvos (--check) ----------
const fails = []
const chk = (ok, msg) => { if (!ok) fails.push(msg) }
const inR = (v, lo, hi) => v >= lo && v <= hi
if (CHECK) {
  const cu = summary.curva?.user
  if (cu) {
    chk(inR(cu[0].w, 40, 50), `curva: OVER igual vence ${cu[0].w}% (alvo 40-50)`)
    chk(inR(cu[15].w, 63, 76), `curva: +15 vence ${cu[15].w}% (alvo 65-75; exato 66, ruído de Monte Carlo ±1,5)`)
    chk(inR(cu[-15].w, 19, 31), `curva: -15 vence ${cu[-15].w}% (alvo 20-30; tolerância de Monte Carlo)`)
    chk(cu[30].w <= 88, `curva: +30 vence ${cu[30].w}% (teto 88)`)
  }
  const rot = summary.tipicoRot?.porSerie
  if (rot) {
    // (i) sem prêmio: bilheteria + patrocínio + bônus − folha − manutenção, pequeno e positivo
    const OPS = { D: [3000, 70000], C: [3000, 110000], B: [3000, 200000], A: [3000, 220000] }
    // total com prêmios: não pode acumular (teto ~2 ampliações típicas)
    const TOT = { D: 130000, C: 220000, B: 380000, A: 650000 }
    for (const [d, [lo, hi]] of Object.entries(OPS)) {
      chk(rot[d] && inR(rot[d].saldoSemPremio, lo, hi), `típico ${d}: saldo sem prêmio ${rot[d]?.saldoSemPremio} fora de ${lo}-${hi}`)
      chk(rot[d] && rot[d].saldoMedio > 0 && rot[d].saldoMedio <= TOT[d], `típico ${d}: saldo total ${rot[d]?.saldoMedio} fora de 0-${TOT[d]}`)
      chk(rot[d] && inR(rot[d].vit, 38, 50), `típico ${d}: vitórias ${rot[d]?.vit}% fora de 38-50`)
    }
  }
  const mx = summary.maximoRot?.porSerie
  if (mx) {
    // teto 82% (C, B, A); na D o elenco máximo fica 38 pontos acima do típico e só existe em teste (seção 7.3): teto 90%
    for (const [d, x] of Object.entries(mx)) { const cap = d === 'D' ? 90 : 82; chk(x.vit <= cap, `elenco máximo ${d}: vitórias ${x.vit}% acima do teto ${cap}`) }
    chk(mx.A && mx.A.saldoMedio < 400000, `elenco máximo na A: saldo ${mx.A?.saldoMedio} (não deve imprimir dinheiro; teto 400 mil)`)
  }
  for (const pol of ['tipicoD', 'fraco']) if (summary[pol]) chk(summary[pol].vendasForcadas === 0 && summary[pol].porSerie.D.saldoMedio > 0, `${pol}: Série D travou (vendas forçadas ${summary[pol].vendasForcadas}, saldo ${summary[pol].porSerie.D.saldoMedio})`)
  for (const [pol, v] of Object.entries(summary)) if (v && v.erros) chk(v.erros.length === 0, `${pol}: erros ${v.erros.join(';')}`)
  for (const [pol, r] of Object.entries(results)) chk(!r.crashed, `${pol}: CRASH ${r.crashed}`)
  summary.check = fails.length ? fails : 'OK'
}
fs.writeFileSync(OUT, JSON.stringify({ summary, results }, null, 1))
if (process.env.CALIB_VERBOSE) console.log(JSON.stringify(summary, null, 1))
if (summary.curva) {
  const f = o => Object.entries(o).sort((a, b) => a[0] - b[0]).map(([d, x]) => `${d}:${x.w}/${x.d}/${x.l}`).join('  ')
  console.log('curva usuário (V/E/D %)', f(summary.curva.user)); console.log('curva IA mandante    ', f(summary.curva.ai))
  for (const [m, o] of Object.entries(summary.curva.mentality)) console.log('  mentalidade', m, f(o))
}
for (const [p, v] of Object.entries(summary)) {
  if (!v || !v.porSerie) continue
  if (v.mundial) { const m = v.mundial; console.log(`[${p}] mundial: edições ${m.ed} (na A ${m.edA}) classificado ${m.cls} (na A ${m.clsA}; taxa na A ${m.taxaClassifNaA}%) portas ouro/sede/ranking ${m.door.ouro}/${m.door.sede}/${m.door.ranking} prêmio/edição ${m.premioPorEdicao} prêmio/classificado ${m.premioPorClassificado} jogos a mais/edição ${m.jogosMaisPorEdicao}`) }
  console.log(`\n[${p}] séries ${v.series} ampliações ${v.ampliacoes} vendasForçadas ${v.vendasForcadas} caixaMín ${v.caixaMinimo} erros ${v.erros.length}`)
  console.log('  caixa fim (mil):', v.caixaFim_mil.join(','))
  if (!p.endsWith('Rot')) console.log('  OVER:', v.over, '| estádio/finanças:', v.niveis)
  for (const [d, x] of Object.entries(v.porSerie)) console.log(`  ${d} n=${x.n} saldo=${x.saldoMedio} vit=${x.vit} emp=${x.emp} jogos=${x.jogos} receitaJogos=${x.receitaJogos} folha=${x.folha} manut=${x.manutencao} premios=${x.premios} fracPremio=${x.fracPremio} semPremio=${x.saldoSemPremio} ampl/temp=${x.ampliacoes} luvas=${x.luvas} renov=${x.renov} saidas=${x.saidas} aposent=${x.aposent} desfechos=${Object.entries(x.desf).map(([k, v]) => k + ':' + v.n + '/' + v.saldo).join(' ')}`)
}
await vs.close()
if (CHECK) console.log(fails.length ? 'FALHOU:\n - ' + fails.join('\n - ') : 'CHECK OK: todos os alvos atingidos')
process.exit(CHECK && fails.length ? 1 : 0)

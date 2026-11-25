// T23 - economia do atleta (valor dinâmico, salário, contrato, envelhecimento, vendas sem arbitragem, migração).
// Uso: copiar para a raiz do projeto, `node t23-atletas.mjs`, apagar a cópia.
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
const root = (await import('node:url')).fileURLToPath(new URL('../../', import.meta.url)).split(String.fromCharCode(92)).join('/').replace(/\/+$/, '')
const store = new Map()
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }
globalThis.confirm = () => true
globalThis.window = globalThis; globalThis.location = { pathname: '/', search: '', hash: '', href: 'http://x/', origin: 'http://x' }; globalThis.history = { state: {}, pushState() {}, replaceState() {} }; globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.document = { querySelector: () => null, addEventListener() {} }
const vs = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const fail = async (m) => { console.log('FAIL', m); await vs.close(); process.exit(1) }
const ok = async (c, m) => { if (!c) await fail(m); console.log('OK', m) }
const load = (p) => vs.ssrLoadModule(p)
const { router } = await load('/src/router/index.ts'); router.push = () => new Promise(() => {})
const { usePersistence, STORAGE_KEY } = await load('/src/composables/usePersistence.ts')
const { useSeason } = await load('/src/composables/useSeason.ts')
const { useSquad, sellPriceFor, loanOutFeeFor } = await load('/src/composables/useSquad.ts')
const { useScouting } = await load('/src/composables/useScouting.ts')
const { useEconomy } = await load('/src/composables/useEconomy.ts')
const { useMatchSimulation } = await load('/src/composables/useMatchSimulation.ts')
const GP = await load('/src/utils/player/generatePlayer.ts')
const C = await load('/src/config/index.ts')
const { CONTRACT, AGING, TRANSFER, STAR, VALUE, WAGE } = C
const starX = o => o > STAR.from ? Math.pow(2, (o - STAR.from) / STAR.doubleEvery) : 1
const wageX = o => Math.max(WAGE.min, Math.round(WAGE.base * Math.pow(2, (o - WAGE.refOvr) / WAGE.doubleEvery) * starX(o) / WAGE.step) * WAGE.step)
const S = {}
for (const n of ['club', 'squad', 'league', 'market', 'competitions', 'scouting', 'ui'])
  S[n] = (await load(`/src/stores/${n}.ts`))[`use${n[0].toUpperCase() + n.slice(1)}Store`]
function fresh() {
  setActivePinia(createPinia()); store.clear()
  useSeason().initializeFreshCareer()
  const club = S.club(); club.division = 4; club.season = 1; club.budget = 5000000
  return { club, squad: S.squad(), scouting: S.scouting(), market: S.market(), sq: useSquad(), sc: useScouting(), P: usePersistence() }
}
const mk = (o, a, pot) => ({ overall: o, age: a, potential: pot ?? o })

// (a) constantes e fórmulas
await ok(GP.wageForOverall(WAGE.refOvr) === WAGE.base && GP.wageForOverall(WAGE.refOvr + WAGE.doubleEvery) === 2 * WAGE.base && WAGE.min === 500, 'a1 salário = base no refOvr e dobra a cada doubleEvery; mínimo 500')
await ok(STAR && VALUE && C.VALUE_AGE && CONTRACT && AGING && TRANSFER && C.YOUTH_PROMOTED_VALUE_CAP === undefined, 'a2 constantes novas exportadas e YOUTH_PROMOTED_VALUE_CAP removida')
{
  let prev = 0, mono = true
  for (let o = 50; o <= 99; o++) { const v = GP.valueForPlayer(mk(o, 25, o + 1)); if (v < prev) mono = false; prev = v }
  await ok(mono, 'a3 valor cresce com o OVER (50..99)')
  const ages = [24, 27, 28, 30, 33, 36].map(a => GP.valueForPlayer(mk(75, a)))
  await ok(ages[0] === ages[1] && ages.slice(1).every((v, i, x) => i === 0 || v < x[i - 1]), 'a4 valor estável no pico (24-27) e cai depois: ' + ages.join(','))
  await ok(GP.valueForPlayer(mk(65, 19, 80)) > GP.valueForPlayer(mk(65, 19, 66)), 'a5 potencial valoriza')
  { // prêmio de estrela lido das constantes (com VALUE novo, 90/85 = 1,82x; o 1,9x era da escala antiga)
    const base = o => VALUE.floor + Math.pow(Math.max(0, o - VALUE.ref), VALUE.exp) * VALUE.mult
    const exp = starX(90) * base(90) / base(85), got = GP.valueForPlayer(mk(90, 25)) / GP.valueForPlayer(mk(85, 25))
    await ok(got >= 0.995 * exp && got > Math.pow(base(90) / base(85), 1) * 1.3, `a6 estrela: valor 90 / valor 85 = ${got.toFixed(2)} (esperado ${exp.toFixed(2)} pelas constantes)`)
  }
  await ok(GP.wageForOverall(90) === wageX(90) && GP.wageForOverall(99) === wageX(99) && GP.wageForOverall(85) === wageX(85) && GP.wageForOverall(90) > GP.wageForOverall(85) * Math.pow(2, 5 / WAGE.doubleEvery), `a7 salário 85/90/99 = ${GP.wageForOverall(85)}/${GP.wageForOverall(90)}/${GP.wageForOverall(99)}`)
  await ok(GP.wageForOverall(C.SERIE_TYPICAL_OVER[4]) === wageX(C.SERIE_TYPICAL_OVER[4]) && GP.wageForOverall(C.SERIE_TYPICAL_OVER[1]) === wageX(C.SERIE_TYPICAL_OVER[1]), 'a8 salários abaixo da estrela seguem WAGE (típico D e A)')
  let all = true
  for (let i = 0; i < 300; i++) { const p = GP.generatePlayer({ minOvr: 52, maxOvr: 93, isYouth: i % 3 === 0, isGem: i % 5 === 0 }); if (p.value !== GP.valueForPlayer(p) || p.wage !== GP.wageForOverall(p.overall)) all = false }
  await ok(all, 'a9 generatePlayer usa valueForPlayer e wageForOverall')
}

// (b) evolução recalcula valor e salário
{
  const { club, squad } = fresh()
  for (const p of squad.players) { p.potential = 96; p.stamina = 100 }
  club.upgrades.trainingCenterLevel = 5
  const sim = useMatchSimulation()
  const before = squad.players.map(p => p.overall).join()
  for (let i = 0; i < 30; i++) sim.applyPostMatchProgression()
  await ok(squad.players.map(p => p.overall).join() !== before, 'b1 houve evolução')
  await ok(squad.players.every(p => p.value === GP.valueForPlayer(p) && p.wage === GP.wageForOverall(p.overall)), 'b2 valor e salário seguem o OVER após evoluir')
}

// (c) contrato vence, aposentadoria, envelhecimento
{
  const { squad } = fresh()
  const [a, b, c, d] = squad.players.filter(p => !squad.isStarter(p.id)).concat(squad.players).slice(0, 4)
  a.contractYears = 1; b.contractYears = 2; c.age = GP.retireAgeFor(c.position) - 1; c.contractYears = 3
  d.age = 32; d.overall = 70; d.potential = 75; d.contractYears = 3
  const ids = [a.id, b.id, c.id, d.id]
  useSeason().startNewSeason(4, 0, 't', 'success')
  const has = id => squad.players.some(p => p.id === id)
  await ok(!has(ids[0]), 'c1 contrato vencido sai de graça na virada')
  await ok(has(ids[1]) && squad.players.find(p => p.id === ids[1]).contractYears === 1, 'c2 contrato de 2 vira 1 (último ano)')
  await ok(!has(ids[2]), 'c3 aposenta ao chegar em retireAge')
  const dd = squad.players.find(p => p.id === ids[3])
  await ok(dd && dd.age === 33 && dd.overall === 70 - GP.agingDrop(33) && dd.potential === dd.overall, `c4 envelhecimento: 33 anos perde ${GP.agingDrop(33)} de OVER e o potencial trava`)
  await ok(dd.value === GP.valueForPlayer(dd) && dd.wage === GP.wageForOverall(dd.overall), 'c5 valor e salário recalculados na virada')
  await ok(squad.players.length >= C.MIN_SQUAD_SIZE && squad.starterIds.length === 11, 'c6 elenco e titulares válidos após saídas')
  await ok([1, 30, 31, 32, 33, 34, 35, 36].map(GP.agingDrop).join() === '0,0,1,1,2,2,3,3', 'c7 tabela de queda por idade')
}

// (c2) goleiros: aposentadoria aos 45; linha aos 37
{
  const { squad } = fresh()
  const gks = squad.players.filter(p => p.position === 'GK')
  const line = squad.players.find(p => p.position !== 'GK' && !squad.isStarter(p.id))
  const [g1, g2] = gks
  g1.age = 39; g1.overall = 70; g1.potential = 70; g1.contractYears = 3
  g2.age = 44; g2.overall = 70; g2.potential = 70; g2.contractYears = 3
  line.age = 36; line.contractYears = 3
  const ids = [g1.id, g2.id, line.id]
  useSeason().startNewSeason(4, 0, 't', 'success')
  const f = id => squad.players.find(p => p.id === id)
  await ok(f(ids[0]) && f(ids[0]).age === 40 && f(ids[0]).overall === 67, 'c8 GK de 40 anos fica e perde 3 de OVER')
  await ok(!f(ids[1]), 'c9 GK de 44 vira 45 e se aposenta')
  await ok(!f(ids[2]), 'c10 jogador de linha de 36 vira 37 e se aposenta')
  await ok(squad.players.length >= C.MIN_SQUAD_SIZE && squad.starterIds.length === 11, 'c11 elenco valido apos aposentadorias')
}

// (d) renovação
{
  const { club, squad, sq } = fresh()
  const p = squad.players.find(x => x.age < CONTRACT.veteranAge)
  p.contractYears = 1; GP.refreshPlayerEconomy(p)
  const cost = Math.round(p.value * CONTRACT.renewFeePerYear * CONTRACT.renewYears)
  await ok(sq.getRenewalCost(p) === cost, `d1 luvas = valor x ${CONTRACT.renewFeePerYear} x ${CONTRACT.renewYears}`)
  const b = club.budget; sq.renewPlayerContract(p)
  await ok(p.contractYears === 1 + CONTRACT.renewYears && club.budget === b - cost, 'd2 renovação soma anos e cobra luvas')
  p.contractYears = CONTRACT.maxYears
  const b2 = club.budget; sq.renewPlayerContract(p)
  await ok(p.contractYears === CONTRACT.maxYears && club.budget === b2, 'd3 teto de contrato: não renova nem cobra')
  const v = squad.players.find(x => x.id !== p.id); v.age = CONTRACT.veteranAge; v.contractYears = 1
  sq.renewPlayerContract(v)
  await ok(v.contractYears === 1 + CONTRACT.veteranRenewYears, 'd4 veterano renova por menos tempo')
}

// (e) sem arbitragem: contratar e vender/propor/forçar na mesma temporada nunca dá lucro
{
  const { club, squad, scouting, market, sq, sc } = fresh()
  club.upgrades.squadCapacityLevel = 9
  club.staffContracts.marketAnalyst = Date.now() + 1e9; club.clubNow = Date.now()
  let worst = -Infinity
  for (let i = 0; i < 200; i++) {
    const pl = GP.generatePlayer({ minOvr: 60, maxOvr: 93, isYouth: i % 4 === 0, isGem: i % 3 === 0 })
    const rep = { id: 'r' + i, player: pl, estimatedOvr: pl.overall, estimatedPotential: pl.potential, isGem: false, status: 'new' }
    scouting.reports.unshift(rep)
    club.budget = 50000000
    const b = club.budget
    sc.signScoutedPlayer(rep)
    const p = squad.players.find(x => x.id === pl.id)
    if (!p) await fail('e0 contratação falhou')
    if (p.acquiredSeason !== club.season || p.acquiredFee !== b - club.budget) await fail('e0 acquiredSeason/acquiredFee não gravados na contratação')
    market.incomingOffers = []
    for (let k = 0; k < 30 && !market.incomingOffers.length; k++) { p.marketStatus = 'transfer_listed'; market.generateIncomingTransferOffer() }
    const off = market.incomingOffers.find(o => o.playerId === p.id && o.type === 'buy')
    if (off) { market.counterOffer(off.id); const o2 = market.incomingOffers.find(o => o.id === off.id); if (o2 && o2.amount > p.acquiredFee) await fail('e1 proposta acima do valor pago na temporada da chegada') }
    sq.sellSquadPlayer(p)
    worst = Math.max(worst, club.budget - b)
  }
  await ok(worst <= 0, `e2 200 ciclos contratar+vender: pior saldo ${worst}`)
}
{
  const { club, squad, sq } = fresh()
  const p = squad.players.find(x => !squad.isStarter(x.id))
  p.acquiredSeason = club.season - 1
  await ok(sellPriceFor(p) === Math.round(p.value * TRANSFER.saleShare), 'e3 temporada seguinte: venda = valor x saleShare')
  await ok(loanOutFeeFor(p) === Math.round(p.value * TRANSFER.loanShare), 'e4 empréstimo = valor x loanShare')
}

// (f) base: promoção grátis, mas a venda na temporada da promoção vale 0 (peneira + promoção + venda nunca lucra)
{
  const { club, squad, scouting, sq, sc } = fresh()
  const bench = squad.players.find(p => !squad.isStarter(p.id)); squad.removePlayer(bench.id)
  const kid = scouting.youthAcademyProspects[0]
  const b = club.budget; sc.promoteYouthProspect(kid)
  const p = squad.players.find(x => x.id === kid.id)
  await ok(club.budget === b && p && p.acquiredSeason === club.season && p.acquiredFee === 0, 'f1 promoção grátis grava acquiredSeason e acquiredFee 0')
  await ok(sellPriceFor(p) === 0, 'f2 jovem recém-promovido não vende com lucro na temporada da promoção')
  await ok(p.value === GP.valueForPlayer(p), 'f3 jovem promovido mantém o valor de mercado real (sem teto)')
}

// (g) venda forçada respeita o teto da chegada
{
  const { club, squad } = fresh()
  for (const p of squad.players) { p.acquiredSeason = club.season; p.acquiredFee = 1000 }
  club.budget = -10000000
  const r = useEconomy().settleMatch(0, 1, true)
  await ok(r.forcedSale && r.forcedSale.price <= 1000, 'g1 venda forçada na temporada da chegada limitada ao valor pago')
}

// (h) migração de save antigo: idempotente, 25 chaves
{
  const { club, squad, P } = fresh()
  club.season = 7
  P.saveGame()
  const p = JSON.parse(localStorage.getItem(STORAGE_KEY))
  delete p.club.athleteEconomyVersion
  p.squad.players.forEach((pl, i) => { pl.value = 12345; pl.contractYears = 1; pl.age = i === 0 ? 41 : pl.age; delete pl.acquiredSeason; delete pl.acquiredFee })
  const g = fresh()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  await ok(g.P.loadGame() === true, 'h1 save antigo carrega')
  const sp = g.squad.players
  await ok(sp.every(x => x.isLoanedIn || (x.contractYears >= CONTRACT.migrationMinYears && x.contractYears <= CONTRACT.maxYears)), 'h2 contratos entre 2 e 5')
  await ok(sp.every(x => x.age <= AGING.retireAge - 2), 'h3 idade limitada a retireAge - 2')
  await ok(sp.every(x => x.value === GP.valueForPlayer(x) && x.wage === GP.wageForOverall(x.overall)), 'h4 valor e salário recalculados')
  await ok(sp.every(x => x.acquiredSeason === 7 && x.acquiredFee <= 12345), 'h5 venda travada no valor antigo nesta temporada')
  g.P.saveGame()
  const a = localStorage.getItem(STORAGE_KEY)
  const o = JSON.parse(a)
  const KEYS = ["club","squad","scouting","competitionStage","leagueTeams","leagueFixtures","transferHistory","trophyGallery","seasonGoals","seasonAssists","seasonApps","seasonYellows","seasonReds","careerStats","matchHistory","incomingOffers","youthAcademyProspects","staffContracts","supercupState","recopaState","cupState","continentalState","friendlies","prematchCompetition","mundialState"]
  await ok(JSON.stringify([...Object.keys(o)].sort()) === JSON.stringify([...KEYS].sort()) && o.club.athleteEconomyVersion === 1, 'h6 25 chaves de topo (24 + mundialState) (lista exata) e club.athleteEconomyVersion = 1')
  const h = fresh(); localStorage.setItem(STORAGE_KEY, a); h.P.loadGame(); h.P.saveGame()
  await ok(localStorage.getItem(STORAGE_KEY) === a || JSON.stringify(JSON.parse(localStorage.getItem(STORAGE_KEY)).squad) === JSON.stringify(o.squad), 'h7 recarregar não muda nada (idempotente)')
}

console.log('T23 OK')
await vs.close()
process.exit(0)

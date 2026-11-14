import { computed } from 'vue'
import { useClubStore } from '@/stores/club'
import { useSquadStore } from '@/stores/squad'
import { useUiStore } from '@/stores/ui'
import type { LastMatchSummary } from '@/types/match'
import type { Player } from '@/types/player'
import { ECONOMY, MIN_SQUAD_SIZE, SQUAD_MAX_SIZE, calcOfflineReward } from '@/config'
import { offlineRewardText } from '@/utils/club/offlineRewardText'
import { formatCurrency } from '@/utils/format/formatCurrency'
import { generatePlayer, saleCap } from '@/utils/player/generatePlayer'

export function useEconomy() {
  const club = useClubStore()
  const squad = useSquadStore()
  const ui = useUiStore()

  function ticketIncome(isHome: boolean): number {
    return isHome ? club.projectedStadiumIncome : Math.round(club.projectedStadiumIncome * ECONOMY.awayTicketShare)
  }

  /** Dívida acima do limite da série: a diretoria vende o atleta de maior salário (um por partida). */
  function forcedSale(): { name: string; price: number } | null {
    const sellable = squad.players.filter((p) => !p.isLoanedIn && !p.isLoanedOut)
    const bench = sellable.filter((p) => !squad.isStarter(p.id))
    const byWage = (a: Player, b: Player) => b.wage - a.wage
    let target: Player | undefined = (squad.players.length > MIN_SQUAD_SIZE ? bench : []).sort(byWage)[0]
    if (!target) {
      // Elenco no mínimo: vende o titular mais caro e promove um jovem da base (ou da peneira) para manter 11.
      target = [...sellable].sort(byWage)[0]
      if (!target) return null
      // Não mexe na lista da base (o save regenera lista vazia): sobe um jovem gerado na hora.
      const kid = generatePlayer({ position: target.position, minOvr: 45, maxOvr: 49, isYouth: true })
      kid.acquiredSeason = club.season
      kid.acquiredFee = 0
      // Nunca passa do limite absoluto: com elenco no teto, a vaga do vendido não é reposta.
      if (squad.players.length < SQUAD_MAX_SIZE) {
        squad.addPlayer(kid)
        club.recordTransfer('sign', kid.name, kid.position, kid.overall, 0)
      }
      squad.removePlayer(target.id)
    } else {
      squad.removePlayer(target.id)
    }
    const price = saleCap(target, Math.round(target.value * ECONOMY.forcedSaleShare), club.season)
    club.budget += price
    club.recordTransfer('sell', target.name, target.position, target.overall, price)
    ui.showToast(`Dívida acima do limite: a diretoria vendeu ${target.name} por ${formatCurrency(price)}.`, 'danger')
    return { name: target.name, price }
  }

  /** `pens`: disputa de pênaltis do mata-mata empatado; quem vence nos pênaltis conta como vencedor. */
  function settleMatch(
    uGoals: number,
    oGoals: number,
    isHome: boolean,
    pens?: { user: number; opp: number } | null
  ): LastMatchSummary {
    const won = uGoals > oGoals || (uGoals === oGoals && !!pens && pens.user > pens.opp)
    const lost = uGoals < oGoals || (uGoals === oGoals && !!pens && pens.user < pens.opp)
    const eco = club.serieEconomy
    const ticket = ticketIncome(isHome)
    const sponsor = club.projectedSponsorIncome
    const winBonus =
      won ? Math.round(eco.sponsorBase * ECONOMY.winBonusShare) : lost ? 0 : Math.round(eco.sponsorBase * ECONOMY.drawBonusShare)
    const wages = squad.totalWageBill
    // Saldo negativo é permitido (dívida): paga juros por partida e bloqueia gastos (spend exige saldo).
    const interest = club.budget < 0 ? Math.round(-club.budget * ECONOMY.debtInterestPerMatch) : 0
    const maintenance = club.maintenanceCost
    const net = ticket + sponsor + winBonus - wages - interest - maintenance
    club.budget += net
    club.reputation += won ? 3 : lost ? 0 : 1
    const sale = club.budget < -eco.debtLimit ? forcedSale() : null
    return { ticket, sponsor, winBonus, wages, net, interest, maintenance, forcedSale: sale }
  }

  const projectedTotalIncome = computed(() => club.projectedStadiumIncome + club.projectedSponsorIncome)

  /** Recompensa offline pela ausência desde lastActiveAt; null se abaixo do mínimo. */
  function computeOfflineReward(now = Date.now()) {
    const r = calcOfflineReward(
      now - club.lastActiveAt,
      club.projectedStadiumIncome + club.projectedSponsorIncome,
      club.upgrades.financeLevel
    )
    if (!r || r.amount <= 0) return null
    return { ...r, text: offlineRewardText({ clubName: club.name, hours: r.hours, seed: club.lastActiveAt }) }
  }

  /** Paga a recompensa pendente uma única vez e reinicia a contagem. */
  function claimOfflineReward() {
    const pending = club.offlinePending
    if (!pending) return
    club.offlinePending = null
    club.earn(pending.amount)
    club.lastActiveAt = Date.now()
    ui.showToast(`Renda offline coletada: ${formatCurrency(pending.amount)}.`, 'success')
  }

  return { ticketIncome, settleMatch, projectedTotalIncome, computeOfflineReward, claimOfflineReward }
}

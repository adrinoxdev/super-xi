import { computed } from 'vue'
import { useClubStore } from '@/stores/club'
import { useMarketStore } from '@/stores/market'
import { useSquadStore } from '@/stores/squad'
import { useUiStore } from '@/stores/ui'
import type { FormationName } from '@/types/match'
import type { IncomingOffer, LoanCandidate, Player } from '@/types'
import { pickBestLineup } from '@/utils/calculateTeamStrength'
import { CONTRACT, MIN_SQUAD_SIZE, REST, STAFF_BONUS, TRANSFER } from '@/config'
import { formatCurrency, formatPitchStarterName } from '@/utils/formatCurrency'
import { refreshPlayerEconomy, retireAgeFor, saleCap } from '@/utils/generatePlayer'
import { squadFullTitle, blockedMsg, wageWarning } from './useClub'
import { usePersistence } from './usePersistence'

const LOANED_MSG = 'Atleta emprestado: não pode ser vendido, emprestado nem renovado.'
export const LOAN_OUT_SHARE = TRANSFER.loanShare

/** Preço de venda de um atleta do elenco (mesmo cálculo usado ao vender e exibido no modal). */
export function sellPriceFor(p: Player): number {
  const club = useClubStore()
  const base = Math.round(p.value * TRANSFER.saleShare * (1 + (club.clubStaff.marketAnalyst ? STAFF_BONUS.analystSaleBonus : 0)))
  return saleCap(p, base, club.season)
}

/** Taxa de empréstimo de saída recebida por temporada. */
export function loanOutFeeFor(p: Player): number {
  return Math.round(p.value * LOAN_OUT_SHARE)
}

export function useSquad() {
  const club = useClubStore()
  const squad = useSquadStore()
  const market = useMarketStore()
  const ui = useUiStore()
  const { saveGame } = usePersistence()

  const filteredSquadPlayers = computed(() =>
    squad.players.filter((p) => {
      const f = ui.squadPositionFilter
      if (f === 'ALL') return true
      if (f === 'GK') return p.position === 'GK'
      if (f === 'DEF') return ['CB', 'LB', 'RB'].includes(p.position)
      if (f === 'MID') return ['CDM', 'CM', 'CAM'].includes(p.position)
      return ['LW', 'RW', 'ST'].includes(p.position)
    })
  )

  function formatStarterName(player: Player | null | undefined): string {
    return formatPitchStarterName(player, squad.currentStartersList)
  }

  function selectPitchSlot(idx: number): void {
    ui.selectedPitchSlotIndex = ui.selectedPitchSlotIndex === idx ? null : idx
  }

  function assignPlayerToSlot(playerId: string): void {
    if (ui.selectedPitchSlotIndex === null) return
    squad.swapStarterSlot(ui.selectedPitchSlotIndex, playerId)
    ui.selectedPitchSlotIndex = null
    saveGame()
  }

  function changeFormation(fName: FormationName): void {
    squad.setFormation(fName)
    saveGame()
  }

  function autoPickBestLineup(): void {
    squad.setStarters(pickBestLineup(squad.players, squad.formation))
    ui.selectedPitchSlotIndex = null
    saveGame()
    ui.showToast('Melhor escalação titular definida!', 'success')
  }

  function recoverSquadStamina(): void {
    // Sem cobrança à toa: elenco com energia cheia não precisa de descanso.
    if (squad.players.every((p) => (p.stamina ?? 100) >= 100)) {
      ui.showToast('O elenco já está com energia total.', 'info')
      return
    }
    const cost = club.restCostNow
    if (club.budget < cost) {
      ui.showToast(blockedMsg(cost), 'warning')
      return
    }
    club.budget -= cost
    club.registerRest()
    squad.recoverStamina(REST.energy)
    saveGame()
    ui.showToast(
      `Descanso concluído por ${formatCurrency(cost)}. Próximo hoje:${formatCurrency(club.restCostNow)}.`,
      'success'
    )
  }

  function openPlayerModal(player: Player): void {
    ui.openPlayer(player.id)
  }

  /** Temporadas que o atleta ainda joga antes de se aposentar. */
  function seasonsLeft(p: Player): number {
    return Math.max(0, retireAgeFor(p.position) - p.age)
  }

  /** Anos de renovação, sem somar mais do que o atleta jogará nem o teto de contrato. */
  function renewYearsFor(p: Player): number {
    const base = p.age >= CONTRACT.veteranAge ? CONTRACT.veteranRenewYears : CONTRACT.renewYears
    return Math.max(1, Math.min(base, seasonsLeft(p) - p.contractYears, CONTRACT.maxYears - p.contractYears))
  }

  /** Renovável: não emprestado, dentro do teto de temporadas e sem passar da aposentadoria. */
  function canRenew(p: Player): boolean {
    return !p.isLoanedIn && p.contractYears + renewYearsFor(p) <= Math.min(CONTRACT.maxYears, seasonsLeft(p))
  }

  function getRenewalCost(p: Player): number {
    return Math.round(p.value * CONTRACT.renewFeePerYear * renewYearsFor(p))
  }

  function renewPlayerContract(p: Player): void {
    if (p.isLoanedIn) {
      ui.showToast(LOANED_MSG, 'warning')
      return
    }
    if (!canRenew(p)) {
      ui.showToast(p.contractYears >= CONTRACT.maxYears ? 'Contrato já no máximo de ' + CONTRACT.maxYears + ' temporadas.' : 'Atleta perto da aposentadoria: contrato não renovável.', 'warning')
      return
    }
    const cost = getRenewalCost(p)
    if (club.budget < cost) {
      ui.showToast(blockedMsg(cost), 'warning')
      return
    }
    club.budget -= cost
    const years = renewYearsFor(p)
    p.contractYears += years
    refreshPlayerEconomy(p)
    club.recordTransfer('renew', p.name, p.position, p.overall, cost)
    saveGame()
    ui.showToast(`Contrato de ${p.name} renovado por +${years} ${years === 1 ? 'temporada' : 'temporadas'}!`, 'success')
  }

  function loanOutPlayer(p: Player): void {
    if (p.isLoanedIn) {
      ui.showToast(LOANED_MSG, 'warning')
      return
    }
    if (p.isLoanedOut) return
    if (p.acquiredSeason === club.season) {
      ui.showToast('Chegou nesta temporada: empréstimo liberado na próxima.', 'warning')
      return
    }
    if (squad.isStarter(p.id)) {
      ui.showToast('Retire o atleta dos 11 titulares antes de emprestá-lo.', 'warning')
      return
    }
    const fee = loanOutFeeFor(p)
    p.isLoanedOut = true
    club.budget += fee
    club.recordTransfer('loan_out', p.name, p.position, p.overall, fee)
    ui.closePlayer()
    saveGame()
    ui.showToast(`${p.name} emprestado! Taxa recebida: ${formatCurrency(fee)}.`, 'success')
  }

  function sellSquadPlayer(p: Player): void {
    if (p.isLoanedIn) {
      ui.showToast(LOANED_MSG, 'warning')
      return
    }
    const own = squad.players.filter((x) => !x.isLoanedIn && !x.isLoanedOut).length
    if (own <= MIN_SQUAD_SIZE) {
      ui.showToast(`Você precisa manter pelo menos ${MIN_SQUAD_SIZE} atletas no elenco.`, 'warning')
      return
    }
    const price = sellPriceFor(p)
    if (price <= 0) {
      ui.showToast('Promovido nesta temporada: venda liberada na próxima.', 'warning')
      return
    }
    squad.removePlayer(p.id)
    club.budget += price
    club.recordTransfer('sell', p.name, p.position, p.overall, price)
    ui.closePlayer()
    saveGame()
    ui.showToast(`${p.name} vendido por ${formatCurrency(price)}!`, 'success')
  }

  function openLoanMarketModal(): void {
    market.refreshLoanCandidates()
    ui.openLoanMarket()
  }

  function signLoanPlayer(cand: LoanCandidate): void {
    if (squad.players.length >= club.maxSquadCapacity) {
      ui.showToast(squadFullTitle(squad.players.length, club.maxSquadCapacity), 'warning')
      return
    }
    if (club.budget < cand.loanFee) {
      ui.showToast(blockedMsg(cand.loanFee), 'warning')
      return
    }
    club.budget -= cand.loanFee
    const loaned: Player = { ...cand, isLoanedIn: true, contractYears: 1 }
    squad.addPlayer(loaned)
    club.recordTransfer('loan_in', loaned.name, loaned.position, loaned.overall, cand.loanFee)
    ui.closeLoanMarket()
    saveGame()
    ui.showToast(`${loaned.name} chegou por empréstimo de 1 temporada!`, 'success')
    const warn = wageWarning(loaned.wage)
    if (warn) ui.showToast(warn, 'warning')
  }

  function acceptIncomingOffer(offer: IncomingOffer): void {
    const pl = squad.players.find((p) => p.id === offer.playerId)
    if (!pl) {
      market.removeOffer(offer.id)
      return
    }
    if (pl.isLoanedOut || pl.isLoanedIn) {
      market.removeOffer(offer.id)
      ui.showToast(LOANED_MSG, 'warning')
      saveGame()
      return
    }
    if (offer.type === 'loan') {
      squad.releaseStarter(pl.id)
      pl.isLoanedOut = true
      club.budget += offer.amount
      club.recordTransfer('loan_out', pl.name, pl.position, pl.overall, offer.amount)
      ui.showToast(`${pl.name} emprestado ao ${offer.rivalClub} por ${formatCurrency(offer.amount)}!`, 'success')
    } else {
      const own = squad.players.filter((x) => !x.isLoanedIn && !x.isLoanedOut).length
      if (own <= MIN_SQUAD_SIZE) {
        ui.showToast(`Você precisa manter pelo menos ${MIN_SQUAD_SIZE} atletas no elenco.`, 'warning')
        return
      }
      squad.removePlayer(pl.id)
      club.budget += offer.amount
      club.recordTransfer('sell', pl.name, pl.position, pl.overall, offer.amount)
      ui.showToast(`${pl.name} vendido ao ${offer.rivalClub} por ${formatCurrency(offer.amount)}!`, 'success')
    }
    market.removeOffer(offer.id)
    saveGame()
  }

  function counterIncomingOffer(offer: IncomingOffer): void {
    const accepted = market.counterOffer(offer.id)
    if (accepted) {
      ui.showToast(`${offer.rivalClub} aceitou sua contraproposta de ${formatCurrency(offer.amount)}!`, 'success')
    } else {
      ui.showToast(`${offer.rivalClub} recusou a contraproposta e encerrou negociação.`, 'warning')
    }
    saveGame()
  }

  function rejectIncomingOffer(id: string): void {
    market.removeOffer(id)
    saveGame()
  }

  return {
    filteredSquadPlayers,
    formatStarterName,
    selectPitchSlot,
    assignPlayerToSlot,
    changeFormation,
    autoPickBestLineup,
    recoverSquadStamina,
    openPlayerModal,
    getRenewalCost,
    renewYearsFor,
    canRenew,
    renewPlayerContract,
    loanOutPlayer,
    sellSquadPlayer,
    openLoanMarketModal,
    signLoanPlayer,
    acceptIncomingOffer,
    counterIncomingOffer,
    rejectIncomingOffer,
  }
}

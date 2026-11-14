import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { IncomingOffer, LoanCandidate } from '../types'
import { useSquadStore } from './squad'
import { generatePlayer, isYouthSaleLocked, saleCap } from '@/utils/player/generatePlayer'
import { useClubStore } from './club'
import { pickRandom } from '@/utils/core/random'
import { OFFER_RIVAL_CLUBS, TRANSFER } from '@/config'

export interface MarketSave {
  incomingOffers: IncomingOffer[]
}

export const useMarketStore = defineStore('market', () => {
  const incomingOffers = ref<IncomingOffer[]>([])
  const loanMarketCandidates = ref<LoanCandidate[]>([])

  function generateIncomingTransferOffer() {
    const squadStore = useSquadStore()
    if (incomingOffers.value.length >= 3) return
    const eligible = squadStore.players.filter(
      p => !p.isLoanedOut && !p.isLoanedIn && p.marketStatus !== 'untouchable' && !p.injury && !isYouthSaleLocked(p, useClubStore().season)
    )
    if (!eligible.length) return
    const listed = eligible.filter(p => p.marketStatus === 'transfer_listed')
    const chance = listed.length > 0 ? 0.65 : 0.35
    if (Math.random() > chance) return

    const target = pickRandom(listed.length ? listed : eligible)
    const isLoan = Math.random() < 0.25 && !squadStore.isStarter(target.id)
    const season = useClubStore().season
    const amount = isLoan
      ? Math.round(target.value * TRANSFER.loanShare)
      : saleCap(target, Math.round(target.value * (TRANSFER.offerMin + Math.random() * (TRANSFER.offerMax - TRANSFER.offerMin))), season)

    incomingOffers.value.push({
      id: 'off_' + Date.now(),
      playerId: target.id,
      playerName: target.name,
      position: target.position,
      overall: target.overall,
      rivalClub: pickRandom(OFFER_RIVAL_CLUBS),
      type: isLoan ? 'loan' : 'buy',
      amount,
      countered: false
    })
  }

  function removeOffer(id: string) {
    incomingOffers.value = incomingOffers.value.filter(o => o.id !== id)
  }

  /** true = rival aceitou (+15%); false = recusou e a proposta foi removida. */
  function counterOffer(id: string): boolean {
    const offer = incomingOffers.value.find(o => o.id === id)
    if (!offer) return false
    offer.countered = true
    if (Math.random() < TRANSFER.counterChance) {
      const pl = useSquadStore().players.find(p => p.id === offer.playerId)
      const raised = Math.round(offer.amount * TRANSFER.counterMult)
      offer.amount = pl && offer.type === 'buy' ? saleCap(pl, raised, useClubStore().season) : raised
      return true
    }
    removeOffer(id)
    return false
  }

  function refreshLoanCandidates() {
    loanMarketCandidates.value = [0, 1, 2].map(() => {
      const pl = generatePlayer({ minOvr: 55, maxOvr: 69, isYouth: true, tail: true })
      return { ...pl, loanFee: Math.round(pl.value * TRANSFER.loanShare) }
    })
  }

  function toSave(): MarketSave {
    return { incomingOffers: incomingOffers.value }
  }

  function fromSave(data?: Partial<MarketSave> | null) {
    incomingOffers.value = Array.isArray(data?.incomingOffers) ? data!.incomingOffers! : []
  }

  return {
    incomingOffers, loanMarketCandidates,
    generateIncomingTransferOffer, removeOffer, counterOffer, refreshLoanCandidates,
    toSave, fromSave
  }
})

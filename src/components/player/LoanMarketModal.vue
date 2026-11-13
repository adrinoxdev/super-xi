<script setup lang="ts">
import ListRow from '@/components/ui/ListRow.vue'
import { X } from 'lucide-vue-next'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useUiStore } from '@/stores/ui'
import { useMarketStore } from '@/stores/market'
import { useSquad } from '@/composables/useSquad'
import { formatCurrency, formatPosBR } from '@/utils/formatCurrency'
import { wageWarning, squadFullTitle } from '@/composables/useClub'
import { useSquadStore } from '@/stores/squad'
import { useClubStore } from '@/stores/club'

const ui = useUiStore()
const squad = useSquadStore()
const club = useClubStore()
const market = useMarketStore()
const { signLoanPlayer } = useSquad()
</script>

<template>
  <BaseModal v-if="ui.loanMarketModalOpen" @close="ui.closeLoanMarket()">
    <div class="flex items-center justify-between gap-3 border-b border-borderline pb-3">
      <div class="min-w-0">
        <span class="text-[11px] font-bold uppercase text-emeraldpro">Mercado de Empréstimos</span>
        <h3 class="text-lg font-extrabold text-ink">Jovens Promessas por 1 Temporada</h3>
      </div>
      <button type="button" aria-label="Fechar" class="p-1.5 rounded-lg bg-subtle text-ink-muted shrink-0" @click="ui.closeLoanMarket()">
        <X class="w-4 h-4" />
      </button>
    </div>

    <div class="space-y-2.5">
      <ListRow
        v-for="cand in market.loanMarketCandidates"
        :key="cand.id"
        padding="p-3.5"
        gap="gap-3"
      >
        <div class="min-w-0">
          <div class="font-bold text-sm text-ink break-words [overflow-wrap:anywhere]">{{ cand.name }} ({{ formatPosBR(cand.position) }} • OVER {{ cand.overall }})</div>
          <div class="text-ink-muted break-words">{{ cand.age }} anos • Taxa: <span class="font-score">{{ formatCurrency(cand.loanFee) }}</span> • Salário: <span class="font-score">{{ formatCurrency(cand.wage) }}</span></div>
          <p v-if="wageWarning(cand.wage)" class="mt-1 text-[11px] text-amberpro font-semibold break-words">{{ wageWarning(cand.wage) }}</p>
        </div>
        <button type="button" class="px-3.5 py-2 rounded-xl bg-emeraldpro disabled:bg-borderline disabled:text-ink-muted disabled:cursor-not-allowed text-white font-bold shrink-0"
          :disabled="squad.isFull"
          :title="squad.isFull ? squadFullTitle(squad.players.length, club.maxSquadCapacity) : undefined"
          @click="signLoanPlayer(cand)">
          Emprestar
        </button>
      </ListRow>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <button type="button" class="px-4 py-2 rounded-xl bg-subtle text-ink text-xs font-bold" @click="ui.closeLoanMarket()">
        Fechar
      </button>
    </div>
  </BaseModal>
</template>

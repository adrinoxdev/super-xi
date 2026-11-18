<script setup lang="ts">
import { Coins } from 'lucide-vue-next'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useClubStore } from '@/stores/club'
import { useEconomy } from '@/composables/useEconomy'
import { usePersistence } from '@/composables/usePersistence'
import { formatCurrency } from '@/utils/format/formatCurrency'

const club = useClubStore()
const { claimOfflineReward } = useEconomy()
const { saveGame } = usePersistence()

function claim() {
  claimOfflineReward()
  saveGame()
}
</script>

<template>
  <BaseModal v-if="club.offlinePending" card-class="!max-w-md" @close="() => {}">
    <div class="flex items-start gap-3" role="alertdialog" aria-modal="true" aria-label="Bem-vindo de volta">
      <span class="w-10 h-10 shrink-0 rounded-xl grid place-items-center bg-emeraldpro-soft text-emeraldpro">
        <Coins class="w-5 h-5" />
      </span>
      <div class="min-w-0 space-y-1">
        <p class="text-xs font-semibold text-ink-muted uppercase tracking-wider">Bem-vindo de volta</p>
        <h3 class="text-base sm:text-lg font-extrabold text-ink leading-tight">{{ club.offlinePending.title }}</h3>
        <p class="text-sm text-ink-muted break-words [overflow-wrap:anywhere]">{{ club.offlinePending.message }}</p>
        <p v-if="club.offlinePending.capped" class="text-xs text-ink-muted">Limite de acúmulo offline atingido.</p>
      </div>
    </div>
    <div class="font-score font-extrabold text-3xl text-emeraldpro text-center">+{{ formatCurrency(club.offlinePending.amount) }}</div>
    <button type="button" class="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emeraldpro hover:bg-emeraldpro-hover text-night text-sm font-bold transition-colors" @click="claim">
      Coletar
    </button>
  </BaseModal>
</template>

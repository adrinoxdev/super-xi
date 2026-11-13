<script setup lang="ts">
import { useClubStore } from '@/stores/club'
import { formatCurrency, formatPosBR, formatTransferLabel } from '@/utils/formatCurrency'

const club = useClubStore()
</script>

<template>
  <div class="bg-surface rounded-2xl p-5 border border-borderline shadow-sm space-y-3">
    <h3 class="font-bold text-base text-ink">Histórico de Transferências & Contratos</h3>
    <div v-if="club.transferHistory.length === 0" class="p-6 rounded-xl bg-subtle border border-dashed border-borderline text-center text-xs text-ink-muted">
      Nenhuma movimentação registrada ainda.
    </div>
    <div v-else class="space-y-2 max-h-[240px] overflow-y-auto">
      <div
        v-for="tr in club.transferHistory"
        :key="tr.id"
        class="p-3 rounded-xl bg-subtle border border-borderline flex items-center justify-between gap-2 text-xs"
      >
        <div class="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
          <span class="font-bold text-ink">{{ tr.playerName }}</span>
          <span class="text-ink-muted ml-1.5">({{ formatPosBR(tr.position) }} • OVER {{ tr.overall }}) • Temp. {{ tr.season }}</span>
        </div>
        <span :class="tr.type === 'sell' ? 'text-emeraldpro' : 'text-ink'" class="font-bold shrink-0 text-right">
          {{ formatTransferLabel(tr.type) }} • {{ formatCurrency(tr.amount) }}
        </span>
      </div>
    </div>
  </div>
</template>

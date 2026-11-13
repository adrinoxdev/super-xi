<script setup lang="ts">
import { useClubStore } from '@/stores/club'
import { formatCurrency, formatPosBR, formatTransferLabel } from '@/utils/formatCurrency'
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ListRow from '@/components/ui/ListRow.vue'

const club = useClubStore()
</script>

<template>
  <BaseCard class="space-y-3">
    <SectionTitle>Histórico de Transferências & Contratos</SectionTitle>
    <EmptyState v-if="club.transferHistory.length === 0">
      Nenhuma movimentação registrada ainda.
    </EmptyState>
    <div v-else class="space-y-2 max-h-[240px] overflow-y-auto">
      <ListRow
        v-for="tr in club.transferHistory"
        :key="tr.id"
      >
        <div class="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
          <span class="font-bold text-ink">{{ tr.playerName }}</span>
          <span class="text-ink-muted ml-1.5">({{ formatPosBR(tr.position) }} • OVER {{ tr.overall }}) • Temp. {{ tr.season }}</span>
        </div>
        <span :class="tr.type === 'sell' ? 'text-emeraldpro' : 'text-ink'" class="font-bold shrink-0 text-right">
          {{ formatTransferLabel(tr.type) }} • {{ formatCurrency(tr.amount) }}
        </span>
      </ListRow>
    </div>
  </BaseCard>
</template>

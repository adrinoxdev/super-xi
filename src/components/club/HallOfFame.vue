<script setup lang="ts">
import { useClubStore } from '@/stores/club'
import { useClub } from '@/composables/useClub'
import { formatPosBR } from '@/utils/formatCurrency'
import BaseCard from '@/components/ui/BaseCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ListRow from '@/components/ui/ListRow.vue'

const club = useClubStore()
const { hallOfFameList } = useClub()
</script>

<template>
  <BaseCard class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div class="min-w-0">
        <span class="text-[11px] font-bold uppercase tracking-wider text-amberpro">Ídolos & Recordes Históricos</span>
        <h3 class="text-base sm:text-lg font-bold text-ink">Hall da Fama do Clube (Todas as Temporadas)</h3>
      </div>
      <span class="text-xs font-semibold text-ink-muted break-words">Gols e partidas acumuladas na história do clube</span>
    </div>

    <EmptyState v-if="hallOfFameList.length === 0" class="break-words [overflow-wrap:anywhere]">
      Dispute partidas para construir o ranking histórico de jogos e gols dos ídolos do {{ club.name }}.
    </EmptyState>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <ListRow
        v-for="(leg, idx) in hallOfFameList.slice(0, 6)"
        :key="leg.id"
        padding="p-3.5"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <span
            :class="idx === 0 ? 'bg-amberpro text-white' : 'bg-surface border border-borderline text-ink'"
            class="w-6 h-6 rounded-lg font-bold flex items-center justify-center text-[11px] shrink-0"
          >
            {{ idx + 1 }}
          </span>
          <div class="min-w-0">
            <div class="font-bold text-ink truncate" :title="leg.name">{{ leg.name }}</div>
            <div class="text-[10px] text-ink-muted truncate">{{ formatPosBR(leg.position) }} • {{ leg.apps }} jogos</div>
          </div>
        </div>
        <div class="text-right shrink-0">
          <span class="font-score font-bold text-base text-emeraldpro block leading-none">{{ leg.goals }} gols</span>
          <span class="text-[9px] text-ink-muted uppercase font-bold">Histórico</span>
        </div>
      </ListRow>
    </div>
  </BaseCard>
</template>

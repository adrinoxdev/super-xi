<script setup lang="ts">
import { useClubStore } from '@/stores/club'
import { useClub } from '@/composables/useClub'
import { formatPosBR } from '@/utils/formatCurrency'

const club = useClubStore()
const { hallOfFameList } = useClub()
</script>

<template>
  <div class="bg-surface rounded-2xl p-5 border border-borderline shadow-sm space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div class="min-w-0">
        <span class="text-[11px] font-bold uppercase tracking-wider text-amberpro">Ídolos & Recordes Históricos</span>
        <h3 class="text-base sm:text-lg font-bold text-ink">Hall da Fama do Clube (Todas as Temporadas)</h3>
      </div>
      <span class="text-xs font-semibold text-ink-muted break-words">Gols e partidas acumuladas na história do clube</span>
    </div>

    <div v-if="hallOfFameList.length === 0" class="p-6 rounded-xl bg-subtle border border-dashed border-borderline text-center text-xs text-ink-muted break-words [overflow-wrap:anywhere]">
      Dispute partidas para construir o ranking histórico de jogos e gols dos ídolos do {{ club.name }}.
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="(leg, idx) in hallOfFameList.slice(0, 6)"
        :key="leg.id"
        class="p-3.5 rounded-xl bg-subtle border border-borderline flex items-center justify-between gap-2 text-xs"
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
      </div>
    </div>
  </div>
</template>

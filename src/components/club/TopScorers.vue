<script setup lang="ts">
import { Goal } from 'lucide-vue-next'
import { useClubStore } from '@/stores/club'
import { useClub } from '@/composables/useClub'
import { formatPosBR } from '@/utils/formatCurrency'

const club = useClubStore()
const { topScorersList } = useClub()
</script>

<template>
  <div class="bg-surface rounded-2xl p-5 border border-borderline shadow-sm space-y-3">
    <h3 class="font-bold text-base text-ink flex items-center gap-2">
      <Goal class="w-4 h-4 text-emeraldpro shrink-0" />
      Artilharia da Temporada {{ club.season }}
    </h3>

    <div v-if="topScorersList.length === 0" class="p-6 rounded-xl bg-subtle border border-dashed border-borderline text-center text-xs text-ink-muted">
      Nenhum gol marcado nesta temporada ainda.
    </div>
    <div v-else class="space-y-2 max-h-[260px] overflow-y-auto">
      <div
        v-for="(sc, idx) in topScorersList"
        :key="sc.id"
        class="p-3 rounded-xl bg-subtle border border-borderline flex items-center justify-between gap-2 text-xs"
      >
        <div class="flex items-center gap-2 min-w-0">
          <span class="font-bold text-ink-muted w-5 shrink-0">{{ idx + 1 }}º</span>
          <span class="font-bold text-ink truncate" :title="sc.name">{{ sc.name }}</span>
          <span class="text-[10px] font-bold text-ink-muted shrink-0">({{ formatPosBR(sc.position) }})</span>
        </div>
        <span class="font-score font-bold text-base text-emeraldpro shrink-0">{{ sc.goals }} {{ sc.goals === 1 ? 'gol' : 'gols' }}</span>
      </div>
    </div>
  </div>
</template>

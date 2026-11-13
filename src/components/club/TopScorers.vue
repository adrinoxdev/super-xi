<script setup lang="ts">
import { Goal } from 'lucide-vue-next'
import { useClubStore } from '@/stores/club'
import { useClub } from '@/composables/useClub'
import { formatPosBR } from '@/utils/format/formatCurrency'
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ListRow from '@/components/ui/ListRow.vue'

const club = useClubStore()
const { topScorersList } = useClub()
</script>

<template>
  <BaseCard class="space-y-3">
    <SectionTitle>
      <template #icon><Goal class="w-4 h-4 text-emeraldpro shrink-0" /></template>
      Artilharia da Temporada {{ club.season }}
    </SectionTitle>

    <EmptyState v-if="topScorersList.length === 0">
      Nenhum gol marcado nesta temporada ainda.
    </EmptyState>
    <div v-else class="space-y-2 max-h-[260px] overflow-y-auto">
      <ListRow
        v-for="(sc, idx) in topScorersList"
        :key="sc.id"
      >
        <div class="flex items-center gap-2 min-w-0">
          <span class="font-bold text-ink-muted w-5 shrink-0">{{ idx + 1 }}º</span>
          <span class="font-bold text-ink truncate" :title="sc.name">{{ sc.name }}</span>
          <span class="text-[10px] font-bold text-ink-muted shrink-0">({{ formatPosBR(sc.position) }})</span>
        </div>
        <span class="font-score font-bold text-base text-emeraldpro shrink-0">{{ sc.goals }} {{ sc.goals === 1 ? 'gol' : 'gols' }}</span>
      </ListRow>
    </div>
  </BaseCard>
</template>

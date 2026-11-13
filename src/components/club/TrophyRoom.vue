<script setup lang="ts">
import { Award } from 'lucide-vue-next'
import { useClubStore } from '@/stores/club'
import { formatCurrency } from '@/utils/format/formatCurrency'
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ListRow from '@/components/ui/ListRow.vue'
import Badge from '@/components/ui/Badge.vue'

const club = useClubStore()
</script>

<template>
  <BaseCard class="space-y-3">
    <SectionTitle class="min-w-0">
      <template #icon><Award class="w-4 h-4 text-amberpro shrink-0" /></template>
      <span class="min-w-0 break-words">Sala de Troféus & Acessos ({{ club.trophyGallery.length }})</span>
    </SectionTitle>

    <EmptyState v-if="club.trophyGallery.length === 0">
      Nenhum troféu conquistado ainda. Conquiste acessos e títulos para preencher a galeria!
    </EmptyState>
    <div v-else class="space-y-2 max-h-[260px] overflow-y-auto">
      <ListRow
        v-for="tr in club.trophyGallery"
        :key="tr.id"
      >
        <div class="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
          <Badge tone="warning" shape="rounded" uppercase class="mr-1.5 whitespace-nowrap">
            Temp. {{ tr.season }}
          </Badge>
          <strong class="text-ink">{{ tr.title }}</strong>
        </div>
        <span class="font-bold text-emeraldpro shrink-0">+{{ formatCurrency(tr.prize) }}</span>
      </ListRow>
    </div>
  </BaseCard>
</template>

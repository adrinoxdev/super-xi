<script setup lang="ts">
import { Award } from 'lucide-vue-next'
import { useClubStore } from '@/stores/club'
import { formatCurrency } from '@/utils/formatCurrency'

const club = useClubStore()
</script>

<template>
  <div class="bg-surface rounded-2xl p-5 border border-borderline shadow-sm space-y-3">
    <h3 class="font-bold text-base text-ink flex items-center gap-2 min-w-0">
      <Award class="w-4 h-4 text-amberpro shrink-0" />
      <span class="min-w-0 break-words">Sala de Troféus & Acessos ({{ club.trophyGallery.length }})</span>
    </h3>

    <div v-if="club.trophyGallery.length === 0" class="p-6 rounded-xl bg-subtle border border-dashed border-borderline text-center text-xs text-ink-muted">
      Nenhum troféu conquistado ainda. Conquiste acessos e títulos para preencher a galeria!
    </div>
    <div v-else class="space-y-2 max-h-[260px] overflow-y-auto">
      <div
        v-for="tr in club.trophyGallery"
        :key="tr.id"
        class="p-3 rounded-xl bg-subtle border border-borderline flex items-center justify-between gap-2 text-xs"
      >
        <div class="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
          <span class="px-2 py-0.5 rounded bg-amberpro-soft text-amberpro font-bold text-[10px] uppercase mr-1.5 whitespace-nowrap">
            Temp. {{ tr.season }}
          </span>
          <strong class="text-ink">{{ tr.title }}</strong>
        </div>
        <span class="font-bold text-emeraldpro shrink-0">+{{ formatCurrency(tr.prize) }}</span>
      </div>
    </div>
  </div>
</template>

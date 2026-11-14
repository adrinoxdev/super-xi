<script setup lang="ts">
import { computed } from 'vue'
import { Square } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import { useSquadStore } from '@/stores/squad'
import { useClubStore } from '@/stores/club'
import { formatPosBR } from '@/utils/format/formatCurrency'
import { suspensionsOf, suspensionText } from '@/utils/player/suspension'

const squad = useSquadStore()
const club = useClubStore()

const rows = computed(() =>
  squad.players
    .map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      yellows: club.seasonYellows[p.id] || 0,
      reds: club.seasonReds[p.id] || 0,
      suspended: suspensionsOf(p).length > 0,
      suspText: suspensionText(p),
    }))
    .filter((r) => r.yellows + r.reds > 0)
    .sort((a, b) => b.reds - a.reds || b.yellows - a.yellows)
    .slice(0, 8),
)
</script>

<template>
  <BaseCard class="space-y-3">
    <SectionTitle>
      <template #icon><Square class="w-4 h-4 text-amberpro shrink-0 fill-current" aria-hidden="true" /></template>
      Cartões da temporada
    </SectionTitle>

    <p v-if="rows.length === 0" class="text-sm text-ink-muted">Nenhum cartão recebido nesta temporada.</p>
    <template v-else>
      <div class="flex items-center gap-2 px-3 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
        <span class="w-5 shrink-0"></span>
        <span class="flex-1 min-w-0">Atleta</span>
        <span class="w-9 flex justify-center shrink-0" title="Amarelos">
          <span class="w-2.5 h-3.5 rounded-[2px] bg-amberpro" aria-hidden="true"></span><span class="sr-only">Amarelos</span>
        </span>
        <span class="w-9 flex justify-center shrink-0" title="Vermelhos">
          <span class="w-2.5 h-3.5 rounded-[2px] bg-dangerpro" aria-hidden="true"></span><span class="sr-only">Vermelhos</span>
        </span>
        <span class="w-10 text-center shrink-0">Total</span>
      </div>
      <div
        v-for="(r, idx) in rows"
        :key="r.id"
        class="flex items-center gap-2 rounded-xl px-3 py-2"
        :class="idx === 0 ? 'bg-dangerpro/10 border border-dangerpro/30' : 'bg-subtle'"
      >
        <span class="font-bold text-ink-muted w-5 shrink-0">{{ idx + 1 }}º</span>
        <div class="flex items-center gap-1 flex-1 min-w-0">
          <span class="font-bold text-ink truncate" :title="r.name">{{ r.name }}</span>
          <span class="text-[11px] md:text-[10px] font-bold text-ink-muted shrink-0">({{ formatPosBR(r.position) }})</span>
          <span
            v-if="r.suspended"
            class="text-[11px] md:text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-dangerpro/15 text-dangerpro shrink-0"
            :title="r.suspText"
            :aria-label="`Suspenso: ${r.suspText}`"
          >Suspenso</span>
        </div>
        <span class="w-9 text-center font-score text-sm text-amberpro shrink-0"><span class="sr-only">Amarelos: </span>{{ r.yellows }}</span>
        <span class="w-9 text-center font-score text-sm text-dangerpro shrink-0"><span class="sr-only">Vermelhos: </span>{{ r.reds }}</span>
        <span class="w-10 text-center font-score font-bold text-sm text-ink shrink-0"><span class="sr-only">Total de cartões: </span>{{ r.yellows + r.reds }}</span>
      </div>
    </template>
  </BaseCard>
</template>

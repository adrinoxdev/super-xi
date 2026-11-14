<script setup lang="ts">
import { computed, ref } from 'vue'
import { Goal } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import { useSquadStore } from '@/stores/squad'
import { useClubStore } from '@/stores/club'
import { formatPosBR } from '@/utils/format/formatCurrency'

const squad = useSquadStore()
const club = useClubStore()

type SortKey = 'goals' | 'assists'
const sortKey = ref<SortKey>('goals')
const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'goals', label: 'Gols' },
  { key: 'assists', label: 'Assistências' },
]

const rows = computed(() =>
  squad.players
    .map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      apps: club.seasonApps[p.id] || 0,
      goals: club.seasonGoals[p.id] || 0,
      assists: club.seasonAssists[p.id] || 0,
    }))
    .filter((r) => r.goals + r.assists > 0)
    .sort((a, b) => {
      const k = sortKey.value
      return b[k] - a[k] || b.goals + b.assists - (a.goals + a.assists) || b.apps - a.apps
    })
    .slice(0, 8),
)

const rowClass = (idx: number) => (idx === 0 ? 'bg-emeraldpro/10 border border-emeraldpro/30' : 'bg-subtle')
const colClass = (k: SortKey) => (sortKey.value === k ? 'text-emeraldpro' : 'text-ink')
</script>

<template>
  <BaseCard class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <SectionTitle>
        <template #icon><Goal class="w-4 h-4 text-emeraldpro shrink-0" /></template>
        Artilharia da temporada
      </SectionTitle>
      <div class="flex gap-1" role="group" aria-label="Ordenar por">
        <button
          v-for="o in sortOptions"
          :key="o.key"
          type="button"
          :aria-pressed="sortKey === o.key"
          @click="sortKey = o.key"
          :class="[
            'px-3 py-2 sm:px-2 sm:py-1 rounded-lg text-[11px] font-bold transition-colors',
            sortKey === o.key ? 'bg-emeraldpro text-white' : 'bg-subtle text-ink-muted hover:text-ink'
          ]"
        >
          {{ o.label }}
        </button>
      </div>
    </div>

    <p v-if="rows.length === 0" class="text-sm text-ink-muted">Ninguém pontuou ainda nesta temporada.</p>
    <template v-else>
      <div class="flex items-center gap-2 px-3 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
        <span class="w-5 shrink-0"></span>
        <span class="flex-1 min-w-0">Atleta</span>
        <span class="w-9 text-center shrink-0" title="Jogos">J</span>
        <span class="w-9 text-center shrink-0" title="Gols">G</span>
        <span class="w-9 text-center shrink-0" title="Assistências">A</span>
        <span class="w-10 text-center shrink-0" title="Gols + Assistências">G+A</span>
      </div>
      <div
        v-for="(r, idx) in rows"
        :key="r.id"
        class="flex items-center gap-2 rounded-xl px-3 py-2"
        :class="rowClass(idx)"
      >
        <span class="font-bold text-ink-muted w-5 shrink-0">{{ idx + 1 }}º</span>
        <div class="flex items-center gap-1 flex-1 min-w-0">
          <span class="font-bold text-ink truncate" :title="r.name">{{ r.name }}</span>
          <span class="text-[11px] md:text-[10px] font-bold text-ink-muted shrink-0">({{ formatPosBR(r.position) }})</span>
        </div>
        <span class="w-9 text-center font-score text-sm shrink-0" :class="'text-ink'"><span class="sr-only">Jogos: </span>{{ r.apps }}</span>
        <span class="w-9 text-center font-score text-sm shrink-0" :class="colClass('goals')"><span class="sr-only">Gols: </span>{{ r.goals }}</span>
        <span class="w-9 text-center font-score text-sm shrink-0" :class="colClass('assists')"><span class="sr-only">Assistências: </span>{{ r.assists }}</span>
        <span class="w-10 text-center font-score font-bold text-sm text-ink shrink-0"><span class="sr-only">Gols mais assistências: </span>{{ r.goals + r.assists }}</span>
      </div>
    </template>
  </BaseCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Flag, Check } from 'lucide-vue-next'
import { useClubStore } from '@/stores/club'
import { useSquadStore } from '@/stores/squad'
import { milestoneCatalog } from '@/utils/club/progression'
import { fmtOver } from '@/utils/format/formatOver'
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import Badge from '@/components/ui/Badge.vue'

const club = useClubStore()
const squad = useSquadStore()

const rows = computed(() => {
  const got = new Map(club.progress.milestones.map((m) => [m.id, m]))
  return milestoneCatalog().map((c) => ({ ...c, done: got.get(c.id) ?? null }))
})
const doneCount = computed(() => rows.value.filter((r) => r.done).length)
const next = computed(() => {
  const r = rows.value.find((x) => !x.done && x.kind === 'team' && x.target !== undefined)
  if (!r || r.target === undefined) return null
  return { title: r.title, left: Math.max(0, r.target - squad.teamStrength.rating) }
})
</script>

<template>
  <BaseCard class="space-y-3 min-w-0">
    <SectionTitle class="min-w-0">
      <template #icon><Flag class="w-4 h-4 text-emeraldpro shrink-0" /></template>
      <span class="min-w-0 break-words">Marcos ({{ doneCount }}/{{ rows.length }})</span>
    </SectionTitle>
    <p v-if="next" class="text-xs text-ink-muted break-words">
      Próximo: {{ next.title }}, faltam <strong class="text-ink">{{ fmtOver(next.left) }}</strong> de OVER.
    </p>
    <ul class="grid grid-cols-1 md:grid-cols-2 gap-1.5">
      <li
        v-for="r in rows"
        :key="r.id"
        class="p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 min-w-0"
        :class="r.done ? 'bg-subtle border-borderline' : 'border-dashed border-borderline'"
      >
        <span class="min-w-0 flex items-center gap-1.5" :class="r.done ? 'text-ink font-semibold' : 'text-ink-muted'">
          <Check v-if="r.done" class="w-3.5 h-3.5 text-emeraldpro shrink-0" />
          <span class="min-w-0 break-words">{{ r.title }}</span>
        </span>
        <Badge v-if="r.done" tone="success-strong" shape="rounded" uppercase class="shrink-0 whitespace-nowrap">
          Temp. {{ r.done.season }}
        </Badge>
        <span v-else class="shrink-0 text-[10px] text-ink-muted">Pendente</span>
      </li>
    </ul>
  </BaseCard>
</template>

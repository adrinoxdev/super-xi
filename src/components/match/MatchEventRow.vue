<script setup lang="ts">
import { computed } from 'vue'
import { Bandage, Footprints, Hand, Mic, Repeat, Swords, Target } from 'lucide-vue-next'
import type { LiveMatchEvent } from '@/types/match'
import { formatMinute } from '@/utils/match/formatMinute'
import EventIcon, { type EventIconKind } from '@/components/match/EventIcon.vue'

const props = defineProps<{ ev: LiveMatchEvent }>()

// Ícone pixel art por tipo de lance; os demais usam ícones simples ou nenhum.
const PIXEL: Partial<Record<LiveMatchEvent['type'], EventIconKind>> = {
  goal: 'ball',
  opp_goal: 'ball',
  corner: 'flag',
  whistle: 'whistle',
  yellow: 'yellow',
  red: 'red',
  offside: 'offside',
  post: 'post'
}

const pixel = computed(() => PIXEL[props.ev.type])

const rowClass = computed(() => {
  switch (props.ev.type) {
    case 'goal': return 'bg-emeraldpro-soft/60 border-emeraldpro font-bold'
    case 'opp_goal': return 'bg-dangerpro-soft/60 border-dangerpro font-bold'
    case 'red': return 'bg-dangerpro-soft/60 border-dangerpro font-bold'
    case 'brawl': return 'bg-dangerpro-soft/60 border-dangerpro font-semibold'
    case 'post': return 'bg-amberpro-soft/60 border-amberpro font-semibold'
    case 'sub':
    case 'penalty':
    case 'yellow': return 'bg-amberpro-soft/60 border-amberpro font-semibold'
    case 'injury': return 'bg-dangerpro-soft/60 border-dangerpro font-semibold'
    case 'whistle': return 'bg-subtle border-borderline font-semibold'
    case 'comment': return 'bg-transparent border-dashed border-borderline text-ink-muted italic'
    default: return 'bg-subtle border-borderline'
  }
})
</script>

<template>
  <div :class="['p-3 rounded-xl border text-xs flex items-start gap-2.5', rowClass]">
    <span class="font-score font-bold text-sm text-ink shrink-0 w-8">{{ formatMinute(ev.minute) }}</span>
    <span class="w-[22px] shrink-0 flex justify-center">
      <EventIcon v-if="pixel" :kind="pixel" :size="22" class="-my-0.5" />
      <Bandage v-else-if="ev.type === 'injury'" class="w-4 h-4 text-dangerpro mt-0.5" aria-label="Lesão" />
      <Repeat v-else-if="ev.type === 'sub'" class="w-4 h-4 text-amberpro mt-0.5" aria-label="Substituição" />
      <Target v-else-if="ev.type === 'penalty'" class="w-4 h-4 text-amberpro mt-0.5" aria-label="Pênalti" />
      <Swords v-else-if="ev.type === 'brawl'" class="w-4 h-4 text-dangerpro mt-0.5" aria-label="Briga" />
      <Hand v-else-if="ev.type === 'throwin'" class="w-4 h-4 text-ink-muted mt-0.5" aria-label="Lateral" />
      <Footprints v-else-if="ev.type === 'freekick'" class="w-4 h-4 text-amberpro mt-0.5" aria-label="Falta perigosa" />
      <Mic v-else-if="ev.type === 'comment'" class="w-3.5 h-3.5 text-ink-muted mt-0.5" aria-label="Comentarista" />
    </span>
    <span class="text-ink leading-relaxed min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{{ ev.description }}</span>
  </div>
</template>

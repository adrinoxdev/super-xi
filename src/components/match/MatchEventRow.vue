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

// Dinâmica de ticker: fundo neutro, faixa colorida à esquerda e tinta leve só nos lances que importam.
const rowClass = computed(() => {
  switch (props.ev.type) {
    case 'goal': return 'bg-emeraldpro-soft border-l-emeraldpro font-bold'
    case 'opp_goal': return 'bg-dangerpro-soft border-l-dangerpro font-bold'
    case 'red': return 'bg-dangerpro-soft border-l-dangerpro font-bold'
    case 'brawl':
    case 'injury': return 'bg-subtle/40 border-l-dangerpro font-semibold'
    case 'penalty':
    case 'freekick': return 'bg-subtle/40 border-l-amberpro font-semibold'
    case 'sub':
    case 'yellow': return 'bg-subtle/40 border-l-amberpro font-semibold'
    case 'whistle': return 'bg-subtle/40 border-l-ink-muted font-semibold'
    case 'comment': return 'bg-transparent border-dashed !border-l-2 border-borderline text-ink-muted italic'
    default: return 'bg-subtle/40 border-l-borderline'
  }
})
</script>

<template>
  <div :class="['p-3 rounded-xl border border-borderline border-l-4 text-xs flex items-start gap-2.5', rowClass]">
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

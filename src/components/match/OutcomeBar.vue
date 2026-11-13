<script setup lang="ts">
import { computed } from 'vue'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import { contrastRatio } from '@/utils/identity/crest'

// Barra de chances (Vitoria/Empate/Derrota). Percentuais ja calculados pelo pai.
const props = defineProps<{
  win: number
  draw: number
  loss: number
  userColor: string
  oppColor: string
  userName: string
  oppName: string
}>()

const INK = '#0F172A'
const NARROW = 12

// Branco ou tinta, o que tiver mais contraste sobre a cor do segmento.
const textOn = (bg: string) => (contrastRatio(bg, '#FFFFFF') >= contrastRatio(bg, INK) ? '#FFFFFF' : INK)

const segments = computed(() => [
  { key: 'win', pct: props.win, bg: props.userColor, fg: textOn(props.userColor), cls: '' },
  { key: 'draw', pct: props.draw, bg: '', fg: '', cls: 'bg-surface border border-borderline text-ink-muted' },
  { key: 'loss', pct: props.loss, bg: props.oppColor, fg: textOn(props.oppColor), cls: '' }
])
const hasNarrow = computed(() => segments.value.some(s => s.pct > 0 && s.pct < NARROW))
const label = computed(
  () => `Chance estimada: vitória ${props.win}%, empate ${props.draw}%, derrota ${props.loss}%`
)
</script>

<template>
  <div class="min-w-0 space-y-2">
    <div class="flex items-center justify-between gap-3 min-w-0">
      <span class="flex items-center gap-2 min-w-0">
        <TeamCrest size="sm" is-user class="shrink-0" />
        <span class="truncate text-xs font-bold text-ink">{{ userName }}</span>
      </span>
      <span class="flex items-center gap-2 min-w-0 justify-end">
        <span class="truncate text-xs font-bold text-ink text-right">{{ oppName }}</span>
        <TeamCrest size="sm" :name="oppName" class="shrink-0" />
      </span>
    </div>

    <div
      role="img"
      :aria-label="label"
      class="flex w-full gap-0.5 min-w-0"
      :class="hasNarrow ? 'pt-6' : ''"
    >
      <template v-for="s in segments" :key="s.key">
        <div
          v-if="s.pct > 0"
          class="relative h-9 sm:h-10 min-w-0 rounded-lg flex items-center justify-center transition-all duration-300"
          :class="s.cls"
          :style="{ flexGrow: s.pct, flexBasis: 0, ...(s.bg ? { backgroundColor: s.bg } : {}) }"
        >
          <span
            v-if="s.pct >= NARROW"
            class="font-score text-sm font-bold leading-none"
            :class="s.fg ? '' : 'text-ink-muted'"
            :style="s.fg ? { color: s.fg } : {}"
            aria-hidden="true"
          >{{ s.pct }}%</span>
          <span v-else class="absolute bottom-full left-1/2 -translate-x-1/2 flex flex-col items-center" aria-hidden="true">
            <span class="font-score text-sm font-bold leading-none text-ink">{{ s.pct }}%</span>
            <span class="w-px h-1.5 mt-0.5" :style="{ backgroundColor: s.bg || '#64748B' }"></span>
          </span>
        </div>
      </template>
    </div>

    <div class="flex items-center justify-between gap-2 text-[11px] font-bold text-ink-muted" aria-hidden="true">
      <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-sm shrink-0" :style="{ backgroundColor: userColor }"></span>Vitória</span>
      <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-sm shrink-0 bg-surface border border-borderline"></span>Empate</span>
      <span class="flex items-center gap-1.5">Derrota<span class="w-2 h-2 rounded-sm shrink-0" :style="{ backgroundColor: oppColor }"></span></span>
    </div>
  </div>
</template>

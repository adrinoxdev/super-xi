<script setup lang="ts">
import { computed } from 'vue'
import { TrendingUp } from 'lucide-vue-next'
import { useClubStore } from '@/stores/club'
import { fmtDelta, fmtOver } from '@/utils/formatOver'

const club = useClubStore()
const review = computed(() => {
  const r = club.progress.lastSeason
  return r && !r.seen ? r : null
})
const delta = computed(() => (review.value ? review.value.overEnd - review.value.overStart : 0))
const marcos = computed(() => (review.value ? club.progress.milestones.filter((m) => m.season === review.value!.season) : []))
function hide() {
  if (club.progress.lastSeason) club.progress.lastSeason.seen = true
}
</script>

<template>
  <div v-if="review" class="bg-surface rounded-2xl p-4 sm:p-5 border-2 border-emeraldpro shadow-sm space-y-3 min-w-0">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <span class="text-xs font-bold uppercase text-emeraldpro">Evolução da temporada</span>
        <h3 class="text-base sm:text-lg font-extrabold text-ink flex items-start gap-2 min-w-0">
          <TrendingUp class="w-5 h-5 mt-0.5 text-emeraldpro shrink-0" />
          <span class="min-w-0 break-words">Temporada {{ review.season }}: OVER do time {{ fmtOver(review.overStart) }} → {{ fmtOver(review.overEnd) }} ({{ fmtDelta(delta) }})</span>
        </h3>
      </div>
      <button
        type="button"
        class="shrink-0 px-3 py-1.5 rounded-xl bg-subtle hover:bg-borderline text-ink text-xs font-bold"
        @click="hide"
      >
        Ocultar
      </button>
    </div>
    <p class="text-xs sm:text-sm text-ink-muted break-words">
      Ganho total do elenco: <strong class="text-emeraldpro-hover">+{{ review.totalGain }} de OVER</strong> em atletas
    </p>
    <ul v-if="review.top.length" class="space-y-1.5">
      <li
        v-for="(t, i) in review.top"
        :key="i"
        class="p-2.5 rounded-xl bg-subtle flex items-center justify-between gap-2 text-xs min-w-0"
      >
        <span class="min-w-0 truncate text-ink font-semibold" :title="t.name">{{ i + 1 }}. {{ t.name }}</span>
        <span class="shrink-0 font-score font-bold text-emeraldpro-hover">+{{ t.gain }} (OVER {{ t.overall }})</span>
      </li>
    </ul>
    <div v-if="marcos.length" class="flex flex-wrap gap-1.5 min-w-0">
      <span
        v-for="m in marcos"
        :key="m.id"
        class="max-w-full min-w-0 break-words px-2 py-0.5 rounded-full border border-emeraldpro text-emeraldpro-hover text-[11px] font-bold"
      >
        Marco: {{ m.title }}
      </span>
    </div>
  </div>
</template>

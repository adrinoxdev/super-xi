<script setup lang="ts">
import { Trophy } from 'lucide-vue-next'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import type { Podium, PodiumEntry } from '@/types/bracket'

defineProps<{ podiums: Podium[]; season: number }>()
defineEmits<{ (e: 'close'): void }>()

function places(p: Podium): Array<{ place: number; entry: PodiumEntry | null }> {
  return [
    { place: 1, entry: p.champion },
    { place: 2, entry: p.runnerUp },
    { place: 3, entry: p.third }
  ]
}
</script>

<template>
  <section class="bg-surface rounded-2xl p-4 border border-borderline shadow-sm space-y-2">
    <header class="flex items-center justify-between gap-2">
      <h4 class="font-bold text-sm text-ink flex items-center gap-2 min-w-0">
        <Trophy class="w-4 h-4 text-emeraldpro shrink-0" /> <span class="min-w-0 break-words">Pódios da Temporada {{ season }}</span>
      </h4>
      <button type="button" class="shrink-0 text-xs text-ink-muted hover:text-ink" @click="$emit('close')">Ocultar</button>
    </header>
    <div
      v-for="p in podiums"
      :key="p.competition + p.season"
      class="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-subtle border border-borderline"
    >
      <span class="text-xs font-bold text-ink sm:w-44 sm:shrink-0 min-w-0 break-words">{{ p.competitionLabel }}</span>
      <div class="grid grid-cols-3 gap-2 flex-1 min-w-0">
        <div
          v-for="s in places(p)"
          :key="s.place"
          :class="[
            'flex items-center gap-1.5 min-w-0 rounded-lg px-1.5 py-1',
            s.entry?.isUser ? 'bg-emeraldpro-soft/50' : ''
          ]"
        >
          <template v-if="s.entry">
            <TeamCrest class="shrink-0" size="xs" :team="s.entry.teamId" :name="s.entry.name" :is-user="s.entry.isUser" />
            <span class="min-w-0 truncate text-[11px] text-ink" :title="s.entry.name"
              ><span class="font-score font-extrabold">{{ s.place }}º</span> {{ s.entry.name }}</span
            >
          </template>
          <span v-else class="text-[11px] text-ink-muted"
            ><span class="font-score font-extrabold">{{ s.place }}º</span> —</span
          >
        </div>
      </div>
    </div>
  </section>
</template>

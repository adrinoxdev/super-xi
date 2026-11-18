<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'
import Badge from '@/components/ui/Badge.vue'
import { computed } from 'vue'
import { Trophy } from 'lucide-vue-next'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import type { Podium } from '@/types/bracket'

const props = defineProps<{ podium: Podium }>()

// ordem visual: 2º, 1º, 3º
const slots = computed(() => [
  { place: 2, title: 'Vice', entry: props.podium.runnerUp, platform: 'h-16 bg-ink-light text-night' },
  { place: 1, title: 'Campeão', entry: props.podium.champion, platform: 'h-24 bg-emeraldpro text-night' },
  { place: 3, title: '3º lugar', entry: props.podium.third, platform: 'h-12 bg-subtle border border-borderline text-ink' }
])
</script>

<template>
  <BaseCard as="section" class="space-y-4">
    <header class="flex items-center justify-between gap-2">
      <h4 class="font-bold text-sm text-ink flex items-center gap-2 min-w-0">
        <Trophy class="w-4 h-4 text-emeraldpro shrink-0" /> <span class="min-w-0 break-words">Pódio — {{ podium.competitionLabel }}</span>
      </h4>
      <span class="shrink-0 text-[11px] text-ink-muted">Temporada {{ podium.season }}</span>
    </header>
    <div class="grid grid-cols-3 items-end gap-2 sm:gap-4">
      <div v-for="slot in slots" :key="slot.place" class="flex flex-col items-center gap-1.5 text-center min-w-0">
        <template v-if="slot.entry">
          <Trophy v-if="slot.place === 1" class="w-5 h-5 text-emeraldpro shrink-0" />
          <TeamCrest
            :size="slot.place === 1 ? 'lg' : 'md'"
            :team="slot.entry.teamId"
            :name="slot.entry.name"
            :is-user="slot.entry.isUser"
          />
          <span class="text-xs font-bold text-ink truncate max-w-full" :title="slot.entry.name">{{ slot.entry.name }}</span>
          <Badge v-if="slot.entry.isUser" tone="success">Seu clube</Badge>
        </template>
        <span v-else class="text-xs text-ink-muted">—</span>
        <div :class="['w-full rounded-t-xl flex flex-col items-center justify-center', slot.platform]">
          <span class="font-score text-2xl font-extrabold">{{ slot.place }}º</span>
          <span class="text-[11px] md:text-[10px] uppercase font-bold tracking-wide">{{ slot.title }}</span>
        </div>
      </div>
    </div>
    <p class="text-[11px] text-ink-muted text-center break-words">
      Final: {{ podium.finalSummary
      }}<template v-if="podium.thirdSummary"> • 3º lugar: {{ podium.thirdSummary }}</template>
    </p>
  </BaseCard>
</template>

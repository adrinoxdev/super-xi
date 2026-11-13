<script setup lang="ts">
import type { ScoutMission } from '@/types/scouting'
import { useScouting } from '@/composables/useScouting'
import { formatDuration } from '@/utils/formatDuration'

defineProps<{ mission: ScoutMission }>()
const { getMissionProgress, getMissionRemainingSec } = useScouting()
</script>

<template>
  <div class="bg-surface rounded-2xl p-4 border-2 border-emeraldpro shadow-sm space-y-3">
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs font-bold text-emeraldpro uppercase tracking-wider min-w-0 break-words [overflow-wrap:anywhere]">{{ mission.title }}</span>
      <span class="text-xs font-score font-bold text-ink shrink-0">{{ formatDuration(getMissionRemainingSec(mission)) }}</span>
    </div>
    <div class="w-full h-2 bg-subtle rounded-full overflow-hidden">
      <div
        class="h-full bg-emeraldpro transition-all duration-300"
        :style="{ width: getMissionProgress(mission) + '%' }"
      ></div>
    </div>
    <p class="text-[11px] text-ink-muted">O relatório sai sozinho quando o tempo acabar, mesmo com o jogo fechado.</p>
  </div>
</template>

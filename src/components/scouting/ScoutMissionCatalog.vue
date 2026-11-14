<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useClubStore } from '@/stores/club'
import { useScoutingStore } from '@/stores/scouting'
import { useScouting } from '@/composables/useScouting'
import { blockedMsg } from '@/composables/useClub'
import { ALL_POSITIONS, SCOUT_MISSIONS, SCOUT_OVR_OFFSETS, SCOUT_REPORT_COUNT } from '@/config'
import type { ScoutMissionType } from '@/types/scouting'
import { formatCurrency, formatPosBR } from '@/utils/format/formatCurrency'
import { formatDuration } from '@/utils/format/formatDuration'

const club = useClubStore()
const scouting = useScoutingStore()
const { startScoutMission } = useScouting()

// Qualidade esperada no nível atual de Scouting (a geração limita o OVR sorteado entre 52 e 93).
function ovrRange(type: ScoutMissionType): string {
  const [lo, hi] = SCOUT_OVR_OFFSETS[type]
  const M = club.scoutingSpec.maxOvr
  return `${Math.max(52, M + lo)} a ${Math.min(93, M + hi)}`
}
function reportsLabel(type: ScoutMissionType): string {
  const n = SCOUT_REPORT_COUNT[type]
  return n === 1 ? '1 atleta' : `${n} atletas`
}
</script>

<template>
  <BaseCard padding="p-4 sm:p-5" class="space-y-4">
    <SectionTitle size="responsive">Enviar Nova Missão de Observação</SectionTitle>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <div
        v-for="m in SCOUT_MISSIONS"
        :key="m.type"
        class="p-4 rounded-xl bg-subtle border border-borderline flex flex-col justify-between space-y-3"
      >
        <div class="space-y-1">
          <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <span class="font-bold text-xs text-ink min-w-0 break-words [overflow-wrap:anywhere]">{{ m.title }}</span>
            <span class="shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded bg-surface border border-borderline text-ink-muted">
              {{ formatDuration(m.durationSec * club.scoutingSpec.timeMult) }}
            </span>
          </div>
          <p class="text-[11px] text-ink-muted leading-snug break-words">{{ m.description }}</p>
          <p class="text-[11px] font-semibold text-ink leading-snug">
            OVER esperado: {{ ovrRange(m.type) }}
            <span class="font-normal text-ink-muted">• {{ reportsLabel(m.type) }}</span>
          </p>
          <label v-if="m.type === 'position'" class="flex items-center gap-2 pt-1 text-[11px] font-medium text-ink-muted">
            Posição
            <select
              v-model="scouting.selectedScoutPosition"
              class="flex-1 min-w-0 bg-surface border border-borderline rounded-lg px-2 py-2 sm:py-1 min-h-[40px] sm:min-h-0 font-bold text-ink focus:outline-none"
            >
              <option v-for="pos in ALL_POSITIONS" :key="pos" :value="pos">{{ formatPosBR(pos) }}</option>
            </select>
          </label>
        </div>

        <BaseButton
          @click="startScoutMission(m.type)"
          :disabled="club.upgrades.scoutingLevel < m.minLevel || scouting.activeMissions.length >= club.scoutingSpec.slots || club.budget < m.cost"
          :title="club.budget < m.cost ? blockedMsg(m.cost) : undefined"
          class="w-full min-h-[40px] sm:min-h-0 px-3 py-2 text-xs transition-colors"
        >
          <template v-if="club.upgrades.scoutingLevel < m.minLevel">Requer Scout Nv.{{ m.minLevel }}</template>
          <template v-else>{{ formatCurrency(m.cost) }}</template>
        </BaseButton>
      </div>
    </div>
  </BaseCard>
</template>

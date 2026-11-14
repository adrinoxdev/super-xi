<script setup lang="ts">
import Badge from '@/components/ui/Badge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import type { ScoutReport } from '@/types/scouting'
import { useScouting } from '@/composables/useScouting'
import PlayerCard from '@/components/player/PlayerCard.vue'
import { formatCurrency } from '@/utils/format/formatCurrency'
import { wageForOverall } from '@/utils/player/generatePlayer'
import { wageWarning, squadFullTitle } from '@/composables/useClub'
import { useSquadStore } from '@/stores/squad'
import { useClubStore } from '@/stores/club'

const squad = useSquadStore()
const club = useClubStore()
const fullTitle = computed(() => (squad.isFull ? squadFullTitle(squad.players.length, club.maxSquadCapacity) : undefined))
const props = defineProps<{ rep: ScoutReport }>()
// Aviso calculado com o salário estimado (o real revelaria o OVER).
const hireWarning = computed(() => wageWarning(wageForOverall(props.rep.estimatedOvr)))
const { openCompareModal, signScoutedPlayer, dismissReport } = useScouting()
</script>

<template>
  <div
    :class="[
      'p-4 rounded-2xl border flex flex-col justify-between space-y-3',
      rep.isGem ? 'bg-amberpro-soft/30 border-amberpro' : 'bg-subtle border-borderline'
    ]"
  >
    <div class="space-y-2">
      <div class="flex items-start justify-between gap-2">
        <div class="flex flex-wrap items-center gap-3 min-w-0">
          <PlayerCard class="shrink-0" :player="rep.player" size="md" estimated mask-attrs :overall="rep.estimatedOvr" />
          <div class="min-w-0 flex-1 basis-28">
            <div class="font-bold text-sm text-ink truncate" :title="rep.player.name">{{ rep.player.name }}</div>
            <div class="text-xs text-ink-muted truncate" :title="`${rep.player.age} anos • ${rep.player.nationality}`">{{ rep.player.age }} anos • {{ rep.player.nationality }}</div>
          </div>
        </div>
        <Badge
          v-if="rep.isGem"
          tone="warning-solid"
          weight="extrabold"
          uppercase
          class="shrink-0"
        >
          Joia Rara
        </Badge>
      </div>

      <div class="grid grid-cols-3 gap-1.5 text-center text-[11px] bg-surface p-2 rounded-xl border border-borderline">
        <div>
          <span class="text-ink-muted block">Potencial</span>
          <strong class="text-ink">~{{ rep.estimatedPotential }}</strong>
        </div>
        <div>
          <span class="text-ink-muted block">Passe</span>
          <strong class="text-emeraldpro">{{ formatCurrency(rep.player.value) }}</strong>
        </div>
        <div>
          <span class="text-ink-muted block">Salário</span>
          <strong class="text-ink">~{{ formatCurrency(wageForOverall(rep.estimatedOvr)) }}</strong>
        </div>
      </div>
    </div>

    <p v-if="hireWarning" class="text-[11px] text-amberpro font-semibold break-words">{{ hireWarning }}</p>

    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        @click="openCompareModal(rep)"
        class="flex-1 min-w-0 min-h-[40px] sm:min-h-0 py-2 rounded-xl bg-surface hover:bg-borderline border border-borderline text-ink text-xs font-bold transition-colors"
      >
        Comparar
      </button>
      <BaseButton
        @click="signScoutedPlayer(rep)"
        :disabled="squad.isFull"
        :title="fullTitle"
        class="flex-1 min-w-0 min-h-[40px] sm:min-h-0 py-2 disabled:cursor-not-allowed text-xs transition-colors"
      >
        Contratar
      </BaseButton>
      <button
        type="button"
        @click="dismissReport(rep.id)"
        title="Dispensar Relatório"
        class="shrink-0 p-2 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 inline-flex items-center justify-center rounded-xl bg-surface hover:bg-dangerpro-soft border border-borderline text-ink-muted hover:text-dangerpro transition-colors"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import type { ScoutReport } from '@/types/scouting'
import { useScouting } from '@/composables/useScouting'
import PlayerCard from '@/components/player/PlayerCard.vue'
import { formatCurrency } from '@/utils/formatCurrency'
import { wageForOverall } from '@/utils/generatePlayer'
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
        <span
          v-if="rep.isGem"
          class="px-2 py-0.5 rounded-full bg-amberpro text-white text-[10px] font-extrabold uppercase shrink-0"
        >
          Joia Rara
        </span>
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

    <div class="flex items-center gap-2">
      <button
        type="button"
        @click="openCompareModal(rep)"
        class="flex-1 min-w-0 py-2 rounded-xl bg-surface hover:bg-borderline border border-borderline text-ink text-xs font-bold transition-colors"
      >
        Comparar
      </button>
      <button
        type="button"
        @click="signScoutedPlayer(rep)"
        :disabled="squad.isFull"
        :title="fullTitle"
        class="flex-1 min-w-0 py-2 rounded-xl bg-emeraldpro hover:bg-emeraldpro-hover disabled:bg-borderline disabled:text-ink-muted disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
      >
        Contratar
      </button>
      <button
        type="button"
        @click="dismissReport(rep.id)"
        title="Dispensar Relatório"
        class="shrink-0 p-2 rounded-xl bg-surface hover:bg-dangerpro-soft border border-borderline text-ink-muted hover:text-dangerpro transition-colors"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

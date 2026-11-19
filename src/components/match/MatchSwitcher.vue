<script setup lang="ts">
import { computed } from 'vue'
import { useMatchStore } from '@/stores/match'
import { useMatchSimulation } from '@/composables/useMatchSimulation'
import type { MatchCompetition } from '@/types/match'
import { formatMinute } from '@/utils/match/formatMinute'

const match = useMatchStore()
const { switchActiveMatch, opponentFor } = useMatchSimulation()

const NAMES: Record<MatchCompetition, string> = {
  league: 'Liga',
  cup: 'Taça Cacique',
  continental: 'Continental',
  supercup: 'Supercopa',
  recopa: 'Recopa',
  friendly: 'Amistoso'
}

// Mostra o seletor só quando há mais de uma partida aberta (ou outra rodando enquanto vê um pré-jogo).
const items = computed(() => {
  const comps = [...match.openCompetitions]
  if (!comps.includes(match.activeMatchCompetition)) comps.push(match.activeMatchCompetition)
  if (comps.length < 2) return []
  return comps.map((c) => {
    const st = match.sessions[c].matchState
    const open = match.isCompetitionMatchActive(c)
    return {
      comp: c,
      name: NAMES[c],
      status: !open ? 'Pré-jogo' : st.isFinished ? 'Encerrada' : st.isRunning ? formatMinute(st.minute) : 'Pausada',
      score: open ? `${st.userScore}-${st.opponentScore}` : '',
      live: open && !st.isFinished,
      vs: open ? opponentFor(c).name : ''
    }
  })
})
</script>

<template>
  <div v-if="items.length" class="flex flex-wrap gap-2" role="tablist" aria-label="Partidas simultâneas">
    <button
      v-for="it in items"
      :key="it.comp"
      type="button"
      role="tab"
      :aria-selected="it.comp === match.activeMatchCompetition"
      class="rounded-xl border px-3.5 py-2 text-left text-xs transition-colors flex flex-col gap-0.5 min-w-[9rem] min-h-11 flex-1 sm:flex-none max-w-full"
      :class="
        it.comp === match.activeMatchCompetition
          ? 'border-emeraldpro bg-emeraldpro-soft text-ink shadow-sm'
          : 'border-borderline bg-surface text-ink-muted hover:bg-subtle hover:text-ink'
      "
      @click="switchActiveMatch(it.comp)"
    >
      <span class="flex items-center justify-between gap-3">
        <span class="font-bold text-ink">{{ it.name }}</span>
        <span class="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider" :class="it.live ? 'text-dangerpro' : 'text-ink-muted'">
          <span v-if="it.live" class="h-1.5 w-1.5 rounded-full bg-dangerpro animate-pulse"></span>
          {{ it.status }}
        </span>
      </span>
      <span v-if="it.vs" class="flex items-center justify-between gap-3">
        <span class="truncate" :title="it.vs">x {{ it.vs }}</span>
        <span class="font-score font-bold text-ink">{{ it.score }}</span>
      </span>
    </button>
  </div>
</template>

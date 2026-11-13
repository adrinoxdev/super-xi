<script setup lang="ts">
import { computed } from 'vue'
import { useMatchStore } from '@/stores/match'
import { useMatchSimulation } from '@/composables/useMatchSimulation'
import type { MatchCompetition } from '@/types/match'

const match = useMatchStore()
const { switchActiveMatch, opponentFor } = useMatchSimulation()

const NAMES: Record<MatchCompetition, string> = {
  league: 'Liga',
  cup: 'Taça Cacique',
  continental: 'Continental',
  supercup: 'Supercopa',
  recopa: 'Recopa'
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
      status: !open ? 'Pré-jogo' : st.isFinished ? 'Encerrada' : st.isRunning ? st.minute + "'" : 'Pausada',
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
      class="rounded-lg border px-3 py-2 text-left text-xs transition"
      :class="
        it.comp === match.activeMatchCompetition
          ? 'border-emerald-400 bg-emerald-500/15 text-ink'
          : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500'
      "
      @click="switchActiveMatch(it.comp)"
    >
      <span class="font-bold">{{ it.name }}</span>
      <span v-if="it.vs" class="text-slate-400"> x {{ it.vs }}</span>
      <span class="ml-2 inline-flex items-center gap-1">
        <span v-if="it.live" class="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
        {{ it.score }} {{ it.status }}
      </span>
    </button>
  </div>
</template>

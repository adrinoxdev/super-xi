<script setup lang="ts">
import { computed } from 'vue'
import { useClubStore } from '@/stores/club'
import { useMatchStore } from '@/stores/match'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import { useMatchSimulation } from '@/composables/useMatchSimulation'

const club = useClubStore()
const match = useMatchStore()
const {
  activeMatchCompetitionLabel,
  activeMatchOpponent,
  effectiveUserPower,
  effectiveOpponentPower,
  activeMatchIsHome
} = useMatchSimulation()

// Mandante sempre a esquerda (somente exibicao).
const h = activeMatchIsHome
const leftName = computed(() => (h.value ? club.name : activeMatchOpponent.value.name))
const rightName = computed(() => (h.value ? activeMatchOpponent.value.name : club.name))
const leftPower = computed(() => (h.value ? effectiveUserPower.value : effectiveOpponentPower.value))
const rightPower = computed(() => (h.value ? effectiveOpponentPower.value : effectiveUserPower.value))
const leftScore = computed(() => (h.value ? match.matchState.userScore : match.matchState.opponentScore))
const rightScore = computed(() => (h.value ? match.matchState.opponentScore : match.matchState.userScore))
</script>

<template>
  <div class="bg-ink text-white rounded-2xl p-4 sm:p-6 shadow-md space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
      <span class="px-2.5 py-1 rounded-full bg-emeraldpro text-white font-bold uppercase">
        {{ match.matchState.isFinished ? "Fim de Jogo • 90'" : 'Ao Vivo • ' + match.matchState.minute + "'" }}
      </span>
      <span class="text-slate-300 font-medium min-w-0 break-words">{{ activeMatchCompetitionLabel }}</span>
    </div>

    <div class="grid grid-cols-3 items-center text-center py-2">
      <div class="flex flex-col items-center gap-1 min-w-0">
        <TeamCrest size="md" :name="leftName" :is-user="h" />
        <div class="font-bold text-sm sm:text-lg truncate max-w-full" :title="leftName">{{ leftName }}</div>
        <div class="text-[11px] text-slate-400">OVER {{ leftPower }}</div>
      </div>
      <div class="font-score font-extrabold text-4xl sm:text-5xl tracking-wider text-emerald-400">
        {{ leftScore }} <span class="text-slate-500 text-2xl">x</span> {{ rightScore }}
      </div>
      <div class="flex flex-col items-center gap-1 min-w-0">
        <TeamCrest size="md" :name="rightName" :is-user="!h" />
        <div class="font-bold text-sm sm:text-lg truncate max-w-full" :title="rightName">{{ rightName }}</div>
        <div class="text-[11px] text-slate-400">OVER {{ rightPower }}</div>
      </div>
    </div>
  </div>
</template>

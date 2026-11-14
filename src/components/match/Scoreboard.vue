<script setup lang="ts">
import { computed } from 'vue'
import { useClubStore } from '@/stores/club'
import { useMatchStore } from '@/stores/match'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import { useMatchSimulation } from '@/composables/useMatchSimulation'
import { formatMinute } from '@/utils/match/formatMinute'

const club = useClubStore()
const match = useMatchStore()
const {
  activeMatchCompetitionLabel,
  activeMatchOpponent,
  effectiveUserPower,
  effectiveOpponentPower,
  activeMatchIsHome
} = useMatchSimulation()

const userKicks = computed(() => match.matchState.shootout?.kicks.filter((k) => k.side === 'user') ?? [])
const oppKicks = computed(() => match.matchState.shootout?.kicks.filter((k) => k.side === 'opp') ?? [])
const shootoutScore = computed(() => ({
  user: userKicks.value.filter((k) => k.scored).length,
  opp: oppKicks.value.filter((k) => k.scored).length
}))

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
        {{ match.matchState.shootout ? (match.matchState.isFinished ? 'Fim de Jogo • Pênaltis' : 'Disputa de Pênaltis') : match.matchState.isFinished ? 'Fim de Jogo • ' + formatMinute(match.matchState.minute) : 'Ao Vivo • ' + formatMinute(match.matchState.minute) }}
      </span>
      <span class="text-slate-300 font-medium min-w-0 break-words">{{ activeMatchCompetitionLabel }}</span>
    </div>

    <div v-if="match.matchState.shootout" class="space-y-2" aria-label="Disputa de pênaltis">
      <div class="flex items-center justify-center gap-3 text-xs">
        <span class="font-bold text-slate-300 truncate max-w-[30%]">{{ club.name }}</span>
        <span class="flex gap-1">
          <span
            v-for="(k, i) in userKicks"
            :key="'u' + i"
            :class="['w-3 h-3 rounded-full', k.scored ? 'bg-emerald-400' : 'bg-red-500']"
          ></span>
        </span>
        <span class="font-score font-extrabold text-amber-300 text-lg">{{ shootoutScore.user }} x {{ shootoutScore.opp }}</span>
        <span class="flex gap-1">
          <span
            v-for="(k, i) in oppKicks"
            :key="'o' + i"
            :class="['w-3 h-3 rounded-full', k.scored ? 'bg-emerald-400' : 'bg-red-500']"
          ></span>
        </span>
        <span class="font-bold text-slate-300 truncate max-w-[30%]">{{ activeMatchOpponent.name }}</span>
      </div>
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

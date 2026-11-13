<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ListRow from '@/components/ui/ListRow.vue'
import { Play } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useClubStore } from '@/stores/club'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import { useCompetitionsStore } from '@/stores/competitions'
import { useMatchSimulation } from '@/composables/useMatchSimulation'
import { formatCurrency } from '@/utils/formatCurrency'
import BracketView from '@/components/bracket/BracketView.vue'
import PodiumCard from '@/components/bracket/PodiumCard.vue'
import { useSquadStore } from '@/stores/squad'
import { computed } from 'vue'
import { PRIZES } from '@/config'

const club = useClubStore()
const squad = useSquadStore()
const { cupState, cupRoundLabel } = storeToRefs(useCompetitionsStore())
const canPlay = computed(
  () =>
    !cupState.value.champion &&
    !!cupState.value.currentRival &&
    (!cupState.value.eliminated || cupState.value.thirdPlace)
)
const isThird = computed(() => cupState.value.thirdPlace)
const statusBadge = computed(() => {
  switch (cupState.value.finalPosition) {
    case 2: return { text: 'Vice-campeão', cls: 'bg-subtle text-ink' }
    case 3: return { text: '3º lugar', cls: 'bg-emeraldpro-soft text-emeraldpro' }
    case 4: return { text: '4º lugar', cls: 'bg-subtle text-ink' }
    default: return null
  }
})
const { prepareMatch } = useMatchSimulation()
</script>

<template>
  <div class="space-y-6">
    <BaseCard class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="space-y-1 min-w-0">
        <span class="inline-block max-w-full px-2.5 py-0.5 rounded-full bg-emeraldpro-soft text-emeraldpro text-xs font-bold uppercase break-words">
          Mata-Mata Nacional • Jogo Único
        </span>
        <h3 class="text-lg sm:text-xl font-extrabold text-ink break-words">Taça Cacique — {{ cupRoundLabel }}</h3>
        <p class="text-xs text-ink-muted break-words">
          16 clubes das Séries A, B, C e D em confronto eliminatório direto. Cota da final: <strong class="text-emeraldpro">{{ formatCurrency(PRIZES.cup.rounds[3]) }}</strong>. Campeão leva até <strong class="text-emeraldpro">{{ formatCurrency(PRIZES.cup.rounds.reduce((a, b) => a + b, 0)) }}</strong> no acumulado. Vice: {{ formatCurrency(PRIZES.cup.finalLoss) }}. Disputa de 3º lugar: {{ formatCurrency(PRIZES.cup.thirdWin) }} pela vitória e {{ formatCurrency(PRIZES.cup.thirdLoss) }} pela derrota.
        </p>
      </div>

      <BaseButton
        v-if="canPlay"
        @click="prepareMatch('cup')"
        class="shrink-0 px-5 py-3 text-xs sm:text-sm shadow-sm flex items-center gap-2 self-start sm:self-auto"
      >
        <Play class="w-4 h-4 fill-current" />
        Jogar {{ cupRoundLabel }}
      </BaseButton>
      <span
        v-else-if="cupState.champion"
        class="max-w-full break-words px-4 py-2 rounded-xl bg-emeraldpro-soft text-emeraldpro text-xs font-extrabold"
      >
        CAMPEÃO DA TAÇA CACIQUE!
      </span>
      <span
        v-else-if="statusBadge"
        :class="['max-w-full break-words px-4 py-2 rounded-xl text-xs font-extrabold', statusBadge.cls]"
      >
        {{ statusBadge.text }}
      </span>
      <span
        v-else
        class="max-w-full break-words px-4 py-2 rounded-xl bg-subtle text-ink text-xs font-extrabold"
      >
        Eliminado na Temporada {{ club.season }}
      </span>
    </BaseCard>

    <PodiumCard v-if="cupState.bracket?.podium" :podium="cupState.bracket.podium" />

    <BaseCard v-if="canPlay && cupState.currentRival" class="space-y-3">
      <h4 class="font-bold text-sm text-ink">{{ isThird ? 'Disputa de 3º Lugar' : 'Confronto da Fase Atual' }}</h4>
      <div class="p-4 rounded-xl bg-subtle border border-borderline flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <TeamCrest class="shrink-0" size="md" :name="cupState.currentRival.name" />
          <div class="min-w-0">
          <span class="text-[11px] font-bold uppercase text-ink-muted block">Seu Adversário ({{ cupState.currentRival.serieCode }})</span>
          <strong class="text-base text-ink block break-words [overflow-wrap:anywhere]">{{ cupState.currentRival.name }}</strong>
          </div>
        </div>
        <span class="shrink-0 px-3 py-1 rounded-lg bg-surface border border-borderline font-score font-bold text-sm text-ink">
          OVER {{ cupState.currentRival.power }}
        </span>
      </div>
    </BaseCard>

    <BracketView
      v-if="cupState.bracket"
      :bracket="cupState.bracket"
      title="Chave da Taça Cacique"
      :user-power="squad.teamStrength.total"
    />

    <BaseCard v-if="cupState.history.length" class="space-y-3">
      <h4 class="font-bold text-sm text-ink">Campanha na Taça Cacique</h4>
      <div class="space-y-2">
        <ListRow v-for="(item, idx) in cupState.history" :key="idx">
          <div class="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
            <span class="font-bold text-ink">{{ item.roundName }}:</span>
            <span class="text-ink-muted ml-1">{{ item.summary }}</span>
          </div>
          <span class="shrink-0 font-bold text-emeraldpro tabular-nums">+{{ formatCurrency(item.prize) }}</span>
        </ListRow>
      </div>
    </BaseCard>
  </div>
</template>

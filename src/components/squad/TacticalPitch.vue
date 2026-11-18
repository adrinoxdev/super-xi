<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useSquadStore } from '@/stores/squad'
import { useMatchStore } from '@/stores/match'
import { useUiStore } from '@/stores/ui'
import { useSquad } from '@/composables/useSquad'
import MentalitySelector from '@/components/ui/MentalitySelector.vue'
import PlayerCard from '@/components/player/PlayerCard.vue'
import { computed } from 'vue'
import { getEffectiveOvr } from '@/utils/match/calculateTeamStrength'
import { formatPosBR } from '@/utils/format/formatCurrency'

const squad = useSquadStore()
const match = useMatchStore()
const ui = useUiStore()
const { formatStarterName, selectPitchSlot, cancelSelection, changeFormation, autoPickBestLineup, autoPickBestFormation } = useSquad()

function pct(mod: number): string {
  const v = Math.round((mod - 1) * 100)
  return (v >= 0 ? '+' : '') + v
}

// Atleta escolhido na lista: OVER dele em cada vaga e qual(is) vaga(s) rendem mais.
const picked = computed(() => squad.players.find((p) => p.id === ui.selectedRosterPlayerId) ?? null)
const fit = computed(() => {
  const p = picked.value
  if (!p) return null
  const effs = squad.pitchSlots.map((s) => getEffectiveOvr(p, s.role))
  const max = Math.max(...effs)
  return effs.map((eff) => ({ eff, best: eff === max, penalty: eff < p.overall }))
})
</script>

<template>
  <BaseCard padding="p-4 sm:p-5" class="lg:col-span-7 space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div class="min-w-0">
        <SectionTitle>Prancheta Tática ({{ squad.formation }})</SectionTitle>
        <p v-if="picked" class="text-xs font-bold text-amberpro break-words">
          {{ picked.name }} ({{ formatPosBR(picked.position) }}, OVER {{ picked.overall }}): toque na vaga destacada em verde, onde ele rende mais.
          <button type="button" @click="cancelSelection" class="underline ml-1">Cancelar</button>
        </p>
        <p v-else class="text-xs text-ink-muted break-words">Toque em um titular para trocá-lo, ou escolha um atleta na lista e veja aqui onde ele rende mais.</p>
      </div>
      <div class="flex flex-wrap gap-2 shrink-0 self-start sm:self-auto">
        <BaseButton
          variant="soft"
          @click="autoPickBestLineup"
          title="Mantém a formação atual e escolhe, para cada posição, o atleta com melhor desempenho."
          class="min-h-[40px] sm:min-h-0 px-3.5 py-2 text-xs transition-colors"
        >
          Melhor Escalação
        </BaseButton>
        <BaseButton
          variant="soft"
          @click="autoPickBestFormation"
          title="Compara todas as formações com o elenco atual e adota a que dá o maior OVER, já escalando os melhores titulares nela."
          class="min-h-[40px] sm:min-h-0 px-3.5 py-2 text-xs transition-colors"
        >
          Melhor Tática
        </BaseButton>
      </div>
    </div>

    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="fName in squad.formationNames"
        :key="fName"
        type="button"
        @click="changeFormation(fName)"
        :class="[
          'px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold transition-all border',
          squad.formation === fName
            ? 'bg-emeraldpro text-night border-emeraldpro shadow-sm'
            : 'bg-subtle text-ink-muted border-borderline hover:text-ink'
        ]"
      >
        {{ fName }}
      </button>
    </div>

    <!-- Container query: no celular o card dos titulares escala com a largura do campo (cqw) para os 11 caberem sem sobrepor; md+ fixo em 76px como antes -->
    <div id="prancheta-tatica" class="scroll-mt-16 relative w-full aspect-[1/1.8] max-h-[640px] sm:aspect-auto sm:h-[640px] lg:h-[510px] max-w-full rounded-2xl pitch-bg border-2 border-emerald-800/30 overflow-hidden select-none shadow-inner [container-type:inline-size]">
      <div class="absolute inset-3 border-2 border-white/30 rounded-xl pointer-events-none"></div>
      <div class="absolute left-3 right-3 top-1/2 h-0.5 bg-white/30 pointer-events-none"></div>
      <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-white/30 pointer-events-none"></div>
      <div class="absolute left-1/2 top-3 -translate-x-1/2 w-40 h-16 border-2 border-t-0 border-white/30 pointer-events-none"></div>
      <div class="absolute left-1/2 bottom-3 -translate-x-1/2 w-40 h-16 border-2 border-b-0 border-white/30 pointer-events-none"></div>

      <div
        v-for="(slot, idx) in squad.pitchSlots"
        :key="idx"
        :style="{ left: slot.x + '%', top: slot.y + '%' }"
        :class="[
          'absolute -translate-x-1/2 -translate-y-1/2 w-[clamp(48px,17.5cqw,76px)] md:w-[76px]',
          ui.selectedPitchSlotIndex === idx ? 'z-20 scale-105' : 'z-10'
        ]"
      >
        <template v-if="fit">
          <span
            :class="[
              'absolute -inset-1 rounded-2xl pointer-events-none border-2',
              fit[idx].best ? 'border-emeraldpro ring-4 ring-emeraldpro/50 animate-pulse' : 'border-transparent'
            ]"
          ></span>
          <span
            :class="[
              'absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold leading-none whitespace-nowrap shadow pointer-events-none',
              fit[idx].best ? 'bg-emeraldpro text-night' : fit[idx].penalty ? 'bg-amberpro text-night' : 'bg-surface text-ink border border-borderline'
            ]"
          >{{ fit[idx].best ? 'Melhor ' : '' }}{{ fit[idx].eff }}</span>
        </template>
        <PlayerCard
          v-if="slot.player"
          class="!w-full"
          :player="slot.player"
          size="xs"
          clickable
          show-stamina
          :selected="ui.selectedPitchSlotIndex === idx"
          :overall="getEffectiveOvr(slot.player, slot.role)"
          :pos-label="formatPosBR(slot.role)"
          :label="formatStarterName(slot.player)"
          @click="selectPitchSlot(idx)"
        />
        <button
          v-else
          type="button"
          @click="selectPitchSlot(idx)"
          :class="[
            'w-full sm:w-[74px] mx-auto min-h-11 sm:min-h-0 rounded-xl p-1 sm:p-1.5 bg-surface shadow-md border-2 transition-transform hover:scale-105 flex flex-col items-center text-center',
            ui.selectedPitchSlotIndex === idx ? 'border-amberpro ring-2 ring-amberpro/40' : 'border-white'
          ]"
        >
          <div class="w-full flex items-center justify-between text-[10px] font-extrabold leading-none">
            <span class="text-amberpro">{{ formatPosBR(slot.role) }}</span>
            <span class="font-score text-xs sm:text-sm text-ink">--</span>
          </div>
          <span class="text-[10px] font-bold text-ink truncate w-full mt-0.5 leading-tight">Vazio</span>
        </button>
      </div>
    </div>

    <div class="pt-1 space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs">
        <span class="font-bold text-ink">Postura Tática da Equipe</span>
        <span class="font-semibold text-emeraldpro">
          ATQ {{ pct(match.mentalityInfo.atkMod) }}% • DEF {{ pct(match.mentalityInfo.defMod) }}%
        </span>
      </div>
      <MentalitySelector v-model="match.selectedMentality" variant="compact" />
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ListRow from '@/components/ui/ListRow.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { Play } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useClubStore } from '@/stores/club'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import { useCompetitionsStore } from '@/stores/competitions'
import { useMatchSimulation } from '@/composables/useMatchSimulation'
import { PRIZES } from '@/config'
import { formatCurrency } from '@/utils/format/formatCurrency'

const club = useClubStore()
const { supercupState, recopaState } = storeToRefs(useCompetitionsStore())
const { prepareMatch, matchEntryLabel } = useMatchSimulation()
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Supercopa Soberana -->
    <BaseCard class="flex flex-col justify-between space-y-4">
      <div class="space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span class="max-w-full break-words px-2.5 py-0.5 rounded-full bg-amberpro text-night text-[11px] font-bold uppercase">
            Supercopa Soberana • Final Única
          </span>
          <span class="text-xs font-bold text-ink-muted">Temp. {{ club.season }}</span>
        </div>
        <h3 class="text-lg font-bold text-ink">Supercopa Soberana</h3>
        <p class="text-xs text-ink-muted leading-relaxed break-words">
          Confronto em jogo único que abre a temporada entre os campeões nacionais da Liga e da Taça Cacique. Prêmio: <strong class="text-emeraldpro">{{ formatCurrency(PRIZES.supercup.champion) }}</strong>.
        </p>
      </div>

      <EmptyState v-if="!supercupState.qualified" padding="p-4">
        Vaga bloqueada. Conquiste um título nacional de divisão ou a Taça Cacique para disputar a Supercopa na temporada seguinte!
      </EmptyState>
      <div v-else class="space-y-3">
        <ListRow padding="p-3.5">
          <div class="flex items-center gap-2.5 min-w-0">
            <TeamCrest class="shrink-0" size="sm" :name="supercupState.rivalName" />
            <div class="min-w-0">
              <span class="text-[11px] md:text-[10px] font-bold uppercase text-ink-muted block">Adversário da Decisão</span>
              <strong class="text-sm text-ink block break-words [overflow-wrap:anywhere]">{{ supercupState.rivalName }}</strong>
              <span v-if="supercupState.rivalOrigin" class="text-[11px] text-ink-muted block break-words">{{ supercupState.rivalOrigin }}</span>
            </div>
          </div>
          <span class="shrink-0 font-bold text-ink-muted">OVER {{ supercupState.rivalPower }}</span>
        </ListRow>

        <BaseButton
          v-if="!supercupState.played"
          @click="prepareMatch('supercup')"
          class="w-full py-2.5 text-xs flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Play class="w-3.5 h-3.5 fill-current" />
          {{ matchEntryLabel('supercup', 'Disputar Final da Supercopa') }}
        </BaseButton>
        <div
          v-else
          :class="supercupState.won ? 'bg-emeraldpro-soft text-emeraldpro border-emeraldpro/40' : 'bg-dangerpro-soft text-dangerpro border-dangerpro/40'"
          class="p-3 rounded-xl border text-center text-xs font-extrabold break-words"
        >
          {{ supercupState.won ? 'CAMPEÃO DA SUPERCOPA! (' + supercupState.scoreText + ')' : 'Vice-Campeão (' + supercupState.scoreText + ')' }}
        </div>
      </div>
    </BaseCard>

    <!-- Recopa Condor -->
    <BaseCard class="flex flex-col justify-between space-y-4">
      <div class="space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span class="max-w-full break-words px-2.5 py-0.5 rounded-full bg-emeraldpro text-night text-[11px] font-bold uppercase">
            Recopa Condor • Final Única
          </span>
          <span class="text-xs font-bold text-ink-muted">Temp. {{ club.season }}</span>
        </div>
        <h3 class="text-lg font-bold text-ink">Recopa Condor</h3>
        <p class="text-xs text-ink-muted leading-relaxed break-words">
          Decisão internacional entre os campeões da Copa Condor de Ouro e da Copa Condor de Prata. Prêmio do campeão: <strong class="text-emeraldpro">{{ formatCurrency(PRIZES.recopa.champion) }}</strong>.
        </p>
      </div>

      <EmptyState v-if="!recopaState.qualified" padding="p-4">
        Vaga bloqueada. Conquiste a Copa Condor de Prata ou a Copa Condor de Ouro para disputar a Recopa Condor!
      </EmptyState>
      <div v-else class="space-y-3">
        <ListRow padding="p-3.5">
          <div class="flex items-center gap-2.5 min-w-0">
            <TeamCrest class="shrink-0" size="sm" :name="recopaState.rivalName" />
            <div class="min-w-0">
              <span class="text-[11px] md:text-[10px] font-bold uppercase text-ink-muted block">Campeão Continental Rival</span>
              <strong class="text-sm text-ink block break-words [overflow-wrap:anywhere]">{{ recopaState.rivalName }}</strong>
              <span v-if="recopaState.rivalOrigin" class="text-[11px] text-ink-muted block break-words">{{ recopaState.rivalOrigin }}</span>
            </div>
          </div>
          <span class="shrink-0 font-bold text-ink-muted">OVER {{ recopaState.rivalPower }}</span>
        </ListRow>

        <BaseButton
          v-if="!recopaState.played"
          @click="prepareMatch('recopa')"
          class="w-full py-2.5 text-xs flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Play class="w-3.5 h-3.5 fill-current" />
          {{ matchEntryLabel('recopa', 'Disputar Final da Recopa') }}
        </BaseButton>
        <div
          v-else
          :class="recopaState.won ? 'bg-emeraldpro-soft text-emeraldpro border-emeraldpro/40' : 'bg-dangerpro-soft text-dangerpro border-dangerpro/40'"
          class="p-3 rounded-xl border text-center text-xs font-extrabold break-words"
        >
          {{ recopaState.won ? 'CAMPEÃO DA RECOPA! (' + recopaState.scoreText + ')' : 'Vice-Campeão (' + recopaState.scoreText + ')' }}
        </div>
      </div>
    </BaseCard>
  </div>
</template>

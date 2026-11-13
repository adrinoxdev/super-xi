<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Sparkles } from 'lucide-vue-next'
import MentalitySelector from '@/components/ui/MentalitySelector.vue'
import { useMatchStore } from '@/stores/match'
import { useSquadStore } from '@/stores/squad'
import { useMatchSimulation } from '@/composables/useMatchSimulation'
import { formatPosBR } from '@/utils/formatCurrency'
import { getEffectiveOvr } from '@/utils/calculateTeamStrength'
import { FORMATIONS } from '@/utils/constants'
import type { Player } from '@/types/player'

const match = useMatchStore()
const squad = useSquadStore()
const { selectedMentality, subOutId, subInId } = storeToRefs(match)
const { closeInMatchSubDrawer, confirmInMatchSubstitution, recommendSubstitution } = useMatchSimulation()

// Posição da vaga que será liberada: qualquer reserva pode entrar, mas fora de posição perde OVR.
const slotRole = computed(() => {
  const idx = squad.starterIds.indexOf(subOutId.value)
  return idx === -1 ? null : (FORMATIONS[squad.formation] || FORMATIONS['4-3-3'])[idx]?.role ?? null
})
function effectiveLabel(p: Player): string {
  if (!slotRole.value) return `OVER ${p.overall}`
  const eff = getEffectiveOvr(p, slotRole.value)
  return eff === p.overall ? `OVER ${p.overall}` : `OVER ${p.overall} → ${eff} na vaga`
}
const forcedSub = computed(() => !!squad.players.find((p) => p.id === subOutId.value)?.injury)
</script>

<template>
  <div class="bg-surface rounded-2xl p-5 border-2 border-amberpro shadow-md space-y-4 animate-pop">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0 flex-1 basis-60">
        <h3 class="font-bold text-base text-ink break-words">Substituições & Postura ao Vivo ({{ match.matchState.subsUsed }}/5 usadas)</h3>
        <p class="text-xs text-ink-muted break-words">O cronômetro está pausado enquanto você ajusta o time. Reserva fora de posição entra com OVER reduzido; trocar um lesionado não gasta substituição.</p>
      </div>
      <button
        type="button"
        @click.prevent.stop="closeInMatchSubDrawer"
        class="shrink-0 px-4 py-2 rounded-xl bg-emeraldpro text-white text-xs font-bold"
      >
        Retomar Jogo
      </button>
    </div>

    <MentalitySelector v-model="selectedMentality" variant="pills" />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="min-w-0">
        <label class="text-xs font-bold text-ink block mb-1.5">1. Quem sai (Titular em campo):</label>
        <select v-model="subOutId" class="w-full p-2.5 rounded-xl bg-subtle border border-borderline text-xs font-bold text-ink">
          <option value="">-- Selecione o titular --</option>
          <option v-for="st in squad.currentStartersList" :key="st.id" :value="st.id">
            {{ formatPosBR(st.position) }} • {{ st.name }} {{ st.injury ? '🩹 ' : '' }}(OVER {{ st.overall }} • Energia {{ Math.round(st.stamina ?? 100) }}%)
          </option>
        </select>
      </div>
      <div class="min-w-0">
        <label class="text-xs font-bold text-ink block mb-1.5">2. Quem entra (Banco de Reservas):</label>
        <select v-model="subInId" class="w-full p-2.5 rounded-xl bg-subtle border border-borderline text-xs font-bold text-ink">
          <option value="">-- Selecione o reserva --</option>
          <option v-for="bn in squad.availableBenchList" :key="bn.id" :value="bn.id">
            {{ formatPosBR(bn.position) }} • {{ bn.name }} {{ bn.injury ? '🩹 ' : '' }}({{ effectiveLabel(bn) }} • Energia {{ Math.round(bn.stamina ?? 100) }}%)
          </option>
        </select>
      </div>
    </div>

    <div class="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        @click.prevent.stop="recommendSubstitution"
        class="px-5 py-2.5 rounded-xl bg-subtle hover:bg-borderline text-ink text-xs font-bold transition-colors flex items-center gap-2"
      >
        <Sparkles class="w-4 h-4 text-emeraldpro" />
        Substituição Recomendada
      </button>
      <button
        type="button"
        @click.prevent.stop="confirmInMatchSubstitution"
        :disabled="!subOutId || !subInId || (!forcedSub && match.matchState.subsUsed >= 5)"
        class="px-5 py-2.5 rounded-xl bg-amberpro disabled:opacity-40 text-white text-xs font-bold"
      >
        Confirmar Substituição
      </button>
    </div>
  </div>
</template>

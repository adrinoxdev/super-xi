<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { LayoutGrid, Sparkles } from 'lucide-vue-next'
import MentalitySelector from '@/components/ui/MentalitySelector.vue'
import { useMatchStore } from '@/stores/match'
import { useSquadStore } from '@/stores/squad'
import { isSentOff, useMatchSimulation } from '@/composables/useMatchSimulation'
import { isSuspendedFor } from '@/utils/player/suspension'
import { formatPosBR } from '@/utils/format/formatCurrency'
import { getEffectiveOvr } from '@/utils/match/calculateTeamStrength'
import { FORMATIONS } from '@/config'
import type { Player } from '@/types/player'

const match = useMatchStore()
const squad = useSquadStore()
const { selectedMentality, subOutId, subInId } = storeToRefs(match)
const { closeInMatchSubDrawer, confirmInMatchSubstitution, recommendSubstitution, pendingInjuries, reorganizeTeam } = useMatchSimulation()

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
// Expulso não sai: a vaga fica vazia e o time joga com um a menos.
const outCandidates = computed(() => squad.currentStartersList.filter((p) => !isSentOff(match.activeMatchCompetition, p.id)))
// Suspenso na competição desta partida não pode entrar.
const benchCandidates = computed(() => squad.availableBenchList.filter((p) => !isSuspendedFor(p, match.activeMatchCompetition)))
// Lesão exige ajuste: com lesionado em campo e reserva saudável, o jogo não retoma antes da troca.
const pending = computed(() => pendingInjuries(match.activeMatchCompetition))
// Titulares fora de campo (expulsos ou suspensos): o time joga com menos de 11 e pode se reorganizar.
const missing = computed(() =>
  squad.currentStartersList.filter((p) => isSentOff(match.activeMatchCompetition, p.id) || isSuspendedFor(p, match.activeMatchCompetition))
)
// Abaixo de md o painel vira bottom-sheet fixo (Teleport p/ body): cabeçalho e ações fixos, miolo rola sozinho e a página atrás fica travada.
const isMobile = ref(false)
let mq: MediaQueryList | null = null
const onMq = () => { isMobile.value = !!mq?.matches }
watch(isMobile, (m) => { document.body.style.overflow = m ? 'hidden' : '' })
onMounted(() => {
  mq = window.matchMedia('(max-width: 767px)')
  onMq()
  mq.addEventListener('change', onMq)
})
onBeforeUnmount(() => {
  mq?.removeEventListener('change', onMq)
  document.body.style.overflow = ''
})
const forcedSub = computed(() => !!squad.players.find((p) => p.id === subOutId.value)?.injury)
</script>

<template>
  <Teleport to="body" :disabled="!isMobile">
  <div :class="isMobile ? 'fixed inset-0 z-[55] bg-ink/50 flex items-end' : ''">
  <div class="bg-surface w-full flex flex-col max-h-[92dvh] rounded-t-2xl md:rounded-2xl md:block md:max-h-none border-2 border-amberpro shadow-md md:p-5 md:space-y-4 animate-pop">
    <div class="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-borderline md:border-0 md:p-0">
      <div class="min-w-0 flex-1 basis-60">
        <h3 class="font-bold text-base text-ink break-words">Substituições & Postura ao Vivo ({{ match.matchState.subsUsed }}/5 usadas)</h3>
        <p class="text-xs text-ink-muted break-words">O cronômetro está pausado enquanto você ajusta o time. Reserva fora de posição entra com OVER reduzido; trocar um lesionado não gasta substituição.</p>
      </div>
      <button
        type="button"
        @click.prevent.stop="closeInMatchSubDrawer"
        :disabled="pending.length > 0"
        :title="pending.length ? 'Substitua o lesionado antes de retomar.' : undefined"
        class="shrink-0 px-4 py-2 min-h-11 md:min-h-0 rounded-xl bg-emeraldpro disabled:bg-borderline disabled:text-ink-muted disabled:cursor-not-allowed text-white text-xs font-bold"
      >
        Retomar Jogo
      </button>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-4 md:p-0 md:overflow-visible">
    <div v-if="pending.length" class="p-3 rounded-xl bg-dangerpro-soft/60 border border-dangerpro/40 text-xs text-ink break-words" role="alert">
      <strong class="text-dangerpro">Lesão em campo:</strong>
      {{ pending.map((p) => p.name).join(', ') }} precisa ser substituído para o jogo continuar. Essa troca não gasta substituição.
    </div>
    <div class="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-subtle border border-borderline">
      <p class="text-xs text-ink-muted min-w-0 flex-1 basis-56 break-words">
        <template v-if="missing.length">
          <strong class="text-dangerpro">Time com {{ missing.length }} {{ missing.length === 1 ? 'jogador' : 'jogadores' }} a menos.</strong>
          Reorganize para a melhor formação com quem está em campo.
        </template>
        <template v-else>Testa todas as formações e posições com quem está em campo e adota a de maior força.</template>
      </p>
      <button
        type="button"
        @click.prevent.stop="reorganizeTeam"
        class="shrink-0 px-4 py-2 min-h-11 md:min-h-0 rounded-xl bg-subtle hover:bg-borderline border border-borderline text-ink text-xs font-bold flex items-center gap-2"
      >
        <LayoutGrid class="w-4 h-4 text-emeraldpro" />
        Reorganizar time
      </button>
    </div>

    <MentalitySelector v-model="selectedMentality" variant="pills" />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="min-w-0">
        <label class="text-xs font-bold text-ink block mb-1.5">1. Quem sai (Titular em campo):</label>
        <select v-model="subOutId" class="w-full p-2.5 min-h-11 md:min-h-0 rounded-xl bg-subtle border border-borderline text-xs font-bold text-ink">
          <option value="">-- Selecione o titular --</option>
          <option v-for="st in outCandidates" :key="st.id" :value="st.id">
            {{ formatPosBR(st.position) }} • {{ st.name }} {{ st.injury ? '🩹 ' : '' }}(OVER {{ st.overall }} • Energia {{ Math.round(st.stamina ?? 100) }}%)
          </option>
        </select>
      </div>
      <div class="min-w-0">
        <label class="text-xs font-bold text-ink block mb-1.5">2. Quem entra (Banco de Reservas):</label>
        <select v-model="subInId" class="w-full p-2.5 min-h-11 md:min-h-0 rounded-xl bg-subtle border border-borderline text-xs font-bold text-ink">
          <option value="">-- Selecione o reserva --</option>
          <option v-for="bn in benchCandidates" :key="bn.id" :value="bn.id">
            {{ formatPosBR(bn.position) }} • {{ bn.name }} {{ bn.injury ? '🩹 ' : '' }}({{ effectiveLabel(bn) }} • Energia {{ Math.round(bn.stamina ?? 100) }}%)
          </option>
        </select>
      </div>
    </div>

    </div>

    <div class="shrink-0 flex flex-wrap justify-end gap-2 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-borderline md:border-0 md:p-0 [&>button]:flex-1 sm:[&>button]:flex-none">
      <button
        type="button"
        @click.prevent.stop="recommendSubstitution"
        class="px-5 py-2.5 min-h-11 md:min-h-0 rounded-xl bg-subtle hover:bg-borderline text-ink text-xs font-bold transition-colors flex items-center justify-center gap-2"
      >
        <Sparkles class="w-4 h-4 text-emeraldpro" />
        Substituição Recomendada
      </button>
      <button
        type="button"
        @click.prevent.stop="confirmInMatchSubstitution"
        :disabled="!subOutId || !subInId || (!forcedSub && match.matchState.subsUsed >= 5)"
        class="px-5 py-2.5 min-h-11 md:min-h-0 rounded-xl bg-amberpro disabled:opacity-40 text-white text-xs font-bold"
      >
        Confirmar Substituição
      </button>
    </div>
  </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Bandage } from 'lucide-vue-next'
import BaseModal from '@/components/ui/BaseModal.vue'
import EventIcon from '@/components/match/EventIcon.vue'
import { useSquadStore } from '@/stores/squad'
import { useUiStore } from '@/stores/ui'
import { useMatchStore } from '@/stores/match'
import { useSquad } from '@/composables/useSquad'
import { getEffectiveOvr } from '@/utils/match/calculateTeamStrength'
import { isSuspendedFor, suspensionText } from '@/utils/player/suspension'
import { formatPosBR } from '@/utils/format/formatCurrency'
import type { Player } from '@/types'

// Abaixo de lg o campo e a lista ficam empilhados: a troca acontece nesta folha, sem rolar até o elenco.
const squad = useSquadStore()
const ui = useUiStore()
const match = useMatchStore()
const { assignPlayerToSlot } = useSquad()

const isSmall = ref(false)
let mq: MediaQueryList | null = null
const sync = () => { isSmall.value = !!mq?.matches }
onMounted(() => {
  mq = window.matchMedia('(max-width: 1023.98px)')
  sync()
  mq.addEventListener('change', sync)
})
onBeforeUnmount(() => mq?.removeEventListener('change', sync))

const slot = computed(() => (ui.selectedPitchSlotIndex === null ? null : squad.pitchSlots[ui.selectedPitchSlotIndex] ?? null))

function blocked(p: Player): boolean {
  return isSuspendedFor(p, match.activeMatchCompetition)
}

const candidates = computed(() => {
  const s = slot.value
  if (!s) return []
  return squad.players
    .filter((p) => !p.isLoanedOut && p.id !== s.player?.id)
    .map((p) => ({ p, eff: getEffectiveOvr(p, s.role), same: p.position === s.role, starter: squad.isStarter(p.id) }))
    .sort((a, b) => Number(blocked(a.p)) - Number(blocked(b.p)) || Number(!!a.p.injury) - Number(!!b.p.injury) || Number(b.same) - Number(a.same) || b.eff - a.eff)
})

function pick(p: Player): void {
  if (blocked(p)) return
  assignPlayerToSlot(p.id)
}
function close(): void {
  ui.selectedPitchSlotIndex = null
}
</script>

<template>
  <BaseModal v-if="isSmall && slot" card-class="!p-0 sm:!p-0 space-y-0" @close="close">
    <div class="sticky top-0 bg-surface z-10 p-4 pb-3 border-b border-borderline flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="font-bold text-base text-ink break-words">Escalar na vaga {{ formatPosBR(slot.role) }}</h3>
        <p class="text-xs text-ink-muted break-words">
          <template v-if="slot.player">Sai: {{ slot.player.name }} ({{ slot.player.overall }}). </template>
          Reserva fora de posição entra com OVER reduzido.
        </p>
      </div>
      <button type="button" @click="close" class="shrink-0 min-h-11 px-3 rounded-xl bg-subtle border border-borderline text-ink text-xs font-bold">
        Cancelar
      </button>
    </div>
    <ul class="p-3 space-y-2">
      <li v-for="(c, i) in candidates" :key="c.p.id">
        <p v-if="i === 0 || candidates[i - 1].same !== c.same" class="px-1 pt-1 pb-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-muted">
          {{ c.same ? 'Na posição' : 'Fora de posição (OVER reduzido)' }}
        </p>
        <button
          type="button"
          :disabled="blocked(c.p)"
          @click="pick(c.p)"
          :class="[
            'w-full min-h-14 p-2.5 rounded-xl border flex items-center gap-3 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            c.starter ? 'bg-emeraldpro-soft/40 border-emeraldpro/40' : 'bg-subtle border-borderline'
          ]"
        >
          <div class="w-11 h-11 rounded-xl bg-surface border border-borderline flex flex-col items-center justify-center shrink-0">
            <span class="font-score font-extrabold text-sm text-emeraldpro leading-none">{{ c.eff }}</span>
            <span class="text-[11px] font-bold text-ink-muted">{{ formatPosBR(c.p.position) }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="font-bold text-xs text-ink truncate">{{ c.p.name }}</span>
              <span v-if="c.starter" class="px-1.5 py-0.5 rounded bg-surface border border-borderline text-ink-muted text-[11px] font-bold">Titular: troca de lugar</span>
              <EventIcon v-if="suspensionText(c.p)" kind="red" :size="16" />
              <span v-if="c.p.injury" class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-dangerpro text-white" role="img" :aria-label="`Lesionado, ${c.p.injury.matchesLeft} jogos`">
                <Bandage class="w-3 h-3" />
              </span>
            </div>
            <div class="text-[11px] text-ink-muted">
              OVER {{ c.p.overall }}<template v-if="c.eff !== c.p.overall"> → {{ c.eff }} na vaga</template>
              • Energia {{ Math.round(c.p.stamina ?? 100) }}%
              <template v-if="blocked(c.p)"> • Suspenso: {{ suspensionText(c.p) }}</template>
            </div>
          </div>
          <span v-if="i === 0 && !blocked(c.p)" class="shrink-0 px-1.5 py-0.5 rounded bg-emeraldpro text-white text-[10px] font-extrabold">Melhor</span>
          <span v-if="!blocked(c.p)" class="shrink-0 px-3 py-2 rounded-lg bg-amberpro text-white text-[11px] font-bold">Escalar</span>
        </button>
      </li>
    </ul>
  </BaseModal>
</template>

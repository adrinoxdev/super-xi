<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import PlayerCard from '@/components/player/PlayerCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useUiStore } from '@/stores/ui'
import { useScoutingStore } from '@/stores/scouting'
import { useSquadStore } from '@/stores/squad'
import { useClubStore } from '@/stores/club'
import { squadFullTitle } from '@/composables/useClub'
import { useScouting } from '@/composables/useScouting'
import { formatCurrency, formatPosBR } from '@/utils/format/formatCurrency'

const ui = useUiStore()
const scouting = useScoutingStore()
const squad = useSquadStore()
const club = useClubStore()
const { signScoutedPlayer } = useScouting()

const report = computed(() => scouting.reports.find((r) => r.id === ui.compareModal.reportId) ?? null)
const incumbent = computed(
  () => squad.players.find((p) => p.id === ui.compareModal.incumbentId) ?? null,
)

function close() {
  ui.closeCompare()
}
function sign() {
  if (!report.value) return
  signScoutedPlayer(report.value)
  close()
}
</script>

<template>
  <BaseModal v-if="ui.compareModal.open && report" @close="close">
    <div class="flex items-center justify-between gap-3 border-b border-borderline pb-3">
      <div class="min-w-0">
        <span class="text-[11px] font-bold uppercase text-emeraldpro">Análise Técnica Comparativa</span>
        <h3 class="text-lg font-extrabold text-ink break-words [overflow-wrap:anywhere]">{{ report.player.name }}</h3>
      </div>
      <button type="button" class="p-1.5 rounded-lg bg-subtle text-ink-muted shrink-0" @click="close">
        <X class="w-4 h-4" />
      </button>
    </div>

    <div class="grid grid-cols-2 gap-3 text-xs">
      <div class="min-w-0 p-2.5 sm:p-3.5 rounded-xl bg-emeraldpro-soft/50 border border-emeraldpro/40 space-y-1.5">
        <span class="text-[10px] font-bold uppercase text-emeraldpro block">Alvo do Scouting</span>
        <div class="flex justify-center py-1">
          <PlayerCard :player="report.player" size="sm" estimated mask-attrs :overall="report.estimatedOvr" />
        </div>
        <div class="font-bold text-sm text-ink break-words [overflow-wrap:anywhere]">{{ report.player.name }}</div>
        <div>Posição: <strong>{{ formatPosBR(report.player.position) }}</strong></div>
        <div>OVER Estimado: <strong>~{{ report.estimatedOvr }}</strong></div>
        <div>Potencial: <strong>~{{ report.estimatedPotential }}</strong></div>
        <div>Valor: <strong>{{ formatCurrency(report.player.value) }}</strong></div>
      </div>

      <div class="min-w-0 p-2.5 sm:p-3.5 rounded-xl bg-subtle border border-borderline space-y-1.5">
        <span class="text-[10px] font-bold uppercase text-ink-muted block">Melhor Titular da Posição</span>
        <template v-if="incumbent">
          <div class="flex justify-center py-1">
            <PlayerCard :player="incumbent" size="sm" />
          </div>
          <div class="font-bold text-sm text-ink break-words [overflow-wrap:anywhere]">{{ incumbent.name }}</div>
          <div>Posição: <strong>{{ formatPosBR(incumbent.position) }}</strong></div>
          <div>OVER Atual: <strong>{{ incumbent.overall }}</strong></div>
          <div>Potencial: <strong>{{ incumbent.potential }}</strong></div>
          <div>Valor: <strong>{{ formatCurrency(incumbent.value) }}</strong></div>
        </template>
        <p v-else class="text-ink-muted pt-2">Nenhum titular cadastrado nessa posição.</p>
      </div>
    </div>

    <div class="flex flex-wrap justify-end gap-2 pt-2">
      <button type="button" class="px-4 py-2 rounded-xl bg-subtle text-ink text-xs font-bold" @click="close">
        Fechar
      </button>
      <button
        type="button"
        class="px-5 py-2 rounded-xl bg-emeraldpro disabled:bg-borderline disabled:text-ink-muted disabled:cursor-not-allowed text-white text-xs font-bold"
        :disabled="squad.isFull"
        :title="squad.isFull ? squadFullTitle(squad.players.length, club.maxSquadCapacity) : undefined"
        @click="sign"
      >
        Contratar ({{ formatCurrency(report.player.value) }})
      </button>
    </div>
  </BaseModal>
</template>

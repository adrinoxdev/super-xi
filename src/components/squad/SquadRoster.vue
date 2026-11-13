<script setup lang="ts">
import { computed } from 'vue'
import { Bandage } from 'lucide-vue-next'
import { useSquadStore } from '@/stores/squad'
import { useClubStore } from '@/stores/club'
import { useUiStore } from '@/stores/ui'
import { useSquad } from '@/composables/useSquad'
import { retireAgeFor } from '@/utils/generatePlayer'
import { formatPosBR } from '@/utils/formatCurrency'

const squad = useSquadStore()
const club = useClubStore()
const ui = useUiStore()
const { filteredSquadPlayers, assignPlayerToSlot, recoverSquadStamina, openLoanMarketModal, openPlayerModal } = useSquad()

// Custo curto no botão (R$ 9,5k); o detalhe fica na dica.
const restCostLabel = computed(() => 'R$ ' + (club.restCostNow / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k')
const restResetLabel = computed(() => {
  const totalH = Math.ceil(club.restResetsInMs / 3600000)
  const d = Math.floor(totalH / 24)
  return d > 0 ? `${d}d ${totalH % 24}h` : `${totalH}h`
})
const restTitle = computed(
  () =>
    `Recupera energia de todo o elenco. Descansos hoje: ${club.restUsesToday}. O custo dobra a cada uso e volta ao valor inicial à meia-noite, em ${restResetLabel.value}.`
)

const filters = ['ALL', 'GK', 'DEF', 'MID', 'ATT'] as const
const filterLabels: Record<string, string> = { ALL: 'Todos', GK: 'GOL', DEF: 'DEF', MID: 'MEI', ATT: 'ATQ' }
</script>

<template>
  <div class="lg:col-span-5 bg-surface rounded-2xl p-4 sm:p-5 border border-borderline shadow-sm space-y-4">
    <div class="flex items-center justify-between gap-2">
      <div class="min-w-0">
        <h3 class="font-bold text-base text-ink">Elenco ({{ squad.players.length }}/{{ club.maxSquadCapacity }})</h3>
        <span v-if="squad.overLimit" class="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-amberpro-soft text-amberpro text-[10px] font-bold break-words">
          Elenco acima do limite: venda atletas para voltar a contratar.
        </span>
        <span v-else-if="squad.isFull" class="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-amberpro-soft text-amberpro text-[10px] font-bold">Elenco cheio</span>
        <p v-if="club.restUsesToday > 0" class="text-[11px] text-ink-muted break-words">
          Descansos hoje: {{ club.restUsesToday }} • custo reinicia em {{ restResetLabel }}
        </p>
        <p v-if="ui.selectedPitchSlotIndex !== null" class="text-[11px] font-bold text-amberpro break-words">
          Selecione um reserva abaixo para entrar na vaga #{{ ui.selectedPitchSlotIndex + 1 }}
        </p>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
        <button
          type="button"
          @click="recoverSquadStamina"
          class="px-2.5 py-1.5 rounded-xl bg-emeraldpro-soft hover:bg-emeraldpro hover:text-white text-emeraldpro text-[11px] font-bold transition-colors"
          :title="restTitle"
        >
          Descansar ({{ restCostLabel }})
        </button>
        <button
          type="button"
          @click="openLoanMarketModal"
          class="px-2.5 py-1.5 rounded-xl bg-subtle hover:bg-borderline border border-borderline text-ink text-[11px] font-bold transition-colors"
        >
          Empréstimos
        </button>
      </div>
    </div>

    <div class="flex gap-1.5 overflow-x-auto no-scrollbar">
      <button
        v-for="f in filters"
        :key="f"
        type="button"
        @click="ui.squadPositionFilter = f"
        :class="[
          'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors shrink-0',
          ui.squadPositionFilter === f ? 'bg-emeraldpro text-white' : 'bg-subtle text-ink-muted hover:text-ink'
        ]"
      >
        {{ filterLabels[f] }}
      </button>
    </div>

    <div class="space-y-2 max-h-[540px] overflow-y-auto pr-1">
      <div
        v-for="player in filteredSquadPlayers"
        :key="player.id"
        :class="[
          'p-3 rounded-xl border flex items-center justify-between gap-2 transition-colors',
          squad.isStarter(player.id) ? 'bg-emeraldpro-soft/40 border-emeraldpro/40' : 'bg-subtle border-borderline'
        ]"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-surface border border-borderline flex flex-col items-center justify-center shrink-0">
            <span class="font-score font-extrabold text-sm text-emeraldpro leading-none">{{ player.overall }}</span>
            <span class="text-[9px] font-bold text-ink-muted">{{ formatPosBR(player.position) }}</span>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="font-bold text-xs text-ink truncate" :title="player.name">{{ player.name }}</span>
              <span
                v-if="player.marketStatus === 'transfer_listed'"
                class="px-1.5 py-0.5 rounded bg-amberpro-soft text-amberpro text-[9px] font-bold shrink-0"
              >
                À Venda
              </span>
              <span
                v-if="player.isLoanedOut"
                class="px-1.5 py-0.5 rounded bg-surface border border-borderline text-ink-muted text-[9px] font-bold shrink-0"
              >
                Emprestado
              </span>
              <span
                v-if="player.contractYears === 1 && !player.isLoanedIn"
                class="px-1.5 py-0.5 rounded bg-amberpro-soft text-amberpro text-[9px] font-bold shrink-0"
              >
                Último ano
              </span>
              <span
                v-if="player.age + 1 >= retireAgeFor(player.position)"
                class="px-1.5 py-0.5 rounded bg-amberpro-soft text-amberpro text-[9px] font-bold shrink-0"
              >
                Aposenta
              </span>
              <span
                v-if="player.injury"
                class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-dangerpro text-white shrink-0"
                :title="`Lesionado: ${player.injury.matchesLeft} jogo(s) restantes`"
                role="img"
                :aria-label="`Lesionado, ${player.injury.matchesLeft} jogos restantes`"
              >
                <Bandage class="w-3 h-3" />
              </span>
            </div>
            <div class="text-[11px] text-ink-muted flex flex-wrap items-center gap-x-2">
              <span>{{ player.age }}a • Pot {{ player.potential }}</span>
              <span>• Energia {{ Math.round(player.stamina ?? 100) }}%</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <button
            v-if="ui.selectedPitchSlotIndex !== null && !player.isLoanedOut"
            type="button"
            @click="assignPlayerToSlot(player.id)"
            class="px-2.5 py-1.5 rounded-lg bg-amberpro text-white text-[11px] font-bold"
          >
            Escalar
          </button>
          <button
            type="button"
            @click="openPlayerModal(player)"
            class="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-borderline border border-borderline text-ink text-[11px] font-bold"
          >
            Gerenciar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

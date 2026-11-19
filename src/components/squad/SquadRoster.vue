<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import EventIcon from '@/components/match/EventIcon.vue'
import { suspensionText } from '@/utils/player/suspension'
import BaseButton from '@/components/ui/BaseButton.vue'
import { computed } from 'vue'
import { Bandage, Goal, HandHelping, Shirt } from 'lucide-vue-next'
import { useSquadStore } from '@/stores/squad'
import { useClubStore } from '@/stores/club'
import { useUiStore } from '@/stores/ui'
import { useMatchStore } from '@/stores/match'
import { STAMINA_REGEN_MS_PER_POINT, STAMINA_REGEN_PER_HOUR } from '@/config'
import { useSquad } from '@/composables/useSquad'
import { retireAgeFor } from '@/utils/player/generatePlayer'
import { formatPosBR } from '@/utils/format/formatCurrency'

const squad = useSquadStore()
const club = useClubStore()
const ui = useUiStore()
const match = useMatchStore()
const { filteredSquadPlayers, assignPlayerToSlot, selectRosterPlayer, cancelSelection, recoverSquadStamina, openLoanMarketModal, openPlayerModal } = useSquad()

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

// Recuperação natural: aviso só enquanto alguém está abaixo de 100; pausa durante partida ao vivo.
const regenLabel = computed(() => {
  if (!squad.players.some((p) => (p.stamina ?? 100) < 100)) return ''
  if (match.liveCompetitions.length) return `Recuperação natural pausada durante a partida (+${STAMINA_REGEN_PER_HOUR} de energia/h)`
  const left = Math.max(0, STAMINA_REGEN_MS_PER_POINT - (club.clubNow - club.staminaTickAt))
  const s = Math.ceil(left / 1000)
  return `Recuperação natural: +${STAMINA_REGEN_PER_HOUR} de energia/h • próximo ponto em ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})

const filters = ['ALL', 'GK', 'DEF', 'MID', 'ATT'] as const
const filterLabels: Record<string, string> = { ALL: 'Todos', GK: 'GOL', DEF: 'DEF', MID: 'MEI', ATT: 'ATQ' }
</script>

<template>
  <BaseCard padding="p-4 sm:p-5" class="lg:col-span-5 space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="min-w-0">
        <SectionTitle>Elenco ({{ squad.players.length }}/{{ club.maxSquadCapacity }})</SectionTitle>
        <span v-if="squad.overLimit" class="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-amberpro-soft text-amberpro text-[11px] md:text-[10px] font-bold break-words">
          Elenco acima do limite: venda atletas para voltar a contratar.
        </span>
        <span v-else-if="squad.isFull" class="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-amberpro-soft text-amberpro text-[11px] md:text-[10px] font-bold">Elenco cheio</span>
        <p v-if="club.restUsesToday > 0" class="text-[11px] text-ink-muted break-words">
          Descansos hoje: {{ club.restUsesToday }} • custo reinicia em {{ restResetLabel }}
        </p>
        <p v-if="regenLabel" class="text-[11px] text-ink-muted break-words">{{ regenLabel }}</p>
        <p v-if="ui.selectedRosterPlayerId" class="text-[11px] font-bold text-amberpro break-words">
          Veja no campo onde o atleta rende mais e toque na vaga.
          <button type="button" @click="cancelSelection" class="underline ml-1">Cancelar</button>
        </p>
        <p v-if="ui.selectedPitchSlotIndex !== null" class="hidden lg:block text-[11px] font-bold text-amberpro break-words">
          Selecione um reserva abaixo para entrar na vaga #{{ ui.selectedPitchSlotIndex + 1 }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-1.5 sm:justify-end sm:shrink-0">
        <BaseButton
          variant="soft"
          @click="recoverSquadStamina"
          class="min-h-[40px] sm:min-h-0 px-2.5 py-1.5 text-[11px] transition-colors"
          :title="restTitle"
        >
          Descansar ({{ restCostLabel }})
        </BaseButton>
        <button
          type="button"
          @click="openLoanMarketModal"
          class="min-h-[40px] sm:min-h-0 px-2.5 py-1.5 rounded-xl bg-subtle hover:bg-borderline border border-borderline text-ink text-[11px] font-bold transition-colors"
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
          'px-3 py-2 sm:py-1 rounded-lg text-xs font-bold transition-colors shrink-0',
          ui.squadPositionFilter === f ? 'bg-emeraldpro text-night' : 'bg-subtle text-ink-muted hover:text-ink'
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
          'p-3 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 transition-colors',
          ui.selectedRosterPlayerId === player.id ? 'bg-amberpro-soft border-amberpro ring-2 ring-amberpro/40' : squad.isStarter(player.id) ? 'bg-emeraldpro-soft border-emeraldpro/40' : 'bg-subtle border-borderline'
        ]"
      >
        <div class="flex items-center gap-2.5 min-w-0 flex-1">
          <div class="w-10 h-10 rounded-xl bg-surface border border-borderline flex flex-col items-center justify-center shrink-0">
            <span class="font-score font-extrabold text-sm text-emeraldpro leading-none">{{ player.overall }}</span>
            <span class="text-[11px] md:text-[10px] font-bold text-ink-muted">{{ formatPosBR(player.position) }}</span>
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5 min-w-0">
              <span class="font-bold text-xs text-ink truncate" :title="player.name">{{ player.name }}</span>
              <span
                v-if="player.marketStatus === 'transfer_listed'"
                class="px-1.5 py-0.5 rounded bg-amberpro-soft text-amberpro text-[11px] md:text-[10px] font-bold shrink-0"
              >
                À Venda
              </span>
              <span
                v-if="player.isLoanedOut"
                class="px-1.5 py-0.5 rounded bg-surface border border-borderline text-ink-muted text-[11px] md:text-[10px] font-bold shrink-0"
              >
                Emprestado
              </span>
              <span
                v-if="player.contractYears === 1 && !player.isLoanedIn"
                class="px-1.5 py-0.5 rounded bg-amberpro-soft text-amberpro text-[11px] md:text-[10px] font-bold shrink-0"
              >
                Último ano
              </span>
              <span
                v-if="player.age + 1 >= retireAgeFor(player.position)"
                class="px-1.5 py-0.5 rounded bg-amberpro-soft text-amberpro text-[11px] md:text-[10px] font-bold shrink-0"
              >
                Aposenta
              </span>
              <span
                v-if="suspensionText(player)"
                class="inline-flex items-center justify-center w-5 h-5 shrink-0"
                :title="`Suspenso: ${suspensionText(player)}`"
              >
                <EventIcon kind="red" :size="18" />
              </span>
              <span
                v-if="player.injury"
                class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-dangerpro text-night shrink-0"
                :title="`Lesionado: ${player.injury.matchesLeft} jogo(s) restantes`"
                role="img"
                :aria-label="`Lesionado, ${player.injury.matchesLeft} jogos restantes`"
              >
                <Bandage class="w-3 h-3" />
              </span>
            </div>
            <div class="text-[11px] text-ink-muted flex flex-wrap items-center gap-x-2">
              <span>{{ player.age }}a • Energia {{ Math.round(player.stamina ?? 100) }}%</span>
            </div>
            <div class="mt-0.5 flex flex-wrap items-center gap-1">
              <span
                class="inline-flex items-center gap-0.5 text-[11px] md:text-[10px] font-bold text-ink-muted"
                :aria-label="`Jogos na temporada: ${club.seasonApps[player.id] || 0}`"
                title="Jogos na temporada"
              >
                <Shirt class="w-3 h-3" aria-hidden="true" />{{ club.seasonApps[player.id] || 0 }}
              </span>
              <span
                class="inline-flex items-center gap-0.5 text-[11px] md:text-[10px] font-bold text-ink-muted"
                :aria-label="`Gols na temporada: ${club.seasonGoals[player.id] || 0}`"
                title="Gols na temporada"
              >
                <Goal class="w-3 h-3" aria-hidden="true" />{{ club.seasonGoals[player.id] || 0 }}
              </span>
              <span
                class="inline-flex items-center gap-0.5 text-[11px] md:text-[10px] font-bold text-ink-muted"
                :aria-label="`Assistências na temporada: ${club.seasonAssists[player.id] || 0}`"
                title="Assistências na temporada"
              >
                <HandHelping class="w-3 h-3" aria-hidden="true" />{{ club.seasonAssists[player.id] || 0 }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
          <button
            v-if="ui.selectedPitchSlotIndex !== null && !player.isLoanedOut"
            type="button"
            @click="assignPlayerToSlot(player.id)"
            class="hidden lg:block lg:flex-none px-2.5 py-1.5 rounded-lg bg-amberpro text-night text-[11px] font-bold"
          >
            Escalar
          </button>
          <button
            v-if="!player.isLoanedOut"
            type="button"
            @click="selectRosterPlayer(player.id)"
            :aria-pressed="ui.selectedRosterPlayerId === player.id"
            :class="[
              'flex-1 sm:flex-none min-h-[40px] sm:min-h-0 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold',
              ui.selectedRosterPlayerId === player.id ? 'bg-amberpro text-night border-amberpro' : 'bg-surface hover:bg-borderline border-borderline text-ink'
            ]"
          >
            Posição
          </button>
          <button
            type="button"
            @click="openPlayerModal(player)"
            class="flex-1 sm:flex-none min-h-[40px] sm:min-h-0 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-borderline border border-borderline text-ink text-[11px] font-bold"
          >
            Gerenciar
          </button>
        </div>
      </div>
    </div>
  </BaseCard>
</template>

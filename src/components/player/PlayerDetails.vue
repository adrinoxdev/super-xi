<script setup lang="ts">
import Badge from '@/components/ui/Badge.vue'
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import BaseModal from '@/components/ui/BaseModal.vue'
import PlayerCard from '@/components/player/PlayerCard.vue'
import { useSquadStore } from '@/stores/squad'
import { useUiStore } from '@/stores/ui'
import { useClubStore } from '@/stores/club'
import { useSquad, sellPriceFor, loanOutFeeFor, treatmentFor } from '@/composables/useSquad'
import { usePersistence } from '@/composables/usePersistence'
import { retireAgeFor, agingDrop, isYouthSaleLocked, youthUnlockSeason } from '@/utils/player/generatePlayer'
import { MARKET_STATUS_OPTIONS, TRAINING_FOCUS_OPTIONS } from '@/config'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import { formatCurrency } from '@/utils/format/formatCurrency'
import { suspensionText, suspensionsOf, yellowsOf } from '@/utils/player/suspension'

const ui = useUiStore()
const squad = useSquadStore()
const club = useClubStore()
const { saveGame } = usePersistence()
const { getRenewalCost, renewYearsFor, canRenew, renewPlayerContract, loanOutPlayer, sellSquadPlayer, treatInjury } = useSquad()

const player = computed(() =>
  ui.playerModal.playerId ? squad.players.find((p) => p.id === ui.playerModal.playerId) ?? null : null
)

const retireAge = computed(() => (player.value ? retireAgeFor(player.value.position) : 37))
const retiresNext = computed(() => !!player.value && player.value.age + 1 >= retireAge.value)
const lastYear = computed(() => !!player.value && player.value.contractYears === 1 && !player.value.isLoanedIn && !retiresNext.value)
// Queda de OVER que o atleta sofre na próxima virada (idade que terá depois dela).
const dropNext = computed(() => (player.value ? agingDrop(player.value.age + 1, player.value.position) : 0))
const seasonGain = computed(() => (player.value ? club.progress.seasonGains[player.value.id] || 0 : 0))
const historyStats = computed(() => {
  const p = player.value
  if (!p) return []
  const apps = club.careerStats[p.id]?.apps ?? 0
  const goals = club.careerStats[p.id]?.goals ?? 0
  return [
    { label: 'Jogos na carreira', value: apps },
    { label: 'Gols na carreira', value: goals },
    { label: 'Assistências na carreira', value: club.careerStats[p.id]?.assists ?? 0 },
    { label: 'Jogos na temporada', value: club.seasonApps[p.id] ?? 0 },
    { label: 'Gols na temporada', value: club.seasonGoals[p.id] ?? 0 },
    { label: 'Assistências na temporada', value: club.seasonAssists[p.id] ?? 0 },
    { label: 'Gols por jogo', value: apps > 0 ? (goals / apps).toFixed(2) : '—' },
  ]
})
const atPeak = computed(() => !!player.value && player.value.overall >= player.value.potential)
const overPercent = computed(() => (player.value && player.value.potential > 0 ? (player.value.overall / player.value.potential) * 100 : 0))
const sellBlocked = computed(() => !!player.value && sellPriceFor(player.value) <= 0)
const injured = computed(() => !!player.value?.injury)
const treatment = computed(() => (player.value ? treatmentFor(player.value) : null))
const youthLocked = computed(() => !!player.value && isYouthSaleLocked(player.value, club.season))
const youthUnlock = computed(() => (player.value ? youthUnlockSeason(player.value) : null))
const justArrived = computed(() => !!player.value && player.value.acquiredSeason === club.season)
const renewBlockedReason = computed(() => {
  const p = player.value
  if (!p || canRenew(p)) return ''
  if (p.age + 1 >= retireAgeFor(p.position)) return 'Atleta se aposenta na próxima virada: contrato não renovável'
  return 'Contrato no máximo (5 temp.)'
})
</script>

<template>
  <BaseModal v-if="ui.playerModal.open && player" @close="ui.closePlayer()">
    <div class="relative flex flex-col items-center gap-2 border-b border-borderline pb-4">
      <button
        type="button"
        class="absolute right-0 top-0 p-2.5 md:p-1.5 rounded-lg bg-subtle text-ink-muted"
        aria-label="Fechar"
        @click="ui.closePlayer()"
      >
        <X class="w-4 h-4" />
      </button>
      <PlayerCard :player="player" size="lg" show-stamina />
      <p class="text-xs text-ink-muted text-center break-words min-w-0">
        {{ player.age }} anos • Potencial {{ player.potential }} • Contrato: {{ player.contractYears }} temp.
      </p>
      <p class="text-xs text-ink-muted text-center break-words min-w-0">
        Valor {{ formatCurrency(player.value) }} • Salário {{ formatCurrency(player.wage) }} por jogo
        • Aposenta aos {{ retireAge }}{{ player.position === 'GK' ? ' (goleiro)' : '' }}
      </p>
      <div class="flex flex-wrap items-center justify-center gap-1.5 min-w-0">
        <Badge v-if="lastYear" tone="warning" shape="rounded" size="sm" class="break-words">
          Último ano: renove ou ele sai de graça na virada
        </Badge>
        <Badge v-if="retiresNext" tone="warning" shape="rounded" size="sm">Aposentadoria na próxima virada</Badge>
        <Badge v-if="dropNext > 0" tone="neutral-outline" shape="rounded" size="sm" class="break-words">
          Idade avançada: perde {{ dropNext }} de OVER na próxima virada
        </Badge>
      </div>
    </div>

    <div class="space-y-1.5 text-xs min-w-0">
      <div class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <span class="font-bold text-ink min-w-0 break-words">OVER {{ player.overall }} / potencial {{ player.potential }}</span>
        <span v-if="atPeak" class="text-ink-muted">No auge</span>
        <span v-else-if="seasonGain > 0" class="font-bold text-emeraldpro-hover">+{{ seasonGain }} nesta temporada</span>
        <span v-else class="text-ink-muted">+0 nesta temporada</span>
      </div>
      <ProgressBar :percent="overPercent" />
    </div>

    <div class="space-y-1.5 text-xs">
      <div class="font-bold text-ink">Histórico</div>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div v-for="s in historyStats" :key="s.label" class="p-2.5 rounded-xl bg-subtle border border-borderline">
          <div class="text-[11px] font-bold uppercase text-ink-muted">{{ s.label }}</div>
          <div class="font-bold text-ink">{{ s.value }}</div>
        </div>
      </div>
    </div>

    <div class="space-y-1.5 text-xs">
      <label class="font-bold text-ink block">Foco de Treinamento Individual</label>
      <select
        v-model="player.trainingFocus"
        class="w-full p-2.5 min-h-11 rounded-xl bg-subtle border border-borderline font-semibold text-ink"
        @change="saveGame()"
      >
        <option v-for="o in TRAINING_FOCUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
      <div>
        <label class="font-bold text-ink block mb-1">Status no Mercado</label>
        <select
          v-model="player.marketStatus"
          class="w-full p-2.5 min-h-11 rounded-xl bg-subtle border border-borderline font-semibold text-ink"
          @change="saveGame()"
        >
          <option v-for="o in MARKET_STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
      <div class="p-2.5 rounded-xl bg-subtle border border-borderline flex flex-col justify-center min-w-0">
        <span class="text-[11px] font-bold uppercase text-ink-muted">Valor de mercado</span>
        <strong class="font-score text-base text-ink truncate">{{ formatCurrency(player.value) }}</strong>
      </div>
    </div>

    <p v-if="renewBlockedReason && !player.isLoanedIn" class="text-[11px] text-ink-muted text-center break-words">{{ renewBlockedReason }}</p>
    <div
      v-if="injured && player.injury && !player.isLoanedIn"
      class="p-3 rounded-xl bg-dangerpro-soft/60 border border-dangerpro/40 flex flex-wrap items-center justify-between gap-2"
    >
      <p class="text-xs text-ink min-w-0 break-words">
        <strong class="text-dangerpro">Lesionado:</strong> fora por {{ player.injury.matchesLeft }} {{ player.injury.matchesLeft === 1 ? 'jogo' : 'jogos' }}.
        Para vender ou emprestar, aguarde a recuperação ou pague o tratamento.
        <span v-if="treatment && treatment.discount > 0" class="text-emeraldpro font-semibold">
          Departamento Médico nível {{ club.upgrades.medicalCenterLevel }}: -{{ Math.round(treatment.discount * 100) }}% no custo.
        </span>
      </p>
      <button
        v-if="treatment"
        type="button"
        :disabled="club.budget < treatment.cost"
        :title="club.budget < treatment.cost ? 'Saldo insuficiente para o tratamento.' : undefined"
        class="shrink-0 px-3 py-2 min-h-10 rounded-lg bg-dangerpro hover:opacity-90 disabled:opacity-50 text-white text-[11px] font-bold"
        @click="treatInjury(player)"
      >
        Tratar (-{{ treatment.removed }} {{ treatment.removed === 1 ? 'jogo' : 'jogos' }} • {{ formatCurrency(treatment.cost) }})
      </button>
      <span v-else-if="player.injury.treated" class="shrink-0 text-[11px] font-semibold text-ink-muted">Tratamento já realizado</span>
    </div>
    <div
      v-if="suspensionsOf(player).length && !player.isLoanedIn"
      class="p-3 rounded-xl bg-dangerpro-soft/60 border border-dangerpro/40 text-xs text-ink break-words"
    >
      <strong class="text-dangerpro">Suspenso:</strong> {{ suspensionText(player) }}.
      Fora só dessas competições; nas demais ele joga normalmente.
    </div>
    <p v-if="yellowsOf(player).length && !player.isLoanedIn" class="text-[11px] text-ink-muted text-center">
      Amarelos na temporada:
      <span v-for="(y, i) in yellowsOf(player)" :key="y.comp">{{ i ? ' • ' : ' ' }}{{ y.label }} {{ y.count }}/3</span>
      (o terceiro gera suspensão de 1 jogo na competição).
    </p>
    <p v-if="youthLocked && !player.isLoanedIn" class="text-[11px] text-ink-muted text-center break-words">
      Promovido da base: venda e empréstimo liberados na temporada {{ youthUnlock }}
    </p>
    <p v-else-if="justArrived && !player.isLoanedIn" class="text-[11px] text-ink-muted text-center break-words">
      Venda limitada ao valor pago nesta temporada ({{ formatCurrency(player.acquiredFee ?? 0) }})
    </p>
    <p v-if="player.isLoanedIn" class="pt-2 text-xs text-ink-muted text-center">Atleta emprestado: aguarde o fim do empréstimo</p>
    <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
      <button
        type="button"
        :disabled="!canRenew(player)"
        :title="renewBlockedReason || undefined"
        class="py-2.5 px-3 min-h-11 rounded-xl bg-emeraldpro-soft hover:bg-emeraldpro hover:text-white disabled:opacity-50 disabled:hover:bg-emeraldpro-soft disabled:hover:text-emeraldpro text-emeraldpro text-xs font-bold transition-colors break-words min-w-0"
        @click="renewPlayerContract(player)"
      >
        Renovar (+{{ renewYearsFor(player) }} temp. • luvas {{ formatCurrency(getRenewalCost(player)) }})
      </button>
      <button
        v-if="!player.isLoanedOut"
        type="button"
        :disabled="youthLocked || injured"
        :title="injured ? 'Atleta lesionado: aguarde a recuperação ou pague o tratamento.' : youthLocked ? `Promovido da base: empréstimo liberado na temporada ${youthUnlock}.` : undefined"
        class="py-2.5 px-3 min-h-11 rounded-xl bg-subtle hover:bg-borderline border border-borderline text-ink text-xs font-bold transition-colors disabled:opacity-50 disabled:hover:bg-subtle"
        @click="loanOutPlayer(player)"
      >
        Emprestar Saída (+{{ formatCurrency(loanOutFeeFor(player)) }})
      </button>
      <button
        type="button"
        :disabled="sellBlocked"
        :title="sellBlocked ? (injured ? 'Atleta lesionado: aguarde a recuperação ou pague o tratamento.' : youthLocked ? `Promovido da base: venda liberada na temporada ${youthUnlock}.` : 'Promovido nesta temporada: venda liberada na próxima.') : undefined"
        class="py-2.5 px-3 min-h-11 rounded-xl bg-dangerpro-soft hover:bg-dangerpro hover:text-white disabled:opacity-50 disabled:hover:bg-dangerpro-soft disabled:hover:text-dangerpro text-dangerpro text-xs font-bold transition-colors break-words min-w-0"
        @click="sellSquadPlayer(player)"
      >
        {{ injured ? 'Lesionado' : `Vender (+${formatCurrency(sellPriceFor(player))})` }}
      </button>
    </div>
  </BaseModal>
</template>

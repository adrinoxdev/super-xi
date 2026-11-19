<script setup lang="ts">
import { computed } from 'vue'
import { useMatchStore } from '@/stores/match'
import { useMatchSimulation } from '@/composables/useMatchSimulation'
import { formatCurrency } from '@/utils/format/formatCurrency'
import { signedFame } from '@/utils/friendlies/fame'
import { FRIENDLIES } from '@/config'
import Badge from '@/components/ui/Badge.vue'

const match = useMatchStore()
const { finishMatchAndReturn } = useMatchSimulation()
// Amistoso: bloco próprio no lugar da grade financeira (sem bilheteria, patrocínio nem folha).
const friendly = computed(() => match.lastMatchSummary?.friendly ?? null)
</script>

<template>
  <div v-if="match.lastMatchSummary" class="bg-surface rounded-2xl p-4 sm:p-5 border-2 border-emeraldpro shadow-sm space-y-4 animate-pop">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="min-w-0">
        <span class="text-xs font-bold uppercase text-emeraldpro">{{ friendly ? 'Resultado do Amistoso' : 'Relatório Financeiro da Partida' }}</span>
        <h3 v-if="friendly" class="text-lg font-extrabold text-ink break-words">
          Fama:
          <span :class="friendly.fameDelta > 0 ? 'text-emeraldpro' : friendly.fameDelta < 0 ? 'text-dangerpro' : 'text-ink'">
            {{ signedFame(friendly.fameDelta) }}
          </span>
        </h3>
        <h3 v-else class="text-lg font-extrabold text-ink break-words">
          Balanço Líquido:
          <span :class="match.lastMatchSummary.net >= 0 ? 'text-emeraldpro' : 'text-dangerpro'">
            {{ match.lastMatchSummary.net >= 0 ? '+' : '' }}{{ formatCurrency(match.lastMatchSummary.net) }}
          </span>
        </h3>
      </div>
      <button
        type="button"
        @click="finishMatchAndReturn"
        class="shrink-0 px-5 py-2.5 min-h-11 md:min-h-0 rounded-xl bg-emeraldpro hover:bg-emeraldpro-hover text-night text-xs sm:text-sm font-bold"
      >
        {{ friendly ? 'Voltar aos Amistosos' : 'Continuar Temporada' }}
      </button>
    </div>

    <template v-if="friendly">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Prêmio</span>
          <strong class="text-emeraldpro font-bold">+{{ formatCurrency(friendly.prize) }}</strong>
        </div>
        <div class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Fama</span>
          <strong class="font-bold" :class="friendly.fameDelta > 0 ? 'text-emeraldpro' : friendly.fameDelta < 0 ? 'text-dangerpro' : 'text-ink'">
            {{ signedFame(friendly.fameDelta) }}
          </strong>
        </div>
        <div class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Fama atual</span>
          <strong class="text-ink font-bold">{{ friendly.fameAfter }}</strong>
        </div>
        <div class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Posição</span>
          <strong class="text-ink font-bold">#{{ friendly.rankBefore }} → #{{ friendly.rankAfter }}</strong>
        </div>
      </div>
      <p
        v-if="friendly.paidCapReached"
        class="min-w-0 p-3 rounded-xl border border-amberpro/40 bg-amberpro-soft text-xs text-amberpro font-semibold break-words"
      >
        Limite diário de {{ FRIENDLIES.prize.paidWinsPerDay }} vitórias pagas atingido: esta vitória rendeu só fama. O limite renova à meia-noite.
      </p>
    </template>

    <template v-else>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Bilheteria</span>
          <strong class="text-emeraldpro font-bold">+{{ formatCurrency(match.lastMatchSummary.ticket) }}</strong>
        </div>
        <div class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Patrocínio</span>
          <strong class="text-emeraldpro font-bold">+{{ formatCurrency(match.lastMatchSummary.sponsor) }}</strong>
        </div>
        <div class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Bônus Resultado</span>
          <strong class="text-emeraldpro font-bold">+{{ formatCurrency(match.lastMatchSummary.winBonus) }}</strong>
        </div>
        <div class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Folha Salarial</span>
          <strong class="text-ink font-bold">-{{ formatCurrency(match.lastMatchSummary.wages) }}</strong>
        </div>
        <div v-if="(match.lastMatchSummary.maintenance ?? 0) > 0" class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Manutenção</span>
          <strong class="text-ink font-bold">-{{ formatCurrency(match.lastMatchSummary.maintenance ?? 0) }}</strong>
        </div>
        <div v-if="(match.lastMatchSummary.interest ?? 0) > 0" class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Juros da dívida</span>
          <strong class="text-dangerpro font-bold">-{{ formatCurrency(match.lastMatchSummary.interest ?? 0) }}</strong>
        </div>
      </div>

      <div
        v-if="match.lastMatchSummary.evolutions?.length || match.lastMatchSummary.milestones?.length"
        class="flex flex-wrap gap-1.5 min-w-0"
        aria-label="Evolução da partida"
      >
        <Badge
          v-for="(e, i) in match.lastMatchSummary.evolutions ?? []"
          :key="'ev' + i"
          tone="success-strong"
          size="sm"
          class="max-w-full min-w-0 truncate"
          :title="'+1 OVER: ' + e.name + ' (' + e.overall + ')'"
        >
          +1 OVER: {{ e.name }}
        </Badge>
        <Badge
          v-for="(m, i) in match.lastMatchSummary.milestones ?? []"
          :key="'ms' + i"
          tone="success-outline"
          size="sm"
          class="max-w-full min-w-0 break-words"
        >
          Marco: {{ m }}
        </Badge>
      </div>

      <p
        v-if="match.lastMatchSummary.forcedSale"
        class="min-w-0 p-3 rounded-xl border border-dangerpro/40 bg-dangerpro/10 text-xs text-dangerpro font-semibold break-words"
      >
        Venda forçada: {{ match.lastMatchSummary.forcedSale.name }} foi vendido por
        {{ formatCurrency(match.lastMatchSummary.forcedSale.price) }} para cobrir a dívida.
      </p>
    </template>
  </div>
</template>

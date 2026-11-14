<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Radio } from 'lucide-vue-next'
import MatchEventRow from '@/components/match/MatchEventRow.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import { useMatchStore } from '@/stores/match'
import { formatCurrency, getStatBarPct } from '@/utils/format/formatCurrency'
import { OUTCOME_UI, outcomeOf } from '@/utils/match/matchResult'

const route = useRoute()
const router = useRouter()
const match = useMatchStore()

const m = computed(() => match.matchHistory.find((r) => r.id === route.params.id))

// Mandante sempre à esquerda, como no placar ao vivo.
const left = computed(() => (m.value?.isHome ? m.value.userName : m.value?.opponentName) ?? '')
const right = computed(() => (m.value?.isHome ? m.value.opponentName : m.value?.userName) ?? '')
const leftScore = computed(() => (m.value?.isHome ? m.value.userScore : m.value?.opponentScore) ?? 0)
const rightScore = computed(() => (m.value?.isHome ? m.value.opponentScore : m.value?.userScore) ?? 0)

const rows = computed(() => {
  const s = m.value?.stats
  if (!s) return []
  return [
    { label: 'Posse de Bola', user: s.userPossession + '%', opp: 100 - s.userPossession + '%', pct: s.userPossession },
    { label: 'Finalizações', user: s.userShots, opp: s.oppShots, pct: getStatBarPct(s.userShots, s.oppShots) },
    { label: 'Chutes no Gol', user: s.userShotsOnTarget, opp: s.oppShotsOnTarget, pct: getStatBarPct(s.userShotsOnTarget, s.oppShotsOnTarget) },
    { label: 'Escanteios', user: s.userCorners, opp: s.oppCorners, pct: getStatBarPct(s.userCorners, s.oppCorners) },
    { label: 'Faltas', user: s.userFouls, opp: s.oppFouls, pct: getStatBarPct(s.userFouls, s.oppFouls) },
    { label: 'Cartões Amarelos', user: s.userYellows ?? 0, opp: s.oppYellows ?? 0, pct: getStatBarPct(s.userYellows ?? 0, s.oppYellows ?? 0) },
    { label: 'Cartões Vermelhos', user: s.userReds ?? 0, opp: s.oppReds ?? 0, pct: getStatBarPct(s.userReds ?? 0, s.oppReds ?? 0) },
    { label: 'Impedimentos', user: s.userOffsides ?? 0, opp: s.oppOffsides ?? 0, pct: getStatBarPct(s.userOffsides ?? 0, s.oppOffsides ?? 0) },
    { label: 'Laterais', user: s.userThrowIns ?? 0, opp: s.oppThrowIns ?? 0, pct: getStatBarPct(s.userThrowIns ?? 0, s.oppThrowIns ?? 0) }
  ]
})
</script>

<template>
  <section class="space-y-6 animate-pop">
    <button
      type="button"
      @click="router.push('/matches')"
      class="px-3 py-2 min-h-10 md:min-h-0 md:py-1.5 rounded-lg border border-borderline hover:bg-subtle text-ink-muted hover:text-ink font-bold text-xs flex items-center gap-1"
    >
      <ArrowLeft class="w-3.5 h-3.5" />
      Voltar às partidas
    </button>

    <BaseCard v-if="!m" class="text-sm text-ink-muted text-center py-8">Partida não encontrada.</BaseCard>

    <template v-else>
      <div class="bg-ink text-white rounded-2xl p-4 sm:p-6 shadow-md space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span :class="['px-2.5 py-1 rounded-full font-bold uppercase', OUTCOME_UI[outcomeOf(m)].cls]">
            {{ OUTCOME_UI[outcomeOf(m)].label }} • Encerrada
          </span>
          <span class="text-slate-300 font-medium min-w-0 break-words">{{ m.label.replace(' — ', ' • ') }} • Temp. {{ m.season }}</span>
        </div>
        <div class="grid grid-cols-3 items-center text-center py-2">
          <div class="flex flex-col items-center gap-1 min-w-0">
            <TeamCrest size="md" :name="left" :is-user="m.isHome" />
            <div class="font-bold text-sm sm:text-lg truncate max-w-full" :title="left">{{ left }}</div>
          </div>
          <div class="font-score font-extrabold text-3xl min-[400px]:text-4xl sm:text-5xl tracking-wider whitespace-nowrap text-emerald-400">
            {{ leftScore }} <span class="text-slate-500 text-2xl">x</span> {{ rightScore }}
          </div>
          <div class="flex flex-col items-center gap-1 min-w-0">
            <TeamCrest size="md" :name="right" :is-user="!m.isHome" />
            <div class="font-bold text-sm sm:text-lg truncate max-w-full" :title="right">{{ right }}</div>
          </div>
        </div>
        <p v-if="m.penalties" class="text-center text-sm font-bold text-amber-300">
          Pênaltis: {{ m.isHome ? m.penalties.user : m.penalties.opp }} x {{ m.isHome ? m.penalties.opp : m.penalties.user }}
        </p>
        <p class="text-[11px] text-slate-400 text-center">
          Formação {{ m.formation }} • Postura {{ m.mentality }} • {{ m.isHome ? 'Mandante' : 'Visitante' }}
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <BaseCard padding="p-4 sm:p-5" class="lg:col-span-7 space-y-3">
          <SectionTitle size="responsive">
            <template #icon><Radio class="w-4 h-4 text-emeraldpro shrink-0" /></template>
            Lance a Lance
          </SectionTitle>
          <div class="space-y-2 max-h-[50dvh] md:max-h-[420px] overflow-y-auto pr-1">
            <MatchEventRow v-for="(ev, idx) in m.events" :key="idx" :ev="ev" />
          </div>
        </BaseCard>

        <div class="lg:col-span-5 space-y-6">
          <BaseCard padding="p-4 sm:p-5" class="space-y-3">
            <SectionTitle size="responsive">Estatísticas</SectionTitle>
            <div class="flex justify-between gap-3 text-xs font-bold text-ink min-w-0">
              <span class="min-w-0 break-words sm:truncate" :title="m.userName">{{ m.userName }}</span>
              <span class="min-w-0 break-words sm:truncate" :title="m.opponentName">{{ m.opponentName }}</span>
            </div>
            <div v-for="r in rows" :key="r.label" class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="font-score font-bold text-ink">{{ r.user }}</span>
                <span class="text-ink-muted">{{ r.label }}</span>
                <span class="font-score font-bold text-ink">{{ r.opp }}</span>
              </div>
              <div class="h-1.5 rounded-full bg-ink/80 overflow-hidden">
                <div class="h-full bg-emeraldpro" :style="{ width: r.pct + '%' }"></div>
              </div>
            </div>
          </BaseCard>

          <BaseCard v-if="m.summary" padding="p-4 sm:p-5" class="space-y-2">
            <SectionTitle size="responsive">Resultado financeiro</SectionTitle>
            <div class="text-xs space-y-1.5">
              <div class="flex justify-between"><span class="text-ink-muted">Bilheteria</span><span class="font-semibold text-ink">{{ formatCurrency(m.summary.ticket) }}</span></div>
              <div class="flex justify-between"><span class="text-ink-muted">Patrocínio</span><span class="font-semibold text-ink">{{ formatCurrency(m.summary.sponsor) }}</span></div>
              <div class="flex justify-between"><span class="text-ink-muted">Bônus de vitória</span><span class="font-semibold text-ink">{{ formatCurrency(m.summary.winBonus) }}</span></div>
              <div class="flex justify-between"><span class="text-ink-muted">Salários</span><span class="font-semibold text-dangerpro">-{{ formatCurrency(m.summary.wages) }}</span></div>
              <div class="flex justify-between border-t border-borderline pt-1.5">
                <span class="font-bold text-ink">Saldo</span>
                <span :class="['font-score font-bold', m.summary.net < 0 ? 'text-dangerpro' : 'text-emeraldpro']">{{ formatCurrency(m.summary.net) }}</span>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>
    </template>
  </section>
</template>

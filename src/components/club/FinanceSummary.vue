<script setup lang="ts">
import { computed } from 'vue'
import { Wrench, Landmark, TrendingUp, Users } from 'lucide-vue-next'
import { useClubStore } from '@/stores/club'
import { useSquadStore } from '@/stores/squad'
import { formatCurrency } from '@/utils/formatCurrency'

const club = useClubStore()
const squad = useSquadStore()
const levelCap = computed(() => club.serieEconomy.levelCap)
const aboveCap = computed(() => club.upgrades.stadiumLevel > levelCap.value || club.upgrades.financeLevel > levelCap.value)
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="bg-surface rounded-2xl p-4 sm:p-5 border border-borderline shadow-sm">
      <div class="flex items-center justify-between text-xs font-semibold text-ink-muted uppercase tracking-wider">
        <span>Carteira do Clube</span>
        <Landmark class="w-4 h-4 text-emeraldpro" />
      </div>
      <div class="mt-2 font-score font-extrabold text-2xl sm:text-3xl break-words" :class="club.budget < 0 ? 'text-dangerpro' : 'text-ink'">{{ formatCurrency(club.budget) }}</div>
      <p v-if="club.budget < 0" class="mt-1 text-xs text-dangerpro break-words">
        Dívida — limite {{ formatCurrency(club.serieEconomy.debtLimit) }} na Série {{ ['A', 'B', 'C', 'D'][club.division - 1] ?? 'D' }}. Gastos bloqueados; acima do limite, atleta vendido à força.
      </p>
      <p v-else class="mt-1 text-xs text-ink-muted">Saldo livre para contratações, renovações e obras.</p>
    </div>

    <div class="bg-surface rounded-2xl p-4 sm:p-5 border border-borderline shadow-sm">
      <div class="flex items-center justify-between text-xs font-semibold text-ink-muted uppercase tracking-wider">
        <span>Folha Salarial / Jogo</span>
        <Users class="w-4 h-4 text-ink-muted" />
      </div>
      <div class="mt-2 font-score font-extrabold text-2xl sm:text-3xl break-words text-ink">-{{ formatCurrency(squad.totalWageBill) }}</div>
      <p class="mt-1 text-xs text-ink-muted">{{ squad.activeWagePlayersCount }} atletas remunerados ({{ squad.loanedOutCount }} emprestados fora).</p>
    </div>

    <div class="min-w-0 bg-surface rounded-2xl p-4 sm:p-5 border border-borderline shadow-sm">
      <div class="flex items-center justify-between text-xs font-semibold text-ink-muted uppercase tracking-wider">
        <span class="truncate">Manutenção / Jogo</span>
        <Wrench class="w-4 h-4 text-ink-muted shrink-0" />
      </div>
      <div class="mt-2 font-score font-extrabold text-2xl sm:text-3xl break-words text-ink">-{{ formatCurrency(club.maintenanceCost) }}</div>
      <p class="mt-1 text-xs text-ink-muted">Instalações construídas. Juros de 1% por jogo se o caixa estiver negativo.</p>
    </div>

    <div class="bg-surface rounded-2xl p-4 sm:p-5 border border-borderline shadow-sm">
      <div class="flex items-center justify-between text-xs font-semibold text-ink-muted uppercase tracking-wider">
        <span>Receita Fixa / Jogo</span>
        <TrendingUp class="w-4 h-4 text-emeraldpro" />
      </div>
      <div class="mt-2 font-score font-extrabold text-2xl sm:text-3xl break-words text-emeraldpro">
        +{{ formatCurrency(club.projectedStadiumIncome + club.projectedSponsorIncome) }}
      </div>
      <p class="mt-1 text-xs text-ink-muted">Bilheteria ({{ formatCurrency(club.projectedStadiumIncome) }}) + Patrocínio ({{ formatCurrency(club.projectedSponsorIncome) }}).</p>
    </div>
    <p v-if="aboveCap" class="sm:col-span-2 lg:col-span-4 text-xs text-ink-muted break-words">
      Estádio ou finanças acima do teto da série atual (nível {{ levelCap }}): os níveis excedentes não rendem receita, mas pagam manutenção.
    </p>
  </div>
</template>

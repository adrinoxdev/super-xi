<script setup lang="ts">
import { Receipt, RotateCcw, Trophy, Wallet } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useClubStore } from '@/stores/club'
import { useLeagueStore } from '@/stores/league'
import { useSquadStore } from '@/stores/squad'
import { useNavigation } from '@/composables/useNavigation'
import { useSeason } from '@/composables/useSeason'
import { formatCurrency } from '@/utils/formatCurrency'
import ClubCrest from '@/components/ui/ClubCrest.vue'

const base = import.meta.env.BASE_URL
const club = useClubStore()
const league = useLeagueStore()
const squad = useSquadStore()
const router = useRouter()
const { currentPageTitle } = useNavigation()
const { resetCareer } = useSeason()
</script>

<template>
  <header class="bg-surface/95 backdrop-blur border-b border-borderline sticky top-0 z-30 px-3 sm:px-6 py-2.5 md:py-0 md:h-20 flex items-center justify-between gap-2 sm:gap-3">
    <div class="flex items-center gap-2 min-w-0">
      <img :src="`${base}logo.png`" alt="Super XI" class="md:hidden h-9 w-auto shrink-0 select-none" draggable="false" />
      <ClubCrest size="sm" class="md:hidden" />
      <div class="min-w-0">
        <h2 class="font-bold text-sm sm:text-base md:text-lg text-ink leading-tight truncate">{{ currentPageTitle }}</h2>
        <p class="text-[11px] sm:text-xs text-ink-muted hidden sm:block truncate">{{ league.currentStageLabel }}</p>
      </div>
    </div>

    <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
      <div class="bg-subtle border border-borderline px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl flex items-center gap-1 sm:gap-2">
        <Wallet class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emeraldpro shrink-0" />
        <div>
          <span class="text-[9px] sm:text-[10px] uppercase tracking-wider text-ink-muted block leading-none">Carteira</span>
          <span class="font-score font-bold text-xs sm:text-base leading-tight whitespace-nowrap" :class="club.budget < 0 ? 'text-dangerpro' : 'text-ink'">{{ formatCurrency(club.budget) }}</span>
        </div>
      </div>

      <div class="hidden sm:flex bg-subtle border border-borderline px-3 py-1.5 rounded-xl items-center gap-2">
        <Receipt class="w-4 h-4 text-amberpro" />
        <div>
          <span class="text-[10px] uppercase tracking-wider text-ink-muted block leading-none">Folha / Jogo</span>
          <span class="font-score font-bold text-base text-dangerpro leading-tight">-{{ formatCurrency(squad.totalWageBill) }}</span>
        </div>
      </div>

      <button
        type="button"
        @click="router.push('/league')"
        class="bg-emeraldpro-soft border border-emeraldpro/30 hover:bg-emeraldpro hover:text-white text-emeraldpro px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl flex items-center gap-1 text-[11px] sm:text-xs font-bold transition-colors"
        title="Abrir Liga Aurora"
      >
        <Trophy class="w-3.5 h-3.5 shrink-0" />
        <span class="whitespace-nowrap">{{ league.userLeagueRank }}º ({{ league.userLeaguePoints }}p)</span>
      </button>

      <button
        type="button"
        @click="resetCareer"
        title="Reiniciar Carreira"
        class="p-1.5 sm:p-2 rounded-xl border border-borderline text-ink-muted hover:text-dangerpro hover:border-dangerpro transition-colors"
      >
        <RotateCcw class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    </div>
  </header>
</template>

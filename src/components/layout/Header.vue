<script setup lang="ts">
import { PlayCircle, Receipt, RotateCcw, Trophy, Wallet } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useClubStore } from '@/stores/club'
import { useMatchStore } from '@/stores/match'
import { useLeagueStore } from '@/stores/league'
import { useSquadStore } from '@/stores/squad'
import { useNavigation } from '@/composables/useNavigation'
import { useHeaderStats } from '@/composables/useHeaderStats'
import { usePageSubtitle } from '@/composables/usePageSubtitle'
import { useSeason } from '@/composables/useSeason'
import { formatCurrency } from '@/utils/format/formatCurrency'
import ClubCrest from '@/components/ui/ClubCrest.vue'

const base = import.meta.env.BASE_URL
const club = useClubStore()
const league = useLeagueStore()
const squad = useSquadStore()
const router = useRouter()
const match = useMatchStore()
const { currentPageTitle, isMatchRoute, goToMatchTab } = useNavigation()
const { stats } = useHeaderStats()
const { subtitle } = usePageSubtitle()
const { resetCareer } = useSeason()
</script>

<template>
  <header class="bg-surface/95 backdrop-blur border-b border-borderline sticky top-0 z-30 px-3 sm:px-6 py-2.5 md:py-0 md:h-20 flex items-center justify-between gap-2 sm:gap-3">
    <div class="flex items-center gap-2 min-w-0">
      <img :src="`${base}logo.png`" alt="Super XI" class="md:hidden h-9 w-auto shrink-0 select-none" draggable="false" />
      <ClubCrest size="sm" class="shrink-0 md:hidden" />
      <ClubCrest size="md" class="shrink-0 hidden md:block" />
      <div class="hidden md:block min-w-0">
        <h1 class="font-bold text-base lg:text-lg text-ink leading-tight truncate">{{ club.name }}</h1>
        <div class="mt-1 flex items-center gap-1.5 whitespace-nowrap">
          <span
            v-for="s in stats"
            :key="s.label"
            class="inline-flex items-center gap-1.5 bg-subtle border border-borderline rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-muted"
          >
            {{ s.label }} <b class="font-score text-xs text-ink">{{ s.value }}</b>
          </span>
        </div>
      </div>
      <div class="md:hidden min-w-0">
        <h2 class="font-bold text-sm sm:text-base text-ink leading-tight truncate">{{ currentPageTitle }}</h2>
        <p class="text-[11px] sm:text-xs text-ink-muted hidden sm:block truncate">{{ subtitle }}</p>
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
        v-if="!isMatchRoute && match.liveCompetitions.length"
        type="button"
        @click="goToMatchTab"
        class="bg-emeraldpro text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl flex items-center gap-1 text-[11px] sm:text-xs font-bold shadow-sm"
      >
        <PlayCircle class="w-3.5 h-3.5 shrink-0" />
        <span class="whitespace-nowrap">Voltar à partida</span>
      </button>

      <button
        type="button"
        @click="router.push('/league')"
        class="md:hidden bg-emeraldpro-soft border border-emeraldpro/30 hover:bg-emeraldpro hover:text-white text-emeraldpro px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl flex items-center gap-1 text-[11px] sm:text-xs font-bold transition-colors"
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

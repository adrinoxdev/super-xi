<script setup lang="ts">
import { PlayCircle, Receipt, RotateCcw, Trophy, Volume2, VolumeX, Wallet } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useClubStore } from '@/stores/club'
import { useMatchStore } from '@/stores/match'
import { useLeagueStore } from '@/stores/league'
import { useSquadStore } from '@/stores/squad'
import { useNavigation } from '@/composables/useNavigation'
import { useHeaderStats } from '@/composables/useHeaderStats'
import { usePageSubtitle } from '@/composables/usePageSubtitle'
import { useSeason } from '@/composables/useSeason'
import { useSfx } from '@/composables/useSfx'
import { formatCurrency } from '@/utils/format/formatCurrency'
import ClubCrest from '@/components/ui/ClubCrest.vue'
import { version as appVersion } from '../../../package.json'

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
const { muted, toggleMute } = useSfx()
</script>

<template>
  <header class="bg-night/95 backdrop-blur border-b border-borderline sticky top-0 z-30 px-3 sm:px-6 py-2 md:py-0 md:h-20 flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 md:gap-3">
    <div class="flex items-center justify-between gap-2 sm:gap-3 min-w-0 md:contents">
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
            {{ s.label }} <b class="font-score text-xs text-gold">{{ s.value }}</b>
          </span>
        </div>
      </div>
      <div class="md:hidden min-w-0">
        <h2 class="font-bold text-sm sm:text-base text-ink leading-tight truncate">{{ currentPageTitle }}</h2>
        <p class="text-[11px] sm:text-xs text-ink-muted truncate" :title="club.name">{{ club.name }}<template v-if="subtitle"> · {{ subtitle }}</template></p>
      </div>
    </div>

    <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
      <div class="bg-subtle border border-borderline px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl flex items-center gap-1 sm:gap-2">
        <Wallet class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emeraldpro shrink-0" />
        <div>
          <span class="text-[11px] md:text-[10px] uppercase tracking-wider text-ink-muted block leading-none">Carteira</span>
          <span class="font-score font-bold text-xs sm:text-base leading-tight whitespace-nowrap" :class="club.budget < 0 ? 'text-dangerpro' : 'text-ink'">{{ formatCurrency(club.budget) }}</span>
        </div>
      </div>

      <div class="hidden md:flex bg-subtle border border-borderline px-3 py-1.5 rounded-xl items-center gap-2">
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
        class="hidden md:flex bg-emeraldpro text-night px-3 py-1.5 rounded-xl items-center gap-1 text-xs font-bold shadow-sm"
      >
        <PlayCircle class="w-3.5 h-3.5 shrink-0" />
        <span class="whitespace-nowrap">Voltar à partida</span>
      </button>

      <button
        type="button"
        @click="toggleMute"
        :title="muted ? 'Ligar efeitos sonoros' : 'Desligar efeitos sonoros'"
        :aria-label="muted ? 'Ligar efeitos sonoros' : 'Desligar efeitos sonoros'"
        :aria-pressed="!muted"
        class="p-2.5 md:p-2 rounded-xl border border-borderline text-ink-muted hover:text-ink hover:border-gold transition-colors"
      >
        <VolumeX v-if="muted" class="w-4 h-4" />
        <Volume2 v-else class="w-4 h-4 text-gold" />
      </button>

      <button
        type="button"
        @click="resetCareer"
        title="Reiniciar Carreira"
        aria-label="Reiniciar Carreira"
        class="p-2.5 md:p-2 rounded-xl border border-borderline text-ink-muted hover:text-dangerpro hover:border-dangerpro transition-colors"
      >
        <RotateCcw class="w-4 h-4" />
      </button>
    </div>
    </div>

    <!-- Mobile/tablet: segunda linha com tudo que o desktop mostra no header -->
    <div class="md:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap -mx-3 px-3 sm:-mx-6 sm:px-6 pb-0.5">
      <button
        v-if="!isMatchRoute && match.liveCompetitions.length"
        type="button"
        @click="goToMatchTab"
        class="shrink-0 min-h-9 bg-emeraldpro text-night px-3 rounded-xl flex items-center gap-1 text-xs font-bold shadow-sm"
      >
        <PlayCircle class="w-3.5 h-3.5 shrink-0" />
        Voltar à partida
      </button>
      <button
        type="button"
        @click="router.push('/league')"
        class="shrink-0 min-h-9 bg-emeraldpro-soft border border-emeraldpro/30 hover:bg-emeraldpro hover:text-night text-emeraldpro-hover px-3 rounded-xl flex items-center gap-1 text-xs font-bold transition-colors"
        title="Abrir Liga Aurora"
      >
        <Trophy class="w-3.5 h-3.5 shrink-0" />
        {{ league.userLeagueRank }}º ({{ league.userLeaguePoints }}p)
      </button>
      <span class="shrink-0 inline-flex items-center gap-1.5 bg-subtle border border-borderline rounded-md px-2 py-1 text-[11px] uppercase tracking-wider text-ink-muted">
        <Receipt class="w-3.5 h-3.5 text-amberpro" />
        Folha / Jogo <b class="font-score text-xs text-dangerpro">-{{ formatCurrency(squad.totalWageBill) }}</b>
      </span>
      <span
        v-for="s in stats"
        :key="s.label"
        class="shrink-0 inline-flex items-center gap-1.5 bg-subtle border border-borderline rounded-md px-2 py-1 text-[11px] uppercase tracking-wider text-ink-muted"
      >
        {{ s.label }} <b class="font-score text-xs text-gold">{{ s.value }}</b>
      </span>
      <span class="shrink-0 font-score font-bold bg-subtle border border-borderline rounded-full px-2 py-0.5 text-[11px] text-ink">v{{ appVersion }}</span>
    </div>
  </header>
</template>

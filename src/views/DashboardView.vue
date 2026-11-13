<script setup lang="ts">
import { computed } from 'vue'
import { MailWarning, Clock3, Shield, Play, Trophy, Radar } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import FinanceSummary from '@/components/club/FinanceSummary.vue'
import TeamPowerBar from '@/components/ui/TeamPowerBar.vue'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import { useMatchSimulation } from '@/composables/useMatchSimulation'
import { useClubStore } from '@/stores/club'
import { useLeagueStore } from '@/stores/league'
import { useMarketStore } from '@/stores/market'
import { useScoutingStore } from '@/stores/scouting'
import { useSquadStore } from '@/stores/squad'
import { useUiStore } from '@/stores/ui'
import { retireAgeFor } from '@/utils/generatePlayer'
import SeasonReviewCard from '@/components/club/SeasonReviewCard.vue'
import { fmtDelta, fmtOver } from '@/utils/formatOver'
import PodiumArchiveCard from '@/components/bracket/PodiumArchiveCard.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
const club = useClubStore()
const ui = useUiStore()
const league = useLeagueStore()
const market = useMarketStore()
const scouting = useScoutingStore()
const squad = useSquadStore()
const { prepareMatch } = useMatchSimulation()
const trendDelta = computed(() => squad.teamStrength.rating - club.progress.seasonStartOver)
const trendUp = computed(() => Math.round(trendDelta.value * 10) >= 1)
const trendDown = computed(() => Math.round(trendDelta.value * 10) <= -1)
const expiringCount = computed(() => squad.players.filter((p) => !p.isLoanedIn && p.contractYears === 1 && p.age + 1 < retireAgeFor(p.position)).length)
const retiringCount = computed(() => squad.players.filter((p) => !p.isLoanedIn && p.age + 1 >= retireAgeFor(p.position)).length)
</script>

<template>
  <section class="space-y-6 animate-pop">
    <SeasonReviewCard />
    <PodiumArchiveCard
      v-if="club.previousPodiums.length && ui.hiddenPodiumSeason !== club.season - 1"
      :podiums="club.previousPodiums"
      :season="club.season - 1"
      @close="ui.hiddenPodiumSeason = club.season - 1"
    />
    <div
      v-if="market.incomingOffers.length > 0"
      class="bg-amberpro-soft border border-amberpro/40 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5"
    >
      <div class="flex items-center gap-2.5 text-xs sm:text-sm min-w-0">
        <MailWarning class="w-5 h-5 text-amberpro shrink-0" />
        <span class="text-ink">
          Você tem <strong>{{ market.incomingOffers.length }} proposta(s)</strong> de clubes rivais aguardando resposta no mercado!
        </span>
      </div>
      <button
        type="button"
        @click="router.push('/squad')"
        class="px-3.5 py-1.5 rounded-xl bg-amberpro text-white text-xs font-bold hover:opacity-90 self-start sm:self-auto shrink-0"
      >
        Ver Propostas
      </button>
    </div>

    <div v-if="squad.overLimit" class="bg-amberpro-soft border border-amberpro/40 rounded-2xl p-3.5 sm:p-4 flex items-start gap-2.5 text-xs sm:text-sm min-w-0">
      <Clock3 class="w-5 h-5 text-amberpro shrink-0" />
      <p class="min-w-0 break-words text-ink">Elenco acima do limite: venda atletas para voltar a contratar.</p>
    </div>

    <div
      v-if="expiringCount > 0 || retiringCount > 0"
      class="bg-amberpro-soft border border-amberpro/40 rounded-2xl p-3.5 sm:p-4 flex items-start gap-2.5 text-xs sm:text-sm min-w-0"
    >
      <Clock3 class="w-5 h-5 text-amberpro shrink-0" />
      <div class="space-y-0.5 min-w-0 break-words text-ink">
        <p v-if="expiringCount > 0">
          <strong>{{ expiringCount }} {{ expiringCount === 1 ? 'atleta' : 'atletas' }} em fim de contrato:</strong> renove até a virada
        </p>
        <p v-if="retiringCount > 0">
          <strong>{{ retiringCount }} {{ retiringCount === 1 ? 'aposentadoria' : 'aposentadorias' }}</strong> na próxima virada
        </p>
      </div>
    </div>

    <FinanceSummary />

    <BaseCard padding="p-4 sm:p-6">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div class="space-y-1.5 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-emeraldpro-soft text-emeraldpro text-[11px] font-bold uppercase tracking-wide max-w-full break-words">
              {{ league.currentStageLabel }}
            </span>
            <span class="text-xs font-semibold text-ink-muted min-w-0 break-words [overflow-wrap:anywhere]">
              {{ league.nextFixtureIsHome ? 'Mandante (' + club.stadiumName + ')' : 'Visitante' }}
            </span>
          </div>
          <h3 class="text-lg sm:text-2xl font-extrabold text-ink flex flex-wrap items-center gap-x-2 gap-y-1">
            <template v-if="league.nextFixtureIsHome">
              <span class="min-w-0 break-words [overflow-wrap:anywhere]">{{ club.name }}</span>
              <span class="inline-flex items-center gap-2"><TeamCrest size="sm" is-user />vs<TeamCrest size="sm" :name="league.nextOpponent.name" /></span>
              <span class="min-w-0 break-words [overflow-wrap:anywhere]">{{ league.nextOpponent.name }}</span>
            </template>
            <template v-else>
              <span class="min-w-0 break-words [overflow-wrap:anywhere]">{{ league.nextOpponent.name }}</span>
              <span class="inline-flex items-center gap-2"><TeamCrest size="sm" :name="league.nextOpponent.name" />vs<TeamCrest size="sm" is-user /></span>
              <span class="min-w-0 break-words [overflow-wrap:anywhere]">{{ club.name }}</span>
            </template>
          </h3>
          <p class="text-xs sm:text-sm text-ink-muted break-words">
            Estilo adversário: <strong class="text-ink">{{ league.nextOpponent.style }}</strong> • OVER estimado: <strong class="text-ink">{{ league.nextOpponent.power }}</strong>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            @click="router.push('/squad')"
            class="px-4 py-2.5 rounded-xl bg-subtle hover:bg-borderline text-ink text-xs sm:text-sm font-bold transition-colors flex items-center gap-2"
          >
            <Shield class="w-4 h-4 text-emeraldpro" />
            Ajustar Tática
          </button>
          <BaseButton
            @click="prepareMatch('league')"
            class="px-5 py-2.5 text-xs sm:text-sm shadow-sm transition-colors flex items-center gap-2"
          >
            <Play class="w-4 h-4 fill-current" />
            Jogar Partida
          </BaseButton>
        </div>
      </div>

      <TeamPowerBar
        variant="inline"
        :total="squad.teamStrength.total"
        :attack="squad.teamStrength.attack"
        :midfield="squad.teamStrength.midfield"
        :defense="squad.teamStrength.defense"
      />
      <p v-if="club.progress.seasonStartOver > 0" class="mt-3 text-xs text-ink-muted break-words min-w-0">
        <span class="font-bold" :class="trendUp ? 'text-emeraldpro' : ''" aria-hidden="true">{{ trendUp ? '▲' : trendDown ? '▼' : '=' }}</span>
        OVER do time <strong class="text-ink">{{ fmtOver(squad.teamStrength.rating) }}</strong>
        (<span :class="trendUp ? 'text-emeraldpro font-semibold' : ''">{{ fmtDelta(trendDelta) }}</span> na temporada)
      </p>
    </BaseCard>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <BaseCard padding="p-4 sm:p-5" class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h4 class="font-bold text-sm sm:text-base text-ink flex items-center gap-2 min-w-0">
            <Trophy class="w-4 h-4 text-emeraldpro shrink-0" />
            <span class="min-w-0 break-words">Classificação Atual ({{ league.serieMeta.name }})</span>
          </h4>
          <button type="button" @click="router.push('/league')" class="shrink-0 text-xs font-bold text-emeraldpro hover:underline">
            Tabela Completa
          </button>
        </div>

        <div class="divide-y divide-borderline text-xs">
          <div
            v-for="row in league.leagueStandings.slice(0, 6)"
            :key="row.teamId"
            :class="['py-2 px-2 flex items-center justify-between gap-2 rounded-lg', row.isUser ? 'bg-emeraldpro-soft/60 font-bold' : '']"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-5 shrink-0 text-center font-score font-bold text-sm text-ink-muted">{{ row.rank }}º</span>
              <TeamCrest class="shrink-0" size="xs" :team="row.teamId" :name="row.name" :is-user="row.isUser" />
              <span class="truncate text-ink" :title="row.name">{{ row.name }}</span>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <span class="text-ink-muted">{{ row.played }}J</span>
              <span class="font-score font-bold text-sm text-ink w-9 text-right">{{ row.points }} pts</span>
            </div>
          </div>
        </div>
      </BaseCard>

      <BaseCard padding="p-4 sm:p-5" class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h4 class="font-bold text-sm sm:text-base text-ink flex items-center gap-2 min-w-0">
            <Radar class="w-4 h-4 text-emeraldpro shrink-0" />
            <span class="min-w-0 break-words">Departamento de Scouting & Base</span>
          </h4>
          <button type="button" @click="router.push('/scouting')" class="shrink-0 text-xs font-bold text-emeraldpro hover:underline">
            Abrir Scouting
          </button>
        </div>

        <div class="grid grid-cols-3 gap-2.5 text-center">
          <div class="bg-subtle p-3 rounded-xl min-w-0 break-words">
            <span class="text-[11px] text-ink-muted block">Missões</span>
            <span class="font-score font-bold text-xl text-ink">{{ scouting.activeMissions.length }} / {{ club.scoutingSpec.slots }}</span>
          </div>
          <div class="bg-subtle p-3 rounded-xl min-w-0 break-words">
            <span class="text-[11px] text-ink-muted block">Relatórios</span>
            <span class="font-score font-bold text-xl text-ink">{{ scouting.visibleReports.length }}</span>
          </div>
          <div class="bg-subtle p-3 rounded-xl min-w-0 break-words">
            <span class="text-[11px] text-ink-muted block">Base Sub-20</span>
            <span class="font-score font-bold text-xl text-emeraldpro">{{ scouting.youthAcademyProspects.length }}</span>
          </div>
        </div>

        <p class="text-xs text-ink-muted leading-relaxed">
          Seu departamento opera no <strong class="text-ink">Nível {{ club.upgrades.scoutingLevel }}</strong> com precisão de
          <strong class="text-emeraldpro">{{ Math.round(club.scoutingSpec.accuracy * 100) }}%</strong> e chance de
          <strong class="text-emeraldpro">{{ Math.round(club.gemChanceWithStaff * 100) }}%</strong> de Joias Raras.
        </p>
      </BaseCard>
    </div>
  </section>
</template>

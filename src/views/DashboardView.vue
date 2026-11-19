<script setup lang="ts">
import { computed } from 'vue'
import { MailWarning, Clock3, Shield, Play, Trophy, Radar, CalendarClock } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import QuickStatusPanel from '@/components/club/QuickStatusPanel.vue'
import FinanceSummary from '@/components/club/FinanceSummary.vue'
import TeamPowerBar from '@/components/ui/TeamPowerBar.vue'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import NextMatchCard from '@/components/match/NextMatchCard.vue'
import { useMatchSimulation } from '@/composables/useMatchSimulation'
import type { MatchCompetition } from '@/types/match'
import { clubStyleByName } from '@/utils/league/clubStyle'
import { useClubStore } from '@/stores/club'
import { useCompetitionsStore } from '@/stores/competitions'
import { useLeagueStore } from '@/stores/league'
import { useMarketStore } from '@/stores/market'
import { useScoutingStore } from '@/stores/scouting'
import { useSquadStore } from '@/stores/squad'
import { useUiStore } from '@/stores/ui'
import { retireAgeFor } from '@/utils/player/generatePlayer'
import SeasonReviewCard from '@/components/club/SeasonReviewCard.vue'
import { fmtDelta, fmtOver } from '@/utils/format/formatOver'
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
const competitions = useCompetitionsStore()
const { prepareMatch, matchEntryLabel, opponentFor, labelFor, isHomeFor } = useMatchSimulation()

// Próximos jogos das competições (além da liga): só as que ainda têm partida a disputar.
const CUP_COMPETITIONS: MatchCompetition[] = ['cup', 'continental', 'supercup', 'recopa']
const upcomingCompetitionGames = computed(() =>
  CUP_COMPETITIONS.filter((c) => competitions.isCompetitionPlayable(c)).map((comp) => {
    const [name, ...rest] = labelFor(comp).replace(' — ', ' • ').split(' • ')
    return {
      comp,
      name,
      detail: rest.join(' • '),
      opponent: opponentFor(comp),
      style: clubStyleByName(opponentFor(comp).name),
      home: isHomeFor(comp)
    }
  })
)
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
        class="px-3.5 py-2.5 md:py-1.5 rounded-xl bg-amberpro text-night text-xs font-bold hover:opacity-90 self-start sm:self-auto shrink-0"
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

    <QuickStatusPanel />

    <FinanceSummary />

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <NextMatchCard
        :title="'Liga • ' + league.currentStageLabel.replace(' — ', ' • ')"
        :venue="league.nextFixtureIsHome ? 'Em casa (' + club.stadiumName + ')' : 'Fora'"
        :club-name="club.name"
        :is-home="league.nextFixtureIsHome"
        :opponent-name="league.nextOpponent.name"
        :opponent-power="league.nextOpponent.power"
        :opponent-style="league.nextOpponent.style"
        :play-label="matchEntryLabel('league', 'Jogar')"
        @tactics="router.push('/squad')"
        @play="prepareMatch('league')"
      />

      <NextMatchCard
        v-for="g in upcomingCompetitionGames"
        :key="g.comp"
        :title="g.name + (g.detail ? ' • ' + g.detail : '')"
        :venue="g.home ? 'Em casa (' + club.stadiumName + ')' : 'Fora'"
        :club-name="club.name"
        :is-home="g.home"
        :opponent-name="g.opponent.name"
        :opponent-power="g.opponent.power"
        :opponent-style="g.style"
        :play-label="matchEntryLabel(g.comp, 'Jogar')"
        @tactics="router.push('/squad')"
        @play="prepareMatch(g.comp)"
      />

      <BaseCard v-if="!upcomingCompetitionGames.length" padding="p-4 sm:p-5" class="flex flex-col items-center justify-center gap-2 text-center">
        <CalendarClock class="w-6 h-6 text-ink-muted" />
        <p class="text-xs text-ink-muted">Nenhum jogo de copa pendente no momento.</p>
        <button type="button" @click="router.push('/competitions')" class="min-h-11 md:min-h-0 px-3 md:px-0 text-xs font-bold text-emeraldpro hover:underline">
          Ver competições
        </button>
      </BaseCard>
    </div>

    <div class="space-y-2">
      <TeamPowerBar
        variant="cards"
        :total="squad.teamStrength.total"
        :attack="squad.teamStrength.attack"
        :midfield="squad.teamStrength.midfield"
        :defense="squad.teamStrength.defense"
      />
      <p v-if="club.progress.seasonStartOver > 0" class="text-xs text-ink-muted break-words min-w-0">
        <span class="font-bold" :class="trendUp ? 'text-emeraldpro' : ''" aria-hidden="true">{{ trendUp ? '▲' : trendDown ? '▼' : '=' }}</span>
        OVER do time <strong class="text-ink">{{ fmtOver(squad.teamStrength.rating) }}</strong>
        (<span :class="trendUp ? 'text-emeraldpro font-semibold' : ''">{{ fmtDelta(trendDelta) }}</span> na temporada)
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <BaseCard padding="p-4 sm:p-5" class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h4 class="font-bold text-sm sm:text-base text-ink flex items-center gap-2 min-w-0">
            <Trophy class="w-4 h-4 text-emeraldpro shrink-0" />
            <span class="min-w-0 break-words">Classificação Atual ({{ league.serieMeta.name }})</span>
          </h4>
          <button type="button" @click="router.push('/league')" class="shrink-0 -my-2.5 -mr-2 py-2.5 px-2 md:m-0 md:p-0 text-xs font-bold text-emeraldpro hover:underline">
            Tabela Completa
          </button>
        </div>

        <div class="divide-y divide-borderline text-xs">
          <div
            v-for="row in league.leagueStandings.slice(0, 6)"
            :key="row.teamId"
            :class="['py-2 px-2 flex items-center justify-between gap-2 rounded-lg', row.isUser ? 'bg-emeraldpro-soft font-bold' : '']"
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
          <button type="button" @click="router.push('/scouting')" class="shrink-0 -my-2.5 -mr-2 py-2.5 px-2 md:m-0 md:p-0 text-xs font-bold text-emeraldpro hover:underline">
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

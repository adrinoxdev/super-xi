<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ChevronLeft, ChevronRight, Play } from 'lucide-vue-next'
import { useClubStore } from '@/stores/club'
import { useLeagueStore } from '@/stores/league'
import { useMatchSimulation } from '@/composables/useMatchSimulation'
import { formatCurrency } from '@/utils/format/formatCurrency'
import { useSquadStore } from '@/stores/squad'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import BracketView from '@/components/bracket/BracketView.vue'
import PodiumCard from '@/components/bracket/PodiumCard.vue'
import PodiumArchiveCard from '@/components/bracket/PodiumArchiveCard.vue'
import { useUiStore } from '@/stores/ui'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'

const club = useClubStore()
const ui = useUiStore()
const squad = useSquadStore()
const league = useLeagueStore()
const { prepareMatch, matchEntryLabel } = useMatchSimulation()
const {
  serieMeta,
  currentRound,
  isKnockoutStage,
  currentStageLabel,
  knockoutAggregateScore,
  leagueStandings,
  knockoutBracket,
  knockoutPodium,
  groupStageStandings,
  otherQuadrangularStandings,
  nextUserFixture,
  competitionStage,
  selectedRound,
  maxStageRounds,
  fixturesForSelectedRound
} = storeToRefs(league)
const { getZoneBadgeClass, getTeamName } = league

const isSingleLeg = computed(() => competitionStage.value === 'D_THIRD' || competitionStage.value === 'C_THIRD')
const legLabel = computed(() => {
  if (isSingleLeg.value) return 'Jogo Único'
  const leg = nextUserFixture.value?.leg
  return leg === 1 ? 'Ida' : leg === 2 ? 'Volta' : 'Jogo Único'
})
const playLabel = computed(() => (isKnockoutStage.value ? `Jogar ${legLabel.value}` : `Jogar Rodada ${currentRound.value}`))

type Tab = 'table' | 'bracket'
const tabOptions: Array<{ key: Tab; label: string }> = [
  { key: 'table', label: 'Classificação' },
  { key: 'bracket', label: 'Chave do Mata-Mata' }
]
const activeTab = ref<Tab>(isKnockoutStage.value ? 'bracket' : 'table')
watch(isKnockoutStage, (v) => {
  if (v) activeTab.value = 'bracket'
})
const showBracket = computed(() => !!knockoutBracket.value)
const shownTab = computed<Tab>(() => (showBracket.value ? activeTab.value : 'table'))

const hasQuadrangulars = computed(() => otherQuadrangularStandings.value.length > 0)
const tables = computed(() => {
  if (hasQuadrangulars.value) {
    return [
      { key: 'main', caption: 'Seu quadrangular', rows: groupStageStandings.value },
      { key: 'other', caption: 'Outro quadrangular', rows: otherQuadrangularStandings.value }
    ]
  }
  if (club.division === 4 && isKnockoutStage.value) {
    return [{ key: 'main', caption: 'Grupo A1 (1ª fase)', rows: groupStageStandings.value }]
  }
  return [{ key: 'main', caption: '', rows: leagueStandings.value }]
})
</script>

<template>
  <section class="space-y-6 animate-pop">
    <PodiumArchiveCard
      v-if="club.previousPodiums.length && ui.hiddenPodiumSeason !== club.season - 1"
      :podiums="club.previousPodiums"
      :season="club.season - 1"
      @close="ui.hiddenPodiumSeason = club.season - 1"
    />
    <BaseCard padding="p-4 sm:p-6" class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div class="space-y-1.5 min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full bg-emeraldpro text-night text-xs font-extrabold uppercase">
            Série {{ serieMeta.code }}
          </span>
          <span class="text-xs font-semibold text-ink-muted">Temporada {{ club.season }}</span>
        </div>
        <h2 class="text-lg sm:text-2xl font-extrabold text-ink break-words">{{ serieMeta.name }}</h2>
        <p class="text-xs text-ink-muted break-words">{{ serieMeta.formatSummary }}</p>
        <p class="text-xs font-semibold text-emeraldpro break-words">
          Premiação do Campeão: {{ formatCurrency(serieMeta.championPrize) }}
        </p>
      </div>

      <BaseButton
        class="shrink-0 px-5 py-3 text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 self-start lg:self-auto"
        @click="prepareMatch('league')"
      >
        <Play class="w-4 h-4 fill-current" />
        {{ matchEntryLabel('league', playLabel) }}
      </BaseButton>
    </BaseCard>

    <div
      v-if="isKnockoutStage && nextUserFixture"
      class="bg-surface rounded-2xl p-4 sm:p-5 border-2 border-emeraldpro shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
    >
      <div class="min-w-0">
        <span class="text-[11px] font-bold uppercase tracking-wider text-emeraldpro">Confronto Eliminatório • {{ isSingleLeg ? 'Jogo Único' : 'Ida e Volta' }}</span>
        <h3 class="text-base sm:text-lg font-extrabold text-ink mt-0.5 break-words">{{ currentStageLabel }}</h3>
      </div>
      <div v-if="!isSingleLeg" class="min-w-0 max-w-full bg-subtle px-4 py-2.5 rounded-xl border border-borderline text-center">
        <span class="text-[11px] md:text-[10px] uppercase font-bold text-ink-muted block">Placar Agregado</span>
        <span class="font-score font-extrabold text-xl text-ink break-words">
          <span class="inline-flex max-w-full items-center gap-1.5 align-middle"><TeamCrest class="shrink-0" size="xs" is-user /><span class="min-w-0 break-words [overflow-wrap:anywhere]">{{ club.name }}</span></span>
          {{ knockoutAggregateScore.user }} x {{ knockoutAggregateScore.opp }}
          <span class="inline-flex max-w-full items-center gap-1.5 align-middle"><TeamCrest class="shrink-0" size="xs" :name="knockoutAggregateScore.rivalName" /><span class="min-w-0 break-words [overflow-wrap:anywhere]">{{ knockoutAggregateScore.rivalName }}</span></span>
        </span>
      </div>
    </div>

    <PodiumCard v-if="knockoutPodium" :podium="knockoutPodium" />

    <div v-if="showBracket" class="flex flex-wrap gap-1.5">
      <button
        v-for="t in tabOptions"
        :key="t.key"
        type="button"
        :class="['px-4 py-2.5 md:py-2 rounded-lg text-xs font-bold', shownTab === t.key ? 'bg-emeraldpro text-night' : 'bg-subtle text-ink-muted hover:text-ink']"
        @click="activeTab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <BracketView
      v-if="shownTab === 'bracket' && knockoutBracket"
      :bracket="knockoutBracket"
      title="Chave do Mata-Mata"
      :user-power="squad.teamStrength.total"
    />

    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <BaseCard padding="p-4 sm:p-5" class="lg:col-span-7 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <SectionTitle size="responsive" class="min-w-0">Tabela de Classificação</SectionTitle>
          <span class="shrink-0 text-[11px] text-ink-muted">Pts • V • SG • GP</span>
        </div>

        <div v-for="tb in tables" :key="tb.key" class="overflow-x-auto">
          <p v-if="tb.caption" class="text-[11px] font-bold uppercase tracking-wide text-ink-muted mb-1">{{ tb.caption }}</p>
          <table class="w-full min-w-[460px] md:min-w-0 text-xs text-left border-collapse">
            <thead>
              <tr class="border-b border-borderline text-[11px] uppercase text-ink-muted">
                <th class="py-2.5 px-2 w-9">#</th>
                <th class="py-2.5 px-2 sticky left-0 z-10 bg-surface md:static md:bg-transparent">Clube</th>
                <th class="py-2.5 px-2 text-center font-bold text-ink">P</th>
                <th class="py-2.5 px-2 text-center">J</th>
                <th class="py-2.5 px-2 text-center">V</th>
                <th class="py-2.5 px-2 text-center">E</th>
                <th class="py-2.5 px-2 text-center">D</th>
                <th class="py-2.5 px-2 text-center">GP</th>
                <th class="py-2.5 px-2 text-center">GC</th>
                <th class="py-2.5 px-2 pr-3 text-center">SG</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-borderline">
              <tr
                v-for="row in tb.rows"
                :key="row.teamId"
                :class="['transition-colors', row.isUser ? 'bg-emeraldpro-soft/70 font-bold' : 'hover:bg-subtle/70']"
              >
                <td class="py-2.5 px-2">
                  <span
                    :class="[
                      'w-6 h-6 rounded-md inline-flex items-center justify-center font-score font-bold text-xs',
                      getZoneBadgeClass(row.rank)
                    ]"
                  >
                    {{ row.rank }}
                  </span>
                </td>
                <td :class="['py-2.5 px-2 text-ink max-w-[140px] sm:max-w-[190px] sticky left-0 z-10 md:static md:bg-transparent', row.isUser ? 'bg-emeraldpro-soft' : 'bg-surface']">
                  <span class="flex items-center gap-2 min-w-0">
                    <TeamCrest class="shrink-0" size="xs" :team="row.teamId" :name="row.name" :is-user="row.isUser" />
                    <span class="truncate" :title="row.name">{{ row.name }}</span>
                  </span>
                </td>
                <td class="py-2.5 px-2 text-center font-score font-extrabold text-sm text-ink">{{ row.points }}</td>
                <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.played }}</td>
                <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.won }}</td>
                <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.drawn }}</td>
                <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.lost }}</td>
                <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.gf }}</td>
                <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.ga }}</td>
                <td class="py-2.5 px-2 pr-3 text-center font-semibold" :class="row.gd >= 0 ? 'text-emeraldpro' : 'text-dangerpro'">
                  {{ row.gd > 0 ? '+' + row.gd : row.gd }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>

      <BaseCard padding="p-4 sm:p-5" class="lg:col-span-5 space-y-4">
        <div class="flex items-center justify-between gap-2">
          <SectionTitle size="responsive" class="min-w-0">Jogos da Rodada</SectionTitle>
          <div class="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              class="p-2.5 md:p-1.5 rounded-lg bg-subtle hover:bg-borderline text-ink"
              @click="selectedRound = Math.max(1, selectedRound - 1)"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <span class="text-xs font-bold px-2 text-ink">R{{ selectedRound }} / {{ maxStageRounds }}</span>
            <button
              type="button"
              class="p-2.5 md:p-1.5 rounded-lg bg-subtle hover:bg-borderline text-ink"
              @click="selectedRound = Math.min(maxStageRounds, selectedRound + 1)"
            >
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <div
            v-for="fx in fixturesForSelectedRound"
            :key="fx.id"
            :class="[
              'p-3 rounded-xl border text-xs flex items-center justify-between gap-2',
              fx.homeId === 'user' || fx.awayId === 'user'
                ? 'bg-emeraldpro-soft/50 border-emeraldpro/40 font-bold'
                : 'bg-subtle border-borderline'
            ]"
          >
            <span class="flex-1 min-w-0 flex items-center justify-end gap-1.5 text-ink">
              <span class="truncate" :title="getTeamName(fx.homeId)">{{ getTeamName(fx.homeId) }}</span>
              <TeamCrest class="shrink-0" size="xs" :team="fx.homeId" :name="getTeamName(fx.homeId)" />
            </span>
            <span class="px-2.5 py-1 rounded-lg bg-surface border border-borderline font-score font-extrabold text-sm text-ink shrink-0">
              {{ fx.played ? fx.homeScore + ' x ' + fx.awayScore : 'vs' }}
            </span>
            <span class="flex-1 min-w-0 flex items-center justify-start gap-1.5 text-ink">
              <TeamCrest class="shrink-0" size="xs" :team="fx.awayId" :name="getTeamName(fx.awayId)" />
              <span class="truncate" :title="getTeamName(fx.awayId)">{{ getTeamName(fx.awayId) }}</span>
            </span>
          </div>
        </div>
      </BaseCard>
    </div>
  </section>
</template>

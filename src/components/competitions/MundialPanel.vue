<script setup lang="ts">
import { computed, ref } from 'vue'
import { Globe, Play } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ListRow from '@/components/ui/ListRow.vue'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import BracketView from '@/components/bracket/BracketView.vue'
import PodiumCard from '@/components/bracket/PodiumCard.vue'
import MundialCycleCard from '@/components/competitions/MundialCycleCard.vue'
import { useCompetitionsStore } from '@/stores/competitions'
import { useClubStore } from '@/stores/club'
import { useSquadStore } from '@/stores/squad'
import { useMatchSimulation } from '@/composables/useMatchSimulation'
import { formatCurrency } from '@/utils/format/formatCurrency'
import { MUNDIAL_EVERY, MUNDIAL_LABEL, PRIZES } from '@/config'
import { sortGroup } from '@/utils/groups/groupStage'
import { cycleInfo, hostForSeason } from '@/utils/competitions/mundialCycle'
import type { ContinentalTeam } from '@/types/competitions'

const competitions = useCompetitionsStore()
const { mundialState, mundialStageLabel, mundialStandings, mundialOpponent } = storeToRefs(competitions)
const club = useClubStore()
const squad = useSquadStore()
const { prepareMatch, matchEntryLabel } = useMatchSimulation()

const P = PRIZES.mundial
const m = computed(() => mundialState.value)
const info = computed(() => cycleInfo(club.ecoRecords, club.season))
const editionNow = computed(() => club.season % MUNDIAL_EVERY === 0)
const editionHost = computed(() => {
  const h = hostForSeason(club.season)
  return h.name
})
const last = computed(() => m.value.last ?? null)
const lastGroupId = ref('')
const lastGroup = computed(() => last.value?.groups.find((g) => g.id === lastGroupId.value) ?? last.value?.groups[0])

const canPlay = computed(() => m.value.qualified && !m.value.eliminated && !m.value.champion && m.value.stage !== 'DONE')
const playLabel = computed(() => {
  if (m.value.stage === 'GROUPS') return `Jogar Grupo ${m.value.userGroupId}, ${m.value.groupRound}ª rodada`
  return 'Jogar ' + (mundialStageLabel.value.split(': ')[1] ?? 'Partida')
})
const statusBadge = computed(() => {
  const c = m.value
  if (c.finalPosition === 1 || c.champion) return { text: 'Campeão', cls: 'bg-emeraldpro text-night' }
  if (c.finalPosition === 2) return { text: 'Vice-campeão', cls: 'bg-subtle text-ink' }
  if (c.finalPosition === 3) return { text: '3º lugar', cls: 'bg-emeraldpro-soft text-emeraldpro' }
  if (c.finalPosition === 4) return { text: '4º lugar', cls: 'bg-subtle text-ink' }
  if (c.eliminated) return { text: 'Eliminado', cls: 'bg-subtle text-ink' }
  return null
})
const entryLabel = computed(() =>
  m.value.userEntry === 'ouro' ? 'Campeão da Copa Condor de Ouro' : m.value.userEntry === 'sede' ? 'Sede' : 'Ranking Condor'
)

const otherGroups = computed(() =>
  m.value.groups
    .filter((g) => g.id !== m.value.userGroupId)
    .map((g) => ({ id: g.id, rows: sortGroup(g.teams) as ContinentalTeam[] }))
)
const pickedGroup = ref('')
const shownOther = computed(() => otherGroups.value.find((g) => g.id === pickedGroup.value) ?? otherGroups.value[0])
const sg = (r: ContinentalTeam) => r.gf - r.ga
</script>

<template>
  <div>
    <!-- Sem vaga do usuário -->
    <div v-if="!m.qualified" class="space-y-6">
      <BaseCard v-if="editionNow" class="space-y-2">
        <div class="flex items-start gap-3 min-w-0">
          <Globe class="w-6 h-6 text-ink-muted shrink-0 mt-0.5" />
          <div class="min-w-0 space-y-1">
            <h3 class="text-base sm:text-lg font-extrabold text-ink break-words">{{ MUNDIAL_LABEL }} • edição desta temporada</h3>
            <p class="text-xs text-ink-muted break-words">
              Sede: <strong class="text-ink">{{ editionHost }}</strong>. Seu clube não está entre os 32 participantes: o torneio foi disputado sem você, e os grupos e o campeão aparecem abaixo.
            </p>
          </div>
        </div>
      </BaseCard>
      <BaseCard v-else class="space-y-3">
        <div class="flex items-start gap-3 min-w-0">
          <Globe class="w-6 h-6 text-ink-muted shrink-0 mt-0.5" />
          <div class="min-w-0">
            <h3 class="text-base sm:text-lg font-extrabold text-ink break-words">{{ MUNDIAL_LABEL }}</h3>
            <p class="text-xs text-ink-muted break-words">
              Daqui a <strong class="text-ink">{{ info.remaining }} {{ info.remaining === 1 ? 'temporada' : 'temporadas' }}</strong> (temporada {{ info.target }}). Sede: <strong class="text-ink">{{ info.hostName }}</strong>.
            </p>
          </div>
        </div>
        <div class="p-3 rounded-xl bg-subtle border border-borderline text-xs space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-ink-muted">Ranking Condor (corte de {{ info.cutoff }})</span>
            <span class="font-bold text-ink tabular-nums">{{ info.total }} pontos</span>
          </div>
          <div class="h-2 rounded-full bg-surface overflow-hidden">
            <div class="h-full bg-emeraldpro" :style="{ width: Math.min(100, (info.total / info.cutoff) * 100) + '%' }"></div>
          </div>
        </div>
      </BaseCard>
      <BaseCard v-if="last" class="space-y-3">
        <h4 class="font-bold text-sm text-ink">Notícia: {{ MUNDIAL_LABEL }} da temporada {{ last.season }}</h4>
        <p class="text-xs text-ink-muted break-words">
          Sede: <strong class="text-ink">{{ last.hostName }}</strong>. Campeão: <strong class="text-ink">{{ last.champion }}</strong>.
          Vice: {{ last.runnerUp }}<template v-if="last.third">. 3º: {{ last.third }}</template><template v-if="last.fourth">. 4º: {{ last.fourth }}</template>.
        </p>
        <div class="flex flex-wrap items-center gap-1.5 bg-subtle p-1 rounded-xl border border-borderline self-start max-w-full">
          <button
            v-for="g in last.groups"
            :key="g.id"
            type="button"
            @click="lastGroupId = g.id"
            :class="[
              'px-3 py-2.5 md:py-1.5 rounded-lg text-xs font-bold transition-all',
              lastGroup && lastGroup.id === g.id ? 'bg-emeraldpro text-night shadow-sm' : 'text-ink-muted hover:text-ink'
            ]"
          >
            Grupo {{ g.id }}
          </button>
        </div>
        <table v-if="lastGroup" class="w-full text-[11px] text-left">
          <thead>
            <tr class="border-b border-borderline uppercase text-ink-muted">
              <th class="py-1 pr-1">#</th>
              <th class="py-1">Clube</th>
              <th class="py-1 px-1 text-center">P</th>
              <th class="py-1 pl-1 text-center">SG</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-borderline">
            <tr v-for="(row, idx) in lastGroup.rows" :key="row.id">
              <td class="py-1.5 pr-1">{{ idx + 1 }}º</td>
              <td class="py-1.5 text-ink max-w-0 w-full"><span class="block truncate" :title="row.name">{{ row.name }}</span></td>
              <td class="py-1.5 px-1 text-center font-bold">{{ row.points }}</td>
              <td class="py-1.5 pl-1 text-center">{{ row.gf - row.ga }}</td>
            </tr>
          </tbody>
        </table>
      </BaseCard>
      <MundialCycleCard />
    </div>

    <!-- Com o usuário na edição -->
    <div v-else class="space-y-6">
      <BaseCard class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="space-y-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="max-w-full break-words px-2.5 py-0.5 rounded-full bg-emeraldpro text-night text-xs font-bold uppercase">{{ MUNDIAL_LABEL }}</span>
              <span v-if="statusBadge" :class="['max-w-full break-words px-2.5 py-0.5 rounded-full text-xs font-bold', statusBadge.cls]">{{ statusBadge.text }}</span>
            </div>
            <h3 class="text-lg sm:text-xl font-extrabold text-ink break-words">{{ mundialStageLabel }}</h3>
            <p class="text-xs text-ink-muted break-words">Entrada: {{ entryLabel }}. 8 grupos de 4, chave de 16 em jogo único, em campo neutro.</p>
          </div>
          <BaseButton
            v-if="canPlay"
            @click="prepareMatch('mundial')"
            class="shrink-0 px-5 py-3 text-xs sm:text-sm shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <Play class="w-4 h-4 fill-current" />
            {{ matchEntryLabel('mundial', playLabel) }}
          </BaseButton>
        </div>
        <div v-if="canPlay && mundialOpponent" class="p-3 rounded-xl bg-subtle border border-borderline text-xs flex flex-wrap items-center justify-between gap-2">
          <span class="text-ink-muted">Próximo adversário</span>
          <span class="min-w-0 break-words font-bold text-ink text-right">{{ mundialOpponent.name }} <span class="text-ink-muted font-semibold">• OVER {{ mundialOpponent.power }}</span></span>
        </div>
        <p class="text-[11px] text-ink-muted break-words">
          Prêmios: oitavas {{ formatCurrency(P.r16) }} • quartas {{ formatCurrency(P.qf) }} • semifinal {{ formatCurrency(P.sf) }} •
          3º lugar {{ formatCurrency(P.thirdWin) }} • vice {{ formatCurrency(P.finalLoss) }} • campeão {{ formatCurrency(P.champion) }}
        </p>
      </BaseCard>

      <PodiumCard v-if="m.bracket?.podium" :podium="m.bracket.podium" />

      <BaseCard class="space-y-3">
        <h4 class="font-bold text-sm text-ink">Grupo {{ m.userGroupId }}</h4>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[380px] text-xs text-left">
            <thead>
              <tr class="border-b border-borderline text-[11px] uppercase text-ink-muted">
                <th class="py-2 px-2">#</th>
                <th class="py-2 px-2">Clube</th>
                <th class="py-2 px-2 text-center">P</th>
                <th class="py-2 px-2 text-center">J</th>
                <th class="py-2 px-2 text-center">V</th>
                <th class="py-2 px-2 text-center">SG</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-borderline">
              <tr v-for="(row, idx) in mundialStandings" :key="row.id" :class="row.isUser ? 'bg-emeraldpro-soft font-bold' : ''">
                <td class="py-2 px-2">{{ idx + 1 }}º</td>
                <td class="py-2 px-2 text-ink max-w-[180px] sm:max-w-[280px]">
                  <span class="flex items-center gap-2 min-w-0">
                    <TeamCrest class="shrink-0" size="xs" :team="row.id" :name="row.name" :is-user="row.isUser" />
                    <span class="truncate" :title="row.name">{{ row.name }}</span>
                    <span class="shrink-0 whitespace-nowrap text-[11px] text-ink-muted font-semibold">OVER {{ row.isUser ? squad.teamStrength.total : row.power }}</span>
                  </span>
                </td>
                <td class="py-2 px-2 text-center font-bold">{{ row.points }}</td>
                <td class="py-2 px-2 text-center">{{ row.played }}</td>
                <td class="py-2 px-2 text-center">{{ row.won }}</td>
                <td class="py-2 px-2 text-center">{{ sg(row) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>

      <div v-if="otherGroups.length" class="space-y-2">
        <h4 class="font-bold text-sm text-ink">Outros grupos</h4>
        <div class="flex flex-wrap items-center gap-1.5 bg-subtle p-1 rounded-xl border border-borderline self-start max-w-full">
          <button
            v-for="g in otherGroups"
            :key="g.id"
            type="button"
            @click="pickedGroup = g.id"
            :class="[
              'px-3 py-2.5 md:py-1.5 rounded-lg text-xs font-bold transition-all',
              shownOther && shownOther.id === g.id ? 'bg-emeraldpro text-night shadow-sm' : 'text-ink-muted hover:text-ink'
            ]"
          >
            Grupo {{ g.id }}
          </button>
        </div>
        <BaseCard v-if="shownOther" padding="p-4" class="min-w-0 space-y-2">
          <h5 class="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Grupo {{ shownOther.id }}</h5>
          <table class="w-full text-[11px] text-left">
            <thead>
              <tr class="border-b border-borderline uppercase text-ink-muted">
                <th class="py-1 pr-1">#</th>
                <th class="py-1">Clube</th>
                <th class="py-1 px-1 text-center">P</th>
                <th class="py-1 pl-1 text-center">SG</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-borderline">
              <tr v-for="(row, idx) in shownOther.rows" :key="row.id">
                <td class="py-1.5 pr-1">{{ idx + 1 }}º</td>
                <td class="py-1.5 text-ink max-w-0 w-full">
                  <span class="flex items-center gap-1.5 min-w-0">
                    <TeamCrest class="shrink-0" size="xs" :team="row.id" :name="row.name" :is-user="false" />
                    <span class="truncate" :title="row.name">{{ row.name }}</span>
                  </span>
                </td>
                <td class="py-1.5 px-1 text-center font-bold">{{ row.points }}</td>
                <td class="py-1.5 pl-1 text-center">{{ sg(row) }}</td>
              </tr>
            </tbody>
          </table>
        </BaseCard>
      </div>

      <BracketView v-if="m.bracket" :bracket="m.bracket" title="Chave de 16" :user-power="squad.teamStrength.total" />

      <BaseCard v-if="m.history.length" class="space-y-2">
        <h4 class="font-bold text-sm text-ink">Resultados da {{ MUNDIAL_LABEL }}</h4>
        <ListRow v-for="(item, idx) in m.history" :key="idx">
          <span class="min-w-0 flex-1 text-ink break-words [overflow-wrap:anywhere]">{{ item.summary }}</span>
          <span class="shrink-0 font-bold text-emeraldpro tabular-nums">+{{ formatCurrency(item.prize) }}</span>
        </ListRow>
      </BaseCard>
    </div>
  </div>
</template>

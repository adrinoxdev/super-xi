<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ListRow from '@/components/ui/ListRow.vue'
import { computed } from 'vue'
import { Globe, Play } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useCompetitionsStore } from '@/stores/competitions'
import { useSquadStore } from '@/stores/squad'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import BracketView from '@/components/bracket/BracketView.vue'
import PodiumCard from '@/components/bracket/PodiumCard.vue'
import { useMatchSimulation } from '@/composables/useMatchSimulation'
import { formatCurrency } from '@/utils/formatCurrency'
import { PRIZES } from '@/config'
import type { ContinentalTeam } from '@/types/competitions'

const { continentalState, continentalStageLabel, continentalStandings, continentalOpponent } = storeToRefs(
  useCompetitionsStore()
)
const squad = useSquadStore()
const { prepareMatch } = useMatchSimulation()

const canPlay = computed(
  () => !continentalState.value.eliminated && !continentalState.value.champion && !continentalState.value.finalPosition
)
const playLabel = computed(() => {
  const s = continentalState.value.stage
  if (s === 'THIRD') return 'Jogar Disputa de 3º Lugar'
  if (s === 'GROUPS') return 'Jogar Partida Continental'
  return 'Jogar ' + continentalStageLabel.value
})
const statusBadge = computed(() => {
  const c = continentalState.value
  if (c.finalPosition === 1 || c.champion) return { text: 'Campeão', cls: 'bg-emeraldpro text-white' }
  if (c.finalPosition === 2) return { text: 'Vice-campeão', cls: 'bg-subtle text-ink' }
  if (c.finalPosition === 3) return { text: '3º lugar', cls: 'bg-emeraldpro-soft text-emeraldpro' }
  if (c.finalPosition === 4) return { text: '4º lugar', cls: 'bg-subtle text-ink' }
  if (c.eliminated) return { text: 'Eliminado', cls: 'bg-subtle text-ink' }
  return null
})
const tierLabel = computed(() =>
  continentalState.value.tier === 'libertadores' ? 'Copa Condor de Ouro' : 'Copa Condor de Prata'
)

/** Mesma ordenação da store: pontos, saldo, gols pró e OVER. */
const sortTeams = (teams: ContinentalTeam[]) =>
  [...teams].sort(
    (a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || b.power - a.power
  )
const otherGroups = computed(() =>
  continentalState.value.otherGroups.map((g) => ({ id: g.id, rows: sortTeams(g.teams) }))
)
const sg = (r: ContinentalTeam) => r.gf - r.ga
</script>

<template>
  <div>
    <BaseCard v-if="!continentalState.qualified" padding="p-6" class="text-center space-y-2">
      <Globe class="w-10 h-10 text-ink-muted mx-auto" />
      <h3 class="text-base sm:text-lg font-bold text-ink">Classificação Continental Pendente</h3>
      <p class="text-xs text-ink-muted max-w-lg mx-auto">
        Termine no <strong class="text-ink">G-6 da Série A</strong> ou conquiste a <strong class="text-ink">Taça Cacique</strong> para disputar a Copa Condor de Prata ou a Copa Condor de Ouro na temporada seguinte!
      </p>
    </BaseCard>

    <div v-else class="space-y-6">
      <BaseCard class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="space-y-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="max-w-full break-words px-2.5 py-0.5 rounded-full bg-emeraldpro text-white text-xs font-bold uppercase">{{ tierLabel }}</span>
              <span v-if="statusBadge" :class="['max-w-full break-words px-2.5 py-0.5 rounded-full text-xs font-bold', statusBadge.cls]">{{ statusBadge.text }}</span>
            </div>
            <h3 class="text-lg sm:text-xl font-extrabold text-ink break-words">{{ continentalStageLabel }}</h3>
            <p class="text-xs text-ink-muted break-words">Fase de grupos (6 rodadas) + mata-mata em jogo único, com disputa de 3º lugar.</p>
          </div>
          <BaseButton
            v-if="canPlay"
            @click="prepareMatch('continental')"
            class="shrink-0 px-5 py-3 text-xs sm:text-sm shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <Play class="w-4 h-4 fill-current" />
            {{ playLabel }}
          </BaseButton>
        </div>
        <div v-if="canPlay" class="p-3 rounded-xl bg-subtle border border-borderline text-xs flex flex-wrap items-center justify-between gap-2">
          <span class="text-ink-muted">Próximo adversário</span>
          <span class="min-w-0 break-words font-bold text-ink text-right">{{ continentalOpponent.name }} <span class="text-ink-muted font-semibold">• OVER {{ continentalOpponent.power }}</span></span>
        </div>
        <p class="text-[11px] text-ink-muted break-words">
          Prêmios: campeão {{ formatCurrency(PRIZES.continental.champion) }} • vice {{ formatCurrency(PRIZES.continental.runnerUp) }} •
          3º lugar {{ formatCurrency(PRIZES.continental.third) }} • vitória na partida {{ formatCurrency(PRIZES.continental.win) }}
        </p>
      </BaseCard>

      <PodiumCard v-if="continentalState.bracket?.podium" :podium="continentalState.bracket.podium" />

      <BaseCard class="space-y-3">
        <h4 class="font-bold text-sm text-ink">Grupo A</h4>
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left">
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
              <tr
                v-for="(row, idx) in continentalStandings"
                :key="row.id"
                :class="row.isUser ? 'bg-emeraldpro-soft/70 font-bold' : ''"
              >
                <td class="py-2 px-2">{{ idx + 1 }}º</td>
                <td class="py-2 px-2 text-ink max-w-[180px] sm:max-w-[280px]">
                  <span class="flex items-center gap-2 min-w-0">
                    <TeamCrest class="shrink-0" size="xs" :team="row.id" :name="row.name" :is-user="row.isUser" />
                    <span class="truncate" :title="row.name">{{ row.name }}</span>
                    <span class="shrink-0 whitespace-nowrap text-[10px] text-ink-muted font-semibold">OVER {{ row.isUser ? squad.teamStrength.total : row.power }}</span>
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
        <div class="grid gap-3 sm:grid-cols-3">
          <BaseCard v-for="g in otherGroups" :key="g.id" padding="p-4" class="min-w-0 space-y-2">
            <h5 class="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Grupo {{ g.id }}</h5>
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
                <tr v-for="(row, idx) in g.rows" :key="row.id">
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
      </div>

      <BracketView
        v-if="continentalState.bracket"
        :bracket="continentalState.bracket"
        title="Mata-mata continental"
        :user-power="squad.teamStrength.total"
      />

      <BaseCard v-if="continentalState.history.length" class="space-y-2">
        <h4 class="font-bold text-sm text-ink">Resultados Continentais</h4>
        <ListRow v-for="(item, idx) in continentalState.history" :key="idx">
          <span class="min-w-0 flex-1 text-ink break-words [overflow-wrap:anywhere]">{{ item.summary }}</span>
          <span class="shrink-0 font-bold text-emeraldpro tabular-nums">+{{ formatCurrency(item.prize) }}</span>
        </ListRow>
      </BaseCard>
    </div>
  </div>
</template>

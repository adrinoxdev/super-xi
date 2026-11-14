<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronRight, History } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import { useMatchStore } from '@/stores/match'
import { COMPETITION_NAMES, OUTCOME_UI, outcomeOf, scoreText } from '@/utils/match/matchResult'
import type { MatchCompetition } from '@/types/match'

const router = useRouter()
const match = useMatchStore()
const filter = ref<MatchCompetition | 'all'>('all')

const filters = computed(() => {
  const present = new Set(match.matchHistory.map((m) => m.competition))
  return [
    { id: 'all' as const, label: 'Todas' },
    ...(Object.keys(COMPETITION_NAMES) as MatchCompetition[])
      .filter((c) => present.has(c))
      .map((c) => ({ id: c, label: COMPETITION_NAMES[c] }))
  ]
})

const rows = computed(() =>
  match.matchHistory.filter((m) => filter.value === 'all' || m.competition === filter.value)
)

function dateLabel(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
</script>

<template>
  <section class="space-y-4 animate-pop">
    <BaseCard class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>
          <template #icon><History class="w-4 h-4 text-emeraldpro shrink-0" /></template>
          Partidas realizadas
        </SectionTitle>
        <div v-if="match.matchHistory.length" class="flex flex-wrap gap-1.5">
          <button
            v-for="f in filters"
            :key="f.id"
            type="button"
            @click="filter = f.id"
            :class="[
              'px-3.5 py-2 min-h-10 md:min-h-0 md:py-1 rounded-full text-xs font-bold border transition-colors',
              filter === f.id
                ? 'bg-emeraldpro-soft border-emeraldpro text-emeraldpro'
                : 'bg-surface border-borderline text-ink-muted hover:bg-subtle hover:text-ink'
            ]"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <p v-if="!match.matchHistory.length" class="text-sm text-ink-muted py-8 text-center">
        Nenhuma partida disputada ainda. Os jogos concluídos aparecem aqui para consulta.
      </p>

      <div v-else class="space-y-2">
        <button
          v-for="m in rows"
          :key="m.id"
          type="button"
          @click="router.push('/matches/' + m.id)"
          class="w-full text-left rounded-xl border border-borderline bg-surface hover:bg-subtle transition-colors px-3 sm:px-4 py-3 flex items-center gap-3"
        >
          <span
            :class="['w-7 h-7 shrink-0 rounded-lg grid place-items-center text-xs font-extrabold', OUTCOME_UI[outcomeOf(m)].cls]"
            :title="OUTCOME_UI[outcomeOf(m)].label"
          >
            {{ OUTCOME_UI[outcomeOf(m)].letter }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 text-sm font-bold text-ink min-w-0">
              <TeamCrest size="sm" is-user class="shrink-0" />
              <span class="min-w-0 break-words sm:truncate" :title="m.userName">{{ m.userName }}</span>
              <span class="font-score shrink-0">{{ scoreText(m) }}</span>
              <TeamCrest size="sm" :name="m.opponentName" class="shrink-0" />
              <span class="min-w-0 break-words sm:truncate" :title="m.opponentName">{{ m.opponentName }}</span>
            </div>
            <p class="text-[11px] text-ink-muted break-words sm:truncate mt-0.5">
              {{ m.label.replace(' — ', ' • ') }} • Temp. {{ m.season }} • {{ m.isHome ? 'Em casa' : 'Fora' }} • {{ dateLabel(m.playedAt) }}
            </p>
          </div>
          <ChevronRight class="w-4 h-4 text-ink-muted shrink-0" />
        </button>
        <p v-if="!rows.length" class="text-sm text-ink-muted py-4 text-center">Sem partidas nessa competição.</p>
      </div>
    </BaseCard>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Trophy, Activity, HeartPulse, Swords, Radar, type LucideIcon } from 'lucide-vue-next'
import { useLeagueStore } from '@/stores/league'
import { useMatchStore } from '@/stores/match'
import { useSquadStore } from '@/stores/squad'
import { useFriendliesStore } from '@/stores/friendlies'
import { useScoutingStore } from '@/stores/scouting'
import { useClubStore } from '@/stores/club'

const router = useRouter()
const league = useLeagueStore()
const match = useMatchStore()
const squad = useSquadStore()
const friendlies = useFriendliesStore()
const scouting = useScoutingStore()
const club = useClubStore()

const myRow = computed(() => league.leagueStandings.find((r) => r.isUser) ?? null)

// Últimos 5 jogos oficiais (amistosos ficam fora da forma).
const form = computed(() =>
  match.matchHistory
    .filter((m) => m.competition !== 'friendly')
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      letter: m.userScore > m.opponentScore ? 'V' : m.userScore < m.opponentScore ? 'D' : 'E',
      title: `${m.userName} ${m.userScore} x ${m.opponentScore} ${m.opponentName}`
    }))
)

const isOut = (p: { injury?: unknown; suspension?: Partial<Record<string, number>> }) =>
  !!p.injury || Object.values(p.suspension ?? {}).some((n) => (n ?? 0) > 0)
const absent = computed(() => squad.players.filter((p) => !p.isLoanedOut && isOut(p)))
const absentStarters = computed(() => absent.value.filter((p) => squad.starterIds.includes(p.id)))

const tiles = computed<Array<{ key: string; icon: LucideIcon; label: string; value: string; hint: string; warn?: boolean; to: string }>>(() => [
  {
    key: 'rank',
    icon: Trophy,
    label: 'Posição na liga',
    value: myRow.value ? `${myRow.value.rank}º` : '—',
    hint: myRow.value ? `${myRow.value.points} pts em ${myRow.value.played} jogos` : 'Sem tabela',
    to: '/league'
  },
  {
    key: 'out',
    icon: HeartPulse,
    label: 'Desfalques',
    value: String(absent.value.length),
    hint: absentStarters.value.length ? `${absentStarters.value.length} titular(es) fora: ajuste o time` : 'Nenhum titular fora',
    warn: absentStarters.value.length > 0,
    to: '/squad'
  },
  {
    key: 'friendlies',
    icon: Swords,
    label: 'Amistosos',
    value: String(friendlies.tokens),
    hint: friendlies.tokens > 0 ? 'ficha(s) para treinar' : 'Sem fichas agora',
    to: '/friendlies'
  },
  {
    key: 'scout',
    icon: Radar,
    label: 'Relatórios',
    value: String(scouting.visibleReports.length),
    hint: `${scouting.activeMissions.length}/${club.scoutingSpec.slots} missões ativas`,
    to: '/scouting'
  }
])

const formColor = (l: string) => (l === 'V' ? 'bg-emeraldpro text-night' : l === 'D' ? 'bg-red-500/80 text-white' : 'bg-subtle text-ink-muted')
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <button
        v-for="t in tiles"
        :key="t.key"
        type="button"
        @click="router.push(t.to)"
        :class="[
          'text-left rounded-2xl border p-3.5 min-w-0 min-h-11 transition hover:opacity-90',
          t.warn ? 'bg-amberpro-soft border-amberpro/40' : 'bg-subtle border-borderline'
        ]"
      >
        <span class="flex items-center gap-1.5 text-[11px] text-ink-muted">
          <component :is="t.icon" class="w-3.5 h-3.5 shrink-0" :class="t.warn ? 'text-amberpro' : 'text-emeraldpro'" />
          <span class="truncate">{{ t.label }}</span>
        </span>
        <span class="font-score font-bold text-2xl text-ink block mt-0.5">{{ t.value }}</span>
        <span class="text-[11px] text-ink-muted block break-words">{{ t.hint }}</span>
      </button>
    </div>

    <div v-if="form.length" class="flex items-center gap-2.5 text-xs">
      <Activity class="w-4 h-4 text-emeraldpro shrink-0" />
      <span class="text-ink-muted">Forma recente</span>
      <span class="flex gap-1">
        <span
          v-for="f in form"
          :key="f.id"
          :title="f.title"
          :class="['w-6 h-6 rounded-md grid place-items-center font-score font-bold text-[11px]', formColor(f.letter)]"
        >{{ f.letter }}</span>
      </span>
      <button type="button" @click="router.push('/history')" class="ml-auto text-xs font-bold text-emeraldpro hover:underline">Histórico</button>
    </div>
  </div>
</template>

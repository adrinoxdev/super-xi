<script setup lang="ts">
import { computed } from 'vue'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import { useClubStore } from '@/stores/club'
import type { BracketTeam, BracketTie } from '@/types/bracket'

const props = withDefaults(
  defineProps<{
    tie: BracketTie
    teams: Record<string, BracketTeam>
    userPower?: number
    compact?: boolean
  }>(),
  { userPower: undefined, compact: false }
)
const club = useClubStore()

const isUserTie = computed(() => props.tie.homeId === 'user' || props.tie.awayId === 'user')

function legGoalsFor(id: string | null): Array<number | null> {
  return props.tie.legs.map((leg) => {
    if (!id || !leg.played) return null
    const g = leg.homeId === id ? leg.homeScore : leg.awayId === id ? leg.awayScore : null
    return g ?? null
  })
}

function buildSide(key: 'home' | 'away') {
  const id = key === 'home' ? props.tie.homeId : props.tie.awayId
  const label = key === 'home' ? props.tie.homeLabel : props.tie.awayLabel
  const isUser = id === 'user'
  const team = id ? props.teams[id] : undefined
  const name = id ? (isUser ? club.name : team?.name ?? label) : label
  const power = isUser ? props.userPower : team?.power
  const legGoals = legGoalsFor(id)
  const done = legGoals.length > 0 && legGoals.every((g) => g !== null)
  const aggregate = done ? legGoals.reduce<number>((s, g) => s + (g ?? 0), 0) : null
  const pens = props.tie.penalties ? props.tie.penalties[key] : null
  return { key, id, name, isUser, power, legGoals, aggregate, pens, isWinner: !!id && props.tie.winnerId === id }
}
const sides = computed(() => [buildSide('home'), buildSide('away')])

const footer = computed(() => {
  const t = props.tie
  if (t.walkover) return 'W.O.'
  const parts: string[] = []
  const played = t.legs.filter((l) => l.played && l.homeScore !== null && l.awayScore !== null)
  if (t.legCount === 2 && played.length > 0) {
    t.legs.forEach((l, i) => {
      if (l.played && l.homeScore !== null && l.awayScore !== null)
        parts.push(`${i === 0 ? 'Ida' : 'Volta'} ${l.homeScore}x${l.awayScore}`)
    })
    const s = sides.value
    if (s[0].aggregate !== null && s[1].aggregate !== null) parts.push(`Agregado ${s[0].aggregate}x${s[1].aggregate}`)
  }
  if (t.penalties) parts.push(`pên. ${t.penalties.home}x${t.penalties.away}`)
  if (t.legacy && played.length === 0 && t.winnerId) parts.push('Resultado anterior à chave')
  return parts.join(' • ')
})
</script>

<template>
  <div
    :class="[
      'rounded-xl border bg-surface text-xs overflow-hidden divide-y divide-borderline',
      isUserTie ? 'border-emeraldpro ring-1 ring-emeraldpro/30' : 'border-borderline'
    ]"
  >
    <div
      v-for="side in sides"
      :key="side.key"
      :class="['flex items-center gap-2 px-2.5 py-1.5', side.isUser ? 'bg-emeraldpro-soft/50' : '']"
    >
      <TeamCrest class="shrink-0" size="xs" :team="side.id ?? undefined" :name="side.name" :is-user="side.isUser" />
      <span
        :class="[
          'flex-1 min-w-0 truncate',
          side.isWinner ? 'font-bold text-ink' : tie.winnerId ? 'text-ink-muted' : 'text-ink',
          !side.id ? 'italic text-ink-muted' : ''
        ]"
        :title="side.name"
        >{{ side.name }}</span
      >
      <span v-if="side.power && !compact" class="shrink-0 text-[11px] lg:text-[10px] font-score text-ink-muted"
        >OVER {{ side.power }}</span
      >
      <template v-if="tie.legCount === 2">
        <span
          v-for="(g, i) in side.legGoals"
          :key="i"
          class="w-4 text-center font-score tabular-nums text-ink-muted"
          >{{ g ?? '–' }}</span
        >
        <span class="w-5 text-center font-score font-extrabold tabular-nums text-ink">{{ side.aggregate ?? '' }}</span>
      </template>
      <span
        v-else-if="side.legGoals.length"
        class="w-5 text-center font-score font-extrabold tabular-nums text-ink"
        >{{ side.legGoals[0] ?? '–' }}</span
      >
      <span v-if="side.pens !== null" class="shrink-0 text-[11px] font-score text-ink-muted">({{ side.pens }})</span>
    </div>
    <div v-if="!compact && footer" class="px-2.5 py-1 bg-subtle text-[11px] text-ink-muted break-words">{{ footer }}</div>
  </div>
</template>

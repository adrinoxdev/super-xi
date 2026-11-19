<script setup lang="ts">
import { computed } from 'vue'
import { Trophy } from 'lucide-vue-next'
import type { FriendlyRankingRow, FriendlyRankingView } from '@/types/friendlies'
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import TeamCrest from '@/components/ui/TeamCrest.vue'

const props = defineProps<{ view: FriendlyRankingView; userName: string; total: number }>()
// Usuário no top 10: só a tabela. Fora: tabela + "…" + linha dele destacada.
const userInTop = computed(() => props.view.top.some((r) => r.isUser))
const rows = computed<FriendlyRankingRow[]>(() => (userInTop.value ? props.view.top : [...props.view.top, props.view.user]))
const nameOf = (r: FriendlyRankingRow) => (r.isUser ? props.userName : r.name)
const signed = (n: number) => (n > 0 ? `+${n}` : String(n))
</script>

<template>
  <BaseCard class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <SectionTitle class="min-w-0">
        <template #icon><Trophy class="w-4 h-4 text-gold shrink-0" /></template>
        Ranking de Fama
      </SectionTitle>
      <span class="shrink-0 text-[11px] text-ink-muted">Fama • V • SG • GP</span>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full min-w-[460px] md:min-w-0 text-xs text-left border-collapse">
        <thead>
          <tr class="border-b border-borderline text-[11px] uppercase text-ink-muted">
            <th class="py-2.5 px-2 w-9">#</th>
            <th class="py-2.5 px-2 sticky left-0 z-10 bg-surface md:static md:bg-transparent">Clube</th>
            <th class="py-2.5 px-2 text-center font-bold text-ink">Fama</th>
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
          <template v-for="(row, i) in rows" :key="row.id">
            <tr v-if="!userInTop && i === rows.length - 1" aria-hidden="true">
              <td colspan="10" class="py-1 px-2 text-center text-ink-muted">…</td>
            </tr>
            <tr
              :class="['transition-colors', row.isUser ? 'bg-emeraldpro-soft font-bold' : 'hover:bg-subtle/70']"
              :aria-current="row.isUser ? 'true' : undefined"
            >
              <td class="py-2.5 px-2 font-score font-bold text-ink-muted">{{ row.rank }}</td>
              <td
                :class="[
                  'py-2.5 px-2 text-ink max-w-[140px] sm:max-w-[190px] sticky left-0 z-10 md:static md:bg-transparent',
                  row.isUser ? 'bg-emeraldpro-soft' : 'bg-surface'
                ]"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <TeamCrest v-if="row.isUser" class="shrink-0" size="xs" is-user />
                  <TeamCrest v-else class="shrink-0" size="xs" :name="row.name" />
                  <span class="truncate" :title="nameOf(row)">{{ nameOf(row) }}</span>
                </span>
              </td>
              <td class="py-2.5 px-2 text-center font-score font-extrabold text-sm text-ink">{{ row.fame }}</td>
              <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.played }}</td>
              <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.won }}</td>
              <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.drawn }}</td>
              <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.lost }}</td>
              <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.gf }}</td>
              <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.ga }}</td>
              <td class="py-2.5 px-2 pr-3 text-center font-semibold" :class="row.gd >= 0 ? 'text-emeraldpro' : 'text-dangerpro'">
                {{ signed(row.gd) }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <p class="text-[11px] text-ink-muted">
      {{ total }} clubes no ranking. Desempate como na liga: vitórias, saldo e gols pró. A fama e os jogos dos rivais mudam com o tempo.
    </p>
  </BaseCard>
</template>

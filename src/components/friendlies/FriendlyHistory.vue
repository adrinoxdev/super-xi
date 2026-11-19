<script setup lang="ts">
import { History } from 'lucide-vue-next'
import type { FriendlyResult } from '@/types/friendlies'
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import { OUTCOME_UI } from '@/utils/match/matchResult'
import { outcomeFromScore, signedFame } from '@/utils/friendlies/fame'
import { formatCurrency } from '@/utils/format/formatCurrency'

defineProps<{ results: FriendlyResult[] }>()
</script>

<template>
  <BaseCard class="space-y-3">
    <SectionTitle>
      <template #icon><History class="w-4 h-4 text-emeraldpro shrink-0" /></template>
      Últimos Amistosos
    </SectionTitle>
    <p v-if="!results.length" class="text-sm text-ink-muted">Nenhum amistoso jogado ainda.</p>
    <ul v-else class="divide-y divide-borderline">
      <li v-for="r in results" :key="r.at" class="flex items-center gap-3 py-2 min-w-0">
        <span
          class="w-6 h-6 rounded-full text-[11px] font-extrabold flex items-center justify-center shrink-0"
          :class="OUTCOME_UI[outcomeFromScore(r.userScore, r.oppScore)].cls"
          :title="OUTCOME_UI[outcomeFromScore(r.userScore, r.oppScore)].label"
        >{{ OUTCOME_UI[outcomeFromScore(r.userScore, r.oppScore)].letter }}</span>
        <TeamCrest :name="r.botName" size="xs" />
        <span class="flex-1 min-w-0 truncate text-sm text-ink" :title="r.botName">{{ r.botName }}</span>
        <span class="font-score font-bold text-ink shrink-0">{{ r.userScore }} x {{ r.oppScore }}</span>
        <span class="w-10 text-right text-xs font-bold shrink-0" :class="r.fameDelta > 0 ? 'text-emeraldpro' : r.fameDelta < 0 ? 'text-dangerpro' : 'text-ink-muted'">
          {{ signedFame(r.fameDelta) }}
        </span>
        <span class="hidden sm:inline w-24 text-right text-xs text-ink-muted shrink-0">{{ r.prize > 0 ? '+' + formatCurrency(r.prize) : '—' }}</span>
      </li>
    </ul>
  </BaseCard>
</template>

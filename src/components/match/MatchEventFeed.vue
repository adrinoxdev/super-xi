<script setup lang="ts">
import { Radio, Repeat } from 'lucide-vue-next'
import { useMatchStore } from '@/stores/match'
import { useMatchSimulation } from '@/composables/useMatchSimulation'
import MatchBackButton from '@/components/match/MatchBackButton.vue'
import MatchEventRow from '@/components/match/MatchEventRow.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'

const match = useMatchStore()
const { toggleMatchSpeed, openInMatchSubDrawer } = useMatchSimulation()
</script>

<template>
  <BaseCard padding="p-4 sm:p-5" class="lg:col-span-7 space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <SectionTitle size="responsive" class="min-w-0">
        <template #icon><Radio class="w-4 h-4 text-emeraldpro shrink-0" /></template>
        <span class="break-words">Lance a Lance em Tempo Real</span>
      </SectionTitle>
      <div v-if="!match.matchState.isFinished" class="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        <MatchBackButton class="px-3 py-2 min-h-11 md:min-h-0 md:py-1.5 rounded-lg border border-borderline hover:bg-subtle text-ink-muted hover:text-ink font-bold text-xs flex items-center gap-1" />
        <button
          v-if="!match.matchState.shootout"
          type="button"
          @click.prevent.stop="openInMatchSubDrawer"
          title="Substituições e postura tática"
          class="px-3 py-2 min-h-10 md:min-h-0 md:py-1.5 rounded-lg bg-amberpro hover:opacity-90 text-white font-bold text-xs flex items-center gap-1"
        >
          <Repeat class="w-3.5 h-3.5" />
          Time & Tática (Trocas: {{ 5 - match.matchState.subsUsed }})
        </button>
        <button
          type="button"
          @click.prevent.stop="toggleMatchSpeed"
          class="px-3 py-2 min-h-10 md:min-h-0 md:py-1.5 rounded-lg bg-subtle hover:bg-borderline border border-borderline text-ink font-score font-bold text-xs"
        >
          Velocidade {{ match.matchState.speed === 1 ? '1x' : '2x' }}
        </button>
      </div>
    </div>
    <div class="space-y-2 max-h-72 lg:max-h-[380px] overflow-y-auto overscroll-contain pr-1">
      <MatchEventRow v-for="(ev, idx) in match.matchState.events" :key="idx" :ev="ev" />
    </div>
  </BaseCard>
</template>

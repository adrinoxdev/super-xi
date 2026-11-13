<script setup lang="ts">
import { Bandage, Radio, Repeat } from 'lucide-vue-next'
import { useMatchStore } from '@/stores/match'
import { useMatchSimulation } from '@/composables/useMatchSimulation'
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
        <span class="truncate">Lance a Lance em Tempo Real</span>
      </SectionTitle>
      <div v-if="!match.matchState.isFinished" class="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        <button
          type="button"
          @click.prevent.stop="openInMatchSubDrawer"
          title="Substituições e postura tática"
          class="px-3 py-1.5 rounded-lg bg-amberpro hover:opacity-90 text-white font-bold text-xs flex items-center gap-1"
        >
          <Repeat class="w-3.5 h-3.5" />
          Time & Tática (Trocas: {{ 5 - match.matchState.subsUsed }})
        </button>
        <button
          type="button"
          @click.prevent.stop="toggleMatchSpeed"
          class="px-3 py-1.5 rounded-lg bg-subtle hover:bg-borderline border border-borderline text-ink font-score font-bold text-xs"
        >
          Velocidade {{ match.matchState.speed === 1 ? '1x' : '2x' }}
        </button>
      </div>
    </div>
    <div class="space-y-2 max-h-[380px] overflow-y-auto pr-1">
      <div
        v-for="(ev, idx) in match.matchState.events"
        :key="idx"
        :class="[
          'p-3 rounded-xl border text-xs flex items-start gap-2.5',
          ev.type === 'goal' ? 'bg-emeraldpro-soft/60 border-emeraldpro font-bold' :
          ev.type === 'opp_goal' ? 'bg-dangerpro-soft/60 border-dangerpro font-bold' :
          ev.type === 'sub' ? 'bg-amberpro-soft/60 border-amberpro font-semibold' :
          ev.type === 'injury' ? 'bg-dangerpro-soft/60 border-dangerpro font-semibold' :
          ev.type === 'comment' ? 'bg-transparent border-dashed border-borderline text-ink-muted italic' :
          'bg-subtle border-borderline'
        ]"
      >
        <span class="font-score font-bold text-sm text-ink shrink-0 w-8">{{ ev.minute }}'</span>
        <Bandage v-if="ev.type === 'injury'" class="w-4 h-4 text-dangerpro shrink-0 mt-0.5" aria-label="Lesão" />
        <span class="text-ink leading-relaxed min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{{ ev.description }}</span>
      </div>
    </div>
  </BaseCard>
</template>

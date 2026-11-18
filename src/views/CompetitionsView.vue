<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCompetitionsStore } from '@/stores/competitions'
import { useUiStore } from '@/stores/ui'
import CupPanel from '@/components/competitions/CupPanel.vue'
import ContinentalPanel from '@/components/competitions/ContinentalPanel.vue'
import SupercupsPanel from '@/components/competitions/SupercupsPanel.vue'
import PodiumArchiveCard from '@/components/bracket/PodiumArchiveCard.vue'
import { useClubStore } from '@/stores/club'
import BaseCard from '@/components/ui/BaseCard.vue'

const ui = useUiStore()
const club = useClubStore()
const { compSubTab } = storeToRefs(ui)
const competitions = useCompetitionsStore()

const tabs = [
  { id: 'cup', label: 'Taça Cacique' },
  { id: 'continental', label: 'Continental' },
  { id: 'supercups', label: 'Supercopa & Recopa' }
]
</script>

<template>
  <section class="space-y-6 animate-pop">
    <PodiumArchiveCard
      v-if="club.previousPodiums.length && ui.hiddenPodiumSeason !== club.season - 1"
      :podiums="club.previousPodiums"
      :season="club.season - 1"
      @close="ui.hiddenPodiumSeason = club.season - 1"
    />
    <BaseCard padding="p-4 sm:p-5" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-lg sm:text-xl font-bold text-ink break-words">Competições Paralelas & Supercopas</h2>
        <p class="text-xs text-ink-muted mt-0.5 break-words">Dispute a Taça Cacique, torneios continentais e decisões em jogo único.</p>
      </div>
      <div class="flex flex-wrap items-center gap-1.5 bg-subtle p-1 rounded-xl border border-borderline self-start max-w-full">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          @click="compSubTab = t.id"
          :class="[
            'px-3 py-2.5 md:py-1.5 rounded-lg text-xs font-bold transition-all',
            t.id === 'supercups' ? 'flex items-center gap-1' : '',
            compSubTab === t.id ? 'bg-emeraldpro text-night shadow-sm' : 'text-ink-muted hover:text-ink'
          ]"
        >
          {{ t.label }}
          <span
            v-if="t.id === 'supercups' && competitions.hasPendingFinal"
            class="w-2 h-2 rounded-full bg-amberpro"
          ></span>
        </button>
      </div>
    </BaseCard>

    <CupPanel v-if="compSubTab === 'cup'" />
    <ContinentalPanel v-if="compSubTab === 'continental'" />
    <SupercupsPanel v-if="compSubTab === 'supercups'" />
  </section>
</template>

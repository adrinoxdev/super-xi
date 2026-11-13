<script setup lang="ts">
import { useClubStore } from '@/stores/club'
import { useScoutingStore } from '@/stores/scouting'

const club = useClubStore()
const scouting = useScoutingStore()
</script>

<template>
  <div class="bg-surface rounded-2xl p-4 sm:p-5 border border-borderline shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div class="min-w-0">
      <h2 class="text-lg sm:text-xl font-bold text-ink">Central de Scouting & Mercado</h2>
      <p class="text-xs text-ink-muted">Envie olheiros para descobrir reforços ou promova jovens talentos da sua base.</p>
    </div>
    <div class="flex flex-wrap items-center gap-2.5">
      <div class="bg-subtle px-3 py-2 rounded-xl border border-borderline text-center">
        <span class="text-[10px] uppercase text-ink-muted block">Slots</span>
        <span class="font-score font-bold text-base text-ink">{{ scouting.activeMissions.length }} / {{ club.scoutingSpec.slots }}</span>
      </div>
      <div class="bg-subtle px-3 py-2 rounded-xl border border-borderline text-center">
        <span class="text-[10px] uppercase text-ink-muted block">Precisão</span>
        <span class="font-score font-bold text-base text-emeraldpro">{{ Math.round(club.accuracyWithStaff * 100) }}%</span>
      </div>
      <div class="bg-subtle px-3 py-2 rounded-xl border border-borderline text-center">
        <span class="text-[10px] uppercase text-ink-muted block">Joia Rara</span>
        <span class="font-score font-bold text-base text-amberpro">
          {{ Math.round(club.gemChanceWithStaff * 100) }}%
        </span>
      </div>
    </div>
  </div>
</template>

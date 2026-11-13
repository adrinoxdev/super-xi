<script setup lang="ts">
import { useScoutingStore } from '@/stores/scouting'
import ScoutStatusBar from '@/components/scouting/ScoutStatusBar.vue'
import ScoutMissionCard from '@/components/scouting/ScoutMissionCard.vue'
import ScoutMissionCatalog from '@/components/scouting/ScoutMissionCatalog.vue'
import YouthAcademyPanel from '@/components/scouting/YouthAcademyPanel.vue'
import ScoutReportCard from '@/components/scouting/ScoutReportCard.vue'

const scouting = useScoutingStore()
</script>

<template>
  <section class="space-y-6 animate-pop">
    <ScoutStatusBar />

    <div v-if="scouting.activeMissions.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ScoutMissionCard v-for="mission in scouting.activeMissions" :key="mission.id" :mission="mission" />
    </div>

    <ScoutMissionCatalog />

    <YouthAcademyPanel />

    <div class="bg-surface rounded-2xl p-4 sm:p-5 border border-borderline shadow-sm space-y-4">
      <h3 class="font-bold text-sm sm:text-base text-ink break-words">Relatórios de Jogadores Observados ({{ scouting.visibleReports.length }})</h3>

      <div v-if="scouting.visibleReports.length === 0" class="p-8 rounded-xl bg-subtle border border-dashed border-borderline text-center text-xs text-ink-muted">
        Nenhum relatório disponível. Inicie uma missão de scouting acima para revelar talentos.
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ScoutReportCard v-for="rep in scouting.visibleReports" :key="rep.id" :rep="rep" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
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

    <BaseCard padding="p-4 sm:p-5" class="space-y-4">
      <SectionTitle size="responsive" class="break-words">Relatórios de Jogadores Observados ({{ scouting.visibleReports.length }})</SectionTitle>

      <EmptyState v-if="scouting.visibleReports.length === 0" padding="p-8">
        Nenhum relatório disponível. Inicie uma missão de scouting acima para revelar talentos.
      </EmptyState>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ScoutReportCard v-for="rep in scouting.visibleReports" :key="rep.id" :rep="rep" />
      </div>
    </BaseCard>
  </section>
</template>

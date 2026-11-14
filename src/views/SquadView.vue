<script setup lang="ts">
import { useSquadStore } from '@/stores/squad'
import TeamPowerBar from '@/components/ui/TeamPowerBar.vue'
import IncomingOffersPanel from '@/components/squad/IncomingOffersPanel.vue'
import TacticalPitch from '@/components/squad/TacticalPitch.vue'
import SquadRoster from '@/components/squad/SquadRoster.vue'
import SquadScorers from '@/components/squad/SquadScorers.vue'
import SquadDiscipline from '@/components/squad/SquadDiscipline.vue'

const squad = useSquadStore()
</script>

<template>
  <section class="space-y-6 animate-pop">
    <IncomingOffersPanel />
    <TeamPowerBar
      variant="cards"
      :total="squad.teamStrength.total"
      :attack="squad.teamStrength.attack"
      :midfield="squad.teamStrength.midfield"
      :defense="squad.teamStrength.defense"
    />
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <TacticalPitch />
      <SquadRoster />
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SquadScorers />
      <SquadDiscipline />
    </div>
  </section>
</template>

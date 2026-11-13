<script setup lang="ts">
import MatchSwitcher from '@/components/match/MatchSwitcher.vue'
import Scoreboard from '@/components/match/Scoreboard.vue'
import SubstitutionDrawer from '@/components/match/SubstitutionDrawer.vue'
import PostMatchSummary from '@/components/match/PostMatchSummary.vue'
import MatchEventFeed from '@/components/match/MatchEventFeed.vue'
import LiveStatsPanel from '@/components/match/LiveStatsPanel.vue'
import { useMatchStore } from '@/stores/match'

const match = useMatchStore()
</script>

<template>
  <section class="space-y-6 animate-pop">
    <MatchSwitcher />
    <Scoreboard />
    <SubstitutionDrawer v-if="match.showSubDrawer && !match.matchState.isFinished" />
    <PostMatchSummary v-if="match.matchState.isFinished && match.lastMatchSummary" />
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <MatchEventFeed />
      <LiveStatsPanel />
    </div>
  </section>
</template>

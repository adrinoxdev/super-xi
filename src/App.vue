<script setup lang="ts">
import { onMounted } from 'vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import Header from '@/components/layout/Header.vue'
import BottomNav from '@/components/layout/BottomNav.vue'
import AppToast from '@/components/ui/AppToast.vue'
import PlayerCompare from '@/components/player/PlayerCompare.vue'
import PlayerDetails from '@/components/player/PlayerDetails.vue'
import LoanMarketModal from '@/components/player/LoanMarketModal.vue'
import { usePersistence } from '@/composables/usePersistence'
import { useSeason } from '@/composables/useSeason'
import { useScouting } from '@/composables/useScouting'

const { loadGame } = usePersistence()
const { initializeFreshCareer } = useSeason()
const { startMissionTicker } = useScouting()

onMounted(() => {
  loadGame() || initializeFreshCareer()
  startMissionTicker()
})
</script>

<template>
  <div class="w-full min-h-screen flex flex-col md:flex-row overflow-x-clip">
    <AppToast />
    <Sidebar />
    <div class="flex-1 flex flex-col min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
      <Header />
      <main class="flex-1 p-3 sm:p-6 pt-4 sm:pt-6 md:pt-9 max-w-7xl w-full mx-auto space-y-6">
        <RouterView />
      </main>
    </div>
    <BottomNav />
    <PlayerCompare />
    <PlayerDetails />
    <LoanMarketModal />
  </div>
</template>

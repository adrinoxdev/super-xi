<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import Header from '@/components/layout/Header.vue'
import BottomNav from '@/components/layout/BottomNav.vue'
import AppToast from '@/components/ui/AppToast.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import InstallPrompt from '@/components/ui/InstallPrompt.vue'
import OfflineRewardModal from '@/components/club/OfflineRewardModal.vue'
import PlayerCompare from '@/components/player/PlayerCompare.vue'
import PlayerDetails from '@/components/player/PlayerDetails.vue'
import LoanMarketModal from '@/components/player/LoanMarketModal.vue'
import { usePersistence } from '@/composables/usePersistence'
import { useClubStore } from '@/stores/club'
import { useSeason } from '@/composables/useSeason'
import { useScouting } from '@/composables/useScouting'
import { useMatchSimulation } from '@/composables/useMatchSimulation'
import { useMatchStore } from '@/stores/match'
import { useUiStore } from '@/stores/ui'
import { useFriendliesStore } from '@/stores/friendlies'

const club = useClubStore()
const { loadGame, saveGame, applyOfflineReward } = usePersistence()
const { initializeFreshCareer } = useSeason()
const { startMissionTicker } = useScouting()
const { restoreLiveMatches } = useMatchSimulation()
const match = useMatchStore()
const ui = useUiStore()
const friendlies = useFriendliesStore()

// A competição exibida vai no save (pré-jogo de copa ou amistoso volta ao recarregar): grava a cada troca,
// sem depender só do beforeunload, que o celular nem sempre dispara.
watch(
  () => match.activeMatchCompetition,
  () => saveGame()
)

function onVisibility() {
  if (document.visibilityState === 'hidden') saveGame()
  else if (document.visibilityState === 'visible' && !club.offlinePending) applyOfflineReward()
}

onMounted(() => {
  // Partida que estava ao vivo antes de recarregar volta do mesmo minuto (só com save principal carregado).
  if (loadGame()) {
    restoreLiveMatches()
    // Amistoso gravado como em andamento que não voltou (save ao vivo ausente ou corrompido): não conta e a ficha não volta.
    if (friendlies.resolveOrphan(match.isCompetitionLive('friendly'))) {
      ui.showToast('O amistoso anterior foi interrompido e não contou.', 'warning')
      saveGame()
    }
  } else initializeFreshCareer()
  startMissionTicker()
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('beforeunload', saveGame)
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('beforeunload', saveGame)
})
</script>

<template>
  <div class="w-full min-h-dvh flex flex-col md:flex-row overflow-x-clip">
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
    <ConfirmDialog />
    <OfflineRewardModal />
    <InstallPrompt />
  </div>
</template>

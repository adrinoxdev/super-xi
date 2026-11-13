<script setup lang="ts">
import { FACILITIES_LIST, STAFF_CATALOG } from '@/config'
import IdentityEditor from '@/components/club/IdentityEditor.vue'
import UpgradeCard from '@/components/club/UpgradeCard.vue'
import StaffCard from '@/components/club/StaffCard.vue'
import TrophyRoom from '@/components/club/TrophyRoom.vue'
import MilestonesCard from '@/components/club/MilestonesCard.vue'
import TopScorers from '@/components/club/TopScorers.vue'
import HallOfFame from '@/components/club/HallOfFame.vue'
import TransferHistory from '@/components/club/TransferHistory.vue'
import ManagerRanking from '@/components/club/ManagerRanking.vue'
import BackupPanel from '@/components/club/BackupPanel.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
</script>

<template>
  <section class="space-y-6 animate-pop">
    <IdentityEditor />

    <BaseCard padding="p-4 sm:p-6" class="space-y-4">
      <div class="min-w-0">
        <h3 class="text-base sm:text-lg font-bold text-ink">Infraestrutura do Clube</h3>
        <p class="text-xs text-ink-muted break-words">Invista nas instalações para ampliar receitas, vagas no elenco e qualidade dos reforços.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UpgradeCard v-for="fac in FACILITIES_LIST" :key="fac.key" :facility="fac" />
      </div>
    </BaseCard>

    <BaseCard padding="p-4 sm:p-6" class="space-y-4">
      <div class="min-w-0">
        <h3 class="text-base sm:text-lg font-bold text-ink">Comissão Técnica Especializada</h3>
        <p class="text-xs text-ink-muted break-words">Contrate profissionais permanentes para potencializar evolução, preparo físico e scouting.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StaffCard v-for="st in STAFF_CATALOG" :key="st.key" :staff="st" />
      </div>
    </BaseCard>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TrophyRoom />
      <TopScorers />
    </div>

    <MilestonesCard />

    <HallOfFame />
    <TransferHistory />

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ManagerRanking />
      <BackupPanel />
    </div>
  </section>
</template>

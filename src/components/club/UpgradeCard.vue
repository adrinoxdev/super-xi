<script setup lang="ts">
import Badge from '@/components/ui/Badge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useClubStore } from '@/stores/club'
import { useClub, blockedMsg } from '@/composables/useClub'
import { formatCurrency } from '@/utils/formatCurrency'
import { computed } from 'vue'
import { FACILITY_MAX_LEVEL, SQUAD_CAPACITIES, SQUAD_MAX_SIZE, ECONOMY, SERIE_ECONOMY, UPGRADE_COSTS, facilityIncomeFactor } from '@/config'
import type { ClubUpgrades } from '@/types/club'

const props = defineProps<{ facility: { key: keyof ClubUpgrades; title: string; description: string } }>()
const club = useClubStore()
const { upgradeFacility } = useClub()

const isSquad = computed(() => props.facility.key === 'squadCapacityLevel')
const nextCap = computed(() => Math.min(SQUAD_MAX_SIZE, SQUAD_CAPACITIES[club.upgrades.squadCapacityLevel + 1] ?? club.maxSquadCapacity))
const isIncome = computed(() => props.facility.key === 'stadiumLevel' || props.facility.key === 'financeLevel')
const levelCap = computed(() => (SERIE_ECONOMY[club.division] ?? SERIE_ECONOMY[4]).levelCap)
const atMax = computed(() => club.upgrades[props.facility.key] >= FACILITY_MAX_LEVEL[props.facility.key])
const atCap = computed(() => club.upgrades[props.facility.key] === levelCap.value)
const aboveCap = computed(() => club.upgrades[props.facility.key] > levelCap.value)
// Ganho por jogo da próxima expansão (0 se o nível passar do teto da série).
const incomeGain = computed(() => {
  const lvl = club.upgrades[props.facility.key]
  const base = props.facility.key === 'stadiumLevel' ? club.serieEconomy.ticketBase : club.serieEconomy.sponsorBase
  const diff = facilityIncomeFactor(lvl + 1, club.division) - facilityIncomeFactor(lvl, club.division)
  return Math.round(base * diff)
})
const extraMaintenance = computed(() => Math.round((UPGRADE_COSTS[props.facility.key][club.upgrades[props.facility.key]] || 0) * ECONOMY.maintenanceRate))
</script>

<template>
  <div class="p-4 rounded-2xl bg-subtle border border-borderline flex flex-col justify-between space-y-3">
    <div class="space-y-1">
      <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span class="font-bold text-sm text-ink min-w-0 break-words [overflow-wrap:anywhere]">{{ facility.title }}<template v-if="isSquad"> (máx. {{ SQUAD_MAX_SIZE }})</template></span>
        <Badge tone="success" size="sm" class="shrink-0">
          Nv. {{ club.upgrades[facility.key] }} / {{ FACILITY_MAX_LEVEL[facility.key] }}
        </Badge>
      </div>
      <p class="text-xs text-ink-muted break-words">{{ facility.description }}</p>
      <template v-if="isSquad">
        <p v-if="atMax" class="text-xs font-semibold text-ink-muted break-words">Capacidade máxima: {{ SQUAD_MAX_SIZE }} atletas</p>
        <p v-else class="text-xs font-semibold text-ink-muted break-words">
          Capacidade atual: {{ club.maxSquadCapacity }} atletas • Próximo nível: {{ nextCap }} (+{{ nextCap - club.maxSquadCapacity }})
        </p>
        <p class="text-xs text-ink-muted break-words">Atletas extras aumentam a folha por jogo</p>
      </template>
      <template v-if="isIncome">
        <p class="text-xs font-semibold text-ink-muted break-words">Teto da série: nível {{ levelCap }}</p>
        <p v-if="atCap" class="text-xs text-amberpro font-semibold break-words">No teto da série: a próxima expansão não aumenta a receita</p>
        <p v-else-if="aboveCap" class="text-xs text-amberpro font-semibold break-words">Níveis acima de {{ levelCap }} não rendem nesta série, mas pagam manutenção</p>
        <template v-if="!atMax">
          <p v-if="incomeGain > 0" class="text-xs text-emeraldpro font-semibold break-words">+{{ formatCurrency(incomeGain) }} por jogo</p>
          <p class="text-xs text-ink-muted break-words">+{{ formatCurrency(extraMaintenance) }} de manutenção</p>
        </template>
      </template>
    </div>

    <BaseButton
      @click="upgradeFacility(facility.key)"
      :disabled="club.upgrades[facility.key] >= FACILITY_MAX_LEVEL[facility.key] || club.budget < club.getUpgradeCost(facility.key)"
      :title="club.upgrades[facility.key] < FACILITY_MAX_LEVEL[facility.key] && club.budget < club.getUpgradeCost(facility.key) ? blockedMsg(club.getUpgradeCost(facility.key)) : undefined"
      class="w-full px-3 py-2.5 text-xs transition-colors"
    >
      <template v-if="club.upgrades[facility.key] >= FACILITY_MAX_LEVEL[facility.key]">Nível Máximo Atingido</template>
      <template v-else>Expandir ({{ formatCurrency(club.getUpgradeCost(facility.key)) }})</template>
    </BaseButton>
  </div>
</template>

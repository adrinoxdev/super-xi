<script setup lang="ts">
import Badge from '@/components/ui/Badge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { computed } from 'vue'
import { useClubStore } from '@/stores/club'
import { useClub, blockedMsg } from '@/composables/useClub'
import { formatCurrency } from '@/utils/format/formatCurrency'
import { STAFF_CONTRACT_DAYS, STAFF_RENEW_WINDOW_MS, staffContractCost } from '@/config'
import type { StaffKey } from '@/types/club'

const props = defineProps<{ staff: { key: StaffKey; title: string; cost: number; description: string } }>()
const club = useClubStore()
const { hireStaffMember } = useClub()

// Preço do contrato de 7 dias na série atual do clube.
const price = computed(() => staffContractCost(props.staff.cost, club.division))
const priced = computed(() => ({ ...props.staff, cost: price.value }))
const active = computed(() => club.clubStaff[props.staff.key])
const remainingMs = computed(() => club.staffRemainingMs(props.staff.key))
const canRenew = computed(() => remainingMs.value <= STAFF_RENEW_WINDOW_MS)

const remainingLabel = computed(() => {
  const totalMin = Math.ceil(remainingMs.value / 60000)
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`
  return `${m}min`
})

const buttonLabel = computed(() => {
  const priceLabel = formatCurrency(price.value)
  if (!active.value) return `Contratar por ${STAFF_CONTRACT_DAYS} dias (${priceLabel})`
  if (canRenew.value) return `Renovar +${STAFF_CONTRACT_DAYS} dias (${priceLabel})`
  return `Contrato ativo • renova nas últimas 24h`
})
</script>

<template>
  <div class="p-4 rounded-2xl bg-subtle border border-borderline flex flex-col justify-between space-y-3">
    <div class="space-y-1">
      <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span class="font-bold text-sm text-ink min-w-0 break-words [overflow-wrap:anywhere]">{{ staff.title }}</span>
        <Badge v-if="active" tone="success-solid" uppercase class="whitespace-normal">
          Expira em {{ remainingLabel }}
        </Badge>
      </div>
      <p class="text-xs text-ink-muted break-words">{{ staff.description }}</p>
    </div>

    <BaseButton
      @click="hireStaffMember(priced)"
      :disabled="(active && !canRenew) || club.budget < price"
      :title="club.budget < price ? blockedMsg(price) : undefined"
      class="w-full min-h-[40px] sm:min-h-0 px-3 py-2 text-xs transition-colors break-words"
    >
      {{ buttonLabel }}
    </BaseButton>
  </div>
</template>

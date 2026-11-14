<script setup lang="ts">
import SectionTitle from '@/components/ui/SectionTitle.vue'
import ListRow from '@/components/ui/ListRow.vue'
import Badge from '@/components/ui/Badge.vue'
import { Briefcase } from 'lucide-vue-next'
import { useMarketStore } from '@/stores/market'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import { useSquad } from '@/composables/useSquad'
import { formatCurrency, formatPosBR } from '@/utils/format/formatCurrency'

const market = useMarketStore()
const { acceptIncomingOffer, counterIncomingOffer, rejectIncomingOffer } = useSquad()
</script>

<template>
  <div v-if="market.incomingOffers.length > 0" class="bg-surface rounded-2xl p-4 sm:p-5 border-2 border-amberpro shadow-sm space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <SectionTitle size="responsive" class="min-w-0">
        <template #icon><Briefcase class="w-4 h-4 text-amberpro shrink-0" /></template>
        <span class="min-w-0 break-words">Propostas de Clubes Rivais ({{ market.incomingOffers.length }})</span>
      </SectionTitle>
      <span class="text-[11px] font-semibold text-ink-muted shrink-0">Mercado Dinâmico</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <ListRow
        v-for="offer in market.incomingOffers"
        :key="offer.id"
        padding="p-3.5"
        layout="block"
        class="min-w-0 flex flex-col justify-between gap-2.5 text-xs"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <Badge tone="warning" shape="rounded" uppercase>
              {{ offer.type === 'loan' ? 'Empréstimo 1 Temp.' : 'Compra Definitiva' }}
            </Badge>
            <div class="font-bold text-sm text-ink mt-1 break-words [overflow-wrap:anywhere]">{{ offer.playerName }} ({{ formatPosBR(offer.position) }} • OVER {{ offer.overall }})</div>
            <div class="text-ink-muted flex items-center gap-1.5 min-w-0">
              <span class="shrink-0">Interessado:</span> <TeamCrest class="shrink-0" size="xs" :name="offer.rivalClub" /><strong class="text-ink truncate" :title="offer.rivalClub">{{ offer.rivalClub }}</strong>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="text-[11px] text-ink-muted block">Oferta</span>
            <span class="font-score font-extrabold text-lg text-emeraldpro whitespace-nowrap">{{ formatCurrency(offer.amount) }}</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            @click="acceptIncomingOffer(offer)"
            class="flex-1 min-h-[40px] sm:min-h-0 py-1.5 rounded-lg bg-emeraldpro hover:bg-emeraldpro-hover text-white font-bold"
          >
            Aceitar
          </button>
          <button
            v-if="!offer.countered"
            type="button"
            @click="counterIncomingOffer(offer)"
            class="flex-1 min-h-[40px] sm:min-h-0 py-1.5 rounded-lg bg-surface hover:bg-borderline border border-borderline text-ink font-bold"
          >
            Pedir +20%
          </button>
          <button
            type="button"
            @click="rejectIncomingOffer(offer.id)"
            class="shrink-0 px-3 min-h-[40px] sm:min-h-0 py-1.5 rounded-lg bg-dangerpro-soft text-dangerpro font-bold"
          >
            Recusar
          </button>
        </div>
      </ListRow>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Briefcase } from 'lucide-vue-next'
import { useMarketStore } from '@/stores/market'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import { useSquad } from '@/composables/useSquad'
import { formatCurrency, formatPosBR } from '@/utils/formatCurrency'

const market = useMarketStore()
const { acceptIncomingOffer, counterIncomingOffer, rejectIncomingOffer } = useSquad()
</script>

<template>
  <div v-if="market.incomingOffers.length > 0" class="bg-surface rounded-2xl p-4 sm:p-5 border-2 border-amberpro shadow-sm space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <h3 class="font-bold text-sm sm:text-base text-ink flex items-center gap-2 min-w-0">
        <Briefcase class="w-4 h-4 text-amberpro shrink-0" />
        <span class="min-w-0 break-words">Propostas de Clubes Rivais ({{ market.incomingOffers.length }})</span>
      </h3>
      <span class="text-[11px] font-semibold text-ink-muted shrink-0">Mercado Dinâmico</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div
        v-for="offer in market.incomingOffers"
        :key="offer.id"
        class="min-w-0 p-3.5 rounded-xl bg-subtle border border-borderline flex flex-col justify-between gap-2.5 text-xs"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <span class="px-2 py-0.5 rounded bg-amberpro-soft text-amberpro font-bold text-[10px] uppercase">
              {{ offer.type === 'loan' ? 'Empréstimo 1 Temp.' : 'Compra Definitiva' }}
            </span>
            <div class="font-bold text-sm text-ink mt-1 break-words [overflow-wrap:anywhere]">{{ offer.playerName }} ({{ formatPosBR(offer.position) }} • OVER {{ offer.overall }})</div>
            <div class="text-ink-muted flex items-center gap-1.5 min-w-0">
              <span class="shrink-0">Interessado:</span> <TeamCrest class="shrink-0" size="xs" :name="offer.rivalClub" /><strong class="text-ink truncate" :title="offer.rivalClub">{{ offer.rivalClub }}</strong>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="text-[10px] text-ink-muted block">Oferta</span>
            <span class="font-score font-extrabold text-lg text-emeraldpro whitespace-nowrap">{{ formatCurrency(offer.amount) }}</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            @click="acceptIncomingOffer(offer)"
            class="flex-1 py-1.5 rounded-lg bg-emeraldpro hover:bg-emeraldpro-hover text-white font-bold"
          >
            Aceitar
          </button>
          <button
            v-if="!offer.countered"
            type="button"
            @click="counterIncomingOffer(offer)"
            class="flex-1 py-1.5 rounded-lg bg-surface hover:bg-borderline border border-borderline text-ink font-bold"
          >
            Pedir +20%
          </button>
          <button
            type="button"
            @click="rejectIncomingOffer(offer.id)"
            class="shrink-0 px-3 py-1.5 rounded-lg bg-dangerpro-soft text-dangerpro font-bold"
          >
            Recusar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

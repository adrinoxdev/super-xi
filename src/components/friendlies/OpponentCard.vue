<script setup lang="ts">
import { computed } from 'vue'
import type { FriendlyOption, FriendlyQuote } from '@/types/friendlies'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { formatCurrency } from '@/utils/format/formatCurrency'
import { signedFame } from '@/utils/friendlies/fame'
import { useFriendliesStore } from '@/stores/friendlies'

const props = defineProps<{
  option: FriendlyOption
  /** Cotação com o OVER atual do usuário: estimativa (o apito recalcula com o OVER do time que vai a campo). */
  quote: FriendlyQuote
  /** OVER do amistoso do usuário (sem arredondar). */
  userOver: number
  disabled: boolean
  /** Motivo exibido no botão quando desabilitado (ex.: "Sem fichas — próxima em 04:12"). */
  blockLabel: string | null
}>()
const emit = defineEmits<{ play: [botId: string] }>()
const friendlies = useFriendliesStore()

// Ranking e fama ATUAIS do bot (o sorteio grava os do momento); sem o bot na lista, cai nos gravados.
const now = computed(() => friendlies.botNow(props.option.botId) ?? { rank: props.option.rank, fame: props.option.fame })

// Selo de diferença: rival mais forte em vermelho (+3), mais fraco em verde (−2).
const diff = computed(() => props.quote.oppOver - Math.round(props.userOver))
const diffLabel = computed(() => (diff.value > 0 ? `+${diff.value}` : `−${Math.abs(diff.value)}`))
</script>

<template>
  <div class="rounded-2xl border border-borderline bg-subtle p-3 flex flex-col gap-2.5 min-w-0">
    <div class="flex items-center gap-2.5 min-w-0">
      <TeamCrest :name="option.name" size="sm" />
      <div class="min-w-0 flex-1">
        <p class="font-extrabold text-ink truncate" :title="option.name">{{ option.name }}</p>
        <p class="text-[11px] text-ink-muted">Ranking #{{ now.rank }} • Fama {{ now.fame }}</p>
      </div>
      <div class="shrink-0 text-right" :title="'Estimativa com a melhor escalação disponível'">
        <span class="text-[10px] font-bold uppercase text-ink-muted block leading-none">OVER</span>
        <strong class="font-score text-xl text-ink leading-tight">~{{ quote.oppOver }}</strong>
        <span v-if="diff !== 0" class="ml-1 text-xs font-bold" :class="diff > 0 ? 'text-dangerpro' : 'text-emeraldpro'">{{ diffLabel }}</span>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-2 text-xs">
      <div class="rounded-lg bg-night/60 border border-borderline/60 px-2.5 py-1.5 min-w-0">
        <span class="text-[10px] font-bold uppercase text-ink-muted block">Prêmio</span>
        <strong v-if="quote.prize > 0" class="text-emeraldpro break-words">{{ formatCurrency(quote.prize) }}</strong>
        <strong v-else class="text-ink" title="Limite diário de vitórias pagas atingido">R$ 0 <span class="font-normal text-ink-muted">(limite diário)</span></strong>
      </div>
      <div class="rounded-lg bg-night/60 border border-borderline/60 px-2.5 py-1.5 min-w-0">
        <span class="text-[10px] font-bold uppercase text-ink-muted block">Fama (V/E/D)</span>
        <span class="whitespace-nowrap">
          <strong class="text-emeraldpro">{{ signedFame(quote.fameWin) }}</strong>
          <span class="text-ink-muted"> / </span><strong>{{ signedFame(quote.fameDraw) }}</strong>
          <span class="text-ink-muted"> / </span><strong class="text-dangerpro">{{ signedFame(quote.fameLoss) }}</strong>
        </span>
      </div>
    </div>
    <BaseButton
      class="px-4 py-2 min-h-11 text-sm disabled:cursor-not-allowed"
      :disabled="disabled"
      @click="emit('play', option.botId)"
    >
      {{ disabled && blockLabel ? blockLabel : 'Jogar (1 ficha)' }}
    </BaseButton>
  </div>
</template>

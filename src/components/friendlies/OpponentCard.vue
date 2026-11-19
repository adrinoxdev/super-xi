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
  <div class="rounded-2xl border border-borderline bg-subtle p-4 flex flex-col gap-3 min-w-0">
    <div class="flex items-center gap-3 min-w-0">
      <TeamCrest :name="option.name" size="md" />
      <div class="min-w-0">
        <p class="font-extrabold text-ink truncate" :title="option.name">{{ option.name }}</p>
        <p class="text-[11px] text-ink-muted">Ranking #{{ now.rank }} • Fama {{ now.fame }}</p>
      </div>
    </div>
    <div class="flex items-baseline gap-2">
      <span class="text-[11px] font-bold uppercase text-ink-muted">OVER estimado</span>
      <strong class="font-score text-2xl text-ink" :title="'Estimativa com a melhor escalação disponível'">~{{ quote.oppOver }}</strong>
      <span v-if="diff !== 0" class="text-xs font-bold" :class="diff > 0 ? 'text-dangerpro' : 'text-emeraldpro'">{{ diffLabel }}</span>
    </div>
    <p class="text-xs text-ink break-words">
      <template v-if="quote.prize > 0">Prêmio: <strong class="text-emeraldpro">{{ formatCurrency(quote.prize) }}</strong></template>
      <template v-else>Prêmio: <strong>R$ 0</strong> — limite diário de vitórias pagas atingido</template>
    </p>
    <p class="text-xs text-ink">
      Fama:
      <strong class="text-emeraldpro">{{ signedFame(quote.fameWin) }}</strong> /
      <strong>{{ signedFame(quote.fameDraw) }}</strong> /
      <strong class="text-dangerpro">{{ signedFame(quote.fameLoss) }}</strong>
      <span class="text-ink-muted">(V/E/D)</span>
    </p>
    <p class="text-[11px] text-ink-muted break-words">Estimativa com a melhor escalação disponível; os valores são fixados no apito inicial.</p>
    <BaseButton
      class="mt-auto px-4 py-3 min-h-12 text-sm disabled:cursor-not-allowed"
      :disabled="disabled"
      @click="emit('play', option.botId)"
    >
      {{ disabled && blockLabel ? blockLabel : 'Jogar (1 ficha)' }}
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { FriendlyBot, FriendlyOption, FriendlyQuote } from '@/types/friendlies'
import OpponentCard from './OpponentCard.vue'

const props = defineProps<{
  options: FriendlyOption[]
  /** Cotação de cada opção (por botId) com o OVER atual: o que o cartão mostra e a base dos OVERs que rolam. */
  quotes: Record<string, FriendlyQuote>
  /** Bots do ranking: nomes que rolam nos slots. */
  bots: FriendlyBot[]
  /** Sobe a cada sorteio novo: dispara a animação. Ao montar não anima (recarregar mostra as opções salvas). */
  spinKey: number
  userOver: number
  disabled: boolean
  blockLabel: string | null
}>()
const emit = defineEmits<{ play: [botId: string]; spinning: [value: boolean] }>()

const STOP_MS = [900, 1300, 1700]
// false = slot ainda rolando. Ausente (undefined) conta como revelado.
const revealed = ref<boolean[]>([])
const glow = ref<boolean[]>([])
const reels = ref<Array<{ name: string; over: number }>>([])
let timers: ReturnType<typeof setTimeout>[] = []

const rolling = computed(() => revealed.value.some((r) => r === false))

function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function randomReel(i: number) {
  const bot = props.bots[Math.floor(Math.random() * props.bots.length)]
  const opt = props.options[i]
  const base = (opt && props.quotes[opt.botId]?.oppOver) ?? 60
  return { name: bot?.name ?? '???', over: Math.max(35, Math.min(99, base + Math.floor(Math.random() * 11) - 5)) }
}

function revealAll() {
  revealed.value = props.options.map(() => true)
  glow.value = props.options.map(() => false)
  emit('spinning', false)
}

function spin() {
  clearTimers()
  const n = props.options.length
  if (!n) return
  if (prefersReducedMotion() || !props.bots.length) {
    revealAll()
    return
  }
  revealed.value = props.options.map(() => false)
  glow.value = props.options.map(() => false)
  reels.value = props.options.map((_, i) => randomReel(i))
  emit('spinning', true)
  const start = performance.now()
  props.options.forEach((_, i) => {
    const stopAt = STOP_MS[i] ?? STOP_MS[STOP_MS.length - 1] + 400 * (i - STOP_MS.length + 1)
    const tick = () => {
      const elapsed = performance.now() - start
      if (elapsed >= stopAt) {
        revealed.value[i] = true
        glow.value[i] = true
        timers.push(setTimeout(() => (glow.value[i] = false), 700))
        if (!revealed.value.some((r) => r === false)) emit('spinning', false)
        return
      }
      reels.value[i] = randomReel(i)
      // Troca a cada 60 ms no começo e desacelera até ~180 ms perto de parar.
      timers.push(setTimeout(tick, 60 + Math.round((elapsed / stopAt) * 120)))
    }
    tick()
  })
}

watch(() => props.spinKey, spin)

// A roleta só nasce depois do 1º sorteio (v-if), já com spinKey=1: anima ao montar. Recarregar (spinKey=0) não anima.
onMounted(() => {
  if (props.spinKey > 0) spin()
})

onBeforeUnmount(() => {
  clearTimers()
  emit('spinning', false)
})
</script>

<template>
  <div class="grid grid-cols-1 gap-3">
    <template v-for="(opt, i) in options" :key="opt.botId">
      <OpponentCard
        v-if="revealed[i] !== false"
        :option="opt"
        :quote="quotes[opt.botId]"
        :user-over="userOver"
        :disabled="disabled || rolling"
        :block-label="blockLabel"
        class="animate-pop transition-shadow duration-500"
        :class="glow[i] ? 'ring-2 ring-gold shadow-[0_0_18px_rgba(251,191,36,0.45)]' : ''"
        @play="emit('play', $event)"
      />
      <div
        v-else
        class="rounded-2xl border-2 border-dashed border-gold/50 bg-night p-4 min-h-[13.5rem] flex flex-col items-center justify-center gap-2 overflow-hidden min-w-0"
        aria-hidden="true"
      >
        <span class="text-[11px] font-bold uppercase text-gold">Sorteando…</span>
        <span class="font-extrabold text-ink text-center truncate max-w-full">{{ reels[i]?.name }}</span>
        <span class="font-score text-2xl text-ink-muted">{{ reels[i]?.over }}</span>
      </div>
    </template>
    <p class="sr-only" aria-live="polite">{{ rolling ? 'Sorteando adversários' : 'Adversários sorteados' }}</p>
  </div>
</template>

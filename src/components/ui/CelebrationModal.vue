<script setup lang="ts">
import { computed, watch } from 'vue'
import { Trophy, TrendingUp } from 'lucide-vue-next'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useUiStore } from '@/stores/ui'
import { useSfx } from '@/composables/useSfx'
import { formatCurrency } from '@/utils/format/formatCurrency'

const ui = useUiStore()
const { playCelebration } = useSfx()

const c = computed(() => ui.celebration)
const isPromotion = computed(() => c.value.kind === 'promotion')

const COLORS = ['#FBBF24', '#22C55E', '#F87171', '#60A5FA', '#F1F5F9', '#A78BFA']
const pieces = Array.from({ length: 80 }, (_, i) => ({
  left: Math.random() * 100,
  delay: Math.random() * 2.5,
  dur: 3 + Math.random() * 2.5,
  drift: (Math.random() - 0.5) * 160,
  spin: 360 + Math.random() * 720,
  color: COLORS[i % COLORS.length],
  w: 6 + Math.random() * 6,
  h: 10 + Math.random() * 8
}))

watch(
  () => c.value.open,
  (open) => {
    if (open) playCelebration()
  }
)
</script>

<template>
  <template v-if="c.open">
    <div class="confetti" aria-hidden="true">
      <span
        v-for="(p, i) in pieces"
        :key="i"
        class="confetti-piece"
        :style="{
          left: p.left + '%',
          width: p.w + 'px',
          height: p.h + 'px',
          background: p.color,
          animationDelay: p.delay + 's',
          animationDuration: p.dur + 's',
          '--drift': p.drift + 'px',
          '--spin': p.spin + 'deg'
        }"
      />
    </div>
    <BaseModal @close="ui.closeCelebration()">
      <div class="text-center space-y-3" role="dialog" aria-modal="true" aria-labelledby="celebration-title">
        <div class="mx-auto w-20 h-20 rounded-full bg-amberpro-soft border border-gold/50 flex items-center justify-center">
          <component :is="isPromotion ? TrendingUp : Trophy" class="w-10 h-10 text-gold" />
        </div>
        <p class="text-xs uppercase tracking-widest text-ink-muted">{{ isPromotion ? 'Subida de divisão' : 'Título conquistado' }}</p>
        <h2 id="celebration-title" class="text-2xl font-bold text-gold">{{ c.title }}</h2>
        <p v-if="c.prize > 0" class="text-sm text-ink-light">
          Prêmio: <b class="font-score text-emeraldpro">{{ formatCurrency(c.prize) }}</b>
        </p>
        <BaseButton class="w-full py-3" @click="ui.closeCelebration()">Comemorar!</BaseButton>
      </div>
    </BaseModal>
  </template>
</template>

<style scoped>
.confetti {
  position: fixed;
  inset: 0;
  z-index: 60;
  pointer-events: none;
  overflow: hidden;
}
.confetti-piece {
  position: absolute;
  top: -24px;
  border-radius: 2px;
  opacity: 0;
  animation-name: confetti-fall;
  animation-timing-function: linear;
  animation-iteration-count: 2;
}
@keyframes confetti-fall {
  0% { transform: translate3d(0, 0, 0) rotate(0); opacity: 1; }
  100% { transform: translate3d(var(--drift), 105dvh, 0) rotate(var(--spin)); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .confetti { display: none; }
}
</style>

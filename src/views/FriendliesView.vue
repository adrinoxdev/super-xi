<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { Dices, RefreshCw } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import TokenBar from '@/components/friendlies/TokenBar.vue'
import OpponentRoulette from '@/components/friendlies/OpponentRoulette.vue'
import FriendlyRanking from '@/components/friendlies/FriendlyRanking.vue'
import FriendlyHistory from '@/components/friendlies/FriendlyHistory.vue'
import { useFriendliesStore } from '@/stores/friendlies'
import { useClubStore } from '@/stores/club'
import { useFriendlies } from '@/composables/useFriendlies'
import { FRIENDLIES } from '@/config'

const friendlies = useFriendliesStore()
const club = useClubStore()
const { userOver, isLive, liveBlock, currentRankBonus, quotes, nextTokenIn, challengeBlock, open, challenge, redraw, play, watchLive } = useFriendlies()

const total = FRIENDLIES.bots.count + 1
// spinKey sobe a cada sorteio novo (a roleta da Tarefa 16 anima); spinning trava "Jogar" e "Re-sortear" durante a animação.
const spinKey = ref(0)
const spinning = ref(false)
const optionsEl = ref<HTMLElement | null>(null)

const tokenBarNext = computed(() => (friendlies.tokens < FRIENDLIES.tokens.max ? nextTokenIn.value : null))
const bonusLabel = computed(() => '+' + currentRankBonus.value.toFixed(1).replace('.', ','))
const playBlock = computed<string | null>(() => {
  if (isLive.value) return 'Amistoso em andamento'
  // Rótulo curto no botão; o motivo completo aparece no cartão "Desafio".
  if (liveBlock.value) return 'Outra partida ao vivo'
  if (friendlies.tokens < 1) return `Sem fichas — próxima em ${nextTokenIn.value}`
  return challengeBlock.value
})
const playDisabled = computed(() => !!playBlock.value || spinning.value)
const redrawDisabled = computed(() => friendlies.drawsLeft <= 0 || spinning.value || !!challengeBlock.value)

onMounted(open)

async function onChallenge() {
  if (isLive.value) {
    watchLive()
    return
  }
  if (challenge()) spinKey.value++
  // Com opções já sorteadas, "Desafiar" só leva até elas (não sorteia de novo).
  await nextTick()
  if (friendlies.options) optionsEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onRedraw() {
  if (redraw()) spinKey.value++
}
</script>

<template>
  <section class="space-y-4 animate-pop">
    <BaseCard class="space-y-3">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 min-w-0">
          <div class="min-w-0">
            <span class="text-[11px] font-bold uppercase text-ink-muted block">Fama</span>
            <strong class="font-score text-2xl text-gold">{{ friendlies.fame }}</strong>
          </div>
          <div class="min-w-0">
            <span class="text-[11px] font-bold uppercase text-ink-muted block">Posição</span>
            <strong class="font-score text-2xl text-ink">#{{ friendlies.rank }}</strong>
            <span class="text-xs text-ink-muted"> de {{ total }}</span>
          </div>
          <div class="min-w-0">
            <span class="text-[11px] font-bold uppercase text-ink-muted block">OVER do amistoso</span>
            <strong class="font-score text-2xl text-ink">{{ Math.round(userOver) }}</strong>
            <span class="block text-[11px] text-ink-muted">energia 100 • melhor escalação</span>
          </div>
          <div class="min-w-0">
            <span class="text-[11px] font-bold uppercase text-ink-muted block">Bônus de posição</span>
            <strong class="font-score text-2xl text-ink">{{ bonusLabel }}</strong>
            <span class="block text-[11px] text-ink-muted">no OVER dos rivais</span>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 lg:gap-5 min-w-0">
          <TokenBar :tokens="friendlies.tokens" :max="FRIENDLIES.tokens.max" :next-in="tokenBarNext" />
          <BaseButton class="w-full sm:w-auto px-6 py-3 min-h-12 text-sm flex items-center justify-center gap-2 shrink-0 disabled:cursor-not-allowed" :disabled="!isLive && !!challengeBlock" @click="onChallenge">
            <Dices class="w-4 h-4" />
            {{ isLive ? 'Acompanhar amistoso' : 'Desafiar' }}
          </BaseButton>
        </div>
      </div>
      <div class="space-y-1">
        <p v-if="!isLive && challengeBlock" class="text-xs text-dangerpro">{{ challengeBlock }}</p>
        <p v-else class="text-xs text-ink-muted">Sortear não gasta ficha. A ficha é gasta só quando a partida começa.</p>
        <p v-if="!isLive && liveBlock" class="text-xs text-dangerpro break-words" role="status">{{ liveBlock }}</p>
      </div>
    </BaseCard>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
      <div class="lg:col-span-7 min-w-0">
        <div v-if="friendlies.options" ref="optionsEl" class="space-y-3 scroll-mt-24">
          <OpponentRoulette
            :options="friendlies.options"
            :quotes="quotes"
            :bots="friendlies.bots"
            :spin-key="spinKey"
            :user-over="userOver"
            :disabled="playDisabled"
            :block-label="playBlock"
            @play="play"
            @spinning="spinning = $event"
          />
          <div class="flex flex-wrap items-center gap-3">
            <BaseButton variant="secondary" class="px-4 py-2.5 min-h-12 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" :disabled="redrawDisabled" @click="onRedraw">
              <RefreshCw class="w-4 h-4" />
              Re-sortear
            </BaseButton>
            <span class="text-xs" :class="friendlies.drawsLeft > 0 ? 'text-ink-muted' : 'text-amberpro font-bold'">
              {{ friendlies.drawsLeft > 0 ? `Sorteios restantes: ${friendlies.drawsLeft}` : 'Sem sorteios restantes: escolha um dos 3 adversários' }}
            </span>
          </div>
        </div>
        <BaseCard v-else class="flex flex-col items-center text-center gap-2 py-8">
          <Dices class="w-8 h-8 text-gold" />
          <SectionTitle>Sorteie 3 adversários</SectionTitle>
          <p class="text-sm text-ink-muted">Toque em Desafiar para a roleta revelar os rivais.</p>
        </BaseCard>
      </div>
      <div class="lg:col-span-5 min-w-0 space-y-4">
        <FriendlyRanking :view="friendlies.ranking" :user-name="club.name" :total="total" />
        <FriendlyHistory :results="friendlies.recent" />
      </div>
    </div>
  </section>
</template>

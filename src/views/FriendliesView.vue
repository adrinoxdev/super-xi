<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { Dices, Gauge, Medal, RefreshCw, Star, TrendingUp } from 'lucide-vue-next'
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
    <!-- Mesmo padrão dos cartões de FinanceSummary (tela Início): rótulo + ícone, valor grande, descrição dentro do cartão. -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <BaseCard padding="p-4 sm:p-5" class="min-w-0">
        <div class="flex items-center justify-between text-xs font-semibold text-ink-muted uppercase tracking-wider">
          <span class="truncate">Fama</span>
          <Star class="w-4 h-4 text-gold shrink-0" />
        </div>
        <div class="mt-2 font-score font-extrabold text-2xl sm:text-3xl break-words text-gold">{{ friendlies.fame }}</div>
        <p class="mt-1 text-xs text-ink-muted">Pontos do ranking de amistosos.</p>
      </BaseCard>

      <BaseCard padding="p-4 sm:p-5" class="min-w-0">
        <div class="flex items-center justify-between text-xs font-semibold text-ink-muted uppercase tracking-wider">
          <span class="truncate">Posição</span>
          <Medal class="w-4 h-4 text-ink-muted shrink-0" />
        </div>
        <div class="mt-2 font-score font-extrabold text-2xl sm:text-3xl break-words text-ink">#{{ friendlies.rank }}</div>
        <p class="mt-1 text-xs text-ink-muted">de {{ total }} times no ranking.</p>
      </BaseCard>

      <BaseCard padding="p-4 sm:p-5" class="min-w-0">
        <div class="flex items-center justify-between text-xs font-semibold text-ink-muted uppercase tracking-wider">
          <span class="truncate">OVER do Amistoso</span>
          <Gauge class="w-4 h-4 text-emeraldpro shrink-0" />
        </div>
        <div class="mt-2 font-score font-extrabold text-2xl sm:text-3xl break-words text-ink">{{ Math.round(userOver) }}</div>
        <p class="mt-1 text-xs text-ink-muted">Energia 100 e melhor escalação.</p>
      </BaseCard>

      <BaseCard padding="p-4 sm:p-5" class="min-w-0">
        <div class="flex items-center justify-between text-xs font-semibold text-ink-muted uppercase tracking-wider">
          <span class="truncate">Bônus de Posição</span>
          <TrendingUp class="w-4 h-4 text-emeraldpro shrink-0" />
        </div>
        <div class="mt-2 font-score font-extrabold text-2xl sm:text-3xl break-words text-emeraldpro">{{ bonusLabel }}</div>
        <p class="mt-1 text-xs text-ink-muted">Somado ao OVER dos rivais.</p>
      </BaseCard>
    </div>

    <BaseCard class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <!-- Fichas e descrição à esquerda (onde estavam); o botão fica à direita, centralizado na vertical. -->
      <div class="min-w-0 space-y-3">
        <TokenBar :tokens="friendlies.tokens" :max="FRIENDLIES.tokens.max" :next-in="tokenBarNext" />
        <div class="space-y-1">
          <p v-if="!isLive && challengeBlock" class="text-xs text-dangerpro">{{ challengeBlock }}</p>
          <p v-else class="text-xs text-ink-muted">Sortear não gasta ficha. A ficha é gasta só quando a partida começa.</p>
          <p v-if="!isLive && liveBlock" class="text-xs text-dangerpro break-words" role="status">{{ liveBlock }}</p>
        </div>
      </div>
      <BaseButton class="w-full sm:w-auto sm:min-w-56 shrink-0 px-6 py-3 min-h-12 text-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed" :disabled="!isLive && !!challengeBlock" @click="onChallenge">
        <Dices class="w-4 h-4" />
        {{ isLive ? 'Acompanhar amistoso' : 'Desafiar' }}
      </BaseButton>
    </BaseCard>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
      <div class="order-1 lg:order-2 lg:col-span-4 min-w-0 space-y-4">
        <div>
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
        <FriendlyHistory :results="friendlies.recent" />
      </div>
      <div class="order-3 lg:order-1 lg:col-span-8 min-w-0">
        <FriendlyRanking :view="friendlies.ranking" :user-name="club.name" :total="total" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bandage } from 'lucide-vue-next'
import type { Player } from '@/types/player'
import { useClubStore } from '@/stores/club'
import PlayerAvatar from '@/components/player/PlayerAvatar.vue'
import { formatPosBR } from '@/utils/formatCurrency'

const props = withDefaults(
  defineProps<{
    player: Player
    size?: 'xs' | 'sm' | 'md' | 'lg'
    selected?: boolean
    clickable?: boolean
    estimated?: boolean
    overall?: number
    showStamina?: boolean
    maskAttrs?: boolean
    label?: string
    posLabel?: string
  }>(),
  { size: 'md', selected: false, clickable: false, estimated: false, showStamina: false, maskAttrs: false }
)
const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

const club = useClubStore()

const WIDTHS = { xs: 'clamp(60px, 17.5vw, 76px)', sm: '128px', md: '176px', lg: '232px' } as const
const width = computed(() => WIDTHS[props.size])
const xs = computed(() => props.size === 'xs')
const shownName = computed(() => props.label ?? props.player.name)
const shownPos = computed(() => props.posLabel ?? formatPosBR(props.player.position))

// altura do card em cqw (largura = 100cqw): sem rodapé, termina na linha dos atributos
const H = computed(() => (xs.value ? 106 : 132))

const shownOver = computed(() => props.overall ?? props.player.overall)

// Faixas na escala nova (atleta típico entre 45 e 61): bronze < 55, prata 55-64, ouro 65-74, elite >= 75, lenda >= 90.
type Tier = 'bronze' | 'silver' | 'gold' | 'elite' | 'legend'
const tier = computed<Tier>(() => {
  const o = shownOver.value
  return o >= 90 ? 'legend' : o >= 75 ? 'elite' : o >= 65 ? 'gold' : o >= 55 ? 'silver' : 'bronze'
})
const TIER_LABEL = { bronze: 'Bronze', silver: 'Prata', gold: 'Ouro', elite: 'Elite', legend: 'Lenda' } as const

// contraste validado (WCAG AA) por cálculo de luminância; ver razões no relatório
const THEMES = {
  bronze: { bg: 'linear-gradient(160deg,#f0c6a0 0%,#dca072 55%,#c98d5c 100%)', ray: '#fff', rayOp: 0.08, ink: '#1c0e04', edge: '#6e3b18', sub: 'rgba(255,255,255,.3)', halo: 'rgba(255,255,255,.75)', vals: ['#14532d', '#5c3500', '#851717'] },
  silver: { bg: 'linear-gradient(160deg,#f4f6f9 0%,#d3dae3 55%,#b4bfcc 100%)', ray: '#fff', rayOp: 0.1, ink: '#0f1722', edge: '#6b7686', sub: 'rgba(255,255,255,.3)', halo: 'rgba(255,255,255,.8)', vals: ['#14532d', '#5c3500', '#851717'] },
  gold: { bg: 'linear-gradient(160deg,#f9e79b 0%,#ecc653 55%,#d9a92f 100%)', ray: '#fff', rayOp: 0.1, ink: '#1f1504', edge: '#8d6a16', sub: 'rgba(255,255,255,.3)', halo: 'rgba(255,255,255,.75)', vals: ['#14532d', '#5c3500', '#851717'] },
  elite: { bg: 'linear-gradient(160deg,#2c2f38 0%,#14161c 55%,#07080b 100%)', ray: '#e6c15a', rayOp: 0.07, ink: '#f6dc8c', edge: '#e6c15a', sub: 'rgba(0,0,0,.35)', halo: 'rgba(0,0,0,.8)', vals: ['#6ee7a0', '#fcd34d', '#fca5a5'] },
  // lenda: mesmo fundo escuro da elite (mesmo contraste); só a borda e o texto ficam em ouro mais vivo
  legend: { bg: 'linear-gradient(160deg,#2c2f38 0%,#14161c 55%,#07080b 100%)', ray: '#ffd24a', rayOp: 0.12, ink: '#ffe9a8', edge: '#ffd24a', sub: 'rgba(0,0,0,.35)', halo: 'rgba(0,0,0,.8)', vals: ['#6ee7a0', '#fcd34d', '#fca5a5'] }
} as const
const theme = computed(() => THEMES[tier.value])
const halo = computed(() => `0 0 0.12em ${theme.value.halo}, 0 0 0.3em ${theme.value.halo}`)

// recorte em CSS, proporcional à altura H (cqw)
const CLIP = computed(() => {
  const h = H.value
  const p = (y: number) => `${((y / h) * 100).toFixed(1)}%`
  return `polygon(3% ${p(22)}, 15% ${p(22)}, 22% ${p(17.5)}, 26% ${p(9.9)}, 37% ${p(14)}, 63% ${p(14)}, 74% ${p(9.9)}, 78% ${p(17.5)}, 85% ${p(22)}, 97% ${p(22)}, 97% ${p(h - 12)}, 94% ${p(h - 6)}, 50% ${p(h - 0.8)}, 6% ${p(h - 6)}, 3% ${p(h - 12)})`
})

function valueColor(v: number): string {
  const c = theme.value.vals
  return v >= 70 ? c[0] : v >= 50 ? c[1] : c[2]
}

const attrs = computed(() => {
  const a = props.player.attributes
  return [
    { label: 'PAC', value: a.pace },
    { label: 'SHO', value: a.shooting },
    { label: 'PAS', value: a.passing },
    { label: 'DRI', value: a.dribbling },
    { label: 'DEF', value: a.defending },
    { label: 'FIS', value: a.physical }
  ]
})

const stamina = computed(() => Math.max(0, Math.min(100, Math.round(props.player.stamina ?? 100))))

const rays = Array.from({ length: 14 }, (_, i) => i)
</script>

<template>
  <component
    :is="clickable ? 'button' : 'div'"
    :type="clickable ? 'button' : undefined"
    
    :style="{ width, containerType: 'inline-size' }"
    :class="[
      'relative block shrink-0 text-left select-none',
      clickable ? 'cursor-pointer transition-transform hover:-translate-y-0.5 focus:outline-none' : ''
    ]"
    :aria-label="`${shownName}, OVER ${shownOver}${estimated ? ' estimado' : ''}, ${shownPos}, nível ${TIER_LABEL[tier]}`"
    :aria-pressed="clickable ? selected : undefined"
    @click="emit('click', $event)"
  >
    <div
      class="relative w-full"
      :style="{
        aspectRatio: `100 / ${H}`,
        filter: selected
          ? 'drop-shadow(0 0 0.8cqw #10b981) drop-shadow(0 0 2.5cqw #10b981)'
          : 'drop-shadow(0 1.5cqw 2cqw rgba(0,0,0,.28))'
      }"
    >
      <div class="absolute inset-0" :style="{ clipPath: CLIP, background: theme.edge }" />
      <div
        class="absolute overflow-hidden"
        :style="{ inset: '1.2cqw', clipPath: CLIP, background: theme.bg, color: theme.ink }"
      >
        <svg viewBox="0 0 200 280" class="absolute inset-0 w-full h-full" preserveAspectRatio="none" aria-hidden="true">
          <g :fill="theme.ray" :opacity="theme.rayOp" transform="translate(130 80)">
            <path
              v-for="i in rays"
              :key="i"
              :transform="`rotate(${i * (360 / 14)})`"
              d="M0 0 L-9 -260 L9 -260 Z"
            />
          </g>
          
        </svg>

        <div
          class="absolute left-0 right-0 bottom-0"
          :style="{ top: xs ? '70cqw' : '74cqw', background: `linear-gradient(180deg, transparent 0%, ${theme.sub} 14%, ${theme.sub} 100%)` }"
        />

        <div class="absolute" :style="xs ? 'left: 34cqw; top: 8cqw; width: 60cqw; height: 60cqw' : 'left: 31cqw; top: 9cqw; width: 63cqw; height: 63cqw'">
          <PlayerAvatar :seed="player.id + player.name" :shirt-color="club.primaryColor" />
        </div>

        <div class="absolute flex flex-col items-center leading-none" :style="xs ? 'left: 5cqw; top: 24cqw; width: 28cqw' : 'left: 6cqw; top: 22cqw; width: 22cqw'">
          <span class="font-score font-extrabold" :style="{ textShadow: halo, fontSize: xs ? '22cqw' : '17cqw' }" aria-hidden="true">
            <span v-if="estimated" style="font-size: 10cqw">~</span>{{ shownOver }}
          </span>
          <span class="font-bold" :style="{ textShadow: halo, fontSize: xs ? '11cqw' : '7.5cqw', marginTop: '1.5cqw' }">{{ shownPos }}</span>
          <div
            v-if="showStamina && !xs"
            class="rounded-full overflow-hidden"
            :style="{ width: '12cqw', height: '1.6cqw', marginTop: '2.5cqw', background: theme.sub }"
            :title="`Energia ${stamina}%`"
          >
            <div class="h-full" :style="{ width: stamina + '%', background: valueColor(stamina) }" />
          </div>
        </div>

        <div
          class="absolute w-full text-center font-extrabold truncate"
          :style="xs ? 'top: 72cqw; padding: 0 5cqw; font-size: 14cqw; line-height: 1.2' : 'top: 76cqw; padding: 0 7cqw; font-size: 9cqw; line-height: 1.2'"
        >
          {{ shownName }}
        </div>

        <div
          v-if="showStamina && xs"
          class="absolute rounded-full overflow-hidden"
          :style="{ left: '30cqw', right: '30cqw', top: '90.5cqw', height: '3.5cqw', background: theme.sub }"
          :title="`Energia ${stamina}%`"
        >
          <div class="h-full" :style="{ width: stamina + '%', background: valueColor(stamina) }" />
        </div>

        <div
          v-if="!xs"
          class="absolute"
          :style="{ left: '14cqw', right: '14cqw', top: '88cqw', height: '0.6cqw', background: theme.edge, opacity: 0.45 }"
        />

        <div
          v-if="!xs"
          class="absolute grid grid-cols-3 text-center"
          style="left: 12cqw; right: 12cqw; top: 90.5cqw; row-gap: 1.5cqw"
        >
          <div v-for="a in attrs" :key="a.label" class="leading-none">
            <div class="font-bold" style="font-size: 5.6cqw; opacity: 0.9">{{ a.label }}</div>
            <div class="font-score font-extrabold" :style="{ fontSize: '9.5cqw', color: maskAttrs ? 'inherit' : valueColor(a.value), marginTop: '0.8cqw' }">
              {{ maskAttrs ? '--' : a.value }}
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="player.injury"
        class="absolute flex items-center justify-center rounded-full text-white shadow"
        :style="{ top: '0', right: '0', width: xs ? '24cqw' : '18cqw', height: xs ? '24cqw' : '18cqw', background: '#dc2626', border: '1cqw solid #fff' }"
        :title="`Lesionado: ${player.injury.matchesLeft} jogo(s) restantes`"
        role="img"
        :aria-label="`Lesionado, ${player.injury.matchesLeft} jogos restantes`"
      >
        <Bandage :style="{ width: '60%', height: '60%' }" />
      </div>
    </div>
  </component>
</template>

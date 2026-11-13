<script lang="ts">
let crestUid = 0
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useClubStore } from '@/stores/club'
import type { CrestOrientation, CrestPattern, CrestShape } from '@/types/club'
import type { TeamIdentity } from '@/types/team'
import {
  CREST_SHAPE_PATHS,
  CREST_VIEWBOX,
  contrastText,
  luminance,
  mixHex,
  normalizeCrestShape,
  orientationAngle,
  patternRects
} from '@/utils/identity/crest'

const props = withDefaults(
  defineProps<{
    size?: 'xs' | 'sm' | 'md' | 'lg'
    // Sobrescritas opcionais (miniaturas do editor); sem elas, lê a store.
    shape?: CrestShape
    primary?: string
    secondary?: string
    pattern?: CrestPattern
    orientation?: CrestOrientation
    stripes?: number
    code?: string
    // 'auto' ou hex; prioridade maxima sobre identidade e store.
    textColor?: string
    // Identidade completa de outro time; sobrescritas individuais acima ainda tem prioridade.
    identity?: TeamIdentity
  }>(),
  { size: 'md' }
)
const club = useClubStore()
const uid = `crest-${++crestUid}`

const sizeClass = computed(() => (props.size === 'xs' ? 'w-5 h-6' : props.size === 'sm' ? 'w-7 h-8' : props.size === 'lg' ? 'w-14 h-[4.2rem]' : 'w-9 h-11'))

const path = computed(() => CREST_SHAPE_PATHS[normalizeCrestShape(props.shape ?? props.identity?.shape ?? club.crestShape)])
const primary = computed(() => props.primary ?? props.identity?.primaryColor ?? club.primaryColor)
const secondary = computed(() => props.secondary ?? props.identity?.secondaryColor ?? club.secondaryColor)
const pattern = computed(() => props.pattern ?? props.identity?.pattern ?? club.crestPattern)
const angle = computed(() => orientationAngle(props.orientation ?? props.identity?.orientation ?? club.crestOrientation))
const rects = computed(() => patternRects(pattern.value, props.stripes ?? props.identity?.stripes ?? club.crestStripes))
const label = computed(() => (props.code ?? props.identity?.shortName ?? club.shortName ?? 'SXI') || 'SXI')

const HEX = /^#[0-9a-fA-F]{6}$/
const autoText = computed(() => contrastText(pattern.value === 'liso' ? primary.value : mixHex(primary.value, secondary.value)))
// Ordem: prop > identity.textColor > store (so clube do usuario) > automatico.
const textColor = computed(() => {
  const idText = props.identity && props.primary === undefined && props.secondary === undefined ? props.identity.textColor : undefined
  const candidates = [props.textColor, idText, props.identity ? undefined : club.crestTextColor]
  for (const c of candidates) {
    if (c === 'auto') return autoText.value
    if (typeof c === 'string' && HEX.test(c)) return c
  }
  return autoText.value
})
// Borda das iniciais: so o clube do usuario escolhe; senão automática pelo contraste.
const halo = computed(() => {
  if (!props.identity && HEX.test(club.crestTextStroke)) return club.crestTextStroke
  return luminance(textColor.value) > 0.4 ? '#0f172a' : '#ffffff'
})
const hasCustomStroke = computed(() => !props.identity && HEX.test(club.crestTextStroke))
const outline = computed(() => (contrastText(primary.value) === '#ffffff' ? '#ffffff' : '#0f172a'))
const fontSize = computed(() => (label.value.length > 2 ? 30 : 36))
</script>

<template>
  <svg
    :viewBox="CREST_VIEWBOX"
    :class="sizeClass"
    class="shrink-0 drop-shadow-sm"
    role="img"
    :aria-label="`Escudo ${label}`"
  >
    <defs>
      <clipPath :id="uid"><path :d="path" /></clipPath>
    </defs>
    <g :clip-path="`url(#${uid})`">
      <rect x="-10" y="-10" width="120" height="140" :fill="primary" />
      <g :transform="`rotate(${angle} 50 60)`">
        <rect v-for="(r, i) in rects" :key="i" :x="r.x" :y="r.y" :width="r.w" :height="r.h" :fill="secondary" />
      </g>
    </g>
    <path :d="path" fill="none" :stroke="outline" stroke-width="5" stroke-linejoin="round" :clip-path="`url(#${uid})`" />
    <text
      x="50"
      y="62"
      text-anchor="middle"
      dominant-baseline="central"
      class="font-score"
      font-weight="800"
      :font-size="fontSize"
      letter-spacing="1"
      :fill="textColor"
      :stroke="halo"
      stroke-width="4"
      :stroke-opacity="hasCustomStroke ? 1 : 0.55"
      paint-order="stroke"
      stroke-linejoin="round"
    >
      {{ label }}
    </text>
  </svg>
</template>

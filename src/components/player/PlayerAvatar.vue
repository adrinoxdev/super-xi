<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ seed: string; shirtColor?: string }>(), { shirtColor: '#059669' })

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const SKINS = ['#f1c9a5', '#e0ac82', '#c68642', '#a16a45', '#7a4a2e', '#4f301f']
const HAIRS = ['#15110e', '#2b1d14', '#4a2f1b', '#8a5a2b', '#c9a35a', '#6b6b6b']

const look = computed(() => {
  const h = hash(props.seed)
  return {
    skin: SKINS[h % SKINS.length],
    hair: HAIRS[(h >> 3) % HAIRS.length],
    style: (h >> 7) % 5, // 0 raspado, 1 curto, 2 topete, 3 cacheado, 4 longo
    beard: (h >> 11) % 4 === 0,
    brows: 2 + ((h >> 13) % 3) * 0.5,
    collar: (h >> 17) % 2
  }
})
</script>

<template>
  <svg viewBox="0 0 100 100" class="w-full h-full" role="img" aria-hidden="true">
    <!-- camisa -->
    <path d="M6 100 C8 82 24 76 40 74 L60 74 C76 76 92 82 94 100 Z" :fill="shirtColor" />
    <path d="M6 100 C8 82 24 76 40 74 L60 74 C76 76 92 82 94 100 Z" fill="#000" opacity="0.12" />
    <path v-if="look.collar" d="M40 74 L50 86 L60 74 Z" fill="#fff" opacity="0.9" />
    <path v-else d="M40 74 Q50 84 60 74 Z" fill="#fff" opacity="0.9" />
    <!-- pescoço -->
    <rect x="43" y="62" width="14" height="14" rx="4" :fill="look.skin" />
    <rect x="43" y="62" width="14" height="6" fill="#000" opacity="0.15" />
    <!-- cabelo atrás -->
    <path v-if="look.style === 4" d="M26 50 C22 24 36 14 50 14 C64 14 78 24 74 50 L72 70 L28 70 Z" :fill="look.hair" />
    <!-- orelhas -->
    <ellipse cx="29" cy="48" rx="3.5" ry="5" :fill="look.skin" />
    <ellipse cx="71" cy="48" rx="3.5" ry="5" :fill="look.skin" />
    <!-- rosto -->
    <ellipse cx="50" cy="46" rx="21" ry="25" :fill="look.skin" />
    <!-- barba -->
    <path v-if="look.beard" d="M30 52 C32 70 68 70 70 52 C64 60 36 60 30 52 Z" :fill="look.hair" opacity="0.85" />
    <!-- cabelo -->
    <path v-if="look.style === 1" d="M29 40 C28 22 42 17 50 17 C60 17 72 22 71 40 C64 32 36 32 29 40 Z" :fill="look.hair" />
    <path v-if="look.style === 2" d="M29 40 C26 20 40 12 54 14 C68 14 74 26 71 40 C66 30 52 26 44 30 C38 32 32 34 29 40 Z" :fill="look.hair" />
    <g v-if="look.style === 3" :fill="look.hair">
      <circle cx="34" cy="30" r="8" /><circle cx="44" cy="23" r="8" /><circle cx="56" cy="23" r="8" />
      <circle cx="66" cy="30" r="8" /><circle cx="50" cy="29" r="9" />
    </g>
    <path v-if="look.style === 4" d="M29 42 C28 22 42 17 50 17 C60 17 72 22 71 42 C64 30 36 30 29 42 Z" :fill="look.hair" />
    <path v-if="look.style === 0" d="M30 38 C32 26 42 22 50 22 C58 22 68 26 70 38 C62 30 38 30 30 38 Z" :fill="look.hair" opacity="0.35" />
    <!-- feições -->
    <rect x="37" :y="40 - look.brows * 0.4" width="9" height="2" rx="1" :fill="look.hair" />
    <rect x="54" :y="40 - look.brows * 0.4" width="9" height="2" rx="1" :fill="look.hair" />
    <ellipse cx="41.5" cy="46" rx="2.2" ry="2.6" fill="#1b1410" />
    <ellipse cx="58.5" cy="46" rx="2.2" ry="2.6" fill="#1b1410" />
    <path d="M50 48 L48 56 L52 56" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="1.2" stroke-linecap="round" />
    <path d="M42 62 Q50 67 58 62" fill="none" stroke="#5b2a1c" stroke-width="1.8" stroke-linecap="round" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { createAvatar } from '@dicebear/core'
import * as openPeeps from '@dicebear/open-peeps'
import type { Options } from '@dicebear/open-peeps'

// Arte "Open Peeps" de Pablo Stanley, licença CC0 1.0 (domínio público). Gerada por seed, sem rede.
const props = withDefaults(
  defineProps<{ seed: string; shirtColor?: string; animated?: boolean }>(),
  { shirtColor: '#059669', animated: false }
)

// Só expressões sérias e cabelos de atleta, para o visual não ficar infantil.
const BASE: Partial<Options> = {
  face: ['calm', 'serious', 'driven', 'solemn', 'contempt', 'suspicious', 'smile'],
  head: [
    'short1', 'short2', 'short3', 'short4', 'short5',
    'shaved1', 'shaved2', 'shaved3', 'flatTop', 'pomp',
    'afro', 'cornrows', 'cornrows2', 'dreads1', 'twists', 'noHair1', 'noHair2'
  ],
  facialHair: ['chin', 'full', 'full2', 'goatee1', 'goatee2', 'moustache1', 'moustache2'],
  facialHairProbability: 35,
  accessoriesProbability: 0,
  maskProbability: 0,
  skinColor: ['ffdbb4', 'edb98a', 'd08b5b', 'ae5d29', '694d3d'],
}

// o SVG de um jogador só muda com a camisa: gera uma vez e guarda (o elenco mostra vários cards juntos)
const cache = new Map<string, string>()
function build(seed: string, shirt: string): string {
  const key = `${seed}|${shirt}`
  let svg = cache.get(key)
  if (!svg) {
    const hex = /^#[0-9a-f]{6}$/i.test(shirt) ? shirt.slice(1) : '059669'
    svg = createAvatar(openPeeps, { seed, backgroundColor: [], radius: 0, ...BASE, clothingColor: [hex] }).toString()
    cache.set(key, svg)
  }
  return svg
}

const svg = computed(() => build(props.seed, props.shirtColor))
</script>

<template>
  <div class="relative w-full h-full" aria-hidden="true">
    <div class="avatar-art absolute inset-0" :class="{ 'avatar-breathe': animated }" v-html="svg" />
  </div>
</template>

<style scoped>
.avatar-art :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
.avatar-breathe {
  transform-origin: 50% 100%;
  animation: avatar-breathe 3.2s ease-in-out infinite;
}
@keyframes avatar-breathe {
  0%, 100% { transform: scale(1) translateY(0); }
  50% { transform: scale(1.025) translateY(-1%); }
}
@media (prefers-reduced-motion: reduce) {
  .avatar-breathe { animation: none; }
}
</style>

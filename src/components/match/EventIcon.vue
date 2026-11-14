<script setup lang="ts">
import { computed } from 'vue'

export type EventIconKind = 'ball' | 'flag' | 'whistle' | 'yellow' | 'red' | 'offside' | 'post'

const props = withDefaults(defineProps<{ kind: EventIconKind; size?: number }>(), { size: 24 })

// Pixel art 12x12. k contorno, w branco, g cinza, y/Y amarelo, r/R vermelho, b madeira, s/S metal.
const PALETTE: Record<string, string> = {
  k: '#0f172a', w: '#ffffff', g: '#cbd5e1',
  y: '#facc15', Y: '#ca8a04', r: '#ef4444', R: '#b91c1c',
  b: '#b45309', s: '#cbd5e1', S: '#64748b'
}

const GRIDS: Record<EventIconKind, string[]> = {
  ball: [
    '....kkkk....',
    '..kkwkkwkk..',
    '.kwwwkkwwwk.',
    '.kwkkkkkkwk.',
    'kwwkkkkkkwwk',
    'kwwwkkkkwwwk',
    'kkwwwkkwwwkk',
    'kkkwwwwwwkkk',
    '.kkkwwwwkkk.',
    '.kwwkkkkwwk.',
    '..kkwwwwkk..',
    '....kkkk....'
  ],
  flag: [
    '.kk.........',
    '.kbkkkkkk...',
    '.kbrrrrrrkk.',
    '.kbrrrrrrrk.',
    '.kbrrrrrkk..',
    '.kbrrrkk....',
    '.kbkkk......',
    '.kb.........',
    '.kb.........',
    '.kb.........',
    'kkbkk.......',
    'kkkkk.......'
  ],
  whistle: [
    '........kkk.',
    '.......k...k',
    '.......k...k',
    '..kkkkkkkkk.',
    'kkssssssssSk',
    'kwwsssssssSk',
    'kkssskkkssSk',
    '..kssskkksSk',
    '...kssssSSk.',
    '....kkkkkk..',
    '............',
    '............'
  ],
  offside: [
    '.kk.........',
    '.kbkkkkkk...',
    '.kbyyyyyykk.',
    '.kbyyyyyyyk.',
    '.kbyyyyykk..',
    '.kbyyykk....',
    '.kbkkk......',
    '.kb.........',
    '.kb.........',
    '.kb.........',
    'kkbkk.......',
    'kkkkk.......'
  ],
  post: [
    '............',
    'kkkkkkkkkkkk',
    'kwwwwwwwwwwk',
    'kgwgwgwgwgwk',
    'kwgwgwgwgwwk',
    'kgwgwgwgwgwk',
    'kwgwgwgwgwwk',
    'kgwgwgwgwgwk',
    'kwgwgwgwgwwk',
    'kk........kk',
    'kk........kk',
    'kk........kk'
  ],
  yellow: [
    '...kkkkkk...',
    '...kwyyyk...',
    '...kwyyyk...',
    '...kwyyyk...',
    '...kyyyYk...',
    '...kyyyYk...',
    '...kyyyYk...',
    '...kyyyYk...',
    '...kyyyYk...',
    '...kyyYYk...',
    '...kYYYYk...',
    '...kkkkkk...'
  ],
  red: [
    '...kkkkkk...',
    '...kwrrrk...',
    '...kwrrrk...',
    '...kwrrrk...',
    '...krrrRk...',
    '...krrrRk...',
    '...krrrRk...',
    '...krrrRk...',
    '...krrrRk...',
    '...krrRRk...',
    '...kRRRRk...',
    '...kkkkkk...'
  ]
}

const LABELS: Record<EventIconKind, string> = {
  ball: 'Gol',
  flag: 'Escanteio',
  whistle: 'Apito do árbitro',
  yellow: 'Cartão amarelo',
  red: 'Cartão vermelho',
  offside: 'Impedimento',
  post: 'Bola na trave'
}

const pixels = computed(() => {
  const out: Array<{ x: number; y: number; c: string }> = []
  GRIDS[props.kind].forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = PALETTE[row[x]]
      if (c) out.push({ x, y, c })
    }
  })
  return out
})
</script>

<template>
  <svg
    viewBox="0 0 12 12"
    :width="size"
    :height="size"
    shape-rendering="crispEdges"
    role="img"
    :aria-label="LABELS[kind]"
  >
    <title>{{ LABELS[kind] }}</title>
    <rect v-for="p in pixels" :key="`${p.x}-${p.y}`" :x="p.x" :y="p.y" width="1" height="1" :fill="p.c" />
  </svg>
</template>

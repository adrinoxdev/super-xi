<script setup lang="ts">
withDefaults(defineProps<{
  total: number
  attack: number
  midfield: number
  defense: number
  variant?: 'inline' | 'cards'
}>(), { variant: 'cards' })

const tileClass = {
  inline: 'bg-subtle rounded-xl p-3 text-center',
  cards: 'bg-surface rounded-2xl p-3.5 border border-borderline shadow-sm text-center',
}
</script>

<template>
  <div
    :class="variant === 'inline'
      ? 'mt-5 pt-5 border-t border-borderline grid grid-cols-2 sm:grid-cols-4 gap-3'
      : 'grid grid-cols-2 sm:grid-cols-4 gap-3'"
  >
    <div :class="tileClass[variant]">
      <span class="text-[11px] font-semibold uppercase text-ink-muted block">OVER</span>
      <span class="font-score font-extrabold text-2xl text-ink">{{ total }}</span>
    </div>
    <div :class="tileClass[variant]">
      <span class="text-[11px] font-semibold uppercase text-ink-muted block">Ataque</span>
      <span class="font-score font-extrabold text-2xl text-emeraldpro">{{ attack }}</span>
    </div>
    <div :class="tileClass[variant]">
      <span class="text-[11px] font-semibold uppercase text-ink-muted block">Meio-Campo</span>
      <span class="font-score font-extrabold text-2xl text-ink">{{ midfield }}</span>
    </div>
    <div :class="tileClass[variant]">
      <span class="text-[11px] font-semibold uppercase text-ink-muted block">Defesa</span>
      <span class="font-score font-extrabold text-2xl text-amberpro">{{ defense }}</span>
    </div>
  </div>
</template>

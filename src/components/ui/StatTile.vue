<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  value: string | number
  variant?: 'subtle' | 'card'
  valueClass?: string
}>(), { variant: 'card', valueClass: 'text-gold glow-gold' })
</script>

<template>
  <div
    :class="variant === 'card'
      ? 'bg-night rounded-2xl p-3.5 border border-borderline text-center shadow-[inset_0_0_14px_rgba(31,63,99,0.5)]'
      : 'bg-night/60 border border-borderline/60 rounded-xl p-3 text-center'"
  >
    <span class="text-[10px] font-bold uppercase tracking-widest text-ink-muted block">{{ label }}</span>
    <span :class="valueClass" class="font-score font-extrabold text-2xl">{{ value }}</span>
  </div>
</template>

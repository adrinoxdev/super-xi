<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  value: string | number
  variant?: 'subtle' | 'card'
  valueClass?: string
}>(), { variant: 'card', valueClass: 'text-ink' })
</script>

<template>
  <div
    :class="variant === 'card'
      ? 'bg-surface rounded-2xl p-3.5 border border-borderline shadow-sm text-center'
      : 'bg-subtle rounded-xl p-3 text-center'"
  >
    <span class="text-[11px] font-semibold uppercase text-ink-muted block">{{ label }}</span>
    <span :class="valueClass" class="font-score font-extrabold text-2xl">{{ value }}</span>
  </div>
</template>

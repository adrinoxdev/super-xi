<script setup lang="ts">
const sizeClasses = {
  base: 'text-base',
  responsive: 'text-sm sm:text-base',
} as const

withDefaults(defineProps<{ as?: 'h2' | 'h3'; size?: 'base' | 'responsive' }>(), {
  as: 'h3',
  size: 'base',
})
</script>

<template>
  <component
    :is="as"
    :class="[sizeClasses[size], $slots.icon ? 'flex items-center gap-2' : '']"
    class="font-bold text-ink"
  >
    <slot name="icon" />
    <slot />
  </component>
</template>

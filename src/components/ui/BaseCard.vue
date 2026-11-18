<script setup lang="ts">
withDefaults(
  defineProps<{
    as?: 'div' | 'section'
    padding?: 'p-4' | 'p-5' | 'p-6' | 'p-4 sm:p-5' | 'p-4 sm:p-6' | 'p-5 sm:p-6'
  }>(),
  { as: 'div', padding: 'p-5' },
)
</script>

<template>
  <component :is="as" :class="padding" class="bg-surface rounded-2xl border border-borderline shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_2px_10px_rgba(0,0,0,0.35)]">
    <slot />
  </component>
</template>

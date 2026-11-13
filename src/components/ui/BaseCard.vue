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
  <component :is="as" :class="padding" class="bg-surface rounded-2xl border border-borderline shadow-sm">
    <slot />
  </component>
</template>

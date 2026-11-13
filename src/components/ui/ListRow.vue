<script setup lang="ts">
withDefaults(
  defineProps<{
    as?: 'div' | 'li'
    padding?: 'p-3' | 'p-3.5'
    layout?: 'row' | 'block'
    gap?: 'gap-2' | 'gap-3'
  }>(),
  { as: 'div', padding: 'p-3', layout: 'row', gap: 'gap-2' },
)
</script>

<template>
  <component
    :is="as"
    :class="[padding, layout === 'row' ? 'flex items-center justify-between text-xs' : '', layout === 'row' ? gap : '']"
    class="rounded-xl bg-subtle border border-borderline"
  >
    <slot />
  </component>
</template>

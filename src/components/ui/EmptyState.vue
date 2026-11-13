<script setup lang="ts">
withDefaults(defineProps<{ padding?: 'p-4' | 'p-6' | 'p-8' }>(), { padding: 'p-6' })
</script>

<template>
  <div
    :class="padding"
    class="rounded-xl bg-subtle border border-dashed border-borderline text-center text-xs text-ink-muted"
  >
    <slot />
  </div>
</template>

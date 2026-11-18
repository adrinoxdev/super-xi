<script setup lang="ts">
defineProps<{ cardClass?: string }>()
defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
  <div
    class="fixed inset-0 z-[55] bg-night/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    @click.self="$emit('close')"
  >
    <div
      :class="[
        'bg-surface rounded-t-2xl sm:rounded-2xl max-w-lg w-full p-4 sm:p-6 border border-borderline shadow-[0_20px_60px_rgba(0,0,0,0.6)] space-y-4 animate-pop max-h-[90dvh] overflow-y-auto overscroll-contain pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-6',
        cardClass
      ]"
    >
      <slot />
    </div>
  </div>
  </Teleport>
</template>

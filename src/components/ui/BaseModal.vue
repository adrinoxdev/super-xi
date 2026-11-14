<script setup lang="ts">
defineProps<{ cardClass?: string }>()
defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
  <div
    class="fixed inset-0 z-[55] bg-ink/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
    @click.self="$emit('close')"
  >
    <div
      :class="[
        'bg-surface rounded-t-2xl sm:rounded-2xl max-w-lg w-full p-4 sm:p-6 border border-borderline shadow-xl space-y-4 animate-pop max-h-[90dvh] overflow-y-auto overscroll-contain pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-6',
        cardClass
      ]"
    >
      <slot />
    </div>
  </div>
  </Teleport>
</template>

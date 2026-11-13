<script setup lang="ts">
defineProps<{ cardClass?: string }>()
defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
  <div
    class="fixed inset-0 z-[55] bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4"
    @click.self="$emit('close')"
  >
    <div
      :class="[
        'bg-surface rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-borderline shadow-xl space-y-4 animate-pop max-h-[90vh] overflow-y-auto',
        cardClass
      ]"
    >
      <slot />
    </div>
  </div>
  </Teleport>
</template>

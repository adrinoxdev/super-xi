<script setup lang="ts">
const variantClasses = {
  primary:
    'bg-emeraldpro hover:bg-emeraldpro-hover disabled:bg-borderline disabled:text-ink-muted disabled:shadow-none text-night shadow-[0_3px_0_#15803D] active:translate-y-px active:shadow-[0_2px_0_#15803D] transition',
  soft: 'bg-emeraldpro-soft hover:bg-emeraldpro hover:text-night text-emeraldpro-hover transition-colors',
  secondary: 'bg-subtle text-gold border border-gold/40 hover:border-gold transition-colors',
} as const

withDefaults(
  defineProps<{
    type?: 'button' | 'submit'
    variant?: keyof typeof variantClasses
  }>(),
  { type: 'button', variant: 'primary' },
)
</script>

<template>
  <button :type="type" :class="variantClasses[variant]" class="rounded-xl font-bold">
    <slot />
  </button>
</template>

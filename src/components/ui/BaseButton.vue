<script setup lang="ts">
const variantClasses = {
  primary:
    'bg-emeraldpro hover:bg-emeraldpro-hover disabled:bg-borderline disabled:text-ink-muted text-white',
  soft: 'bg-emeraldpro-soft hover:bg-emeraldpro hover:text-white text-emeraldpro',
  secondary: 'bg-subtle text-ink',
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

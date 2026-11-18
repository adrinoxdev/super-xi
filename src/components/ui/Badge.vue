<script setup lang="ts">
const toneClasses = {
  success: 'bg-emeraldpro-soft text-emeraldpro-hover',
  'success-strong': 'bg-emeraldpro-soft text-emeraldpro-hover',
  'success-outline': 'border border-emeraldpro text-emeraldpro-hover',
  'success-solid': 'bg-emeraldpro text-night',
  warning: 'bg-amberpro-soft text-amberpro',
  'warning-solid': 'bg-amberpro text-night',
  neutral: 'bg-subtle text-ink-muted',
  'neutral-outline': 'bg-subtle border border-borderline text-ink-muted',
} as const

const shapeClasses = {
  pill: 'rounded-full',
  rounded: 'rounded',
} as const

const sizeClasses = {
  xs: 'text-[11px]',
  sm: 'text-[11px]',
} as const

const weightClasses = {
  bold: 'font-bold',
  extrabold: 'font-extrabold',
} as const

withDefaults(
  defineProps<{
    tone: keyof typeof toneClasses
    shape?: 'pill' | 'rounded'
    size?: 'xs' | 'sm'
    weight?: 'bold' | 'extrabold'
    uppercase?: boolean
  }>(),
  { shape: 'pill', size: 'xs', weight: 'bold', uppercase: false },
)
</script>

<template>
  <span
    :class="[
      toneClasses[tone],
      shapeClasses[shape],
      sizeClasses[size],
      weightClasses[weight],
      uppercase ? 'uppercase' : '',
    ]"
    class="px-2 py-0.5"
  >
    <slot />
  </span>
</template>

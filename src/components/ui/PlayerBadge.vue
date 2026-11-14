<script setup lang="ts">
import { computed } from 'vue'
import { formatPosBR } from '@/utils/format/formatCurrency'

const props = withDefaults(defineProps<{
  overall: number
  position: string
  prefix?: string
  size?: 'sm' | 'md'
}>(), { prefix: '', size: 'md' })

const boxClass = computed(() => (props.size === 'sm' ? 'w-10 h-10' : 'w-12 h-12'))
const numClass = computed(() => (props.size === 'sm' ? 'text-base' : 'text-xl'))
</script>

<template>
  <div
    :class="boxClass"
    class="rounded-xl bg-subtle border border-borderline flex flex-col items-center justify-center shrink-0"
  >
    <span :class="numClass" class="font-score font-extrabold text-emeraldpro leading-none">{{ prefix }}{{ overall }}</span>
    <span class="text-[11px] md:text-[10px] font-bold text-ink-muted">{{ formatPosBR(position) }}</span>
  </div>
</template>

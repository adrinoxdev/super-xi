<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ percent: number; barClass?: string }>(), { barClass: 'bg-gradient-to-r from-[#16A34A] to-emeraldpro-hover' })
const width = computed(() => Math.max(0, Math.min(100, props.percent || 0)))
</script>

<template>
  <div class="w-full h-2 bg-night border border-borderline/60 rounded-full overflow-hidden">
    <div :class="barClass" class="h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(74,222,128,0.7)]" :style="{ width: width + '%' }"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ percent: number; barClass?: string }>(), { barClass: 'bg-emeraldpro' })
const width = computed(() => Math.max(0, Math.min(100, props.percent || 0)))
</script>

<template>
  <div class="w-full h-2 bg-subtle rounded-full overflow-hidden">
    <div :class="barClass" class="h-full transition-all duration-300" :style="{ width: width + '%' }"></div>
  </div>
</template>

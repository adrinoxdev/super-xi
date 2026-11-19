<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'

// 10 fichas (cheias/vazias) e o contador da próxima; o contador some com o estoque cheio (nextIn = null).
defineProps<{ tokens: number; max: number; nextIn: string | null }>()
</script>

<template>
  <BaseCard padding="p-4" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div class="min-w-0">
      <span class="text-[11px] font-bold uppercase text-ink-muted block">Fichas</span>
      <div class="flex flex-wrap gap-1.5 mt-1.5" role="img" :aria-label="`${tokens} de ${max} fichas`">
        <span
          v-for="i in max"
          :key="i"
          class="w-5 h-5 rounded-full border-2"
          :class="i <= tokens ? 'bg-gold border-gold shadow-[0_0_6px_rgba(251,191,36,0.5)]' : 'bg-night border-borderline'"
        ></span>
      </div>
    </div>
    <p class="text-xs text-ink-muted shrink-0">
      <strong class="font-score text-lg text-ink">{{ tokens }}/{{ max }}</strong>
      <span v-if="nextIn"> • Próxima ficha em <strong class="text-ink">{{ nextIn }}</strong></span>
    </p>
  </BaseCard>
</template>

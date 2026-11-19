<script setup lang="ts">
// Fichas compactas (cheias/vazias) e o contador da próxima; o contador some com o estoque cheio (nextIn = null).
// Bloco interno: sem cartão próprio, embutido no painel do desafio.
defineProps<{ tokens: number; max: number; nextIn: string | null }>()
</script>

<template>
  <div class="min-w-0">
    <p class="text-xs text-ink-muted">
      <span class="text-[11px] font-bold uppercase">Fichas</span>
      <strong class="font-score text-lg text-ink ml-2">{{ tokens }}/{{ max }}</strong>
    </p>
    <div class="flex flex-wrap justify-center gap-1 mt-1" role="img" :aria-label="`${tokens} de ${max} fichas`">
      <span
        v-for="i in max"
        :key="i"
        class="w-3.5 h-3.5 rounded-full border-2"
        :class="i <= tokens ? 'bg-gold border-gold shadow-[0_0_6px_rgba(251,191,36,0.5)]' : 'bg-night border-borderline'"
      ></span>
    </div>
    <p v-if="nextIn" class="text-[11px] text-ink-muted mt-1">Próxima ficha em <strong class="text-ink">{{ nextIn }}</strong></p>
  </div>
</template>

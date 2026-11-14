<script setup lang="ts">
import { computed } from 'vue'

// Seletor de cor livre: botão "+" arco-íris ao lado das cores prontas.
// Se a cor atual não é uma das prontas, o botão assume essa cor e fica marcado.
const props = defineProps<{
  modelValue: string
  presets: string[]
  label: string
}>()
const emit = defineEmits<{ (e: 'pick', color: string): void }>()

const HEX = /^#[0-9a-fA-F]{6}$/
const isCustom = computed(
  () => HEX.test(props.modelValue) && !props.presets.some((c) => c.toLowerCase() === props.modelValue.toLowerCase())
)
const pickerValue = computed(() => (HEX.test(props.modelValue) ? props.modelValue : '#ffffff'))
</script>

<template>
  <label
    :title="`Outra cor (${label})`"
    :class="isCustom ? 'ring-2 ring-offset-2 ring-ink scale-110' : ''"
    :style="{ background: isCustom ? modelValue : 'conic-gradient(#ef4444, #f59e0b, #22c55e, #06b6d4, #6366f1, #d946ef, #ef4444)' }"
    class="relative w-8 h-8 md:w-6 md:h-6 rounded-full border border-borderline transition-transform cursor-pointer flex items-center justify-center overflow-hidden"
  >
    <span v-if="!isCustom" class="text-[13px] leading-none font-black text-white drop-shadow" aria-hidden="true">+</span>
    <input
      type="color"
      :value="pickerValue"
      @change="emit('pick', ($event.target as HTMLInputElement).value)"
      :aria-label="`Escolher outra cor: ${label}`"
      class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
    />
  </label>
</template>

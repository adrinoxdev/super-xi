<script setup lang="ts">
import type { TacticalMentality } from '@/types/match'
import { MENTALITIES } from '@/config'

withDefaults(defineProps<{
  modelValue: TacticalMentality
  variant?: 'compact' | 'cards' | 'pills'
}>(), { variant: 'compact' })

defineEmits<{ 'update:modelValue': [value: TacticalMentality] }>()

const entries = Object.entries(MENTALITIES) as [TacticalMentality, (typeof MENTALITIES)[TacticalMentality]][]

function pct(mod: number): string {
  const v = Math.round((mod - 1) * 100)
  return (v >= 0 ? '+' : '') + v
}
</script>

<template>
  <div
    :class="variant === 'compact' ? 'grid grid-cols-3 sm:grid-cols-5 gap-1.5'
      : variant === 'cards' ? 'grid grid-cols-2 sm:grid-cols-5 gap-2'
      : 'flex flex-wrap gap-1.5'"
  >
    <button
      v-for="[key, m] in entries"
      :key="key"
      type="button"
      @click="$emit('update:modelValue', key)"
      :class="variant === 'compact' ? [
        'min-h-10 py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold border text-center transition-all truncate',
        modelValue === key
          ? 'bg-emeraldpro text-white border-emeraldpro shadow-sm'
          : 'bg-subtle text-ink-muted border-borderline hover:text-ink'
      ] : variant === 'cards' ? [
        'p-3 rounded-xl border text-left transition-all',
        modelValue === key
          ? 'bg-emeraldpro-soft border-emeraldpro text-ink ring-1 ring-emeraldpro'
          : 'bg-subtle border-borderline text-ink-muted hover:text-ink'
      ] : [
        'px-3 py-2 min-h-10 md:min-h-0 md:py-1.5 rounded-lg text-xs font-bold border',
        modelValue === key ? 'bg-emeraldpro text-white border-emeraldpro' : 'bg-subtle text-ink-muted border-borderline'
      ]"
    >
      <template v-if="variant === 'cards'">
        <div class="font-bold text-xs text-ink">{{ m.label }}</div>
        <div class="text-[11px] mt-0.5">
          ATQ {{ pct(m.atkMod) }}% / DEF {{ pct(m.defMod) }}%
        </div>
      </template>
      <template v-else>{{ m.label }}</template>
    </button>
  </div>
</template>

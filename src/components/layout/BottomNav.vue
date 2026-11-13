<script setup lang="ts">
import { useNavigation } from '@/composables/useNavigation'

const { navItems, goTo } = useNavigation()
</script>

<template>
  <nav class="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-borderline z-40 grid grid-cols-7 pt-1.5 px-1 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
    <button
      type="button"
      v-for="item in navItems"
      :key="item.id"
      @click="goTo(item)"
      :class="[
        'flex flex-col items-center justify-center py-1 rounded-lg text-[9px] font-bold transition-colors relative',
        item.active ? 'text-emeraldpro' : 'text-ink-muted'
      ]"
    >
      <component :is="item.icon" class="w-4 h-4 mb-0.5" />
      <span class="truncate max-w-full">{{ item.shortLabel }}</span>
      <span
        v-if="item.badge"
        class="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-emeraldpro"
      ></span>
      <span v-if="item.live" class="absolute top-0.5 right-2 flex w-2.5 h-2.5">
        <span class="absolute inline-flex w-full h-full rounded-full bg-emeraldpro opacity-75 animate-ping"></span>
        <span class="relative inline-flex w-2.5 h-2.5 rounded-full bg-emeraldpro"></span>
      </span>
    </button>
  </nav>
</template>

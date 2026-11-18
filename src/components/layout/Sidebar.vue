<script setup lang="ts">
import { useNavigation } from '@/composables/useNavigation'
import { usePageSubtitle } from '@/composables/usePageSubtitle'
import { version as appVersion } from '../../../package.json'

const base = import.meta.env.BASE_URL
const { navItems, goTo, currentPageTitle } = useNavigation()
const { subtitle } = usePageSubtitle()
</script>

<template>
  <aside class="hidden md:flex md:w-64 bg-night border-r border-borderline flex-col justify-between shrink-0 sticky top-0 h-dvh overflow-y-auto z-20 self-start">
    <div>
      <div class="px-4 h-20 border-b border-borderline flex items-center gap-1.5">
        <img :src="`${base}logo.png`" alt="Super XI" class="h-14 w-auto shrink-0 select-none drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]" draggable="false" />
        <div class="min-w-0">
          <h2 class="font-bold text-base text-ink leading-tight truncate">{{ currentPageTitle }}</h2>
          <p class="text-xs text-ink-muted truncate">{{ subtitle }}</p>
        </div>
      </div>

      <nav class="p-3 space-y-1">
        <button
          type="button"
          v-for="item in navItems"
          :key="item.id"
          @click="goTo(item)"
          :class="[
            'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all',
            item.active
              ? 'bg-emeraldpro text-night shadow-[inset_4px_0_0_#FBBF24]'
              : 'text-ink-muted hover:bg-subtle hover:text-ink'
          ]"
        >
          <span class="flex items-center gap-3 min-w-0">
            <component :is="item.icon" class="w-4 h-4 shrink-0" />
            {{ item.label }}
          </span>
          <span
            v-if="item.live"
            :class="[
              'flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full',
              item.active ? 'bg-night text-emeraldpro-hover' : 'bg-emeraldpro-soft text-emeraldpro-hover'
            ]"
          >
            <span class="relative flex w-1.5 h-1.5">
              <span class="absolute inline-flex w-full h-full rounded-full bg-emeraldpro opacity-75 animate-ping"></span>
              <span class="relative inline-flex w-1.5 h-1.5 rounded-full bg-emeraldpro"></span>
            </span>
            AO VIVO
          </span>
          <span
            v-if="item.badge"
            :class="[
              'text-[11px] font-bold px-2 py-0.5 rounded-full',
              item.active ? 'bg-night/25 text-night' : 'bg-emeraldpro-soft text-emeraldpro-hover'
            ]"
          >
            {{ item.badge }}
          </span>
        </button>
      </nav>
    </div>

    <div class="px-4 py-3 border-t border-borderline flex items-center justify-between text-[11px] text-ink-muted">
      <span class="font-semibold tracking-wide">Super XI</span>
      <span class="font-score font-bold bg-gold text-night rounded px-2 py-0.5">v{{ appVersion }}</span>
    </div>
  </aside>
</template>

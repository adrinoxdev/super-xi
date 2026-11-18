<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <Teleport to="body">
  <Transition name="fade">
    <div
      v-if="ui.toast.visible"
      :class="[
        'fixed top-[calc(0.75rem+env(safe-area-inset-top))] sm:top-4 right-3 sm:right-4 left-3 sm:left-auto w-fit ml-auto z-[60] px-4 py-3 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.55)] border flex items-center gap-2.5 text-sm font-medium animate-pop max-w-[min(92vw,28rem)]',
        ui.toast.type === 'success' ? 'bg-surface border-emeraldpro text-ink' :
        ui.toast.type === 'warning' ? 'bg-surface border-amberpro text-ink' :
        'bg-surface border-dangerpro text-ink'
      ]"
    >
      <span
        :class="[
          'w-2.5 h-2.5 rounded-full shrink-0',
          ui.toast.type === 'success' ? 'bg-emeraldpro' :
          ui.toast.type === 'warning' ? 'bg-amberpro' : 'bg-dangerpro'
        ]"
      ></span>
      <span class="min-w-0 break-words [overflow-wrap:anywhere]">{{ ui.toast.message }}</span>
    </div>
  </Transition>
  </Teleport>
</template>

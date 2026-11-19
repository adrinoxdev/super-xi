<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { NavItem } from '@/composables/useNavigation'

const props = defineProps<{ open: boolean; items: NavItem[] }>()
const emit = defineEmits<{ close: []; select: [item: NavItem] }>()
const panel = ref<HTMLElement | null>(null)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

// Aberto: Esc fecha e o foco vai ao primeiro item.
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onKey)
      await nextTick()
      panel.value?.querySelector<HTMLButtonElement>('button')?.focus()
    } else document.removeEventListener('keydown', onKey)
  }
)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div v-if="open" class="md:hidden fixed inset-0 z-30 bg-night/60" aria-hidden="true" @click="emit('close')"></div>
  <div
    v-if="open"
    id="bottom-nav-more"
    ref="panel"
    role="dialog"
    aria-label="Mais opções de navegação"
    class="md:hidden fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 bg-surface border border-borderline rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] p-2 animate-pop"
  >
    <ul class="grid grid-cols-1 gap-1">
      <li v-for="item in items" :key="item.id">
        <button
          type="button"
          @click="emit('select', item)"
          :class="[
            'w-full min-h-12 flex items-center justify-between gap-3 px-3.5 rounded-xl text-sm font-semibold transition-colors',
            item.active ? 'bg-emeraldpro text-night' : 'text-ink hover:bg-subtle'
          ]"
        >
          <span class="flex items-center gap-3 min-w-0">
            <component :is="item.icon" class="w-5 h-5 shrink-0" />
            <span class="truncate">{{ item.label }}</span>
          </span>
          <span class="flex items-center gap-2 shrink-0">
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
            >{{ item.badge }}</span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

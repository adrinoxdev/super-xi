<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import { useNavigation, type NavItem } from '@/composables/useNavigation'
import BottomNavMore from './BottomNavMore.vue'

const route = useRoute()
const { primaryNavItems, moreNavItems, goTo } = useNavigation()
const open = ref(false)
const plusBtn = ref<HTMLButtonElement | null>(null)

// Início · Liga · [+] · Copas · Elenco
const left = computed(() => primaryNavItems.value.slice(0, 2))
const right = computed(() => primaryNavItems.value.slice(2, 4))
const moreActive = computed(() => moreNavItems.value.some((i) => i.active))
const moreLive = computed(() => moreNavItems.value.some((i) => i.live))
// Fichas de amistoso não marcam o "+" (senão ele ficaria sempre marcado).
const moreBadge = computed(() => moreNavItems.value.some((i) => i.id !== 'friendlies' && !!i.badge))

const cellClass = 'flex flex-col items-center justify-center min-h-12 min-w-0 px-px py-1 rounded-lg text-[11px] leading-tight font-bold transition-colors relative'

function close(returnFocus = true) {
  if (!open.value) return
  open.value = false
  if (returnFocus) nextTick(() => plusBtn.value?.focus())
}

function toggle() {
  if (open.value) close()
  else open.value = true
}

function choose(item: NavItem) {
  // Mesma rota: o watch de rota não dispara, então devolve o foco ao "+" ao fechar.
  close(item.path === route.path)
  goTo(item)
}

// Trocar de rota (por qualquer caminho) fecha o painel.
watch(() => route.fullPath, () => close(false))
</script>

<template>
  <BottomNavMore :open="open" :items="moreNavItems" @close="close()" @select="choose" />
  <nav class="md:hidden fixed bottom-0 inset-x-0 bg-night border-t border-borderline z-40 grid grid-cols-5 pt-1 px-0.5 pb-[calc(0.25rem+env(safe-area-inset-bottom))]">
    <button
      type="button"
      v-for="item in left"
      :key="item.id"
      @click="goTo(item)"
      :class="[cellClass, item.active ? 'text-gold' : 'text-ink-muted']"
    >
      <component :is="item.icon" class="w-5 h-5 mb-0.5 shrink-0" />
      <span class="truncate max-w-full">{{ item.shortLabel }}</span>
      <span
        v-if="item.badge"
        class="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-emeraldpro text-night text-[10px] leading-4 font-extrabold text-center"
      >{{ item.badge }}</span>
      <span v-if="item.live" class="absolute top-0.5 left-1 flex w-2.5 h-2.5" role="img" aria-label="Ao vivo">
        <span class="absolute inline-flex w-full h-full rounded-full bg-emeraldpro opacity-75 animate-ping"></span>
        <span class="relative inline-flex w-2.5 h-2.5 rounded-full bg-emeraldpro"></span>
      </span>
    </button>

    <button
      ref="plusBtn"
      type="button"
      aria-label="Mais opções"
      :aria-expanded="open"
      :aria-controls="open ? 'bottom-nav-more' : undefined"
      @click="toggle"
      :class="[cellClass, moreActive || open ? 'text-gold' : 'text-ink-muted']"
    >
      <Plus class="w-5 h-5 mb-0.5 shrink-0 transition-transform" :class="open ? 'rotate-45' : ''" />
      <span class="truncate max-w-full">Mais</span>
      <span
        v-if="moreBadge"
        class="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-emeraldpro text-night text-[10px] leading-4 font-extrabold text-center"
      >!</span>
      <span v-if="moreLive" class="absolute top-0.5 left-1 flex w-2.5 h-2.5" role="img" aria-label="Ao vivo">
        <span class="absolute inline-flex w-full h-full rounded-full bg-emeraldpro opacity-75 animate-ping"></span>
        <span class="relative inline-flex w-2.5 h-2.5 rounded-full bg-emeraldpro"></span>
      </span>
    </button>

    <button
      type="button"
      v-for="item in right"
      :key="item.id"
      @click="goTo(item)"
      :class="[cellClass, item.active ? 'text-gold' : 'text-ink-muted']"
    >
      <component :is="item.icon" class="w-5 h-5 mb-0.5 shrink-0" />
      <span class="truncate max-w-full">{{ item.shortLabel }}</span>
      <span
        v-if="item.badge"
        class="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-emeraldpro text-night text-[10px] leading-4 font-extrabold text-center"
      >{{ item.badge }}</span>
      <span v-if="item.live" class="absolute top-0.5 left-1 flex w-2.5 h-2.5" role="img" aria-label="Ao vivo">
        <span class="absolute inline-flex w-full h-full rounded-full bg-emeraldpro opacity-75 animate-ping"></span>
        <span class="relative inline-flex w-2.5 h-2.5 rounded-full bg-emeraldpro"></span>
      </span>
    </button>
  </nav>
</template>

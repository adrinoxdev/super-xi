<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { AlertTriangle, HelpCircle } from 'lucide-vue-next'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()

function onKey(e: KeyboardEvent) {
  if (!ui.confirmDialog.open) return
  if (e.key === 'Escape') ui.resolveConfirm(false)
  if (e.key === 'Enter') ui.resolveConfirm(true)
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <BaseModal v-if="ui.confirmDialog.open" card-class="!max-w-md" @close="ui.resolveConfirm(false)">
    <div class="flex items-start gap-3" role="alertdialog" aria-modal="true" :aria-label="ui.confirmDialog.title">
      <span
        :class="[
          'w-10 h-10 shrink-0 rounded-xl grid place-items-center',
          ui.confirmDialog.danger ? 'bg-dangerpro-soft text-dangerpro' : 'bg-emeraldpro-soft text-emeraldpro'
        ]"
      >
        <AlertTriangle v-if="ui.confirmDialog.danger" class="w-5 h-5" />
        <HelpCircle v-else class="w-5 h-5" />
      </span>
      <div class="min-w-0 space-y-1">
        <h3 class="text-base sm:text-lg font-extrabold text-ink leading-tight">{{ ui.confirmDialog.title }}</h3>
        <p class="text-sm text-ink-muted break-words [overflow-wrap:anywhere]">{{ ui.confirmDialog.message }}</p>
      </div>
    </div>

    <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
      <button
        type="button"
        class="px-4 py-2.5 rounded-xl bg-subtle hover:bg-borderline text-ink text-sm font-bold transition-colors"
        @click="ui.resolveConfirm(false)"
      >
        {{ ui.confirmDialog.cancelLabel }}
      </button>
      <button
        type="button"
        :class="[
          'px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-colors',
          ui.confirmDialog.danger ? 'bg-dangerpro hover:opacity-90' : 'bg-emeraldpro hover:bg-emeraldpro-hover'
        ]"
        @click="ui.resolveConfirm(true)"
      >
        {{ ui.confirmDialog.confirmLabel }}
      </button>
    </div>
  </BaseModal>
</template>

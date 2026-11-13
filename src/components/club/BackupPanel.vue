<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import { usePersistence } from '@/composables/usePersistence'

const ui = useUiStore()
const { exportCareerCode, importCareerCode } = usePersistence()
</script>

<template>
  <div class="bg-surface rounded-2xl p-5 border border-borderline shadow-sm space-y-3">
    <h3 class="font-bold text-base text-ink">Backup Portátil da Carreira</h3>
    <p class="text-xs text-ink-muted break-words">Exporte ou importe seu código de carreira para transferir seu progresso.</p>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        @click="exportCareerCode"
        class="px-4 py-2 rounded-xl bg-emeraldpro text-white text-xs font-bold"
      >
        Gerar Código
      </button>
      <button
        type="button"
        @click="importCareerCode"
        class="px-4 py-2 rounded-xl bg-subtle hover:bg-borderline border border-borderline text-ink text-xs font-bold"
      >
        Importar Código
      </button>
    </div>
    <textarea
      v-model="ui.backupCodeText"
      rows="2"
      placeholder="Cole aqui o código de carreira para importar ou clique em Gerar Código..."
      class="w-full p-2.5 rounded-xl bg-subtle border border-borderline text-[11px] font-mono text-ink"
    ></textarea>
  </div>
</template>

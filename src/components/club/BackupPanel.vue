<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import { usePersistence } from '@/composables/usePersistence'
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'

const ui = useUiStore()
const { exportCareerCode, importCareerCode } = usePersistence()
</script>

<template>
  <BaseCard class="space-y-3">
    <SectionTitle>Backup Portátil da Carreira</SectionTitle>
    <p class="text-xs text-ink-muted break-words">Exporte ou importe seu código de carreira para transferir seu progresso.</p>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        @click="exportCareerCode"
        class="flex-1 sm:flex-none min-h-[40px] sm:min-h-0 px-4 py-2 rounded-xl bg-emeraldpro text-night text-xs font-bold"
      >
        Gerar Código
      </button>
      <button
        type="button"
        @click="importCareerCode"
        class="flex-1 sm:flex-none min-h-[40px] sm:min-h-0 px-4 py-2 rounded-xl bg-subtle hover:bg-borderline border border-borderline text-ink text-xs font-bold"
      >
        Importar Código
      </button>
    </div>
    <textarea
      v-model="ui.backupCodeText"
      rows="2"
      placeholder="Cole aqui o código de carreira para importar ou clique em Gerar Código..."
      class="w-full p-2.5 rounded-xl bg-subtle border border-borderline text-xs font-mono text-ink"
    ></textarea>
  </BaseCard>
</template>

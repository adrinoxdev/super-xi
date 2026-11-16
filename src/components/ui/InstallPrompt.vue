<script setup lang="ts">
import { Download, Share, X } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useInstallPrompt } from '@/composables/useInstallPrompt'

const { canInstall, showIosHint, install, dismiss } = useInstallPrompt()
const base = import.meta.env.BASE_URL
</script>

<template>
  <div
    v-if="canInstall || showIosHint"
    role="dialog"
    aria-label="Instalar o Super XI"
    class="fixed z-[45] inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:inset-x-auto md:right-4 md:bottom-4 md:w-96 bg-surface border border-borderline rounded-2xl shadow-lg p-3.5 flex items-start gap-3 animate-pop"
  >
    <img :src="`${base}icon-192.png`" alt="" class="w-11 h-11 shrink-0" />
    <div class="min-w-0 flex-1 space-y-2">
      <p class="font-bold text-sm text-ink">Instalar o Super XI</p>
      <p v-if="canInstall" class="text-xs text-ink-muted break-words">
        Abre em tela cheia, como um app, e funciona sem internet. Seu save continua o mesmo.
      </p>
      <p v-else class="text-xs text-ink-muted break-words">
        No iPhone, toque em <Share class="inline w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> <strong>Compartilhar</strong> e depois em
        <strong>Adicionar à Tela de Início</strong>.
      </p>
      <BaseButton v-if="canInstall" class="px-3.5 py-2 text-xs flex items-center gap-1.5" @click="install">
        <Download class="w-3.5 h-3.5" aria-hidden="true" />
        Instalar
      </BaseButton>
    </div>
    <button type="button" class="shrink-0 p-1 text-ink-muted hover:text-ink" aria-label="Agora não" @click="dismiss">
      <X class="w-4 h-4" />
    </button>
  </div>
</template>

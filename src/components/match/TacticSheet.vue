<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { X } from 'lucide-vue-next'
import { useSquadStore } from '@/stores/squad'
import TeamPowerBar from '@/components/ui/TeamPowerBar.vue'
import TacticalPitch from '@/components/squad/TacticalPitch.vue'
import SquadRoster from '@/components/squad/SquadRoster.vue'
import SlotPickerSheet from '@/components/squad/SlotPickerSheet.vue'

// Slide-over da escalação: edita o mesmo estado da tela Elenco sem sair do pré-jogo.
// Desktop: painel pela direita. Mobile: ocupa a tela toda, com cabeçalho fixo.
const emit = defineEmits<{ close: [] }>()
const squad = useSquadStore()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => {
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[50] bg-night/70 backdrop-blur-sm flex justify-end" @click.self="emit('close')">
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Ajustar tática"
        class="bg-night w-full lg:max-w-5xl h-[100dvh] flex flex-col border-l border-borderline shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-pop"
      >
        <header class="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-borderline bg-surface">
          <div class="min-w-0">
            <h3 class="font-bold text-base text-ink">Ajustar Tática</h3>
            <p class="text-xs text-ink-muted">Mudanças valem na hora. Feche para voltar ao pré-jogo.</p>
          </div>
          <button
            type="button"
            @click="emit('close')"
            class="shrink-0 min-h-11 px-4 rounded-xl bg-emeraldpro text-night text-xs font-bold flex items-center gap-2"
          >
            <X class="w-4 h-4" />
            Concluir
          </button>
        </header>
        <div class="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <TeamPowerBar
            variant="cards"
            :total="squad.teamStrength.total"
            :attack="squad.teamStrength.attack"
            :midfield="squad.teamStrength.midfield"
            :defense="squad.teamStrength.defense"
          />
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <TacticalPitch />
            <SquadRoster />
          </div>
        </div>
        <SlotPickerSheet />
      </aside>
    </div>
  </Teleport>
</template>

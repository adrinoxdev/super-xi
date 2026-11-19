import { ref } from 'vue'
import { isSfxMuted, playApplause, playCheer, setSfxMuted } from '@/utils/audio/sfx'

const muted = ref(isSfxMuted())

export function useSfx() {
  function toggleMute() {
    muted.value = !muted.value
    setSfxMuted(muted.value)
    // Ao ligar, um aplauso curto confirma que o som está funcionando (e libera o áudio no navegador).
    if (!muted.value) playApplause(1.2)
  }
  /** Torcida + aplausos da celebração de título ou subida de divisão. */
  function playCelebration() {
    playCheer(true)
    playApplause(6)
  }
  return { muted, toggleMute, playCelebration }
}

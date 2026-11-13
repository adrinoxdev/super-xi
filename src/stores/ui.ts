import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | (string & {})

export const useUiStore = defineStore('ui', () => {
  const toast = ref<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: '',
    type: 'success',
  })
  const compSubTab = ref('cup')
  /** Temporada cujo cartão de pódios foi ocultado (não é salvo). */
  const hiddenPodiumSeason = ref<number | null>(null)
  const selectedPitchSlotIndex = ref<number | null>(null)
  const squadPositionFilter = ref('ALL')
  const compareModal = ref<{ open: boolean; reportId: string | null; incumbentId: string | null }>({
    open: false,
    reportId: null,
    incumbentId: null,
  })
  const playerModal = ref<{ open: boolean; playerId: string | null }>({ open: false, playerId: null })
  const loanMarketModalOpen = ref(false)
  const backupCodeText = ref('')

  let toastTimer: ReturnType<typeof setTimeout> | null = null

  function showToast(message: string, type: ToastType = 'success') {
    toast.value = { visible: true, message, type }
    if (toastTimer !== null) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toastTimer = null
      toast.value.visible = false
    }, 3400)
  }

  function openCompare(reportId: string, incumbentId: string | null = null) {
    compareModal.value = { open: true, reportId, incumbentId }
  }
  function closeCompare() {
    compareModal.value.open = false
  }
  function openPlayer(playerId: string) {
    playerModal.value = { open: true, playerId }
  }
  function closePlayer() {
    playerModal.value.open = false
  }
  function openLoanMarket() {
    loanMarketModalOpen.value = true
  }
  function closeLoanMarket() {
    loanMarketModalOpen.value = false
  }

  return {
    toast, compSubTab, hiddenPodiumSeason, selectedPitchSlotIndex, squadPositionFilter, compareModal, playerModal,
    loanMarketModalOpen, backupCodeText,
    showToast, openCompare, closeCompare, openPlayer, closePlayer, openLoanMarket, closeLoanMarket,
  }
})

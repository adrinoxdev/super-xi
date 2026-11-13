import type { useClubStore } from '@/stores/club'

export type ToastType = 'success' | 'danger' | 'warning' | 'info'
export interface CompetitionToast {
  toast: string
  toastType: ToastType
}

export type CompetitionsClub = ReturnType<typeof useClubStore>

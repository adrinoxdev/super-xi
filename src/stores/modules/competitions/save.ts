import type { Ref } from 'vue'
import type { ContinentalState, CupState, FinalState } from '@/types'
import { emptyCup, emptyContinental } from './defaults'

export function createSave(ctx: {
  cupState: Ref<CupState>
  continentalState: Ref<ContinentalState>
  supercupState: Ref<FinalState>
  recopaState: Ref<FinalState>
}) {
  const { cupState, continentalState, supercupState, recopaState } = ctx

  function toSave() {
    return {
      supercupState: supercupState.value,
      recopaState: recopaState.value,
      cupState: cupState.value,
      continentalState: continentalState.value
    }
  }

  function fromSave(data: Partial<ReturnType<typeof toSave>> | null | undefined) {
    if (!data) return
    if (data.cupState) cupState.value = { ...emptyCup(), ...data.cupState }
    if (data.continentalState) continentalState.value = { ...emptyContinental(), ...data.continentalState }
    if (data.supercupState) supercupState.value = data.supercupState
    if (data.recopaState) recopaState.value = data.recopaState
  }

  return { toSave, fromSave }
}

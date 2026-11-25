import type { Ref } from 'vue'
import type { ContinentalState, CupState, FinalState, MundialState } from '@/types'
import { emptyCup, emptyContinental, emptyMundial } from './defaults'

export function createSave(ctx: {
  cupState: Ref<CupState>
  continentalState: Ref<ContinentalState>
  mundialState: Ref<MundialState>
  supercupState: Ref<FinalState>
  recopaState: Ref<FinalState>
}) {
  const { cupState, continentalState, mundialState, supercupState, recopaState } = ctx

  function toSave() {
    return {
      supercupState: supercupState.value,
      recopaState: recopaState.value,
      cupState: cupState.value,
      continentalState: continentalState.value,
      mundialState: mundialState.value
    }
  }

  function fromSave(data: Partial<ReturnType<typeof toSave>> | null | undefined) {
    if (!data) return
    if (data.cupState) cupState.value = { ...emptyCup(), ...data.cupState }
    if (data.continentalState) continentalState.value = { ...emptyContinental(), ...data.continentalState }
    mundialState.value = data.mundialState ? { ...emptyMundial(), ...data.mundialState } : emptyMundial()
    if (data.supercupState) supercupState.value = data.supercupState
    if (data.recopaState) recopaState.value = data.recopaState
  }

  return { toSave, fromSave }
}

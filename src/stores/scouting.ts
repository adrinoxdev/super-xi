import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ScoutMission, ScoutMissionType, ScoutReport } from '@/types/scouting'
import type { Player, PlayerPosition } from '@/types/player'
import {
  ALL_POSITIONS,
  ATHLETE_MAX_OVERALL,
  FORMATIONS,
  SCOUT_MISSIONS,
  SCOUT_OVR_OFFSETS,
  SCOUT_REPORT_COUNT,
  STAFF_BONUS
} from '@/config'
import { generatePlayer } from '@/utils/player/generatePlayer'
import { clamp, randInt } from '@/utils/core/random'
import { useClubStore } from './club'
import { useSquadStore } from './squad'

export const useScoutingStore = defineStore('scouting', () => {
  const clubStore = useClubStore()

  const missions = ref<ScoutMission[]>([])
  const reports = ref<ScoutReport[]>([])
  const youthAcademyProspects = ref<Player[]>([])
  const selectedScoutPosition = ref<PlayerPosition>('ST')

  const activeMissions = computed(() => missions.value.filter(m => m.status === 'active'))
  const visibleReports = computed(() => reports.value.filter(r => r.status === 'new'))

  function startMission(type: ScoutMissionType): { ok: boolean; title?: string } {
    const spec = clubStore.scoutingSpec
    const cfg = SCOUT_MISSIONS.find(m => m.type === type)
    if (!cfg || activeMissions.value.length >= spec.slots) {
      return { ok: false }
    }
    if (!clubStore.spend(cfg.cost)) return { ok: false }
    missions.value.push({
      id: 'ms_' + Date.now(),
      type,
      title: cfg.title,
      positionFocus: type === 'position' ? selectedScoutPosition.value : undefined,
      startTime: Date.now(),
      duration: Math.round(cfg.durationSec * 1000 * spec.timeMult),
      status: 'active'
    })
    return { ok: true, title: cfg.title }
  }

  // Missões sem posição definida priorizam onde o elenco está curto: posição sem reserva pesa 3x,
  // com um reserva 1,5x, e posição já bem coberta 0,7x. Evita relatórios cheios de posições inúteis.
  function pickNeededPosition(): PlayerPosition {
    const squad = useSquadStore()
    const slots = FORMATIONS[squad.formation] ?? []
    const weights = ALL_POSITIONS.map((pos) => {
      const required = slots.filter((s) => s.role === pos).length
      const have = squad.players.filter((p) => p.position === pos).length
      const spare = have - required
      return spare < 0 ? 4 : spare === 0 ? 3 : spare === 1 ? 1.5 : 0.7
    })
    let roll = Math.random() * weights.reduce((a, b) => a + b, 0)
    for (let i = 0; i < ALL_POSITIONS.length; i++) {
      roll -= weights[i]
      if (roll <= 0) return ALL_POSITIONS[i]
    }
    return ALL_POSITIONS[ALL_POSITIONS.length - 1]
  }

  function completeMission(missionId: string): boolean {
    const m = missions.value.find(x => x.id === missionId)
    if (!m || m.status !== 'active') return false
    m.status = 'completed'
    const spec = clubStore.scoutingSpec
    const gemBonus = clubStore.clubStaff.chiefScout ? STAFF_BONUS.scoutGemChance : 0
    const count = SCOUT_REPORT_COUNT[m.type]
    // Faixa do tier (M = OVR máximo do nível): tier mais caro e demorado entrega qualidade claramente maior, senão o
    // tier de baixo domina. Valores em SCOUT_OVR_OFFSETS (o card da missão mostra a mesma faixa).
    const [offLo, offHi] = SCOUT_OVR_OFFSETS[m.type]

    for (let i = 0; i < count; i++) {
      const minOvr = spec.maxOvr + offLo
      const maxOvr = spec.maxOvr + offHi
      const isGem = Math.random() < (spec.gemChance + gemBonus)
      const player = generatePlayer({
        position: m.positionFocus ?? pickNeededPosition(),
        minOvr,
        maxOvr,
        isYouth: m.type === 'youth',
        isGem,
        tail: true
      })
      const maxErr = Math.round((1 - clubStore.accuracyWithStaff) * 7)
      const delta = randInt(-maxErr, maxErr)
      const estimatedOvr = clamp(player.overall + delta, 30, ATHLETE_MAX_OVERALL)
      reports.value.unshift({
        id: 'rep_' + Date.now() + '_' + i,
        player,
        estimatedOvr,
        estimatedPotential: clamp(player.potential + delta, estimatedOvr, ATHLETE_MAX_OVERALL),
        isGem,
        status: 'new'
      })
    }
    return true
  }

  function dismissReport(id: string) {
    reports.value = reports.value.filter(r => r.id !== id)
  }

  function markSigned(id: string) {
    const r = reports.value.find(x => x.id === id)
    if (r) r.status = 'signed'
  }

  function generateYouthAcademyBatch() {
    const extra = clubStore.clubStaff.chiefScout ? STAFF_BONUS.scoutYouthOvr : 0
    youthAcademyProspects.value = [
      generatePlayer({ minOvr: 45 + extra, maxOvr: 53 + extra, isYouth: true, isGem: Math.random() < 0.3 }),
      generatePlayer({ minOvr: 44 + extra, maxOvr: 52 + extra, isYouth: true, isGem: Math.random() < 0.25 })
    ]
  }

  // Não cobra: quem cobra a peneira é o composable.
  function addTryoutProspect() {
    const extra = clubStore.clubStaff.chiefScout ? STAFF_BONUS.scoutYouthOvr : 0
    youthAcademyProspects.value.unshift(
      generatePlayer({ minOvr: 47 + extra, maxOvr: 55 + extra, isYouth: true, isGem: Math.random() < 0.35 })
    )
  }

  function removeProspect(id: string) {
    youthAcademyProspects.value = youthAcademyProspects.value.filter(y => y.id !== id)
  }

  function toSave() {
    return {
      missions: missions.value,
      reports: reports.value,
      youthAcademyProspects: youthAcademyProspects.value
    }
  }

  function fromSave(data: {
    missions?: ScoutMission[]
    reports?: ScoutReport[]
    youthAcademyProspects?: Player[]
  } | null | undefined) {
    missions.value = data?.missions ?? []
    reports.value = data?.reports ?? []
    youthAcademyProspects.value = data?.youthAcademyProspects ?? []
  }

  function reset() {
    missions.value = []
    reports.value = []
    youthAcademyProspects.value = []
    selectedScoutPosition.value = 'ST'
  }

  return {
    missions,
    reports,
    youthAcademyProspects,
    selectedScoutPosition,
    activeMissions,
    visibleReports,
    startMission,
    completeMission,
    dismissReport,
    markSigned,
    generateYouthAcademyBatch,
    addTryoutProspect,
    removeProspect,
    toSave,
    fromSave,
    reset
  }
})

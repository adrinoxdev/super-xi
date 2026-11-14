import { ref } from 'vue'
import { useClubStore } from '@/stores/club'
import { useScoutingStore } from '@/stores/scouting'
import { useSquadStore } from '@/stores/squad'
import { useUiStore } from '@/stores/ui'
import type { Player } from '@/types/player'
import type { ScoutMission, ScoutMissionType, ScoutReport } from '@/types/scouting'
import { MAX_TRYOUTS_PER_SEASON, SCOUT_MISSIONS } from '@/config'
import { formatCurrency } from '@/utils/format/formatCurrency'
import { clamp } from '@/utils/core/random'
import { squadFullTitle, blockedMsg, wageWarning } from './useClub'
import { usePersistence } from './usePersistence'

// Estado de módulo: um único relógio compartilhado por todas as telas.
export const nowTick = ref(Date.now())
let missionTickTimer: ReturnType<typeof setInterval> | null = null
let lastActiveTouch = 0

export function useScouting() {
  const club = useClubStore()
  const squad = useSquadStore()
  const scouting = useScoutingStore()
  const ui = useUiStore()
  const { saveGame } = usePersistence()

  function startMissionTicker() {
    if (missionTickTimer !== null) return
    missionTickTimer = setInterval(() => {
      nowTick.value = Date.now()
      club.clubNow = nowTick.value
      if (nowTick.value - lastActiveTouch >= 30000 && document.visibilityState === 'visible') {
        lastActiveTouch = nowTick.value
        club.touchActive()
      }
      scouting.missions.forEach((m) => {
        if (m.status === 'active' && Date.now() >= m.startTime + m.duration) {
          completeMissionNow(m.id)
        }
      })
    }, 1000)
  }

  function getMissionProgress(m: ScoutMission): number {
    const pct = ((nowTick.value - m.startTime) / m.duration) * 100
    return clamp(Math.round(pct), 0, 100)
  }

  function getMissionRemainingSec(m: ScoutMission): number {
    return Math.max(0, Math.ceil((m.startTime + m.duration - nowTick.value) / 1000))
  }

  function startScoutMission(type: ScoutMissionType) {
    const cfg = SCOUT_MISSIONS.find((m) => m.type === type)
    if (cfg && scouting.activeMissions.length < club.scoutingSpec.slots && club.budget < cfg.cost) {
      ui.showToast(blockedMsg(cfg.cost), 'warning')
      return
    }
    const res = scouting.startMission(type)
    if (!res.ok) return
    saveGame()
    ui.showToast(`Missão "${res.title}" iniciada!`, 'success')
  }

  function completeMissionNow(missionId: string) {
    if (!scouting.completeMission(missionId)) return
    saveGame()
    ui.showToast('Relatório de Scouting concluído!', 'success')
  }

  function openCompareModal(rep: ScoutReport) {
    const incumbent =
      squad.players
        .filter((p) => p.position === rep.player.position)
        .sort((a, b) => b.overall - a.overall)[0] || null
    ui.openCompare(rep.id, incumbent ? incumbent.id : null)
  }

  function signScoutedPlayer(rep: ScoutReport) {
    if (squad.players.length >= club.maxSquadCapacity) {
      ui.showToast(squadFullTitle(squad.players.length, club.maxSquadCapacity), 'warning')
      return
    }
    if (club.budget < rep.player.value) {
      ui.showToast(blockedMsg(rep.player.value), 'warning')
      return
    }
    club.budget -= rep.player.value
    rep.player.acquiredSeason = club.season
    rep.player.acquiredFee = rep.player.value
    squad.addPlayer(rep.player)
    scouting.markSigned(rep.id)
    club.recordTransfer('sign', rep.player.name, rep.player.position, rep.player.overall, rep.player.value)
    saveGame()
    ui.showToast(`${rep.player.name} contratado por ${formatCurrency(rep.player.value)}!`, 'success')
    const warn = wageWarning(rep.player.wage)
    if (warn) ui.showToast(warn, 'warning')
  }

  function dismissReport(id: string) {
    scouting.dismissReport(id)
    saveGame()
  }

  function runYouthAcademyTryout() {
    if (club.tryoutsThisSeason >= MAX_TRYOUTS_PER_SEASON) {
      ui.showToast(`Limite de ${MAX_TRYOUTS_PER_SEASON} peneiras por temporada atingido.`, 'warning')
      return
    }
    if (!club.spend(12000)) {
      ui.showToast(blockedMsg(12000), 'warning')
      return
    }
    club.tryoutsThisSeason += 1
    scouting.addTryoutProspect()
    saveGame()
    ui.showToast('Novo talento revelado na peneira da base!', 'success')
  }

  function promoteYouthProspect(kid: Player) {
    if (squad.players.length >= club.maxSquadCapacity) {
      ui.showToast(squadFullTitle(squad.players.length, club.maxSquadCapacity), 'warning')
      return
    }
    // Promovido da base de graça: na temporada da promoção a venda vale 0 (teto = valor pago), sem ciclo peneira + venda.
    kid.acquiredSeason = club.season
    kid.acquiredFee = 0
    squad.addPlayer(kid)
    scouting.removeProspect(kid.id)
    club.recordTransfer('sign', kid.name, kid.position, kid.overall, 0)
    saveGame()
    ui.showToast(`${kid.name} promovido da Base para o elenco profissional!`, 'success')
  }

  return {
    nowTick,
    startMissionTicker,
    getMissionProgress,
    getMissionRemainingSec,
    startScoutMission,
    completeMissionNow,
    openCompareModal,
    signScoutedPlayer,
    dismissReport,
    runYouthAcademyTryout,
    promoteYouthProspect,
  }
}

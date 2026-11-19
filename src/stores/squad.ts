import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Player, PlayerPosition } from '@/types/player'
import type { FormationName } from '@/types/match'
import { applyAging, generatePlayer, refreshPlayerEconomy, retireAgeFor } from '@/utils/player/generatePlayer'
import { buildFormationSlots, calculateTeamStrength, getEffectiveOvr, pickBestLineup } from '@/utils/match/calculateTeamStrength'
import { useClubStore } from '@/stores/club'
import { friendlyStrengthOf, isFriendlyEligible } from '@/utils/friendlies/strength'
import { FORMATIONS, MIN_SQUAD_SIZE, SQUAD_MAX_SIZE, STAMINA_REGEN_MS_PER_POINT } from '@/config'

export interface SquadSave {
  players: Player[]
  formation: FormationName
  starterIds: string[]
}

export const useSquadStore = defineStore('squad', () => {
  const players = ref<Player[]>([])
  const formation = ref<FormationName>('4-3-3')
  const starterIds = ref<string[]>([])

  const pitchSlots = computed(() => {
    const starters = starterIds.value.map((id) => players.value.find((p) => p.id === id) ?? null)
    return buildFormationSlots(formation.value, starters)
  })

  // Elenco cheio: bloqueia toda entrada de atleta. Acima do limite absoluto só pode ocorrer em save antigo.
  const isFull = computed(() => players.value.length >= useClubStore().maxSquadCapacity)
  const overLimit = computed(() => players.value.length > SQUAD_MAX_SIZE)

  const teamStrength = computed(() => calculateTeamStrength(pitchSlots.value))
  // OVER do amistoso: a mesma escalação com energia 100 (regra 5 da spec de amistosos).
  const freshTeamStrength = computed(() => calculateTeamStrength(pitchSlots.value, undefined, { ignoreFatigue: true }))
  // Atletas que podem jogar amistoso: sem lesão, sem suspensão em nenhuma competição e não emprestados.
  const friendlyEligibleCount = computed(() => players.value.filter(isFriendlyEligible).length)
  // OVER efetivo do amistoso: max(escalação atual, melhor escalação elegível), sem cansaço (spec §6). É o que fixa o rival.
  const friendlyStrength = computed(() => friendlyStrengthOf(players.value, formation.value, starterIds.value))

  const totalWageBill = computed(() =>
    players.value.reduce((sum, p) => sum + (p.isLoanedOut ? 0 : p.wage), 0)
  )
  const activeWagePlayersCount = computed(() => players.value.filter((p) => !p.isLoanedOut).length)
  const loanedOutCount = computed(() => players.value.filter((p) => p.isLoanedOut).length)

  const currentStartersList = computed(() =>
    starterIds.value
      .map((id) => players.value.find((p) => p.id === id))
      .filter((p): p is Player => !!p)
  )
  const availableBenchList = computed(() =>
    players.value.filter((p) => !starterIds.value.includes(p.id) && !p.isLoanedOut)
  )
  const formationNames = computed(() => Object.keys(FORMATIONS) as FormationName[])

  function initializeDefaultSquad() {
    // Mesma ordem das vagas do 4-3-3 em FORMATIONS: o índice do titular é o índice da vaga na prancheta.
    const startersPos: PlayerPosition[] = ['LW', 'ST', 'RW', 'CM', 'CDM', 'CM', 'LB', 'CB', 'CB', 'RB', 'GK']
    // Alojamento nível 1 comporta 14: 11 titulares + 3 reservas (goleiro, zagueiro e meia ofensivo).
    // Perfis distintos: um líder experiente (CM), duas promessas da base (LW, ST) e o resto de nível regular.
    const benchPos: PlayerPosition[] = ['GK', 'CB', 'CAM']
    const starters: Player[] = startersPos.map((pos, i) => {
      if (i === 3) return generatePlayer({ position: pos, minOvr: 59, maxOvr: 61 })
      if (pos === 'LW' || pos === 'ST') {
        return generatePlayer({ position: pos, minOvr: 48, maxOvr: 51, isYouth: true, isGem: pos === 'ST' })
      }
      return generatePlayer({ position: pos, minOvr: 50, maxOvr: 55 })
    })
    const created: Player[] = [
      ...starters,
      ...benchPos.map((pos) => generatePlayer({ position: pos, minOvr: 46, maxOvr: 51 }))
    ]
    players.value = created
    formation.value = '4-3-3'
    starterIds.value = created.slice(0, 11).map((p) => p.id)
  }

  function isStarter(id: string): boolean {
    return starterIds.value.includes(id)
  }

  function addPlayer(player: Player) {
    players.value.push(player)
  }

  function removePlayer(playerId: string) {
    const idx = starterIds.value.indexOf(playerId)
    players.value = players.value.filter((p) => p.id !== playerId)
    if (idx !== -1) {
      const rep = players.value.find((p) => !starterIds.value.includes(p.id) && !p.isLoanedOut)
      if (rep) starterIds.value[idx] = rep.id
      else starterIds.value.splice(idx, 1)
    }
  }

  function releaseStarter(playerId: string) {
    const idx = starterIds.value.indexOf(playerId)
    if (idx === -1) return
    const rep = players.value.find((p) => p.id !== playerId && !starterIds.value.includes(p.id) && !p.isLoanedOut)
    if (rep) starterIds.value[idx] = rep.id
    else starterIds.value.splice(idx, 1)
  }

  function swapStarterSlot(slotIdx: number, playerId: string) {
    const existingIdx = starterIds.value.indexOf(playerId)
    if (existingIdx !== -1) {
      const temp = starterIds.value[slotIdx]
      starterIds.value[slotIdx] = playerId
      starterIds.value[existingIdx] = temp
    } else {
      starterIds.value[slotIdx] = playerId
    }
  }

  function setFormation(f: FormationName) {
    formation.value = f
  }

  function setStarters(ids: string[]) {
    starterIds.value = ids
  }

  function substituteStarter(outId: string, inId: string): boolean {
    const idx = starterIds.value.indexOf(outId)
    if (idx === -1) return false
    starterIds.value[idx] = inId
    return true
  }

  // Troca titulares lesionados ou suspensos pelo melhor reserva disponível para a posição. Sem reserva, o lesionado
  // segue no time com penalidade de overall e o suspenso deixa a vaga vazia (conta 0 na força do time).
  // `unavailable`: critério extra de indisponibilidade (ex.: suspenso na competição da partida). Devolve as trocas feitas.
  function replaceInjuredStarters(unavailable: (p: Player) => boolean = () => false): Array<{ out: Player; in: Player }> {
    const swaps: Array<{ out: Player; in: Player }> = []
    const layout = FORMATIONS[formation.value] || FORMATIONS['4-3-3']
    starterIds.value.forEach((id, idx) => {
      const p = players.value.find((pl) => pl.id === id)
      if (!p || (!p.injury && !unavailable(p))) return
      const role = layout[idx]?.role ?? p.position
      const rep = players.value
        .filter((q) => !q.injury && !unavailable(q) && !q.isLoanedOut && !starterIds.value.includes(q.id))
        .sort((a, b) => getEffectiveOvr(b, role) - getEffectiveOvr(a, role))[0]
      if (rep) {
        starterIds.value[idx] = rep.id
        swaps.push({ out: p, in: rep })
      }
    })
    return swaps
  }

  /** Recuperação natural por tempo real: soma só pontos inteiros e guarda o resto de tempo em staminaTickAt. */
  function regenStamina(now = Date.now()) {
    const club = useClubStore()
    const points = Math.floor((now - club.staminaTickAt) / STAMINA_REGEN_MS_PER_POINT)
    if (points <= 0) {
      if (now < club.staminaTickAt) club.staminaTickAt = now
      return
    }
    club.staminaTickAt += points * STAMINA_REGEN_MS_PER_POINT
    players.value.forEach((p) => {
      if ((p.stamina ?? 100) < 100) p.stamina = Math.min(100, (p.stamina ?? 100) + points)
    })
    // Elenco cheio: descarta o tempo acumulado para a energia não nascer "adiantada" no próximo desgaste.
    if (players.value.every((p) => (p.stamina ?? 100) >= 100)) club.staminaTickAt = now
  }

  function recoverStamina(amount = 35) {
    players.value.forEach((p) => {
      p.stamina = Math.min(100, (p.stamina ?? 100) + amount)
    })
  }

  function applyEndOfSeason(): { departed: Player[]; retired: Player[] } {
    players.value = players.value.filter((p) => !p.isLoanedIn)
    const departed: Player[] = []
    const retired: Player[] = []
    for (const p of players.value) {
      p.age += 1
      p.contractYears = (p.contractYears ?? 1) - 1
      if (p.age >= retireAgeFor(p.position)) retired.push(p)
      else if (p.contractYears <= 0) departed.push(p)
    }
    const gone = new Set([...departed, ...retired].map((p) => p.id))
    players.value = players.value.filter((p) => !gone.has(p.id))
    // Saídas e fim de empréstimos não podem deixar o elenco abaixo do mínimo: completa com jovens da base.
    const season = useClubStore().season
    while (players.value.length < MIN_SQUAD_SIZE && players.value.length < SQUAD_MAX_SIZE) {
      const y = generatePlayer({ minOvr: 45, maxOvr: 49, isYouth: true })
      y.acquiredSeason = season
      y.acquiredFee = 0
      players.value.push(y)
    }
    starterIds.value = starterIds.value.filter((id) => players.value.some((p) => p.id === id))
    if (starterIds.value.length < MIN_SQUAD_SIZE) starterIds.value = pickBestLineup(players.value, formation.value)
    players.value.forEach((p) => {
      p.isLoanedOut = false
      p.stamina = 100
      delete p.injury
      delete p.suspension
      delete p.yellowCards
      applyAging(p)
      refreshPlayerEconomy(p)
    })
    return { departed, retired }
  }

  function toSave(): SquadSave {
    return {
      players: players.value,
      formation: formation.value,
      starterIds: starterIds.value
    }
  }

  function fromSave(data: SquadSave) {
    players.value = data.players
    formation.value = data.formation ?? '4-3-3'
    starterIds.value = data.starterIds ?? []
  }

  return {
    players,
    isFull,
    overLimit,
    formation,
    starterIds,
    pitchSlots,
    teamStrength,
    freshTeamStrength,
    friendlyEligibleCount,
    friendlyStrength,
    totalWageBill,
    activeWagePlayersCount,
    loanedOutCount,
    currentStartersList,
    availableBenchList,
    formationNames,
    initializeDefaultSquad,
    isStarter,
    addPlayer,
    removePlayer,
    releaseStarter,
    swapStarterSlot,
    setFormation,
    setStarters,
    substituteStarter,
    replaceInjuredStarters,
    recoverStamina,
    regenStamina,
    applyEndOfSeason,
    toSave,
    fromSave
  }
})

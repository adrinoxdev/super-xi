import { computed } from 'vue'
import type { Ref } from 'vue'
import type { Bracket, BracketTeam, BracketTie, GroupTeam, MundialGroup, MundialState, Podium } from '@/types'
import { MUNDIAL_EVERY, MUNDIAL_LABEL, PRIZES } from '@/config'
import {
  completeBracket,
  createBracket,
  fillTieTeams,
  playLeg,
  propagate,
  resolveTie,
  simulatePhaseExceptUser,
  simulateTie,
  userFinalPosition,
  userPendingTie
} from '@/utils/bracket/bracket'
import { MUNDIAL_R16_TEMPLATE, seedMundialRoundOf16 } from '@/utils/bracket/bracketSeeding'
import { applyGroupMatch, GROUP_SCHEDULE, simulateGroupRound, sortGroup } from '@/utils/groups/groupStage'
import type { MundialField } from '@/utils/competitions/mundialField'
import type { Rng } from '@/utils/core/random'
import { formatCurrency } from '@/utils/format/formatCurrency'
import { emptyMundial } from './defaults'
import type { CompetitionToast, CompetitionsClub } from './types'

/** Turno único: 3 rodadas por grupo (plano, seção 1). */
const GROUP_ROUNDS = 3
type GroupLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H'

export function createMundial(ctx: { mundialState: Ref<MundialState>; club: CompetitionsClub; rng?: Rng }) {
  const { mundialState, club } = ctx
  const clubStore = club
  const rng: Rng = ctx.rng ?? Math.random

  const userGroup = (): MundialGroup | undefined =>
    mundialState.value.groups.find((g) => g.id === mundialState.value.userGroupId)

  const userIdx = (teams: GroupTeam[]) => teams.findIndex((t) => t.isUser)

  /** Par [mandante, visitante] (índices) do jogo do usuário na rodada. */
  function userPairInRound(teams: GroupTeam[], round: number): [number, number] | null {
    const u = userIdx(teams)
    const swap = round > GROUP_ROUNDS
    for (const [i, j] of GROUP_SCHEDULE[(round - 1) % 3]) {
      if (i === u || j === u) return swap ? [j, i] : [i, j]
    }
    return null
  }

  const mundialStandings = computed(() => {
    const g = userGroup()
    return g ? sortGroup(g.teams) : []
  })

  /** Disputa de 3º lugar pendente para o usuário. */
  const hasPendingMundialThird = computed(() => {
    const m = mundialState.value
    if (!m.qualified || m.eliminated || m.champion || !m.bracket) return false
    const t = userPendingTie(m.bracket)
    return !!t && t === m.bracket.thirdPlace
  })

  const mundialStageLabel = computed(() => {
    const m = mundialState.value
    if (m.stage === 'GROUPS') return `${MUNDIAL_LABEL}: Fase de Grupos • Rodada ${m.groupRound}/${GROUP_ROUNDS}`
    const tie = m.bracket ? userPendingTie(m.bracket) : null
    if (!tie || !m.bracket) return MUNDIAL_LABEL
    if (tie === m.bracket.thirdPlace) return `${MUNDIAL_LABEL}: Disputa de 3º Lugar`
    return `${MUNDIAL_LABEL}: ${m.bracket.rounds[tie.roundIndex]?.label ?? 'Final'}`
  })

  /** Adversário da próxima partida do usuário (grupo ou chave); null se não há jogo. */
  const mundialOpponent = computed(() => {
    const m = mundialState.value
    if (!m.qualified || m.eliminated || m.champion) return null
    if (m.stage === 'GROUPS') {
      const g = userGroup()
      if (!g) return null
      const pair = userPairInRound(g.teams, m.groupRound)
      const u = userIdx(g.teams)
      const opp = pair ? g.teams[pair[0] === u ? pair[1] : pair[0]] : null
      return opp ? { name: opp.name, power: opp.power, style: MUNDIAL_LABEL, tag: opp.tag ?? '' } : null
    }
    const tie = m.bracket ? userPendingTie(m.bracket) : null
    if (!tie || !m.bracket) return null
    const oppId = tie.homeId === 'user' ? tie.awayId : tie.homeId
    const team = oppId ? m.bracket.teams[oppId] : null
    return team ? { name: team.name, power: team.power, style: MUNDIAL_LABEL, tag: team.tag ?? '' } : null
  })

  function buildBracket(field: MundialField): Bracket {
    const teams: BracketTeam[] = field.teams.map((t) => ({
      id: t.id, name: t.isUser ? clubStore.name : t.name, power: t.power, tag: t.tag
    }))
    const b = createBracket({
      competition: 'mundial',
      season: clubStore.season,
      label: MUNDIAL_LABEL,
      teams,
      rounds: [
        { key: 'R16', label: 'Oitavas de Final', shortLabel: 'Oitavas', legCount: 1 },
        { key: 'QF', label: 'Quartas de Final', shortLabel: 'Quartas', legCount: 1 },
        { key: 'SF', label: 'Semifinal', shortLabel: 'Semi', legCount: 1 },
        { key: 'FINAL', label: 'Final', shortLabel: 'Final', legCount: 1 }
      ],
      firstRound: MUNDIAL_R16_TEMPLATE.map((): [string | null, string | null] => [null, null]),
      firstRoundLabels: MUNDIAL_R16_TEMPLATE,
      thirdPlace: true,
      thirdLegCount: 1
    })
    b.neutral = true
    return b
  }

  /** Abre a edição da temporada atual. Sem vaga do usuário, o estado fica vazio (nada a jogar). */
  function openMundialEdition(field: MundialField) {
    if (!field.userEntry || !field.teams.some((t) => t.isUser)) {
      mundialState.value = emptyMundial()
      return
    }
    const season = clubStore.season
    const groups: MundialGroup[] = field.groups.map((g) => ({
      id: g.id, teams: g.teams.map((t) => ({ ...t })), results: []
    }))
    mundialState.value = {
      ...emptyMundial(),
      qualified: true,
      edition: Math.round(season / MUNDIAL_EVERY),
      season,
      hostId: field.hostId,
      userEntry: field.userEntry,
      stage: 'GROUPS',
      groupRound: 1,
      userGroupId: groups.find((g) => g.teams.some((t) => t.isUser))?.id ?? 'A',
      groups,
      bracket: buildBracket(field)
    }
  }

  function resetMundial() {
    mundialState.value = emptyMundial()
  }

  /** Joga a rodada nos 8 grupos. userScore = [gols do usuário, do adversário]; null = W.O. 0 x 3. */
  function playGroupRound(round: number, userScore: [number, number] | null) {
    for (const g of mundialState.value.groups) {
      g.results.push(...simulateGroupRound(g.teams, round, rng, { neutral: true, skipUser: true }))
      const pair = userPairInRound(g.teams, round)
      if (!pair) continue
      const home = g.teams[pair[0]]
      const away = g.teams[pair[1]]
      const [u, o] = userScore ?? [0, 3]
      const [hg, ag] = home.isUser ? [u, o] : [o, u]
      applyGroupMatch(home, away, hg, ag)
      g.results.push({ round, homeId: home.id, awayId: away.id, hg, ag })
    }
  }

  /** Depois da última rodada: preenche as oitavas com os dois primeiros de cada grupo. */
  function seedMundialKnockout() {
    const m = mundialState.value
    const b = m.bracket
    if (!b) return
    const sorted = {} as Record<GroupLetter, string[]>
    for (const g of m.groups) {
      const ids = sortGroup(g.teams).map((t) => t.id)
      sorted[g.id as GroupLetter] = ids
      ids.forEach((tid, k) => {
        if (b.teams[tid]) b.teams[tid].tag = `${k + 1}º Grupo ${g.id}`
      })
    }
    seedMundialRoundOf16(sorted).forEach(([h, a], i) => {
      const tie = b.rounds[0].ties[i]
      if (a === 'user') fillTieTeams(tie, a, h)
      else fillTieTeams(tie, h, a)
    })
    b.teams.user.name = clubStore.name
    propagate(b, { userHosts: true })
  }

  /** Fim da temporada: o que estiver pendente vira W.O. do usuário e o torneio é simulado até o pódio. */
  function finishMundialForSeason(): Podium | null {
    const m = mundialState.value
    if (!m.qualified || !m.bracket) return null
    if (!m.bracket.podium) {
      if (m.stage === 'GROUPS') {
        for (let r = m.groupRound; r <= GROUP_ROUNDS; r++) playGroupRound(r, null)
        m.groupRound = GROUP_ROUNDS
        seedMundialKnockout()
      }
      m.bracket.teams.user.name = clubStore.name
      completeBracket(m.bracket, rng, { forfeitUser: true })
    }
    if (!m.champion) m.eliminated = true
    m.stage = 'DONE'
    m.finalPosition = m.finalPosition ?? userFinalPosition(m.bracket)
    return m.bracket.podium
  }

  function applyMundialResult(
    uGoals: number,
    oGoals: number,
    clubName: string,
    rivalName: string,
    userPens?: { user: number; opp: number } | null
  ): CompetitionToast | null {
    const m = mundialState.value
    const P = PRIZES.mundial
    if (!m.qualified || !m.bracket || m.stage === 'DONE') {
      return { toast: 'Competição já encerrada.', toastType: 'warning' }
    }
    const pay = (amount: number, roundName: string, summary: string) => {
      if (amount > 0) clubStore.earn(amount)
      m.history.unshift({ roundName, summary, prize: amount })
    }

    if (m.stage === 'GROUPS') {
      const round = m.groupRound
      playGroupRound(round, [uGoals, oGoals])
      pay(0, `Grupos, rodada ${round}`, `${clubName} ${uGoals} x ${oGoals} ${rivalName}`)
      if (round < GROUP_ROUNDS) {
        m.groupRound += 1
        return null
      }
      const rank = mundialStandings.value.findIndex((t) => t.isUser) + 1
      seedMundialKnockout()
      if (rank <= 2) {
        m.stage = 'KNOCKOUT'
        pay(P.r16, 'Fase de Grupos', `Classificado em ${rank}º no grupo ${m.userGroupId}`)
        return { toast: `Classificado às oitavas da ${MUNDIAL_LABEL}! Cota: ${formatCurrency(P.r16)}`, toastType: 'success' }
      }
      m.eliminated = true
      m.stage = 'DONE'
      completeBracket(m.bracket, rng)
      m.finalPosition = userFinalPosition(m.bracket)
      return { toast: `Eliminado na fase de grupos da ${MUNDIAL_LABEL}.`, toastType: 'warning' }
    }

    const b = m.bracket
    const tie: BracketTie | null = userPendingTie(b)
    if (!tie) return { toast: 'Competição já encerrada.', toastType: 'warning' }
    b.teams.user.name = clubName
    const isThird = tie === b.thirdPlace
    const idx = tie.roundIndex
    const userIsHome = tie.homeId === 'user'
    playLeg(tie, 0, userIsHome ? uGoals : oGoals, userIsHome ? oGoals : uGoals)
    resolveTie(tie, b.teams, rng, 0.55, userPens, true)
    const userWon = tie.winnerId === 'user'
    let scoreLabel = `${uGoals} x ${oGoals}`
    if (tie.penalties) {
      const pu = userIsHome ? tie.penalties.home : tie.penalties.away
      const po = userIsHome ? tie.penalties.away : tie.penalties.home
      scoreLabel += ` (Pênaltis ${pu}x${po}: ${userWon ? 'Classificado' : 'Eliminado'})`
    }
    const summary = `${clubName} ${scoreLabel} ${rivalName}`
    const final = b.rounds[b.rounds.length - 1].ties[0]
    if (isThird) simulateTie(final, b.teams, rng, true)
    else simulatePhaseExceptUser(b, idx, rng)
    propagate(b, { userHosts: true })

    const finish = (position: 1 | 2 | 3 | 4 | null) => {
      m.finalPosition = position
      m.stage = 'DONE'
    }

    if (isThird) {
      pay(userWon ? P.thirdWin : P.thirdLoss, 'Disputa de 3º Lugar', summary)
      m.eliminated = true
      finish(userWon ? 3 : 4)
      return userWon
        ? { toast: `3º LUGAR NA ${MUNDIAL_LABEL.toUpperCase()}! Cota: ${formatCurrency(P.thirdWin)}`, toastType: 'success' }
        : { toast: `4º lugar na ${MUNDIAL_LABEL}.`, toastType: 'info' }
    }

    const roundName = b.rounds[idx].label
    if (!userWon) {
      if (idx === 3) {
        pay(P.finalLoss, roundName, summary)
        m.eliminated = true
        finish(2)
        return { toast: `Vice-campeão da ${MUNDIAL_LABEL}.`, toastType: 'info' }
      }
      pay(0, roundName, summary)
      if (idx === 2) return { toast: 'Eliminado na semifinal. Dispute o 3º lugar!', toastType: 'warning' }
      m.eliminated = true
      completeBracket(b, rng)
      finish(userFinalPosition(b))
      return { toast: `Eliminado da ${MUNDIAL_LABEL}.`, toastType: 'warning' }
    }

    if (idx === 3) {
      pay(P.champion, roundName, summary)
      m.champion = true
      finish(1)
      clubStore.recordTrophy('title', `Campeão da ${MUNDIAL_LABEL}`, P.champion)
      return { toast: `CAMPEÃO DA ${MUNDIAL_LABEL.toUpperCase()}!`, toastType: 'success' }
    }
    const prize = idx === 0 ? P.qf : idx === 1 ? P.sf : 0
    pay(prize, roundName, summary)
    return {
      toast: idx === 2 ? `Na final da ${MUNDIAL_LABEL}!` : `Classificado na ${MUNDIAL_LABEL}! Cota: ${formatCurrency(prize)}`,
      toastType: 'success'
    }
  }

  return {
    mundialStageLabel,
    mundialStandings,
    mundialOpponent,
    hasPendingMundialThird,
    openMundialEdition,
    resetMundial,
    playGroupRound,
    seedMundialKnockout,
    finishMundialForSeason,
    applyMundialResult
  }
}

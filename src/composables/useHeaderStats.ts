import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useClubStore } from '@/stores/club'
import { useCompetitionsStore } from '@/stores/competitions'
import { useLeagueStore } from '@/stores/league'
import { useMatchStore } from '@/stores/match'
import { useScoutingStore } from '@/stores/scouting'
import { useSquadStore } from '@/stores/squad'
import { useFriendliesStore } from '@/stores/friendlies'
import { FRIENDLIES } from '@/config'
import { outcomeOf } from '@/utils/match/matchResult'
import { useMatchSimulation } from '@/composables/useMatchSimulation'

export interface HeaderStat {
  label: string
  value: string | number
}

// Chips do header: o conteúdo muda conforme a página aberta.
export function useHeaderStats() {
  const route = useRoute()
  const club = useClubStore()
  const league = useLeagueStore()
  const squad = useSquadStore()
  const competitions = useCompetitionsStore()
  const scouting = useScoutingStore()
  const match = useMatchStore()
  const friendlies = useFriendliesStore()
  const { opponentFor, labelFor } = useMatchSimulation()

  const rankLabel = computed(() => `${league.userLeagueRank}º · ${league.userLeaguePoints} pts`)
  const serieLabel = computed(() => `Série ${league.serieMeta.code} · T${club.season}`)

  const stats = computed<HeaderStat[]>(() => {
    if (route.path.startsWith('/historico')) {
      const h = match.matchHistory
      const wins = h.filter((m) => outcomeOf(m) === 'win').length
      const draws = h.filter((m) => outcomeOf(m) === 'draw').length
      return [
        { label: 'Jogos', value: h.length },
        { label: 'V · E · D', value: `${wins} · ${draws} · ${h.length - wins - draws}` },
        { label: 'Gols', value: `${h.reduce((a, m) => a + m.userScore, 0)} pró · ${h.reduce((a, m) => a + m.opponentScore, 0)} contra` }
      ]
    }
    switch (route.path) {
      case '/pre-match':
      case '/match':
        return [
          { label: 'Competição', value: labelFor(match.activeMatchCompetition) },
          { label: 'Adversário', value: opponentFor(match.activeMatchCompetition).name },
          { label: 'Estilo', value: match.mentalityInfo.label }
        ]
      case '/league':
        return [
          { label: serieLabel.value, value: rankLabel.value },
          { label: 'Rodada', value: `${league.currentRound}/${league.maxStageRounds}` },
          { label: 'Over', value: squad.teamStrength.total }
        ]
      case '/friendlies':
        // A fama só aparece aqui; as demais telas seguem com a reputação (fama e reputação são separadas).
        return [
          { label: 'Fichas', value: `${friendlies.tokens}/${FRIENDLIES.tokens.max}` },
          { label: 'Fama', value: friendlies.fame },
          { label: 'Posição', value: `#${friendlies.rank} de ${FRIENDLIES.bots.count + 1}` }
        ]
      case '/competitions':
        return [
          { label: 'Copa', value: competitions.cupRoundLabel },
          { label: 'Continental', value: competitions.continentalStageLabel }
        ]
      case '/scouting':
        return [
          { label: 'Elenco', value: `${squad.players.length}/${club.maxSquadCapacity}` },
          { label: 'Missões ativas', value: scouting.activeMissions.length },
          { label: 'Relatórios', value: scouting.visibleReports.length },
          { label: 'Base', value: scouting.youthAcademyProspects.length }
        ]
      case '/squad':
        return [
          { label: 'Formação', value: squad.formation },
          { label: 'Over', value: squad.teamStrength.total },
          { label: 'Elenco', value: `${squad.players.length}/${club.maxSquadCapacity}` },
          { label: 'Estilo', value: match.mentalityInfo.label }
        ]
      case '/club':
        return [
          { label: 'Troféus', value: club.trophyGallery.length },
          { label: 'Reputação', value: club.reputation },
          { label: serieLabel.value, value: rankLabel.value }
        ]
      default:
        return [
          { label: 'Over', value: squad.teamStrength.total },
          { label: serieLabel.value, value: rankLabel.value },
          { label: 'Elenco', value: `${squad.players.length}/${club.maxSquadCapacity}` }
        ]
    }
  })

  return { stats }
}

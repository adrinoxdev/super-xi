import { computed, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Award, Building2, LayoutDashboard, PlayCircle, Radar, Shield, Trophy } from 'lucide-vue-next'
import { useCompetitionsStore } from '@/stores/competitions'
import { useLeagueStore } from '@/stores/league'
import { useMarketStore } from '@/stores/market'
import { useMatchStore } from '@/stores/match'
import { useScoutingStore } from '@/stores/scouting'

export interface NavItem {
  id: string
  label: string
  shortLabel: string
  icon: Component
  path: string
  badge: string | number | null
  active: boolean
  live: boolean
}

export function useNavigation() {
  const route = useRoute()
  const router = useRouter()
  const league = useLeagueStore()
  const competitions = useCompetitionsStore()
  const scouting = useScoutingStore()
  const market = useMarketStore()
  const match = useMatchStore()

  const matchPath = computed(() => (match.isMatchActive ? '/match' : '/pre-match'))

  const navItems = computed<NavItem[]>(() => {
    const base = [
      { id: 'dashboard', label: 'Início', shortLabel: 'Início', icon: LayoutDashboard, path: '/', badge: null },
      { id: 'league', label: 'Liga', shortLabel: 'Liga', icon: Trophy, path: '/league', badge: league.serieMeta.code },
      {
        id: 'competitions',
        label: 'Competições',
        shortLabel: 'Copas',
        icon: Award,
        path: '/competitions',
        badge: competitions.hasPendingFinal || competitions.hasPendingThirdPlace ? '!' : null
      },
      {
        id: 'scouting',
        label: 'Scouting',
        shortLabel: 'Scout',
        icon: Radar,
        path: '/scouting',
        badge: scouting.visibleReports.length || null
      },
      {
        id: 'squad',
        label: 'Elenco & Tática',
        shortLabel: 'Elenco',
        icon: Shield,
        path: '/squad',
        badge: market.incomingOffers.length || null
      },
      { id: 'match', label: 'Partidas', shortLabel: 'Jogar', icon: PlayCircle, path: matchPath.value, badge: null },
      { id: 'club', label: 'Clube', shortLabel: 'Clube', icon: Building2, path: '/club', badge: null }
    ]
    const p = route.path
    return base.map((i) => ({
      ...i,
      active: i.id === 'match' ? p === '/match' || p === '/pre-match' : p === i.path,
      // Partida em andamento (rodando ou pausada para substituições, ainda não encerrada).
      live: i.id === 'match' && !match.matchState.isFinished && (match.matchState.isRunning || match.showSubDrawer)
    }))
  })

  const currentPageTitle = computed(() => navItems.value.find((i) => i.active)?.label ?? 'Super XI')

  function goToMatchTab(): void {
    // Competição guardada da última partida já encerrada: volta ao pré-jogo da liga (como no protótipo).
    if (!match.isMatchActive && !competitions.isCompetitionPlayable(match.activeMatchCompetition)) {
      match.activeMatchCompetition = 'league'
    }
    router.push(matchPath.value)
  }

  function goTo(item: NavItem): void {
    if (item.id === 'match') {
      goToMatchTab()
      return
    }
    router.push(item.path)
  }

  return { navItems, currentPageTitle, goToMatchTab, goTo }
}

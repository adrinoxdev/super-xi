import { computed, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Award, Building2, History, LayoutDashboard, Radar, Shield, Swords, Trophy } from 'lucide-vue-next'
import { useCompetitionsStore } from '@/stores/competitions'
import { useFriendliesStore } from '@/stores/friendlies'
import { useLeagueStore } from '@/stores/league'
import { useMarketStore } from '@/stores/market'
import { useMatchStore } from '@/stores/match'
import { useScoutingStore } from '@/stores/scouting'
import { navIdForCompetition, sectionMemory, type MatchNavId } from '@/utils/navigation/sectionMemory'

export interface NavItem {
  id: string
  label: string
  shortLabel: string
  icon: Component
  path: string
  badge: string | number | null
  active: boolean
  live: boolean
  /** Item fixo da BottomNav (4 telas de uso diário); os demais ficam no menu "+". */
  primary: boolean
}

export function useNavigation() {
  const route = useRoute()
  const router = useRouter()
  const league = useLeagueStore()
  const competitions = useCompetitionsStore()
  const scouting = useScoutingStore()
  const market = useMarketStore()
  const match = useMatchStore()
  const friendlies = useFriendliesStore()

  const matchPath = computed(() => (match.isMatchActive ? '/match' : '/pre-match'))
  const isMatchRoute = computed(() => route.path === '/match' || route.path === '/pre-match')

  const navItems = computed<NavItem[]>(() => {
    const base = [
      { id: 'dashboard', label: 'Início', shortLabel: 'Início', icon: LayoutDashboard, path: '/', badge: null, primary: true },
      { id: 'league', label: 'Liga', shortLabel: 'Liga', icon: Trophy, path: '/league', badge: league.serieMeta.code, primary: true },
      {
        id: 'competitions',
        label: 'Competições',
        shortLabel: 'Copas',
        icon: Award,
        path: '/competitions',
        badge: competitions.hasPendingFinal || competitions.hasPendingThirdPlace ? '!' : null,
        primary: true
      },
      {
        id: 'friendlies',
        label: 'Amistosos',
        shortLabel: 'Amist.',
        icon: Swords,
        path: '/friendlies',
        badge: friendlies.tokens > 0 ? friendlies.tokens : null,
        primary: false
      },
      {
        id: 'scouting',
        label: 'Scouting',
        shortLabel: 'Scout',
        icon: Radar,
        path: '/scouting',
        badge: scouting.visibleReports.length || null,
        primary: false
      },
      {
        id: 'squad',
        label: 'Elenco & Tática',
        shortLabel: 'Elenco',
        icon: Shield,
        path: '/squad',
        badge: market.incomingOffers.length || null,
        primary: true
      },
      { id: 'matches', label: 'Histórico', shortLabel: 'Histórico', icon: History, path: '/matches', badge: null, primary: false },
      { id: 'club', label: 'Clube', shortLabel: 'Clube', icon: Building2, path: '/club', badge: null, primary: false }
    ]
    const p = route.path
    const ownerId = isMatchRoute.value ? navIdForCompetition(match.activeMatchCompetition) : null
    return base.map((i) => ({
      ...i,
      active: ownerId ? i.id === ownerId : i.id === 'matches' ? p.startsWith('/matches') : p === i.path,
      // Partida em andamento (rodando ou pausada para substituições, ainda não encerrada) desta competição.
      live: match.liveCompetitions.some((c) => navIdForCompetition(c) === i.id)
    }))
  })

  // BottomNav: 4 itens fixos + menu "+" com o resto (a Sidebar usa navItems inteiro).
  const primaryNavItems = computed(() => navItems.value.filter((i) => i.primary))
  const moreNavItems = computed(() => navItems.value.filter((i) => !i.primary))

  const currentPageTitle = computed(() => {
    const label = navItems.value.find((i) => i.active)?.label ?? 'Super XI'
    return isMatchRoute.value ? `${label} › Partida` : label
  })

  // Item de navegação da página-mãe da partida aberta (destino do botão "Voltar").
  const matchOwner = computed(() => navItems.value.find((i) => i.id === navIdForCompetition(match.activeMatchCompetition)))

  function goToMatchTab(): void {
    // Competição guardada da última partida já encerrada: volta ao pré-jogo da liga (como no protótipo).
    // Há partida ao vivo em outra competição: abre ela em vez do pré-jogo vazio.
    if (!match.isMatchActive && match.openCompetitions.length) {
      match.activeMatchCompetition = match.liveCompetitions[0] ?? match.openCompetitions[0]
    }
    if (!match.isMatchActive && !competitions.isCompetitionPlayable(match.activeMatchCompetition)) {
      match.activeMatchCompetition = 'league'
    }
    router.push(matchPath.value)
  }

  function goTo(item: NavItem): void {
    // Seção com partida: volta para onde o usuário estava (partida ao vivo ou pré-jogo), não para a página principal.
    // Se ele já está na partida desta seção, o clique leva à página principal.
    const mem = sectionMemory[item.id as MatchNavId]
    const onThisMatch = isMatchRoute.value && navIdForCompetition(match.activeMatchCompetition) === item.id
    if (mem?.comp && !onThisMatch) {
      const comp = mem.comp
      if (mem.path === '/match' && match.isCompetitionLive(comp)) {
        match.activeMatchCompetition = comp
        router.push('/match')
        return
      }
      if (mem.path === '/pre-match' && !match.isCompetitionMatchActive(comp) && competitions.isCompetitionPlayable(comp) && (comp !== 'friendly' || (friendlies.selectedOption && !friendlies.active))) {
        match.activeMatchCompetition = comp
        router.push('/pre-match')
        return
      }
    }
    router.push(item.path)
  }

  return { navItems, primaryNavItems, moreNavItems, currentPageTitle, isMatchRoute, matchOwner, goToMatchTab, goTo }
}

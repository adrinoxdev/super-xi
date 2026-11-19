import { createRouter, createWebHashHistory } from 'vue-router'
import { useMatchStore } from '@/stores/match'
import { rememberSection } from '@/utils/navigation/sectionMemory'
// Telas da partida sem carregamento sob demanda: a partida não pode começar se o chunk falhar.
import PreMatchView from '../views/PreMatchView.vue'
import MatchView from '../views/MatchView.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
    { path: '/league', name: 'league', component: () => import('../views/LeagueView.vue') },
    { path: '/competitions', name: 'competitions', component: () => import('../views/CompetitionsView.vue') },
    { path: '/friendlies', name: 'friendlies', component: () => import('../views/FriendliesView.vue') },
    { path: '/scouting', name: 'scouting', component: () => import('../views/ScoutingView.vue') },
    { path: '/squad', name: 'squad', component: () => import('../views/SquadView.vue') },
    { path: '/matches', name: 'matches', component: () => import('../views/MatchesView.vue') },
    { path: '/matches/:id', name: 'match-record', component: () => import('../views/MatchRecordView.vue') },
    { path: '/pre-match', name: 'prematch', component: PreMatchView },
    { path: '/match', name: 'match', component: MatchView },
    { path: '/club', name: 'club', component: () => import('../views/ClubView.vue') }
  ]
})

router.beforeEach((to) => {
  const match = useMatchStore()
  if (to.name === 'match' && !match.isMatchActive) return { name: 'prematch' }
  if (to.name === 'prematch' && match.isMatchActive) return { name: 'match' }
})

router.afterEach((to) => {
  rememberSection(to.path, useMatchStore().activeMatchCompetition)
})

// Rede de segurança: se o carregamento sob demanda de uma tela falhar (chunk antigo após atualização, recarga do servidor
// de desenvolvimento), recarrega a página no destino em vez de ficar parado na tela anterior.
router.onError((err, to) => {
  if (/dynamically imported module|Importing a module script failed/i.test(String((err as Error)?.message))) {
    window.location.assign(to.fullPath)
  }
})

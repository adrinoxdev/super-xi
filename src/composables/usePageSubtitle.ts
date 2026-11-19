import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { useMatchStore } from '@/stores/match'
import { COMPETITION_NAMES } from '@/utils/match/matchResult'

// Curtas de propósito: o espaço ao lado da logo na sidebar é pequeno.
const STATIC_SUBTITLES: Record<string, string> = {
  '/': 'Visão geral',
  '/competitions': 'Copas e finais',
  '/friendlies': 'Fichas e ranking',
  '/scouting': 'Olheiros e base',
  '/squad': 'Time e formação',
  '/history': 'Partidas realizadas',
  '/club': 'Estrutura e finanças'
}

/** Descrição curta que acompanha o título da página (sidebar e header mobile). */
export function usePageSubtitle() {
  const route = useRoute()
  const league = useLeagueStore()
  const match = useMatchStore()

  const subtitle = computed(() => {
    const p = route.path
    if (p === '/league') return league.currentStageLabel.replace(/^Série \w+ — /, '')
    if (p === '/pre-match' || p === '/match') return COMPETITION_NAMES[match.activeMatchCompetition]
    if (p.startsWith('/history/')) return 'Detalhe do jogo'
    return STATIC_SUBTITLES[p] ?? ''
  })

  return { subtitle }
}

import { computed } from 'vue'
import { router } from '@/router'
import type { FriendlyQuote } from '@/types/friendlies'
import { useFriendliesStore } from '@/stores/friendlies'
import { useClubStore } from '@/stores/club'
import { useMatchStore } from '@/stores/match'
import { useSquadStore } from '@/stores/squad'
import { useUiStore } from '@/stores/ui'
import { formatTokenCountdown } from '@/utils/friendlies/tokens'
import { rankBonus } from '@/utils/friendlies/draw'
import { usePersistence } from './usePersistence'
import { useMatchSimulation } from './useMatchSimulation'

const ELIGIBLE_NEEDED = 11
const NO_DRAWS = 'Sem sorteios restantes: escolha um dos 3 adversários.'

/** Orquestra a tela de amistosos: store + pré-jogo + toasts + save. */
export function useFriendlies() {
  const friendlies = useFriendliesStore()
  const club = useClubStore()
  const match = useMatchStore()
  const squad = useSquadStore()
  const ui = useUiStore()
  const { saveGame } = usePersistence()
  const { prepareMatch, friendlyLiveBlock } = useMatchSimulation()

  /** OVER efetivo do amistoso: max(escalação atual, melhor elegível), energia 100, sem arredondar (spec §6). É o do apito. */
  const userOver = computed(() => squad.friendlyStrength.over)
  const isLive = computed(() => match.isCompetitionLive('friendly'))
  /** Partida de outra competição ao vivo: amistoso não começa (spec §2.11). Sortear continua livre. */
  const liveBlock = computed(() => friendlyLiveBlock())
  const currentRankBonus = computed(() => rankBonus(friendlies.rank))
  /** Cotação de cada opção com o OVER atual (estimativa: o apito recalcula com o OVER do time que vai a campo). */
  const quotes = computed<Record<string, FriendlyQuote>>(() =>
    Object.fromEntries((friendlies.options ?? []).map((o) => [o.botId, friendlies.quote(o, userOver.value, club.clubNow)]))
  )
  const nextTokenIn = computed(() => formatTokenCountdown(friendlies.msToNext))
  const challengeBlock = computed<string | null>(() => {
    if (isLive.value) return 'Há um amistoso em andamento.'
    if (squad.friendlyEligibleCount < ELIGIBLE_NEEDED) return 'São precisos 11 atletas sem lesão e sem suspensão.'
    return null
  })

  /** Ao abrir a tela: fichas em dia e ranking dos bots simulado até agora (sem timer em segundo plano). */
  function open() {
    const now = Date.now()
    friendlies.regenTokens(now)
    friendlies.refresh(now)
    saveGame()
  }

  function runDraw(): boolean {
    if (!friendlies.draw()) {
      ui.showToast(NO_DRAWS, 'warning')
      return false
    }
    saveGame()
    return true
  }

  /** "Desafiar": com opções salvas, não sorteia (devolve false); senão faz o 1º sorteio. true = sorteou (a tela anima). */
  function challenge(): boolean {
    if (challengeBlock.value) {
      ui.showToast(challengeBlock.value, 'warning')
      return false
    }
    if (friendlies.options) return false
    return runDraw()
  }

  /** "Re-sortear": consome 1 dos 3 sorteios do desafio. */
  function redraw(): boolean {
    if (challengeBlock.value) {
      ui.showToast(challengeBlock.value, 'warning')
      return false
    }
    if (friendlies.drawsLeft <= 0) {
      ui.showToast(NO_DRAWS, 'warning')
      return false
    }
    return runDraw()
  }

  function watchLive() {
    match.activeMatchCompetition = 'friendly'
    router.push('/match')
  }

  /** "Jogar": escolhe a opção e abre o pré-jogo. A ficha só é gasta no apito inicial. */
  function play(botId: string) {
    if (isLive.value) {
      watchLive()
      return
    }
    if (liveBlock.value) {
      ui.showToast(liveBlock.value, 'warning')
      return
    }
    if (friendlies.tokens < 1) {
      ui.showToast(`Sem fichas. Próxima em ${nextTokenIn.value}.`, 'warning')
      return
    }
    if (!friendlies.select(botId)) return
    saveGame()
    prepareMatch('friendly')
  }

  return { userOver, isLive, liveBlock, currentRankBonus, quotes, nextTokenIn, challengeBlock, open, challenge, redraw, play, watchLive }
}

import type { FriendlyBot, FriendlyOpponentProvider } from '@/types/friendlies'
import type { Rng } from '@/utils/core/random'
import { applyFame } from './fame'
import { drawOptions } from './draw'
import { addResult } from './ranking'
import { rankingView, simulateBots } from './bots'

/** Acesso ao estado dos bots guardado na store (a store continua dona do estado reativo e do save). */
export interface LocalBotState {
  getBots(): FriendlyBot[]
  setBots(bots: FriendlyBot[]): void
  getSimAt(): number
  setSimAt(t: number): void
  /** Sorteio da simulação do ranking (na store: Math.random). Contrato [0, 1). */
  rng: Rng
}

/** Adversários simulados localmente. Para jogadores reais no futuro, troca-se por um provedor remoto. */
export function createLocalBotProvider(state: LocalBotState): FriendlyOpponentProvider {
  return {
    refresh(now) {
      const cur = state.getBots()
      const simAt = state.getSimAt()
      const r = simulateBots(cur, simAt, now, state.rng)
      // Só grava o que mudou: sem passo a dar, nada reativo dispara.
      if (r.bots !== cur) state.setBots(r.bots)
      if (r.simAt !== simAt) state.setSimAt(r.simAt)
    },
    ranking(user) {
      // O nome do usuário é trocado pelo nome do clube na tela (FriendlyRanking).
      return rankingView(state.getBots(), { name: 'Você', ...user })
    },
    drawOptions(ctx, rng) {
      return drawOptions({ ...ctx, bots: state.getBots() }, rng)
    },
    reportResult(botId, result) {
      // Soma zero: o bot recebe o oposto do que o usuário EFETIVAMENTE ganhou ou perdeu, e o jogo espelhado.
      state.setBots(
        state
          .getBots()
          .map((b) =>
            b.id === botId ? { ...b, fame: applyFame(b.fame, -result.userFameDelta), stats: addResult(b.stats, result.oppScore, result.userScore) } : b
          )
      )
    }
  }
}

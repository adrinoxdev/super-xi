import type { FriendlyBot, FriendlyOpponentProvider } from '@/types/friendlies'
import type { Rng } from '@/utils/core/random'
import { applyFame } from './fame'
import { drawOptions } from './draw'
import { rankingView, simulateBots } from './bots'

/** Acesso ao estado dos bots guardado na store (a store continua dona do estado reativo e do save). */
export interface LocalBotState {
  getBots(): FriendlyBot[]
  setBots(bots: FriendlyBot[]): void
  getSimAt(): number
  setSimAt(t: number): void
  /** Sorteio da simulação do ranking (na store: Math.random). */
  rng: Rng
}

/** Adversários simulados localmente. Para jogadores reais no futuro, troca-se por um provedor remoto. */
export function createLocalBotProvider(state: LocalBotState): FriendlyOpponentProvider {
  return {
    refresh(now) {
      const r = simulateBots(state.getBots(), state.getSimAt(), now, state.rng)
      state.setBots(r.bots)
      state.setSimAt(r.simAt)
    },
    ranking(userFame) {
      // O nome do usuário é trocado pelo nome do clube na tela (FriendlyRanking).
      return rankingView(state.getBots(), { name: 'Você', fame: userFame })
    },
    drawOptions(ctx, rng) {
      return drawOptions({ ...ctx, bots: state.getBots() }, rng)
    },
    reportResult(botId, userFameDelta) {
      state.setBots(state.getBots().map((b) => (b.id === botId ? { ...b, fame: applyFame(b.fame, -userFameDelta) } : b)))
    }
  }
}

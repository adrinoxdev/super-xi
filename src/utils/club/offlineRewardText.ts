export interface OfflineTextCtx {
  clubName: string
  hours: number
  seed: number
}

type Variant = (c: { club: string; t: string }) => { title: string; message: string }

const VARIANTS: Variant[] = [
  ({ club, t }) => ({ title: 'Bônus do patrocinador', message: `O patrocinador exclusivo do ${club} ficou tão feliz com a exposição da marca que mandou um bônus. Foram ${t} de vitrine.` }),
  ({ club, t }) => ({ title: 'Elenco em ação de marketing', message: `Enquanto você estava fora, o elenco do ${club} gravou um comercial em ${t}. Ninguém decorou a fala, mas a verba entrou.` }),
  ({ club, t }) => ({ title: 'Vaquinha da torcida', message: `A torcida organizada fez uma vaquinha para o ${club}. Em ${t}, juntou até o dinheiro do troco da pipoca.` }),
  ({ club, t }) => ({ title: 'Camisas esgotadas', message: `A loja do ${club} bateu recorde de vendas. Em ${t}, a camisa nova voou das prateleiras.` }),
  ({ club, t }) => ({ title: 'Tour pelo estádio', message: `Excursões lotaram a visita ao estádio do ${club} por ${t}. O guia já está rouco de tanto contar a história do clube.` }),
  ({ club, t }) => ({ title: 'Sócio-torcedor em alta', message: `A campanha de sócio-torcedor do ${club} deu certo: em ${t}, a fila de adesões deu a volta no quarteirão.` }),
  ({ club, t }) => ({ title: 'Lanchonete lotada', message: `O bar do estádio do ${club} vendeu pastel como nunca em ${t}. A diretoria jura que não tem nada a ver com o jogo.` }),
  ({ club, t }) => ({ title: 'Clínica de futebol', message: `Um dos craques do ${club} apareceu numa clínica infantil durante ${t}. A criançada saiu feliz e o caixa também.` }),
  ({ club, t }) => ({ title: 'Doação de um torcedor ilustre', message: `Um torcedor rico do ${club} ouviu dizer que o time estava bem e abriu a carteira. A ausência de ${t} rendeu isso.` }),
  ({ club, t }) => ({ title: 'Direitos de imagem', message: `Um vídeo do ${club} viralizou durante ${t} e as visualizações viraram receita de publicidade.` })
]

/** Duração em português: "40 min", "1h", "6h30". */
export function formatAbsence(hours: number): string {
  const totalMin = Math.max(1, Math.round(hours * 60))
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

/** Texto determinístico: o mesmo seed (ex.: lastActiveAt) sempre dá a mesma variação. */
export function offlineRewardText(ctx: OfflineTextCtx): { title: string; message: string } {
  const idx = Math.abs(Math.floor(ctx.seed)) % VARIANTS.length
  const base = VARIANTS[idx]({ club: ctx.clubName, t: formatAbsence(ctx.hours) })
  const tail = ctx.hours < 1 ? ' Foi rápido, mas rendeu.' : ctx.hours >= 8 ? ' Uma ausência longa e lucrativa.' : ''
  return { title: base.title, message: base.message + tail }
}

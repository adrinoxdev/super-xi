// Narração da partida: neutra e simétrica. Nenhuma frase usa "nosso", "rival" ou "adversário"; os dois times são
// chamados pelo nome e os mesmos modelos valem para os dois lados. Jogadas só têm nome quando o jogo conhece o atleta
// (elenco do usuário); sem nome, o autor da jogada é o clube. Nomes de clube entram sem artigo ("para Nova Santa Rita")
// porque o gênero do clube varia.

// Memória deslizante das últimas frases (vale para todas as partidas simultâneas): uma frase só volta depois de
// RECENT_MEMORY outras, em vez de esgotar o repertório e repetir sempre as mesmas.
const RECENT_MEMORY = 24
const recentLines: string[] = []

/** Esquece as frases recentes (início de uma nova partida). */
export function resetNarration(): void {
  recentLines.length = 0
}

function pick(lines: string[]): string {
  // Se o repertório for menor que a memória, só evita as mais recentes.
  const window = recentLines.slice(-Math.min(RECENT_MEMORY, Math.max(1, lines.length - 1)))
  let pool = lines.filter((l) => !window.includes(l))
  if (!pool.length) pool = lines
  const line = pool[Math.floor(Math.random() * pool.length)]
  recentLines.push(line)
  if (recentLines.length > RECENT_MEMORY * 2) recentLines.splice(0, RECENT_MEMORY)
  return line
}

export function goalLine(team: string, scorer?: string): string {
  return scorer
    ? pick([
        `GOL! ${scorer} marca para ${team}.`,
        `Bola na rede! ${scorer} balança as redes para ${team}.`,
        `${scorer} finaliza e é gol de ${team}.`,
        `${scorer} não perdoa e abre o placar de ${team} no lance!`,
        `É dele! ${scorer} manda para o fundo da rede e ${team} comemora.`,
        `Que finalização de ${scorer}! O goleiro nem se mexe: gol de ${team}.`,
        `${scorer} aparece livre na área e ${team} converte.`
      ])
    : pick([
        `GOL! ${team} marca.`,
        `Bola na rede para ${team}!`,
        `Gol de ${team}: a finalização entra.`,
        `${team} encontra o caminho e balança as redes!`,
        `Tabela rápida e ${team} termina a jogada com gol.`,
        `Sem chance para o goleiro: gol de ${team}.`
      ])
}

/** Frase completa da defesa: usa o nome do goleiro quando o jogo o conhece. */
export function keeperDefends(keeper: string | undefined, team: string): string {
  return keeper ? `${keeper} defende` : `O goleiro de ${team} defende`
}

export function savedLine(attacker: string, shooter: string | undefined, keeperPhrase: string): string {
  const who = shooter ?? attacker
  return pick([
    `${who} finaliza no alvo. ${keeperPhrase}.`,
    `Chute na direção do gol! ${keeperPhrase}.`,
    `Finalização de ${who} no alvo. ${keeperPhrase}.`,
    `${who} bate firme, mas ${keeperPhrase.charAt(0).toLowerCase() + keeperPhrase.slice(1)}.`,
    `Perigo! ${who} arrisca e ${keeperPhrase.charAt(0).toLowerCase() + keeperPhrase.slice(1)}.`,
    `Quase! ${who} testa o goleiro. ${keeperPhrase}.`
  ])
}

export function offTargetLine(team: string, shooter?: string): string {
  const who = shooter ?? team
  return pick([
    `${who} tenta de longe e a bola passa fora.`,
    `Finalização de ${who} sai para fora.`,
    `${who} chuta, mas sem direção de gol.`,
    `A bola de ${who} passa raspando a trave.`,
    `${who} se apressa na conclusão e manda por cima do gol.`,
    `Chute torto de ${who}, sem perigo.`
  ])
}

export function cornerLine(team: string): string {
  return pick([
    `Escanteio para ${team}.`,
    `${team} ganha um escanteio.`,
    `Bola desviada na defesa: escanteio para ${team}.`,
    `${team} pressiona e força o córner.`,
    `Cruzamento cortado em cima da linha: escanteio de ${team}.`
  ])
}

export function halfTimeLine(a: string, b: string, scoreA: number, scoreB: number): string {
  return `Começa o segundo tempo. Primeiro tempo terminou ${a} ${scoreA} x ${scoreB} ${b}.`
}

export function fullTimeLine(a: string, b: string, scoreA: number, scoreB: number): string {
  return `Fim de jogo: ${a} ${scoreA} x ${scoreB} ${b}.`
}

export interface CommentCtx {
  minute: number
  user: string
  opp: string
  possession: number
  userShots: number
  oppShots: number
  userOnTarget: number
  oppOnTarget: number
  userCorners: number
  oppCorners: number
  userScore: number
  oppScore: number
  /** Nome de um titular do usuário (qualquer posição de linha), para dar rosto ao lance. */
  userPlayer?: string
  /** Titular do usuário com energia abaixo de 60. */
  tired?: { name: string; stamina: number }
  /** Titular do usuário em campo lesionado. */
  injuredOnPitch?: string
}

// Narração de jogo corrido: cada frase descreve o que está acontecendo agora, a partir de posse, chutes, placar,
// fase da partida e atletas conhecidos. Sempre neutra: os dois clubes são tratados do mesmo jeito.

function possessionLines(team: string, other: string, strong: boolean): string[] {
  const base = [
    `${team} troca passes com paciência e procura espaço.`,
    `${team} mantém a bola no pé e empurra ${other} para trás.`,
    `${team} circula a bola de um lado para o outro, esperando a brecha.`,
    `${other} se fecha e ${team} tenta abrir a defesa pelas laterais.`,
    `${team} sobe as linhas e pressiona a saída de bola de ${other}.`,
    `${team} inverte o jogo para a ponta e ${other} precisa se reposicionar.`,
    `Toque de primeira de ${team}, que ganha campo com a posse.`,
    `${other} recua o time e deixa ${team} com a bola.`,
    `${team} varia a jogada, procura o pivô e recomeça pelo meio.`
  ]
  if (strong) base.push(`${team} domina o meio-campo e quase não deixa ${other} respirar.`, `Jogo no campo de ataque de ${team}: ${other} só se defende.`)
  return base
}

function balancedLines(a: string, b: string): string[] {
  return [
    `Jogo equilibrado no meio-campo, ${a} e ${b} disputam cada bola dividida.`,
    `Disputa forte no meio: a posse muda de mãos a cada lance.`,
    `${a} e ${b} se estudam, sem espaço para contra-ataque.`,
    `Bola alta, zagueiro afasta e o jogo segue truncado entre ${a} e ${b}.`,
    `Falta no meio-campo, o árbitro marca e a partida é reiniciada.`,
    `Lateral para ${Math.random() < 0.5 ? a : b}, e a bola volta a rolar.`,
    `Tiro de meta, a defesa recomeça a jogada.`,
    `Time se reorganiza atrás da linha da bola, sem pressa.`,
    `Chutão para o ataque, o zagueiro domina e acalma o jogo.`,
    `Torcida se manifesta e a bola volta a ficar no meio-campo.`,
    `Substituições sendo preparadas nos dois bancos de reservas.`,
    `Falta dura em ${Math.random() < 0.5 ? a : b}, o árbitro conversa com os jogadores.`,
    `Bola recuada para o goleiro, que reinicia a jogada com calma.`,
    `${a} tenta o contra-ataque, mas ${b} fecha bem os espaços.`
  ]
}

function pressureLines(team: string, other: string): string[] {
  return [
    `${team} pressiona e cria perigo: ${other} está acuado na própria área.`,
    `Cruzamento de ${team} na área, a zaga de ${other} afasta com dificuldade.`,
    `${team} chega com mais gente ao ataque e ${other} só consegue rebater.`,
    `Bola rebatida na entrada da área e ${team} segue em cima de ${other}.`,
    `${other} não consegue sair: ${team} reconquista a bola logo após a perda.`
  ]
}

export function commentLine(c: CommentCtx): string {
  const lines: string[] = []
  const userPoss = c.possession
  const lead = c.userScore - c.oppScore
  const late = c.minute >= 70
  const early = c.minute <= 12

  // Quem manda no jogo.
  if (userPoss >= 56) lines.push(...possessionLines(c.user, c.opp, userPoss >= 62))
  else if (userPoss <= 44) lines.push(...possessionLines(c.opp, c.user, userPoss <= 38))
  else lines.push(...balancedLines(c.user, c.opp))

  // Volume de finalizações.
  if (c.userShots >= c.oppShots + 3) lines.push(...pressureLines(c.user, c.opp))
  if (c.oppShots >= c.userShots + 3) lines.push(...pressureLines(c.opp, c.user))

  // Atletas conhecidos (elenco do usuário) em ação.
  if (c.userPlayer) {
    lines.push(
      `${c.userPlayer} recebe, levanta a cabeça e procura o companheiro livre.`,
      `${c.userPlayer} ganha a disputa e toca para ${c.user} sair jogando.`,
      `${c.userPlayer} acompanha o lance e fecha o espaço.`,
      `${c.userPlayer} tenta o drible e é desarmado, a bola sobra para ${c.opp}.`,
      `${c.userPlayer} pede a bola e organiza a saída de ${c.user}.`,
      `${c.userPlayer} cai pela direita e levanta a bola na área.`
    )
  }
  if (c.tired) lines.push(`${c.tired.name} já mostra cansaço e perde um pouco de velocidade na jogada.`)
  if (c.injuredOnPitch) lines.push(`${c.injuredOnPitch} joga com desconforto e evita as divididas mais fortes.`)

  // Fase da partida.
  if (early) {
    lines.push(`Início de jogo estudado: ${c.user} e ${c.opp} ainda se acomodam em campo.`, `Os primeiros minutos são de reconhecimento, com a bola rodando sem risco.`)
  }
  if (c.minute >= 40 && c.minute <= 46) lines.push(`O primeiro tempo se aproxima do fim e o ritmo cai um pouco.`)
  if (late) lines.push(`Reta final: o cansaço pesa e as jogadas ficam mais abertas.`, `Os minutos finais chegam e a bola passa a queimar nos pés.`)

  // Placar.
  if (late && lead > 0) lines.push(`${c.user} administra a vantagem, segurando a bola e cadenciando o jogo.`, `${c.opp} avança em busca do empate e deixa espaço atrás.`)
  if (late && lead < 0) lines.push(`${c.opp} administra a vantagem, segurando a bola e cadenciando o jogo.`, `${c.user} avança em busca do empate e deixa espaço atrás.`)
  if (late && lead === 0) lines.push(`Placar empatado: qualquer erro agora pode decidir o jogo.`)
  if (c.minute > 12 && c.userShots + c.oppShots === 0) lines.push(`Ainda nenhuma finalização na partida, as defesas estão muito bem postadas.`)

  return pick(lines)
}

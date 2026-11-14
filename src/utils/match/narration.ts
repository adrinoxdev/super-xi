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

export function goalLine(team: string, scorer?: string, assist?: string): string {
  if (scorer && assist) {
    return pick([
      `GOL! ${scorer} marca para ${team}, em passe de ${assist}.`,
      `${assist} enxerga o companheiro e ${scorer} só empurra para a rede: gol de ${team}!`,
      `Assistência de ${assist}, finalização de ${scorer} e ${team} balança as redes.`,
      `${assist} cruza na medida e ${scorer} completa para o gol de ${team}.`,
      `Bela troca de passes: ${assist} serve ${scorer}, que não perdoa. Gol de ${team}!`
    ])
  }
  return scorer
    ? pick([
        `GOL! ${scorer} marca para ${team}.`,
        `Bola na rede! ${scorer} balança as redes para ${team}.`,
        `${scorer} finaliza e é gol de ${team}.`,
        `${scorer} não perdoa: finalização certeira e gol de ${team}!`,
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

export function yellowCardLine(team: string, player?: string): string {
  return player
    ? pick([
        `Cartão amarelo para ${player}, de ${team}, após falta dura.`,
        `${player} entra atrasado no lance e recebe o amarelo.`,
        `O árbitro adverte ${player} (${team}) com cartão amarelo.`,
        `Falta de ${player} e cartão amarelo para ${team}.`
      ])
    : pick([
        `Cartão amarelo para um jogador de ${team}.`,
        `O árbitro mostra o amarelo para ${team} após a falta.`,
        `${team} reclama, mas o árbitro aplica o cartão amarelo.`
      ])
}

export function redCardLine(team: string, player: string | undefined, secondYellow: boolean): string {
  const who = player ?? `um jogador de ${team}`
  return secondYellow
    ? pick([
        `Segundo amarelo e ${who} é expulso! ${team} fica com um a menos.`,
        `${who} leva o segundo amarelo e vai para o chuveiro mais cedo.`
      ])
    : pick([
        `Cartão vermelho direto para ${who}! ${team} fica com um a menos.`,
        `Entrada violenta e o árbitro expulsa ${who} (${team}).`
      ])
}

export function throwInLine(team: string, player?: string): string {
  return pick([
    `Lateral longo de ${team} para dentro da área, a defesa afasta.`,
    `${player ? `${player} repõe` : `${team} repõe`} a bola com as mãos e o time sobe para o ataque.`,
    `Lateral para ${team} perto da área: jogada ensaiada com a bola alta.`,
    `${team} cobra o lateral rápido e pega a defesa desatenta.`
  ])
}

export function offsideLine(team: string, player?: string): string {
  const who = player ?? `Atacante de ${team}`
  return pick([
    `Bandeira levantada! ${who} estava em posição de impedimento.`,
    `Impedimento marcado: ${who} se antecipou e a jogada de ${team} é anulada.`,
    `O auxiliar levanta a bandeira e anula o lance de ${team}: impedimento de ${who}.`,
    `${who} parte livre, mas o assistente aponta impedimento. Jogada de ${team} invalidada.`
  ])
}

export function freeKickLine(team: string, taker?: string): string {
  const who = taker ? `${taker} ajeita a bola` : `${team} posiciona a bola`
  return pick([
    `Falta perigosa perto da área! ${who} para a cobrança.`,
    `Falta na entrada da área e ${team} tem uma boa chance: ${who}.`,
    `Bola parada de ${team} em posição de perigo. ${who}.`
  ])
}

export type FreeKickResult = 'saved' | 'wall' | 'post' | 'over'

export function freeKickResultLine(kind: FreeKickResult, team: string, taker: string | undefined, keeperPhrase: string): string {
  const who = taker ?? team
  const k = keeperPhrase.charAt(0).toLowerCase() + keeperPhrase.slice(1)
  if (kind === 'saved') return pick([`${who} cobra firme e ${k}.`, `Cobrança de ${who} no canto, mas ${k}.`])
  if (kind === 'wall') return pick([`${who} bate e a bola explode na barreira.`, `A barreira se joga e bloqueia a cobrança de ${who}.`])
  if (kind === 'post') return pick([`${who} cobra e acerta a trave! Quase!`, `Bola na trave! A cobrança de ${who} passa a centímetros do gol.`])
  return pick([`${who} bate por cima do gol, sem perigo.`, `A cobrança de ${who} sai muito alta.`])
}

export function postLine(team: string, shooter?: string): string {
  const who = shooter ?? team
  return pick([
    `${who} bate colocado e a bola explode na trave!`,
    `Na trave! ${who} quase abre o caminho para ${team}.`,
    `O travessão salva a defesa: a finalização de ${who} bate e sai.`
  ])
}

export function postReaction(): string {
  return pick([
    `Foi por muito pouco: um centímetro e era gol.`,
    `A bola até tremeu a rede por fora. Lance de muita sorte para a defesa.`,
    `Esse tipo de lance pode pesar no fim do jogo.`
  ])
}

export function brawlLine(a: string, b: string): string {
  return pick([
    `Confusão! Jogadores de ${a} e ${b} se empurram depois de uma dividida mais forte.`,
    `Os ânimos se acirram: tumulto no meio-campo entre ${a} e ${b}.`,
    `Empurra-empurra generalizado! ${a} e ${b} se desentendem e o árbitro corre para separar.`
  ])
}

export function brawlCalmLine(): string {
  return pick([
    `O árbitro acalma os ânimos e conversa com os capitães, sem aplicar cartões.`,
    `Os jogadores são separados e o jogo recomeça, sem punições.`
  ])
}

export function brawlReaction(): string {
  return pick([
    `Não pode acontecer isso: o jogo precisa de cabeça fria dos dois lados.`,
    `A tensão estava no ar desde o começo, e a arbitragem tem que ter pulso firme.`,
    `Briga não ajuda ninguém, e quem perde a cabeça costuma pagar caro mais tarde.`
  ])
}

export function freeKickGoalLine(team: string, taker?: string): string {
  const who = taker ?? team
  return pick([
    `GOLAÇO de falta! ${who} bate com categoria, a bola contorna a barreira e entra: gol de ${team}!`,
    `${who} cobra a falta no ângulo e o goleiro só olha. Gol de ${team}!`,
    `Que cobrança! ${who} acerta o canto e ${team} marca de bola parada.`
  ])
}

/** `own`: time do jogador que marcou contra; `beneficiary`: quem ganha o gol. */
export function ownGoalLine(own: string, beneficiary: string, player?: string): string {
  const who = player ?? `Um defensor de ${own}`
  return pick([
    `GOL CONTRA! ${who} tenta cortar o cruzamento e manda para a própria rede. ${beneficiary} marca sem tocar na bola.`,
    `Falha fatal: ${who} desvia a bola contra o próprio gol e ${beneficiary} abre vantagem de graça.`,
    `Gol contra de ${who}! A bola bate no defensor, engana o goleiro e entra. Gol para ${beneficiary}.`
  ])
}

/** Pênalti marcado por toque de mão. `offender` é o defensor que cometeu a falta, se conhecido. */
export function penaltyHandballLine(team: string, taker?: string, offender?: string): string {
  const who = offender ? `na mão de ${offender}` : 'no braço de um defensor'
  const go = taker ? ` ${taker} vai para a bola.` : ''
  return pick([
    `PÊNALTI para ${team}! A bola bate ${who} dentro da área e o árbitro aponta a marca da cal.${go}`,
    `Toque de mão na área! A bola acerta o braço ${offender ? `de ${offender}` : 'do defensor'} e é pênalti para ${team}.${go}`,
    `O árbitro marca pênalti: bola ${who}, braço aberto. ${team} ganha a cobrança.${go}`
  ])
}

export function stoppageLine(minutes: number): string {
  return pick([
    `O quarto árbitro levanta a placa: ${minutes} minutos de acréscimo.`,
    `São ${minutes} minutos de acréscimos para o final do jogo.`,
    `Acréscimos: o árbitro indica ${minutes} minutos.`
  ])
}

export function gkSubLine(team: string, out: string, keeper: string): string {
  return `Sem goleiro por causa da expulsão, o técnico do ${team} sacrifica ${out} e coloca ${keeper} no gol.`
}

export function gkEmergencyLine(team: string, player: string): string {
  return pick([
    `Sem goleiro reserva ou sem substituições, ${player} veste as luvas e vai para o gol do ${team}.`,
    `${player} assume o gol do ${team} depois da expulsão do goleiro: jogador de linha embaixo das traves.`
  ])
}

export function oppKeeperOffLine(team: string): string {
  return pick([
    `Era o goleiro! ${team} fica sem o titular e coloca um jogador de linha para vestir as luvas.`,
    `O expulso é o goleiro do ${team}: o time precisa reorganizar o gol às pressas.`
  ])
}

export function reorganizeLine(team: string, formation: string, players: number, before: number, after: number): string {
  const num = players < 11 ? ` com ${players} jogadores` : ''
  return `Reorganização tática no ${team}: o time passa a jogar no ${formation}${num} (força ${before.toFixed(1)} → ${after.toFixed(1)}).`
}

export function halfTimeLine(a: string, b: string, scoreA: number, scoreB: number): string {
  return `Começa o segundo tempo. Primeiro tempo terminou ${a} ${scoreA} x ${scoreB} ${b}.`
}

export function fullTimeLine(a: string, b: string, scoreA: number, scoreB: number): string {
  return `Fim de jogo: ${a} ${scoreA} x ${scoreB} ${b}.`
}

// Comentarista: reage a cada lance com uma opinião, sempre a partir do que de fato aconteceu (placar, minuto,
// estatísticas). Voz neutra: os dois clubes recebem o mesmo tratamento.

export interface GoalReactionCtx {
  /** Quem fez o gol. */
  team: string
  other: string
  scorer?: string
  /** Placares já com o gol contado, do ponto de vista de `team`. */
  scoreFor: number
  scoreAgainst: number
  minute: number
}

export function goalReaction(c: GoalReactionCtx): string {
  const { team, other, scorer, scoreFor, scoreAgainst, minute } = c
  const diff = scoreFor - scoreAgainst
  const late = minute >= 80
  const who = scorer ?? team
  let lines: string[]
  if (scoreFor === 1 && scoreAgainst === 0) {
    lines = [
      `${team} foi mais objetivo e abre o placar. Um gol assim muda o roteiro da partida.`,
      `Na minha opinião, o gol estava a caminho: ${team} merecia sair na frente.`,
      `${other} agora precisa sair para o jogo, e isso abre espaços.`
    ]
  } else if (diff === 0) {
    lines = [
      `Empatou! O jogo volta à estaca zero e ${other} vai sentir esse gol.`,
      `${team} não desistiu e busca o empate: o jogo fica aberto de novo.`,
      `Gol de empate e a partida ganha outra cara. Difícil prever o que vem agora.`
    ]
    if (late) lines.push(`Empate nos minutos finais: qualquer descuido agora pode decidir tudo.`)
  } else if (diff === 1 && scoreAgainst > 0) {
    lines = [
      `${team} passa à frente: o jogo ganha uma nova direção.`,
      `${team} passa à frente e deixa ${other} com a obrigação de reagir.`,
      `Gol importante: ${team} coloca a cabeça na frente no placar.`
    ]
    if (late) lines.push(`${team} faz o gol que pode valer a partida, com pouco tempo para ${other} responder.`)
  } else if (diff >= 3) {
    lines = [
      `${team} faz ${scoreFor} e a partida parece resolvida.`,
      `Já é goleada: ${other} perdeu o controle do jogo.`
    ]
  } else if (diff >= 2) {
    lines = [
      `${team} amplia e ganha tranquilidade. ${other} agora precisa de um milagre.`,
      `${who} amplia para ${team}: dois gols de vantagem pesam bastante.`,
      `Placar confortável para ${team}, que passa a controlar o ritmo.`
    ]
    if (late) lines.push(`${team} fecha a conta e o jogo praticamente termina aqui.`)
  } else {
    // ainda atrás no placar
    lines = [
      `${team} diminui, mas ainda está atrás. O gol dá esperança.`,
      `Desconto de ${team}: o jogo ainda está aberto.`
    ]
    if (late) lines.push(`${team} diminui tarde: precisa de pressa para buscar o empate.`)
  }
  return pick(lines)
}

/** `accumulated`: amarelos do jogador na competição já contando este (2 = pendurado, 3 = suspenso no próximo jogo). */
export function yellowReaction(team: string, player: string | undefined, minute: number, accumulated = 1): string {
  if (player && accumulated >= 3) {
    return pick([
      `Terceiro amarelo: ${player} está suspenso e desfalca ${team} no próximo jogo da competição.`,
      `${player} chega ao terceiro amarelo e vai cumprir suspensão. Falta que pode sair cara para ${team}.`
    ])
  }
  if (player && accumulated === 2) {
    return pick([
      `${player} chega ao segundo amarelo na competição e fica pendurado: mais um e está suspenso.`,
      `Atenção para ${player}: pendurado, precisa medir as divididas para não desfalcar ${team}.`
    ])
  }
  const lines = [
    `Cartão justo: foi uma entrada atrasada, o árbitro acertou.`,
    `Pelo que vi, o árbitro foi rigoroso, mas dentro da regra.`,
    `Falta para amarelo mesmo. Precisa ter cuidado para não complicar o time.`
  ]
  if (player) lines.push(`${player} fica pendurado e vai ter que medir as divididas daqui para frente.`)
  if (minute <= 20) lines.push(`Amarelo cedo demais para ${team}: vai ter que se segurar.`)
  return pick(lines)
}

export function redReaction(team: string, other: string, scoreFor: number, scoreAgainst: number, minute: number): string {
  const lines = [`Muda completamente o jogo: ${team} agora tem que se defender com um a menos.`]
  if (scoreFor > scoreAgainst) lines.push(`${team} está na frente, mas o jogo fica bem mais difícil com um a menos.`)
  else if (scoreFor < scoreAgainst) lines.push(`Complicou para ${team}: perdendo e com um jogador a menos.`)
  else lines.push(`Com o jogo empatado, a expulsão pode ser decisiva para ${team}.`)
  lines.push(`${other} vai crescer no jogo e explorar o espaço deixado.`)
  if (minute <= 30) lines.push(`Expulsão cedo demais: ainda sobra muito tempo de jogo com um a menos.`)
  return pick(lines)
}

export function penaltyAwardReaction(team: string): string {
  return pick([
    `Pênalti claro, não tinha como o defensor evitar o contato.`,
    `Lance duro para a defesa: o árbitro marcou sem hesitar.`,
    `Decisão importante para ${team}: vale uma grande chance de gol.`,
    `Penalidade que pode mudar o jogo. Agora é com o cobrador.`
  ])
}

export function penaltyMissReaction(team: string, scoreFor: number, scoreAgainst: number): string {
  const lines = [
    `Que desperdício: pênalti é para converter, e ${team} deixa passar.`,
    `Isso vai pesar na cabeça de ${team}.`
  ]
  if (scoreFor < scoreAgainst) lines.push(`Perder esse pênalti, ainda atrás no placar, é um golpe duro para ${team}.`)
  if (scoreFor === scoreAgainst) lines.push(`O jogo continua empatado, e o pênalti perdido pode fazer falta no final.`)
  return pick(lines)
}

export function saveReaction(attacker: string, defender: string): string {
  return pick([
    `Grande defesa! ${attacker} fez a parte dele, mas a defesa de ${defender} foi muito boa.`,
    `Lance de muito perigo: ${attacker} precisa melhorar a pontaria nessas chances.`,
    `Foi no alvo e o goleiro de ${defender} respondeu bem. Poderia ter sido gol.`
  ])
}

export interface HalfTimeStats {
  possession: number
  userShots: number
  oppShots: number
}

export function halfTimeReaction(user: string, opp: string, scoreUser: number, scoreOpp: number, st: HalfTimeStats): string {
  const better = st.userShots > st.oppShots + 1 ? user : st.oppShots > st.userShots + 1 ? opp : null
  const sh = `${st.userShots} finalizações para ${user} e ${st.oppShots} para ${opp}`
  if (scoreUser === scoreOpp) {
    return better
      ? `Primeiro tempo empatado, mas ${better} foi superior: ${sh}. Merece mais do que o placar mostra.`
      : `Primeiro tempo equilibrado, sem favorito claro (${sh}). O segundo tempo promete.`
  }
  const leader = scoreUser > scoreOpp ? user : opp
  const trailing = leader === user ? opp : user
  return better && better !== leader
    ? `${leader} vence o intervalo, mas ${better} criou mais (${sh}). ${trailing} tem motivos para acreditar.`
    : `${leader} vai para o intervalo na frente e ${trailing} precisa reagir logo no começo do segundo tempo.`
}

export function fullTimeReaction(user: string, opp: string, scoreUser: number, scoreOpp: number, st: HalfTimeStats): string {
  const sh = `${st.userShots} a ${st.oppShots} em finalizações`
  if (scoreUser === scoreOpp) {
    return `Empate justo no fim das contas (${sh}). Cada time tem seus motivos para lamentar e para comemorar.`
  }
  const winner = scoreUser > scoreOpp ? user : opp
  const winnerShots = winner === user ? st.userShots : st.oppShots
  const loserShots = winner === user ? st.oppShots : st.userShots
  return winnerShots >= loserShots
    ? `Vitória justa de ${winner}: foi melhor no jogo (${sh}) e levou o resultado.`
    : `${winner} venceu pelo resultado, apesar de ter finalizado menos (${sh}). Foi eficiente quando precisou.`
}

/** Pênalti marcado em jogo: `team` é quem cobra. */
export function penaltyAwardLine(team: string, taker?: string): string {
  const who = taker ? ` ${taker} vai para a bola.` : ''
  return pick([
    `PÊNALTI para ${team}! O árbitro aponta a marca da cal.${who}`,
    `O árbitro marca pênalti a favor de ${team}!${who}`,
    `Falta dentro da área e é pênalti para ${team}!${who}`,
    `Pênalti! ${team} ganha a chance de cobrar da marca da cal.${who}`
  ])
}

export function penaltyMissLine(team: string, taker: string | undefined, keeperPhrase: string, wide: boolean): string {
  const who = taker ?? team
  return wide
    ? pick([
        `${who} bate para fora! Desperdiça o pênalti para ${team}.`,
        `Isolou! ${who} chuta por cima do gol e perde a cobrança.`,
        `${who} manda na trave! O pênalti não entra.`
      ])
    : pick([
        `${who} cobra e ${keeperPhrase.charAt(0).toLowerCase() + keeperPhrase.slice(1)}! Pênalti perdido.`,
        `Cobrança de ${who} no canto, mas ${keeperPhrase.charAt(0).toLowerCase() + keeperPhrase.slice(1)}.`
      ])
}

export function shootoutStartLine(a: string, b: string, scoreA: number, scoreB: number): string {
  return `Empate em ${scoreA} x ${scoreB} no tempo normal: ${a} e ${b} vão decidir a vaga nos pênaltis!`
}

export function shootoutKickLine(team: string, taker: string | undefined, scored: boolean, userGoals: number, oppGoals: number, userName: string, oppName: string): string {
  const who = taker ?? team
  const placar = `${userName} ${userGoals} x ${oppGoals} ${oppName}`
  return scored
    ? pick([`${who} converte para ${team}. ${placar} nos pênaltis.`, `Gol! ${who} não treme e marca para ${team}. ${placar}.`])
    : pick([`${who} desperdiça a cobrança de ${team}! ${placar} nos pênaltis.`, `Perdeu! ${who} erra para ${team}. ${placar}.`])
}

export function shootoutEndLine(winner: string, userGoals: number, oppGoals: number): string {
  return `Fim da disputa: ${winner} vence nos pênaltis por ${Math.max(userGoals, oppGoals)} x ${Math.min(userGoals, oppGoals)} e avança!`
}

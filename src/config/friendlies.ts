/** Amistosos: todos os números da modalidade (spec docs/superpowers/specs/2026-11-19-amistosos-design.md, seção 6). */
/**
 * Só leitura em profundidade, no tipo. Os números continuam `number`: com `as const` virariam literais (`15`, `5`…)
 * e contas como `let size = rankWindow; size += grow` deixariam de compilar.
 */
type DeepReadonly<T> = { readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K] }

const config = {
  tokens: { max: 10, msPerToken: 6 * 60 * 1000, initial: 10 },
  bots: {
    count: 100,
    fameTop: 1800,
    fameCurve: 1.6,
    fameJitter: 20,
    fameMinStart: 10,
    overMin: 48,
    overSpan: 40,
    overJitter: 4,
    overFloor: 40,
    overCeil: 92,
    simStepMs: 60 * 60 * 1000,
    simMaxSteps: 72,
    simNoise: 6,
    simPull: 0.03,
    /** Passo simulado com |Δ de fama| até este valor conta como empate (≈ 22% dos jogos). */
    simDrawBand: 1,
    /** Gols do vencedor num passo simulado: 1..simWinGoalsMax; o perdedor faz menos. */
    simWinGoalsMax: 4,
    /** Gols de cada lado num empate simulado: 0..simDrawGoalsMax. */
    simDrawGoalsMax: 2
  },
  draw: {
    spread: 5,
    rankBonusMax: 6,
    rankBonusTop: 10,
    rankBonusFrom: 50,
    overMin: 35,
    overMax: 99,
    rankWindow: 15,
    rankWindowGrow: 5,
    options: 3,
    maxDraws: 3
  },
  prize: { base: 8000, refOver: 50, perOver: 500, min: 8000, max: 25000, step: 500, paidWinsPerDay: 5 },
  fame: { k: 30, scale: 20, minWin: 4, minLoss: 3, drawCap: 6, start: 0 },
  rankingTop: 10,
  recentMax: 20
}

export const FRIENDLIES: DeepReadonly<typeof config> = config

/** Nomes dos bots: prefixo + lugar inventado (sem repetir clube da liga nem clube real). 10 x 20 = 200 combinações. */
export const FRIENDLY_BOT_NAME_PARTS = {
  prefixes: [
    'Atlético',
    'Esporte Clube',
    'União',
    'Grêmio Esportivo',
    'Sociedade Esportiva',
    'Associação',
    'Racing',
    'Sport Club',
    'Real',
    'Independente'
  ],
  places: [
    'Pedra Funda',
    'Vila Aurora',
    'Lagoa Serena',
    'Morro Azul',
    'Campina Alta',
    'Barra do Vento',
    'Ribeira Dourada',
    'Serra Velada',
    'Porto Esmeralda',
    'Vale Sereno',
    'Alto do Ipê',
    'Mata Funda',
    'Cachoeira Mansa',
    'Areia Branca do Sul',
    'Bosque das Garças',
    'Ilha Verde',
    'Pontal da Brisa',
    'Colina Rubra',
    'Várzea Grande do Leste',
    'Recanto do Sabiá'
  ]
}

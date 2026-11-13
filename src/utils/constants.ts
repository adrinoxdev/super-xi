import type { CrestOrientation, CrestPattern, CrestShape, FormationName, MarketStatus, PlayerPosition, ScoutMissionType, StaffKey, TacticalMentality, TrainingFocus } from '../types'
import type { ClubUpgrades } from '../types/club'

export const STORAGE_KEY = 'super_xi_full_save_v7'

export const SCOUTING_LEVELS: Record<number, {
  slots: number
  maxOvr: number
  accuracy: number
  gemChance: number
  timeMult: number
}> = {
  // maxOvr sobe 3 por nível: relatórios saem em [maxOvr-12, maxOvr] (Internacional soma +3/+4).
  // Atletas de 85+ só aparecem a partir do nível 9 e só em missão Internacional.
  1: { slots: 1, maxOvr: 61, accuracy: 0.60, gemChance: 0.06, timeMult: 1.0 },
  2: { slots: 1, maxOvr: 64, accuracy: 0.65, gemChance: 0.08, timeMult: 0.98 },
  3: { slots: 2, maxOvr: 67, accuracy: 0.70, gemChance: 0.10, timeMult: 0.96 },
  4: { slots: 2, maxOvr: 70, accuracy: 0.75, gemChance: 0.12, timeMult: 0.93 },
  5: { slots: 2, maxOvr: 73, accuracy: 0.80, gemChance: 0.15, timeMult: 0.90 },
  6: { slots: 3, maxOvr: 76, accuracy: 0.84, gemChance: 0.18, timeMult: 0.86 },
  7: { slots: 3, maxOvr: 79, accuracy: 0.88, gemChance: 0.21, timeMult: 0.82 },
  8: { slots: 3, maxOvr: 82, accuracy: 0.91, gemChance: 0.25, timeMult: 0.78 },
  9: { slots: 4, maxOvr: 85, accuracy: 0.94, gemChance: 0.29, timeMult: 0.74 },
  10: { slots: 4, maxOvr: 88, accuracy: 0.97, gemChance: 0.33, timeMult: 0.70 }
}

// Nível máximo de cada instalação.
export const FACILITY_MAX_LEVEL: Record<keyof ClubUpgrades, number> = {
  scoutingLevel: 10,
  squadCapacityLevel: 10,
  trainingCenterLevel: 5,
  medicalCenterLevel: 5,
  stadiumLevel: 10,
  financeLevel: 10
}

// Limite máximo absoluto de atletas no elenco (vale para qualquer caminho de entrada).
export const SQUAD_MAX_SIZE = 25

// Começa com 14 vagas (o clube nasce com 11 atletas, sobram 3) e chega a 25 no nível 10 (máximo).
export const SQUAD_CAPACITIES: Record<number, number> = {
  1: 14,
  2: 15,
  3: 16,
  4: 17,
  5: 18,
  6: 19,
  7: 20,
  8: 21,
  9: 23,
  10: 25
}

// Elenco mínimo para vender/dispensar: é preciso manter ao menos um time completo.
export const MIN_SQUAD_SIZE = 11

// Descanso do elenco (Elenco & Tática): o custo dobra a cada uso no dia, sem teto, e volta ao valor inicial na virada do
// dia (meia-noite, horário local). Várias aplicações no mesmo dia ficam proibitivas. energy = pontos de energia
// devolvidos a todo o elenco.
export const REST = { baseCost: 6000, growth: 2, energy: 35 }
// Multiplicador do custo por série (chave = divisão: 4 = D ... 1 = A), na proporção da folha por jogo.
export const REST_SERIES_MULT: Record<number, number> = { 4: 1, 3: 1.3, 2: 2, 1: 2.6 }

/** Custo do próximo descanso: base x série x crescimento^usos no dia, arredondado a R$ 500. Sem teto. */
export function restCost(usesToday: number, division: number): number {
  const raw = REST.baseCost * (REST_SERIES_MULT[division] ?? 1) * Math.pow(REST.growth, usesToday)
  return Math.round(raw / 500) * 500
}

/** Meia-noite (horário local) do dia de um instante, em ms. */
export function dayStart(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Início do dia seguinte (sem somar 24h fixas: respeita horário de verão). */
export function nextDayStart(ts: number): number {
  const d = new Date(dayStart(ts))
  d.setDate(d.getDate() + 1)
  return d.getTime()
}

/** Peneiras na base permitidas por temporada. */
export const MAX_TRYOUTS_PER_SEASON = 3

// Lesões: sorteadas após cada partida entre os titulares. Chance base + extra por cansaço (energia < 60).
export const INJURY = {
  baseChance: 0.015,
  fatigueChance: 0.02,
  severeChance: 0.15,
  lightMatches: [1, 3] as [number, number],
  severeMatches: [4, 8] as [number, number],
  // Redução por nível do Departamento Médico acima do 1 (chance e duração).
  medicalReductionPerLevel: 0.07,
  // Jogar lesionado custa muito overall e agrava a lesão no fim da partida (+jogos fora, até o teto).
  playingInjuredPenalty: 25,
  aggravateMatches: 2,
  aggravateCap: 12,
  // Ticks da simulação ao vivo (2 minutos de jogo cada): a chance por partida é dividida entre eles.
  matchTicks: 45
}

// Custo para subir do nível indicado pelo índice (índice 1 = sair do nível 1). O tamanho do array é o nível máximo.
export const UPGRADE_COSTS: Record<keyof ClubUpgrades, number[]> = {
  scoutingLevel: [0, 70000, 90000, 125000, 175000, 250000, 350000, 750000, 1050000, 1450000],
  squadCapacityLevel: [0, 15000, 23000, 33000, 47000, 68000, 94000, 130000, 178000, 240000],
  trainingCenterLevel: [0, 75000, 145000, 265000, 950000],
  medicalCenterLevel: [0, 70000, 130000, 235000, 900000],
  stadiumLevel: [0, 58000, 80000, 105000, 130000, 175000, 500000, 720000, 1000000, 1450000],
  financeLevel: [0, 58000, 80000, 105000, 130000, 175000, 500000, 720000, 1000000, 1450000]
}

export const SCOUT_MISSIONS: Array<{
  type: ScoutMissionType
  title: string
  cost: number
  durationSec: number
  minLevel: number
  description: string
}> = [
  {
    type: 'local',
    title: 'Scouting Local',
    cost: 8000,
    durationSec: 1800,
    minLevel: 1,
    description: 'Busca rápida na região. Baixo custo para compor elenco.'
  },
  {
    type: 'position',
    title: 'Por Posição',
    cost: 15000,
    durationSec: 7200,
    minLevel: 1,
    description: 'Procura atletas só da posição escolhida abaixo.'
  },
  {
    type: 'youth',
    title: 'Base',
    cost: 18000,
    durationSec: 10800,
    minLevel: 1,
    description: 'Promessas jovens com alto potencial de evolução.'
  },
  {
    type: 'national',
    title: 'Scouting Nacional',
    cost: 36000,
    durationSec: 21600,
    minLevel: 1,
    description: 'Dois talentos das divisões nacionais, com qualidade mais consistente que as buscas básicas.'
  },
  {
    type: 'international',
    title: 'Internacional',
    cost: 55000,
    durationSec: 43200,
    minLevel: 6,
    description: 'Craques estrangeiros com alta chance de Joias Raras.'
  }
]

/**
 * Faixa de OVR dos relatórios de cada missão, relativa ao OVR máximo do nível de Scouting (M): de M+lo a M+hi.
 * Fonte única: o sorteio (scouting.ts) e o card da missão leem daqui. Tier mais caro e demorado entrega qualidade maior.
 */
export const SCOUT_OVR_OFFSETS: Record<ScoutMissionType, [number, number]> = {
  local: [-16, -3],
  position: [-12, 0],
  youth: [-12, 0],
  national: [-7, 2],
  international: [-3, 4]
}

/** Relatórios gerados por missão. */
export const SCOUT_REPORT_COUNT: Record<ScoutMissionType, number> = {
  local: 1,
  position: 1,
  youth: 1,
  national: 2,
  international: 2
}

export const ALL_POSITIONS: PlayerPosition[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']

export const FORMATIONS: Record<FormationName, Array<{ role: PlayerPosition; x: number; y: number }>> = {
  '4-3-3': [
    { role: 'LW', x: 18, y: 20 }, { role: 'ST', x: 50, y: 14 }, { role: 'RW', x: 82, y: 20 },
    { role: 'CM', x: 25, y: 44 }, { role: 'CDM', x: 50, y: 50 }, { role: 'CM', x: 75, y: 44 },
    { role: 'LB', x: 15, y: 72 }, { role: 'CB', x: 38, y: 75 }, { role: 'CB', x: 62, y: 75 }, { role: 'RB', x: 85, y: 72 },
    { role: 'GK', x: 50, y: 91 }
  ],
  '4-2-3-1': [
    { role: 'ST', x: 50, y: 14 },
    { role: 'LW', x: 18, y: 31 }, { role: 'CAM', x: 50, y: 31 }, { role: 'RW', x: 82, y: 31 },
    { role: 'CDM', x: 35, y: 51 }, { role: 'CDM', x: 65, y: 51 },
    { role: 'LB', x: 15, y: 73 }, { role: 'CB', x: 38, y: 76 }, { role: 'CB', x: 62, y: 76 }, { role: 'RB', x: 85, y: 73 },
    { role: 'GK', x: 50, y: 91 }
  ],
  '4-4-2': [
    { role: 'ST', x: 35, y: 16 }, { role: 'ST', x: 65, y: 16 },
    { role: 'LW', x: 16, y: 44 }, { role: 'CM', x: 38, y: 46 }, { role: 'CM', x: 62, y: 46 }, { role: 'RW', x: 84, y: 44 },
    { role: 'LB', x: 15, y: 73 }, { role: 'CB', x: 38, y: 76 }, { role: 'CB', x: 62, y: 76 }, { role: 'RB', x: 85, y: 73 },
    { role: 'GK', x: 50, y: 91 }
  ],
  '4-1-4-1': [
    { role: 'ST', x: 50, y: 14 },
    { role: 'LW', x: 15, y: 34 }, { role: 'CM', x: 38, y: 36 }, { role: 'CM', x: 62, y: 36 }, { role: 'RW', x: 85, y: 34 },
    { role: 'CDM', x: 50, y: 54 },
    { role: 'LB', x: 15, y: 74 }, { role: 'CB', x: 38, y: 77 }, { role: 'CB', x: 62, y: 77 }, { role: 'RB', x: 85, y: 74 },
    { role: 'GK', x: 50, y: 91 }
  ],
  '3-4-3': [
    { role: 'LW', x: 18, y: 20 }, { role: 'ST', x: 50, y: 14 }, { role: 'RW', x: 82, y: 20 },
    { role: 'LW', x: 15, y: 46 }, { role: 'CM', x: 38, y: 48 }, { role: 'CM', x: 62, y: 48 }, { role: 'RW', x: 85, y: 46 },
    { role: 'CB', x: 24, y: 75 }, { role: 'CB', x: 50, y: 77 }, { role: 'CB', x: 76, y: 75 },
    { role: 'GK', x: 50, y: 91 }
  ],
  '4-2-2-2': [
    { role: 'ST', x: 35, y: 15 }, { role: 'ST', x: 65, y: 15 },
    { role: 'CAM', x: 26, y: 34 }, { role: 'CAM', x: 74, y: 34 },
    { role: 'CDM', x: 36, y: 53 }, { role: 'CDM', x: 64, y: 53 },
    { role: 'LB', x: 15, y: 74 }, { role: 'CB', x: 38, y: 77 }, { role: 'CB', x: 62, y: 77 }, { role: 'RB', x: 85, y: 74 },
    { role: 'GK', x: 50, y: 91 }
  ],
  '4-1-2-1-2': [
    { role: 'ST', x: 36, y: 15 }, { role: 'ST', x: 64, y: 15 },
    { role: 'CAM', x: 50, y: 31 },
    { role: 'CM', x: 28, y: 45 }, { role: 'CM', x: 72, y: 45 },
    { role: 'CDM', x: 50, y: 58 },
    { role: 'LB', x: 15, y: 74 }, { role: 'CB', x: 38, y: 77 }, { role: 'CB', x: 62, y: 77 }, { role: 'RB', x: 85, y: 74 },
    { role: 'GK', x: 50, y: 91 }
  ],
  '3-5-2': [
    { role: 'ST', x: 35, y: 16 }, { role: 'ST', x: 65, y: 16 },
    { role: 'CAM', x: 50, y: 34 },
    { role: 'LW', x: 14, y: 48 }, { role: 'CDM', x: 34, y: 52 }, { role: 'CDM', x: 66, y: 52 }, { role: 'RW', x: 86, y: 48 },
    { role: 'CB', x: 24, y: 75 }, { role: 'CB', x: 50, y: 77 }, { role: 'CB', x: 76, y: 75 },
    { role: 'GK', x: 50, y: 91 }
  ],
  '5-3-2': [
    { role: 'ST', x: 36, y: 17 }, { role: 'ST', x: 64, y: 17 },
    { role: 'CM', x: 28, y: 45 }, { role: 'CDM', x: 50, y: 49 }, { role: 'CM', x: 72, y: 45 },
    { role: 'LB', x: 12, y: 68 }, { role: 'CB', x: 31, y: 76 }, { role: 'CB', x: 50, y: 78 }, { role: 'CB', x: 69, y: 76 }, { role: 'RB', x: 88, y: 68 },
    { role: 'GK', x: 50, y: 91 }
  ]
}

export const MENTALITIES: Record<TacticalMentality, { label: string; atkMod: number; defMod: number }> = {
  very_defensive: { label: 'Muito Defensiva', atkMod: 0.85, defMod: 1.15 },
  defensive: { label: 'Defensiva', atkMod: 0.94, defMod: 1.08 },
  balanced: { label: 'Equilibrada', atkMod: 1.0, defMod: 1.0 },
  offensive: { label: 'Ofensiva', atkMod: 1.09, defMod: 0.93 },
  very_offensive: { label: 'Muito Ofensiva', atkMod: 1.18, defMod: 0.84 }
}

export const POS_BR_MAP: Record<string, string> = {
  GK: 'GOL',
  CB: 'ZAG',
  LB: 'LE',
  RB: 'LD',
  CDM: 'VOL',
  CM: 'MC',
  CAM: 'MEI',
  LW: 'PE',
  RW: 'PD',
  ST: 'ATA'
}

// Nomes ficticios (decisao N1); T37 refina o catalogo.
export const CONTINENTAL_RIVALS: Array<{ id: string; name: string; power: number }> = [
  { id: 'con_1', name: 'Club Atlético Rio Dulce', power: 76 },
  { id: 'con_2', name: 'Deportivo Puerto Azul', power: 75 },
  { id: 'con_3', name: 'Club Sportivo Carbonero', power: 73 },
  { id: 'con_4', name: 'Unión Pampa Oriental', power: 72 },
  { id: 'con_5', name: 'Sociedad Altiplano Alto', power: 72 },
  { id: 'con_6', name: 'Atlético Valle Verde', power: 74 },
  { id: 'con_7', name: 'Ciudad Costanera FC', power: 75 },
  { id: 'con_8', name: 'Club Pehuén Andino', power: 73 }
]

export const CREST_SHAPES: Array<{ id: CrestShape; label: string }> = [
  { id: 'portugues', label: 'Português' },
  { id: 'frances', label: 'Francês' },
  { id: 'ombros', label: 'Ombros' },
  { id: 'brasao', label: 'Brasão' },
  { id: 'medalhao', label: 'Medalhão' },
  { id: 'oval', label: 'Oval' },
  { id: 'losango', label: 'Losango' },
  { id: 'coracao', label: 'Pontudo' },
  { id: 'pergaminho', label: 'Faixa curva' },
  { id: 'chanfrado', label: 'Chanfrado' }
]

export const CREST_PATTERNS: Array<{ id: CrestPattern; label: string }> = [
  { id: 'liso', label: 'Liso' },
  { id: 'listras', label: 'Listras' },
  { id: 'faixa', label: 'Faixa' },
  { id: 'metade', label: 'Metade/metade' },
  { id: 'xadrez', label: 'Xadrez' }
]

export const CREST_ORIENTATIONS: Array<{ id: CrestOrientation; label: string }> = [
  { id: 'vertical', label: 'Vertical' },
  { id: 'horizontal', label: 'Horizontal' },
  { id: 'diagonal-esquerda', label: 'Diagonal \\' },
  { id: 'diagonal-direita', label: 'Diagonal /' }
]

export const CREST_STRIPE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 7, label: 'Fina (7)' },
  { value: 5, label: 'Média (5)' },
  { value: 3, label: 'Grossa (3)' }
]

export const CREST_COLORS: string[] = ['#059669', '#0F172A', '#DC2626', '#2563EB', '#D97706', '#7C3AED', '#FFFFFF', '#FACC15']

export const FACILITIES_LIST: Array<{ key: keyof ClubUpgrades; title: string; description: string }> = [
  { key: 'scoutingLevel', title: 'Departamento de Scouting', description: 'Libera mais slots de missão, precisão e Joias Raras.' },
  { key: 'squadCapacityLevel', title: 'Alojamento & Elenco', description: 'Define o limite de atletas do elenco (de 14 a 25). Cada atleta extra paga salário a cada jogo.' },
  { key: 'trainingCenterLevel', title: 'Centro de Treinamento', description: 'Acelera a evolução dos atributos após cada jogo.' },
  { key: 'medicalCenterLevel', title: 'Departamento Médico', description: 'Acelera a recuperação de energia e reduz a chance e a duração das lesões.' },
  { key: 'stadiumLevel', title: 'Estádio & Sócios', description: 'Aumenta a receita fixa de bilheteria em cada partida. Rende conforme a série (teto por série). Cada nível soma manutenção por jogo.' },
  { key: 'financeLevel', title: 'Marketing & Finanças', description: 'Aumenta o valor fixo da cota de patrocínio por jogo. Rende conforme a série (teto por série). Cada nível soma manutenção por jogo.' }
]

// Contratos da comissão técnica: duram 7 dias reais e podem ser renovados na última janela.
export const STAFF_CONTRACT_DAYS = 7
export const STAFF_CONTRACT_MS = STAFF_CONTRACT_DAYS * 24 * 60 * 60 * 1000
export const STAFF_RENEW_WINDOW_MS = 24 * 60 * 60 * 1000

// Bônus da comissão (antes: +0,15 evolução, desgaste 8 e recuperação +5, +0,10 jóia, +4 base).
export const STAFF_BONUS = {
  assistantEvolution: 0.3,
  fitnessDrain: 6,
  fitnessDrainDefault: 11,
  fitnessRecovery: 10,
  scoutGemChance: 0.15,
  scoutYouthOvr: 5,
  financeIncome: 0.1,
  analystAccuracy: 0.1,
  analystSaleBonus: 0.1,
  youthCoachEvolution: 0.25,
  youthCoachMaxAge: 21,
  physioChanceMult: 0.6,
  physioDurationMult: 0.67
}

// Multiplicador do preço dos contratos por série (chave = divisão: 4 = D ... 1 = A), na proporção da receita de jogos
// por temporada (285k, 682k, 1,48M, 2,1M). Mantém o retorno do Diretor Financeiro e o peso da comissão iguais em toda série.
export const STAFF_SERIES_COST_MULT: Record<number, number> = { 4: 1, 3: 2.4, 2: 5.2, 1: 7.4 }

export function staffContractCost(baseCost: number, division: number): number {
  return Math.round((baseCost * (STAFF_SERIES_COST_MULT[division] ?? 1)) / 1000) * 1000
}

// cost = valor base de cada contrato de 7 dias na série D (multiplicado por STAFF_SERIES_COST_MULT nas séries acima).
export const STAFF_CATALOG: Array<{ key: StaffKey; title: string; cost: number; description: string }> = [
  { key: 'assistantCoach', title: 'Auxiliar Técnico', cost: 90000, description: '+30% na evolução técnica individual após as partidas.' },
  { key: 'fitnessCoach', title: 'Preparador Físico', cost: 80000, description: '-45% de desgaste físico nos 90 min e recuperação muito mais rápida.' },
  { key: 'chiefScout', title: 'Olheiro-Chefe', cost: 120000, description: '+15% de chance de Joias Raras e promessas bem melhores na Base.' },
  { key: 'financeDirector', title: 'Diretor Financeiro', cost: 110000, description: '+10% na receita de bilheteria e patrocínio em cada partida.' },
  { key: 'marketAnalyst', title: 'Analista de Mercado', cost: 85000, description: 'Relatórios de scouting 10 pontos mais precisos e +10% no valor de venda de atletas.' },
  { key: 'youthCoach', title: 'Treinador de Base', cost: 90000, description: '+25% na evolução de atletas até 21 anos após as partidas.' },
  { key: 'physio', title: 'Fisioterapeuta', cost: 85000, description: '-40% de chance de lesão e lesões 1/3 mais curtas.' }
]

export const TRANSFER_LABELS: Record<string, string> = {
  sign: 'Contratação',
  sell: 'Venda',
  loan_in: 'Empréstimo (Entrada)',
  loan_out: 'Empréstimo (Saída)',
  renew: 'Renovação',
  release: 'Fim de contrato',
  retire: 'Aposentadoria'
}

// Clubes ficticios (decisao N1)
export const OFFER_RIVAL_CLUBS: string[] = [
  'Esporte Clube Ipê-Roxo', 'Atlético Serra Azul', 'Sociedade Esportiva Vale do Ipê',
  'Sport Clube Recôncavo', 'Associação Atlética Planalto', 'União Esportiva Marajó', 'Clube Atlético Tapajós'
]

export const TRAINING_FOCUS_OPTIONS: Array<{ value: TrainingFocus; label: string }> = [
  { value: 'balanced', label: 'Equilibrado (Todos os atributos)' },
  { value: 'shooting', label: 'Finalização & Conclusão' },
  { value: 'pace', label: 'Velocidade & Explosão' },
  { value: 'passing', label: 'Passe & Visão de Jogo' },
  { value: 'defending', label: 'Marcação & Desarme' },
  { value: 'physical', label: 'Condicionamento Físico' }
]

export const MARKET_STATUS_OPTIONS: Array<{ value: MarketStatus; label: string }> = [
  { value: 'available', label: 'Disponível (Ouvir propostas)' },
  { value: 'transfer_listed', label: 'Transferível (Atrair ofertas)' },
  { value: 'untouchable', label: 'Intocável (Recusar ofertas)' }
]

// ===== Balanceamento v2 (docs/plano-balanceamento.md) =====
/** OVER de time típico de cada série (chave = divisão: 4 = D ... 1 = A). Mesma unidade do OVER do usuário. */
export const SERIE_TYPICAL_OVER: Record<number, number> = { 4: 50, 3: 57, 2: 64, 1: 71 }

/** OVER máximo de um atleta. Chegar nele é raríssimo: só pela cauda longa da geração (scouting/mercado), nunca por evolução. */
export const ATHLETE_MAX_OVERALL = 99

/**
 * Cauda longa da geração (só scouting e mercado): com probabilidade p90 o atleta salta para >= 90 e cada ponto
 * seguinte tem chance de subir (decai forte): P(>=90) ~ 0,6%, P(>=95) ~ 1e-4, P(99) ~ 1e-6.
 */
export const OVER_TAIL = { p90: 0.006, stepTo95: 0.45, stepTo99: 0.32 }

/** Evolução (treino/jogos): retorno decrescente acima de softStart; teto duro abaixo do máximo, então 99 só nasce na geração. */
export const EVOLUTION = { softStart: 85, hardCap: 98, exponent: 1.5 }

/** Multiplicador (0..1) do ganho de OVER por evolução: 1 até softStart, depois ((max - ovr) / (max - softStart)) ^ 1,5. */
export function evolutionFactor(overall: number): number {
  if (overall <= EVOLUTION.softStart) return 1
  if (overall >= EVOLUTION.hardCap) return 0
  return Math.pow((ATHLETE_MAX_OVERALL - overall) / (ATHLETE_MAX_OVERALL - EVOLUTION.softStart), EVOLUTION.exponent)
}

/** Motor de partida em unidades de OVER (média ponderada dos 11 titulares). */
export const MATCH_SIM = {
  ticks: 45, homeAdvantage: 3, slope: 0.0028, userChanceBase: 0.11, oppChanceBase: 0.10, aiChanceBase: 0.105,
  chanceMin: 0.025, chanceMax: 0.24, userOnTarget: 0.56, userGoal: 0.44, oppOnTarget: 0.52, oppGoal: 0.40,
  aiOnTarget: 0.54, aiGoal: 0.42, formSwing: 1.5, possessionPerOver: 1.2, shootoutDiv: 250, seedingNoise: 2.5
}

/** Receita por jogo depende da série; o nível da instalação acima do teto da série não rende mais. */
export const SERIE_ECONOMY: Record<number, { ticketBase: number; sponsorBase: number; levelCap: number; debtLimit: number }> = {
  4: { ticketBase: 8650, sponsorBase: 8650, levelCap: 3, debtLimit: 150000 },
  3: { ticketBase: 10520, sponsorBase: 10520, levelCap: 5, debtLimit: 250000 },
  2: { ticketBase: 13690, sponsorBase: 13690, levelCap: 7, debtLimit: 400000 },
  1: { ticketBase: 16600, sponsorBase: 16600, levelCap: 10, debtLimit: 600000 }
}

export const ECONOMY = {
  facilityStep: 0.12, awayTicketShare: 0.4, winBonusShare: 0.5, drawBonusShare: 0.2,
  debtInterestPerMatch: 0.01, forcedSaleShare: 0.7, startBudget: 150000, maintenanceRate: 0.0015
}

/** Salário por jogo: base x 2^((OVER - refOvr) / doubleEvery), arredondado a 'step', mínimo 'min'. */
export const WAGE = { base: 1000, refOvr: 49, doubleEvery: 21, min: 500, step: 25 }

/** Prêmio de estrela: acima de STAR.from, salário e valor dobram a mais a cada STAR.doubleEvery pontos de OVER. */
export const STAR = { from: 85, doubleEvery: 10 }
/** Valor de mercado: (floor + max(0, OVER - ref)^exp x mult) x idade x potencial x estrela; arred. a step; mínimo min. */
export const VALUE = { floor: 18000, ref: 46, exp: 2.15, mult: 218, potStep: 0.02, potMaxGap: 20, min: 5000, step: 500 }
/** Fator de idade do valor: jovem até youngMax, pico entre peakFrom e peakTo, cai oldStep por ano depois (piso oldMin). */
export const VALUE_AGE = { youngMax: 1.25, youngStep: 0.03, peakFrom: 24, peakTo: 27, peak: 1.1, oldStep: 0.09, oldMin: 0.4 }
/** Contrato: cai 1 por virada; em 0 o atleta sai de graça. Renovação: luvas = valor x renewFeePerYear x anos. */
export const CONTRACT = { renewYears: 2, veteranAge: 32, veteranRenewYears: 1, maxYears: 5, renewFeePerYear: 0.025, migrationMinYears: 2 }
/** Envelhecimento na virada. Linha: perde OVER a partir de declineFrom e se aposenta em retireAge. Goleiro (GK): campos *GK. */
export const AGING = {
  declineFrom: 31, dropAt33: 2, dropAt35: 3, retireAge: 37,
  declineFromGK: 35, dropGKAt37: 2, dropGKAt40: 3, retireAgeGK: 45
}
/** Mercado: venda manual, empréstimo e propostas recebidas, sempre sobre o valor atual. */
export const TRANSFER = { saleShare: 0.85, loanShare: 0.12, offerMin: 0.85, offerMax: 1.05, counterMult: 1.15, counterChance: 0.55 }

/** Fator da instalação de receita: 1 + step x (min(nível, teto da série) - 1). */
export function facilityIncomeFactor(level: number, division: number): number {
  const cap = (SERIE_ECONOMY[division] ?? SERIE_ECONOMY[4]).levelCap
  return 1 + ECONOMY.facilityStep * (Math.min(level, cap) - 1)
}

export const PRIZES = {
  // Sem cota base: só recebe quem sobe, avança no mata-mata ou fica no G-16 da A. Rebaixado e eliminado cedo = 0.
  // Copa e continental pagam por fase/jogo. Escada: série de cima paga estritamente mais na colocação comparável.
  cup: { rounds: [10000, 20000, 40000, 260000], finalLoss: 70000, thirdWin: 25000, thirdLoss: 10000 },
  continental: { win: 30000, other: 10000, champion: 180000, runnerUp: 70000, third: 30000 },
  supercup: { champion: 40000, runnerUp: 15000 },
  recopa: { champion: 60000, runnerUp: 25000 },
  serieD: { groups: 0, r64: 8000, r32: 15000, r16: 24000, qf: 34000, fourth: 52000, third: 60000, runnerUp: 68000, champion: 80000 },
  serieC: { relegated: 0, stayed: 0, quadElim: 0, fourth: 85000, third: 100000, runnerUp: 115000, champion: 140000 },
  serieB: { relegated: 0, stayed: 0, promotion: 150000, fourth: 150000, third: 170000, runnerUp: 200000, champion: 240000 },
  serieA: {
    relegated: 0,
    champion: 300000,
    // 1º ao 16º (índice = colocação - 1), proporções da pesquisa; 17º a 20º não recebem
    byRank: [300000, 285000, 270000, 255000, 240000, 225000, 210000, 195000, 180000, 165000, 129000, 120000, 111000, 108000, 105000, 102000]
  }
} as const

/** Evolução por temporada (docs/plano-progressao.md). Ganho esperado de OVER de um atleta numa temporada:
 *  seasonBase x idade x min(1, distância ao potencial / gapFull) x (1 + CT + comissão) x minutos x foco x evolutionFactor.
 *  Cada partida sorteia +1 com probabilidade = ganho / matchesPerSeason[série]. */
export const PROGRESSION = {
  seasonBase: 5.25,
  gapFull: 6,
  tcPerLevel: 0.12,
  benchShare: 0.6,
  focusBonus: 0.1,
  maxPerMatch: 0.5,
  matchesPerSeason: { 4: 22, 3: 30, 2: 44, 1: 46 } as Record<number, number>,
  ageBands: [[19, 1], [21, 0.9], [23, 0.75], [26, 0.5], [29, 0.3], [99, 0.15]] as Array<[number, number]>
}
export function progressionAgeFactor(age: number): number {
  for (const [upTo, f] of PROGRESSION.ageBands) if (age <= upTo) return f
  return 0
}
/** Foco de treino que acelera a evolução de cada posição (o atributo-chave). */
export const POSITION_KEY_FOCUS: Record<PlayerPosition, TrainingFocus> = {
  GK: 'physical', CB: 'defending', LB: 'pace', RB: 'pace', CDM: 'defending', CM: 'passing', CAM: 'passing', LW: 'pace', RW: 'pace', ST: 'shooting'
}
/** Marcos de progressão (conquistas): OVER do time e OVER individual. */
export const MILESTONES = { teamOver: [55, 60, 65, 70, 75, 80, 85, 90], playerOver: [70, 80, 90] }

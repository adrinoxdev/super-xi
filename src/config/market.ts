import type { MarketStatus } from '@/types'

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

export const MARKET_STATUS_OPTIONS: Array<{ value: MarketStatus; label: string }> = [
  { value: 'available', label: 'Disponível (Ouvir propostas)' },
  { value: 'transfer_listed', label: 'Transferível (Atrair ofertas)' },
  { value: 'untouchable', label: 'Intocável (Recusar ofertas)' }
]

/** Mercado: venda manual, empréstimo e propostas recebidas, sempre sobre o valor atual. */
export const TRANSFER = { saleShare: 0.85, loanShare: 0.12, offerMin: 0.85, offerMax: 1.05, counterMult: 1.15, counterChance: 0.55 }

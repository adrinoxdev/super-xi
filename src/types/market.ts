export interface IncomingOffer {
  id: string
  playerId: string
  playerName: string
  position: string
  overall: number
  rivalClub: string
  type: 'loan' | 'buy'
  amount: number
  countered: boolean
}

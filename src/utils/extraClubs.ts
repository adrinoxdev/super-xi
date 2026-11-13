// Clubes extras (inventados) que completam os 64 do mata-mata da Série D. Dado estático, não entra no save.
// Escudos vêm do fallback por hash de getTeamIdentity.
export interface ExtraClub {
  id: string
  name: string
  basePower: number
  style: string
}

const EXTRA_STYLES = [
  'Equilibrado', 'Contra-Ataque', 'Retranca', 'Pressão Alta',
  'Posse de Bola', 'Transição Rápida', 'Jogo Aéreo', 'Ofensivo Total'
]

const EXTRA_D_NAMES: string[] = [
  'Arapuã EC',
  'Canjerana FC',
  'Taquaral do Oeste',
  'Cerro Azul do Sertão',
  'Jacarandá Atlético',
  'Ipueiras FC',
  'Aroeira Esporte',
  'Lagoa Funda EC',
  'Morro Alto FC',
  'Buritizal AC',
  'Cachoeira do Pombo',
  'Seringal EC',
  'Piracema FC',
  'Vereda Grande EC',
  'Capim Dourado EC',
  'Barro Vermelho FC',
  'Maracajá EC',
  'Sucupira Atlético',
  'Juriti FC',
  'Carnaubal EC',
  'Guará-Mirim FC',
  'Pedra Lisa AC',
  'Tamanduá EC',
  'Riacho Seco FC',
  'Babaçu do Norte',
  'Angico Atlético',
  'Serra do Facão FC',
  'Bacuri FC',
  'Caraíba EC',
  'Pau-Ferro AC',
  'Lajedo FC',
  'Tucunaré EC',
  'Mandacaru FC',
  'Várzea Bonita EC',
  'Chapada Alta FC',
  'Cajueiro AC',
  'Pitanga do Vale',
  'Jatobá EC',
  'Coqueiral FC',
  'Ribeirão Manso',
  'Siriema Atlético',
  'Graúna FC',
  'Umbuzeiro EC',
  'Taboca FC',
  'Araticum EC',
  'Gameleira AC'
]

export const EXTRA_D_CLUBS: ExtraClub[] = EXTRA_D_NAMES.map((name, idx) => {
  const i = idx + 1
  return { id: 'dx_' + i, name, basePower: 45 + ((i * 7) % 9), style: EXTRA_STYLES[idx % EXTRA_STYLES.length] }
})

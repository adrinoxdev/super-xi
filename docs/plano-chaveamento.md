# Plano: chaveamento completo, simulação dos outros jogos, disputa de 3º lugar e pódio

> **Nota (1.3.0):** este documento descreve o jogo na data em que foi escrito. Depois dele, as competições foram renomeadas: Taça Cacique → Taça do Povo, Supercopa Soberana → Supercopa Zênite, Recopa Condor → Recopa dos Condores (ver `docs/plano-fase-8-mundial-patrocinador.md`). O texto abaixo mantém os nomes antigos como registro.

> **Revisão (Série C e D alinhadas ao Brasileirão):** a Série D não tem mais Playoff de Acesso (`D_PLAYOFF`): sobem 4 clubes, os vencedores das quartas; quem perde as quartas é eliminado e recebe `serieD.qf`. A Série C rebaixa 4 clubes (17º ao 20º). Onde este documento citar playoff ou 6 acessos da D, vale o texto desta nota. As tabelas de calibração abaixo são históricas.


Escopo decidido pelo dono: Taça Cacique (copa nacional, 16 clubes), Copa Condor de Prata/Ouro (continental), mata-mata da Série D e fase final da Série C. Supercopa Soberana e Recopa Condor seguem como final única, sem chave. As Séries A e B (pontos corridos) não ganham chave.

**Série C (decisão do dono):** 1ª fase em pontos corridos, depois quadrangular (dois grupos de 4; no código os grupos se chamam `B` e `C`), depois **final em ida e volta entre os dois campeões de grupo** (empate no agregado vai a pênaltis, mesma regra das outras) e **disputa de 3º em jogo único entre os dois 2º colocados**, mais o pódio. **O acesso não muda:** continua saindo do quadrangular (1º e 2º de cada grupo sobem, conforme `evaluateStageProgression` atual: no grupo do usuário, `rank <= 2` sobe). A final e o 3º decidem só título, prêmio e pódio.

Regra geral: o protótipo prevalece nas regras existentes. Mudam só os pontos pedidos (chave completa, simulação dos outros confrontos, disputa de 3º lugar, pódio), os ajustes que eles exigem e o **rebalanceamento de prêmios** autorizado pelo dono (seção 8), que vale para todas as competições, inclusive Séries A e B.

---

## 0. Como o código funciona hoje (o que o plano muda)

| Competição | Hoje | Problema para a chave |
|---|---|---|
| Taça Cacique (`stores/competitions.ts`) | `cupState` guarda só o caminho do usuário: `roundIndex` (0 a 3), `currentRival`, `history`. O rival de cada fase é sorteado na hora: Série D nas oitavas, C nas quartas, B na semi, A na final. Empate: 55% de chance de o usuário passar, sem placar de pênaltis. Cotas por fase vencida: 25.000 / 45.000 / 80.000 / 350.000. | Não existem os outros 15 clubes nem os outros confrontos. |
| Continental (`stores/competitions.ts`) | Grupo de 4 (usuário com OVER 900 e 3 de `CONTINENTAL_RIVALS`), 6 rodadas. Os rivais do grupo recebem um resultado aleatório por rodada (45% vitória 2x1, 27% empate 1x1, 28% derrota 0x1), sem jogo entre eles. G-2 avança para QF, SF e FINAL em jogo único. **Erro do protótipo:** o adversário do mata-mata vem de `continentalOpponent`, que usa `rivals[(groupRound - 1) % 3]`; `groupRound` fica em 6, então QF, SF e final são sempre contra o mesmo rival do grupo. Cota por jogo: 65.000 na vitória, 25.000 no resto. Título: +500.000. | Só existe 1 grupo. As fases de mata-mata não têm chave. |
| Série D (`stores/league.ts`) | 1ª fase: grupo A1 (usuário e 5 clubes), mais 14 clubes em `OUTROS` que não jogam. G-4 vai ao mata-mata. Cada fase cria só o confronto do usuário (`buildTwoLegTie`): ida fora, volta em casa. Rival das fases seguintes: `pickRandom` entre todos os clubes, inclusive eliminados. Quem perde nas quartas vai ao `D_PLAYOFF`. Quem perde na semi ou na final sobe com 140.000. Título: 300.000. Agregado empatado: 55%. | Não há 64 clubes nem os outros 31 confrontos. O vice ganha o mesmo que o semifinalista. |
| Série C (`stores/league.ts`) | 1ª fase com 20 clubes. O G-8 forma dois quadrangulares (B e C, ida e volta, 6 rodadas). O 1º do grupo **do usuário** é campeão direto (420.000) e o 2º sobe (220.000). `C_FINAL` existe nos tipos e em `STAGE_NAMES`, mas nunca é usado (nem no protótipo). | Não há final nem disputa entre os dois grupos. O plano ativa `C_FINAL` e cria `C_THIRD` sem mexer no acesso. |

O fluxo da partida do usuário é este: `prepareMatch(comp)`, depois `/pre-match`, `startLiveMatch`, `simulateMatchTick` (45 ticks) e `concludeMatch`. Depois disso, `concludeMatch` chama, conforme a competição, `applyCupResult`, `applyContinentalResult`, `applyFinalResult` ou `league.recordRoundResults` + `evaluateStageProgression`, e por fim `saveGame()`.

A virada de temporada (`useSeason.startNewSeason`) acontece **no mesmo instante** em que a liga termina para o usuário (`evaluateStageProgression` devolve `endSeason`). Nesse momento ela reinicia copa, continental e liga. Por isso o pódio da liga nunca seria visto sem um arquivo de pódios (seção 7.3).

---

## 1. Modelo de dados

### 1.1 Arquivo novo `src/types/bracket.ts` (exportar em `src/types/index.ts`)

```ts
export type BracketCompetition = 'cup' | 'continental' | 'serieD' | 'serieC'

/** Time participante da chave. Para o usuário, id = 'user' e o nome exibido vem sempre da store club. */
export interface BracketTeam {
  id: string
  name: string
  power: number        // OVER usado na simulação e exibido como "OVER 912"
  tag?: string         // origem curta: 'Série B', '1º Grupo A', '2º A7'
}

/** Um jogo do confronto. Placar nulo = não jogado (ou legado sem placar registrado). */
export interface BracketLeg {
  homeId: string
  awayId: string
  homeScore: number | null
  awayScore: number | null
  played: boolean
}

/** Pênaltis do confronto. 'home' é sempre o time em tie.homeId. */
export interface PenaltyShootout {
  home: number
  away: number
}

export interface BracketTie {
  id: string                 // 'cup_r2_t1', 'con_third', 'D_R16_t5'
  roundIndex: number         // índice da fase; -1 = disputa de 3º; -2 = lado (playoff)
  slot: number               // posição na fase (0-based); o vencedor vai para slot floor(slot/2) da fase seguinte
  homeId: string | null      // manda o ÚLTIMO (ou único) jogo; null = a definir
  awayId: string | null
  homeLabel: string          // texto quando homeId é null: 'Venc. Quartas 1', '1º Grupo B', '1º A1'
  awayLabel: string
  legCount: 1 | 2
  legs: BracketLeg[]         // [] enquanto os dois times não são conhecidos; depois tem exatamente legCount itens
  penalties: PenaltyShootout | null
  winnerId: string | null
  loserId: string | null
  walkover?: boolean         // usuário não jogou antes da virada de temporada (W.O.)
  legacy?: boolean           // resultado reconstruído de save antigo
}

export interface BracketRound {
  key: string                // 'R16' | 'QF' | 'SF' | 'FINAL' | 'D_R64' ...
  label: string              // 'Oitavas de Final'
  shortLabel: string         // 'Oitavas' (abas no celular)
  legCount: 1 | 2
  ties: BracketTie[]
}

/** Chave paralela alimentada por perdedores (Playoff de Acesso da Série D). */
export interface BracketSide {
  key: string
  label: string
  legCount: 1 | 2
  ties: BracketTie[]
}

export interface PodiumEntry {
  teamId: string
  name: string
  isUser: boolean
}

export interface Podium {
  competition: BracketCompetition
  competitionLabel: string   // 'Taça Cacique', 'Copa Condor de Ouro', 'Liga Aurora — Série D'
  season: number
  champion: PodiumEntry
  runnerUp: PodiumEntry
  third: PodiumEntry | null
  finalSummary: string       // 'Soberano FC 2 x 1 Porto Praiano' ou 'Agregado 3 x 3 (pên. 4 x 2)'
  thirdSummary: string | null
}

export interface Bracket {
  competition: BracketCompetition
  season: number
  label: string
  teams: Record<string, BracketTeam>
  rounds: BracketRound[]
  thirdPlace: BracketTie | null
  side: BracketSide | null
  podium: Podium | null
}
```

`legCount` + `legs: BracketLeg[]` atende ao pedido de "1 ou 2 pernas" e permite confronto ainda sem times (legs vazio). Uma tupla não teria como representar esse estado.

### 1.2 Mudanças em `src/types/competitions.ts`

```ts
export type ContinentalStage = 'GROUPS' | 'QF' | 'SF' | 'THIRD' | 'FINAL'

export interface ContinentalGroup {
  id: string                 // 'B' | 'C' | 'D' (o grupo do usuário continua em ContinentalState.teams, id 'A')
  teams: ContinentalTeam[]
}

export interface CupState {
  roundIndex: number
  eliminated: boolean
  champion: boolean
  currentRival: CupRival | null
  history: CupHistoryItem[]
  bracket: Bracket | null            // NOVO
  thirdPlace: boolean                // NOVO: usuário perdeu a semi e tem a disputa de 3º pendente
  finalPosition: 1 | 2 | 3 | 4 | null // NOVO: colocação final quando chega ao fim
}

export interface ContinentalState {
  qualified: boolean
  tier: ContinentalTier
  stage: ContinentalStage
  groupRound: number
  eliminated: boolean
  champion: boolean
  teams: ContinentalTeam[]           // grupo A (do usuário), como hoje
  history: ContinentalHistoryItem[]
  otherGroups: ContinentalGroup[]    // NOVO: grupos B, C e D
  bracket: Bracket | null            // NOVO: QF, SF, final e 3º
  finalPosition: 1 | 2 | 3 | 4 | null // NOVO
}
```

### 1.3 Mudanças em `src/types/league.ts`

```ts
export type CompetitionStageType =
  | 'D_GROUPS' | 'D_R64' | 'D_R32' | 'D_R16' | 'D_QF' | 'D_SF' | 'D_FINAL' | 'D_THIRD'
  | 'C_FIRST_STAGE' | 'C_QUADRANGULAR' | 'C_FINAL' | 'C_THIRD'
  | 'POINTS_38'

export interface LeagueFixture {
  id?: string
  stage?: CompetitionStageType
  group?: string
  round: number
  homeId: string
  awayId: string
  homeScore: number | null
  awayScore: number | null
  played: boolean
  tie?: number               // NOVO: índice do confronto na fase (mata-mata)
  leg?: 1 | 2                // NOVO: 1 = ida, 2 = volta; ausente em jogo único
  homePens?: number | null   // NOVO: pênaltis, só no último jogo do confronto, relativos ao mandante deste jogo
  awayPens?: number | null
}
```

`LeagueTeam.group` ganha o valor `'MM'` para os clubes que só entram no mata-mata da Série D.

### 1.4 Mudança em `src/types/club.ts`

```ts
export interface ClubSave {
  // ...campos atuais
  podiumArchive?: Podium[]   // NOVO: pódios das temporadas encerradas, mais recente primeiro, no máximo 12
}
```

### 1.5 Onde cada chave fica no save (as 17 chaves continuam as mesmas)

As 17 chaves do protótipo são: `club`, `squad`, `scouting`, `competitionStage`, `leagueTeams`, `leagueFixtures`, `transferHistory`, `trophyGallery`, `seasonGoals`, `careerStats`, `incomingOffers`, `youthAcademyProspects`, `clubStaff`, `supercupState`, `recopaState`, `cupState` e `continentalState`.

| Dado | Onde fica | Por quê |
|---|---|---|
| Chave da Taça Cacique | `cupState.bracket` | A chave pertence à copa; os campos legados (`roundIndex`, `currentRival`) continuam sincronizados para não quebrar `activeMatchOpponent` nem `startNewSeason`. |
| Grupos B, C e D e chave continental | `continentalState.otherGroups` e `continentalState.bracket` | Mesmo raciocínio. |
| Chave da Série D e da Série C | **dentro de `leagueFixtures`** (campos `tie`, `leg`, `homePens`, `awayPens`), com os clubes extras em `leagueTeams` (`group: 'MM'`) | Os jogos de mata-mata da liga já moram em `leagueFixtures`. `nextUserFixture`, `recordRoundResults`, `currentRound`, `nextFixtureIsHome` e ida e volta já funcionam sobre eles. Guardar um objeto `Bracket` separado duplicaria o estado e obrigaria a criar uma 18ª chave (`LeagueSave` é espalhado na raiz do save). A chave da liga é **derivada** dos jogos por uma função pura (`buildLeagueBracketView`). |
| Arquivo de pódios | `club.podiumArchive` (dentro da chave `club`) | Precisa sobreviver à virada de temporada, que reinicia copa, continental e liga. É pequeno (só os 3 do pódio). |

`STORAGE_KEY` continua `super_xi_full_save_v7`. Os campos novos são opcionais no JSON e são preenchidos na carga (seção 7).

---

## 2. Sorteio e semeadura por competição

Arquivo novo `src/utils/bracketSeeding.ts` (funções puras que recebem `rng`). Arquivo novo `src/utils/extraClubs.ts` (clubes extras da Série D). Em `src/utils/random.ts`, acrescentar:

```ts
export type Rng = () => number
/** PRNG determinístico (testes e sorteios por temporada). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] { /* Fisher-Yates */ }
```

### 2.1 Taça Cacique (16 clubes, jogo único)

Sorteio com potes, montado de forma que o caminho provável do usuário repita a escalada do protótipo (D nas oitavas, C nas quartas, B na semi, A na final):

- Pote A: 4 clubes sorteados de `LEAGUE_CLUBS_POOL[1]`. Pote B: 4 de `[2]`. Pote C: 4 de `[3]`. Pote D: 3 de `[4]`. Sorteio sem repetição; OVER = `basePower` (como no protótipo, sem o bônus por temporada); `tag` = `'Série A'` etc.
- O usuário fica no slot 0 (`id 'user'`, `power` = 0 no mapa; a UI mostra o OVER real do elenco).

| Confronto das oitavas | Mandante x Visitante |
|---|---|
| t0 | usuário x D1 |
| t1 | C1 x D2 |
| t2 | B1 x C2 |
| t3 | B2 x C3 |
| t4 | A1 x D3 |
| t5 | A2 x C4 |
| t6 | A3 x B3 |
| t7 | A4 x B4 |

Quartas: vencedores de t0/t1, t2/t3, t4/t5 e t6/t7. Semis: QF0 x QF1 e QF2 x QF3. Final: SF0 x SF1. Disputa de 3º: perdedor da SF0 x perdedor da SF1. Todos os jogos são únicos. O usuário é sempre mandante (regra atual: `activeMatchIsHome` é `true` fora da liga). Nos outros confrontos, manda o vencedor do slot de cima.

Assinatura: `seedCup(rng): { teams: BracketTeam[]; firstRound: Array<[string, string]> }`. O primeiro par é `['user', D1.id]`.

### 2.2 Continental (16 clubes: 4 grupos de 4, QF, SF, final e 3º, jogo único)

- Grupo A: usuário (OVER 900 na tabela, como hoje) + 3 de `CONTINENTAL_RIVALS` (regra atual).
- Grupos B, C e D: os 5 rivais continentais restantes + os 7 clubes de maior `basePower` de `LEAGUE_CLUBS_POOL[1]`. São 12 clubes embaralhados e distribuídos 4 por grupo. Nenhum nome novo é necessário.
- Calendário de cada grupo (índices 0 a 3 na ordem do array; no grupo A o usuário é o índice 0). Isso reproduz a ordem atual do usuário (`rivals[(groupRound - 1) % 3]`):
  - Rodada 1: 0x1 e 2x3. Rodada 2: 0x2 e 1x3. Rodada 3: 0x3 e 1x2.
  - Rodadas 4 a 6: as mesmas, com mando invertido.
- Quartas, com modelo fixo exibido desde o início:

| QF | Confronto |
|---|---|
| t0 | 1º Grupo A x 2º Grupo B |
| t1 | 1º Grupo C x 2º Grupo D |
| t2 | 1º Grupo B x 2º Grupo A |
| t3 | 1º Grupo D x 2º Grupo C |

  Semis: t0/t1 e t2/t3. Assim, dois times do mesmo grupo só se reencontram na final.
- Classificação de cada grupo: pontos, depois saldo (critério atual), depois gols pró e, por fim, OVER.

Assinaturas:

- `seedContinentalGroups(userName, rng): { groupA: ContinentalTeam[]; others: ContinentalGroup[] }`
- `CONTINENTAL_QF_TEMPLATE: Array<[string, string]>`, com os rótulos `'1º Grupo A'` etc.
- `seedContinentalQuarterFinals(sortedGroups: Record<'A'|'B'|'C'|'D', string[]>): Array<[string, string]>`, que devolve ids na ordem do modelo.

### 2.3 Série D (64 clubes, ida e volta e 3º lugar)

- Quem vai ao mata-mata: o G-4 do grupo A1 (real, pela tabela) e o G-4 de 15 grupos virtuais (A2 a A16). Os grupos virtuais têm 60 clubes: os 14 de `OUTROS` + os 46 clubes de `EXTRA_D_CLUBS`. Os extras entram em `leagueTeams` com `group: 'MM'` e `power = basePower + boost` da temporada (mesma regra de `initLeagueSeason`).
- Os grupos virtuais são formados quando a 1ª fase termina: os 60 clubes são embaralhados, divididos em 15 grupos de 4 e ordenados por `power + rng() * 40`, o que dá 1º a 4º. Esses grupos não têm jogos exibidos.
- O modelo de sorteio é determinístico por temporada, para a chave aparecer completa desde a 1ª rodada (`serieDDrawTemplate(season)`):
  1. `rng = mulberry32(season * 7919 + 4)`.
  2. Pote 1 = `['1º A1', '2º A1', ..., '1º A16', '2º A16']` (32 rótulos). Pote 2 = os 32 rótulos de 3º e 4º.
  3. Embaralhar o pote 2. Para cada `i`, formar o par `pote1[i]` x `pote2[i]`. Se os dois forem do mesmo grupo, trocar `pote2[i]` com `pote2[(i + 1) % 32]` e repetir até nenhum par ser do mesmo grupo.
  4. Embaralhar a ordem dos 32 pares: essa é a ordem dos confrontos t0 a t31.
- O mandante da volta é o time do pote 1. **Exceção mantida do protótipo:** o usuário sempre joga a ida fora e a volta em casa. Se ele estiver no pote 2, os lados do confronto se invertem.
- Fases seguintes: o confronto `k` da fase N+1 junta os vencedores de `2k` e `2k+1`; manda a volta o vencedor de `2k`, salvo se o usuário estiver no confronto.
- Sem Playoff de Acesso: quem perde as quartas está eliminado (revisão).
- Final (`D_FINAL`, ida e volta): vencedores das semis. Disputa de 3º (`D_THIRD`, **jogo único**, rodada 1, junto com a ida da final): perdedores das semis.
- Sobem 4 clubes: os 4 semifinalistas, ou seja, os vencedores das quartas (como no Brasileirão).

Assinaturas: `serieDDrawTemplate(season): Array<[string, string]>` e `seedSerieDR64(args: { season: number; a1Top4: string[]; virtualPool: string[]; teams: Record<string, { power: number }>; rng: Rng }): { pairs: Array<[string, string]>; tags: Record<string, string> }`. Cada par vem como `[mandanteDaVolta, visitante]`, e `tags` guarda rótulos como `'2º A7'`.

`EXTRA_D_CLUBS` (`src/utils/extraClubs.ts`), com nomes inventados e ids `dx_1` a `dx_46`, `basePower = 628 + ((i * 17) % 61)` e estilo em rodízio por `['Equilibrado','Contra-Ataque','Retranca','Pressão Alta','Posse de Bola','Transição Rápida','Jogo Aéreo','Ofensivo Total']`:

1 Arapuã EC, 2 Canjerana FC, 3 Taquaral do Oeste, 4 Cerro Azul do Sertão, 5 Jacarandá Atlético, 6 Ipueiras FC, 7 Aroeira Esporte, 8 Lagoa Funda EC, 9 Morro Alto FC, 10 Buritizal AC, 11 Cachoeira do Pombo, 12 Seringal EC, 13 Piracema FC, 14 Vereda Grande EC, 15 Capim Dourado EC, 16 Barro Vermelho FC, 17 Maracajá EC, 18 Sucupira Atlético, 19 Juriti FC, 20 Carnaubal EC, 21 Guará-Mirim FC, 22 Pedra Lisa AC, 23 Tamanduá EC, 24 Riacho Seco FC, 25 Babaçu do Norte, 26 Angico Atlético, 27 Serra do Facão FC, 28 Bacuri FC, 29 Caraíba EC, 30 Pau-Ferro AC, 31 Lajedo FC, 32 Tucunaré EC, 33 Mandacaru FC, 34 Várzea Bonita EC, 35 Chapada Alta FC, 36 Cajueiro AC, 37 Pitanga do Vale, 38 Jatobá EC, 39 Coqueiral FC, 40 Ribeirão Manso, 41 Siriema Atlético, 42 Graúna FC, 43 Umbuzeiro EC, 44 Taboca FC, 45 Araticum EC, 46 Gameleira AC.

Os escudos vêm do fallback por hash de `getTeamIdentity`, então não é preciso mexer em `teamIdentities.ts`. A lista também entra em `docs/catalogo-nomes-ficticios.md`.

### 2.4 Série C (final e 3º lugar entre os quadrangulares)

- `C_FINAL` (ida e volta): 1º do Grupo B x 1º do Grupo C. Manda a volta quem tiver a melhor campanha no quadrangular (pontos, vitórias, saldo, gols pró); se o usuário estiver no confronto, manda ele.
- `C_THIRD` (jogo único, rodada 1, junto com a ida da final): 2º do B x 2º do C. Jogo único é o mais simples e segue o mesmo formato da disputa de 3º da Série D; o fluxo de fase paralela (`PARALLEL_STAGES`) já cobre a diferença de pernas.
- Acesso: os 4 que sobem já estão definidos ao fim do quadrangular (1º e 2º de cada grupo). Perder a final ou o 3º não tira o acesso.
- Modelo exibido desde a 1ª fase: `'1º Grupo B' x '1º Grupo C'` e `'2º Grupo B' x '2º Grupo C'`.

---

## 3. Simulação dos jogos dos outros times

Arquivo novo `src/utils/bracket.ts` (puro, sem Vue nem Pinia, com `rng` injetável).

### 3.1 Placar por OVER, compatível com `simulateMatchTick`

No jogo do usuário, cada tick (45 por partida) tem a chance `clamp(0.11 + (atk - opp)/1600, 0.05, 0.24)`, depois 0,56 de acertar o gol e 0,44 de virar gol. O adversário usa 0,10 / 0,52 / 0,40, e o mandante ganha +18 de OVER. Para dois times da IA, usa-se a média simétrica dos dois lados, com a mesma estrutura de ticks:

```ts
export const SIM_TICKS = 45
export const HOME_ADVANTAGE = 18
export const FORM_SWING = 12          // aleatoriedade controlada: forma do dia ±12 OVER

export function simulateMatchScore(homePower: number, awayPower: number, rng: Rng = Math.random) {
  const h = homePower + HOME_ADVANTAGE + (rng() * 2 - 1) * FORM_SWING
  const a = awayPower + (rng() * 2 - 1) * FORM_SWING
  const pH = clamp(0.105 + (h - a) / 1600, 0.045, 0.23)
  const pA = clamp(0.105 + (a - h) / 1600, 0.045, 0.23)
  let home = 0, away = 0
  for (let t = 0; t < SIM_TICKS; t++) {
    if (rng() < pH && rng() < 0.54 && rng() < 0.42) home++
    if (rng() < pA && rng() < 0.54 && rng() < 0.42) away++
  }
  return { home, away }
}
```

Referência para os testes: com OVER igual e mandante +18, a média esperada é cerca de 1,19 x 0,96 (total de 2,15). O jogo do usuário em casa contra OVER igual dá cerca de 1,34 x 0,83 (total de 2,18): o total de gols é o mesmo, e a pequena vantagem própria do usuário continua exclusiva dele.

**Onde se aplica:** a todos os jogos de mata-mata simulados (copa, continental, Série D e Série C) e aos jogos de grupo continentais dos outros times. A fórmula atual da liga em pontos corridos e grupos (`Math.random() * (2.4 + diff)`) **não muda**, porque é regra do protótipo.

### 3.2 Pênaltis

```ts
const BASE_CONVERSION = 0.76

/** Disputa por cobranças alternadas: 5 para cada, encerra cedo se já decidida, depois morte súbita (até 20). */
export function simulateShootout(rng: Rng = Math.random, convHome = BASE_CONVERSION, convAway = BASE_CONVERSION): PenaltyShootout

/** Conversão ajustada por OVER: 0.76 + clamp((proprio - outro) / 4000, -0.04, 0.04). */
export function shootoutConversions(homePower: number, awayPower: number): [number, number]

/** Disputa com vencedor imposto (regra do usuário): repete simulateShootout até o vencedor bater; até 100 tentativas, senão devolve 5x4 orientado. */
export function shootoutWithWinner(winner: 'home' | 'away', rng: Rng = Math.random): PenaltyShootout
```

- **Confronto entre times da IA:** o resultado sai da própria disputa, com conversões ajustadas por OVER.
- **Confronto do usuário:** as probabilidades atuais continuam valendo (55% na copa, no continental e no agregado da liga). Sorteia-se primeiro quem vence (`rng() < 0.55`) e depois gera-se um placar plausível com `shootoutWithWinner`. O que muda é só que agora o placar dos pênaltis fica gravado e aparece na tela.
- **Ida e volta:** decide o agregado. Não existe gol fora de casa (regra atual). Agregado empatado vai para os pênaltis, gravados em `tie.penalties` (chave) ou em `homePens`/`awayPens` do jogo da volta (liga).

### 3.3 Funções do núcleo (`src/utils/bracket.ts`)

```ts
export function createTie(id: string, roundIndex: number, slot: number, legCount: 1 | 2,
  homeId: string | null, awayId: string | null, homeLabel = 'A definir', awayLabel = 'A definir'): BracketTie
/** Cria legs quando os dois times são conhecidos. Ida e volta: legs[0] = visitante x mandante, legs[1] = mandante x visitante. */
export function fillTieTeams(tie: BracketTie, homeId: string, awayId: string): void
export function createBracket(p: {
  competition: BracketCompetition; season: number; label: string; teams: BracketTeam[]
  rounds: Array<{ key: string; label: string; shortLabel: string; legCount: 1 | 2 }>
  firstRound: Array<[string | null, string | null]>
  firstRoundLabels?: Array<[string, string]>
  thirdPlace: boolean; thirdLegCount?: 1 | 2
}): Bracket                                                           // fases seguintes vazias, com rótulos 'Venc. <fase> N'
export function playLeg(tie: BracketTie, legIndex: number, homeGoals: number, awayGoals: number): void
export function tieAggregate(tie: BracketTie): { home: number; away: number } | null // null se falta jogo
export function resolveTie(tie: BracketTie, teams: Record<string, BracketTeam>, rng?: Rng, userDrawWinProb?: number): void
export function simulateTie(tie: BracketTie, teams: Record<string, BracketTeam>, rng?: Rng): void // não toca em confronto com 'user'
export function propagate(bracket: Bracket, opts?: { userHosts?: boolean }): void
export function userPendingTie(bracket: Bracket): BracketTie | null      // fases em ordem, depois thirdPlace
export function simulatePhaseExceptUser(bracket: Bracket, roundIndex: number, rng?: Rng): void
export function completeBracket(bracket: Bracket, rng?: Rng, opts?: { forfeitUser?: boolean }): void
export function buildPodium(bracket: Bracket, userName: string): Podium | null
export function userFinalPosition(bracket: Bracket): 1 | 2 | 3 | 4 | null
```

Regras do núcleo:

- `propagate` preenche a fase N+1 com os vencedores (slot `2k` vira o mandante e `2k+1` o visitante) e a disputa de 3º com os perdedores das semis. Com `userHosts`, se o usuário estiver num confronto ainda não jogado, os lados se invertem para ele mandar. Quando final e 3º estão resolvidos, preenche `bracket.podium`.
- `simulatePhaseExceptUser(b, r)` simula todos os confrontos da fase `r` sem o usuário. Se `r` é a final, simula também a disputa de 3º (fase única "decisões"). Isso faz a chave **andar junto com o usuário**: cada partida dele fecha a fase inteira.
- `completeBracket` repete simular e propagar até haver pódio. Com `forfeitUser`, o confronto pendente do usuário vira W.O. para o adversário (`walkover: true`, sem placar), o que equivale ao protótipo: copa não jogada não paga nem dá título.
- `buildPodium` usa campeão = vencedor da final, vice = perdedor e 3º = vencedor da disputa de 3º. `isUser` vale para `teamId === 'user'`; o nome do usuário vem do parâmetro.

---

## 4. Avanço da chave após cada partida do usuário

`concludeMatch` (`useMatchSimulation.ts`) **não muda de estrutura**: continua chamando `applyCupResult`, `applyContinentalResult` e `recordRoundResults` + `evaluateStageProgression`. A integração fica dentro das stores.

### 4.1 Taça Cacique: `competitions.applyCupResult(uGoals, oGoals, clubName)`

```
const b = cup.bracket (garantido por ensureBrackets)
const tie = userPendingTie(b); se null -> toast 'Competição já encerrada.' (warning)
const isThird = tie === b.thirdPlace
playLeg(tie, 0, ...)                      // o usuário é o mandante da perna
resolveTie(tie, b.teams, Math.random, 0.55)
isThird ? simulateTie(final) : simulatePhaseExceptUser(b, tie.roundIndex)
propagate(b, { userHosts: true })
scoreLabel = `${u} x ${o}` + (tie.penalties ? ` (Pênaltis ${pu}x${po}: ${venceu ? 'Classificado' : 'Eliminado'})` : '')
```

| Situação | Efeito |
|---|---|
| Venceu R16/QF/SF | Cota da fase `PRIZES.cup.rounds[idx]` (20.000 / 30.000 / 40.000, seção 8), `history`, `roundIndex += 1`, `currentRival` = adversário do próximo confronto (`{ name, power, serieCode: team.tag }`). Toast atual. |
| Venceu a final | `PRIZES.cup.rounds[3]` (70.000), `champion = true`, `finalPosition = 1`, `recordTrophy` (como hoje). O 3º lugar é simulado nessa hora e o pódio é montado. |
| Perdeu a SF | Sem cota. `thirdPlace = true`, `eliminated` continua `false`, `currentRival` = adversário da disputa de 3º. Toast: "Eliminado na semifinal. Dispute o 3º lugar!" (warning). |
| Disputa de 3º | Vitória: `PRIZES.cup.thirdWin` (25.000), `finalPosition = 3`, toast "3º LUGAR NA TAÇA CACIQUE! Cota: R$ 25.000" (success). Derrota: `PRIZES.cup.thirdLoss` (10.000), `finalPosition = 4`, toast "4º lugar na Taça Cacique." (info). Nos dois casos: `eliminated = true`, `thirdPlace = false`, `currentRival = null`. A final é simulada nessa hora e o pódio é montado. |
| Perdeu a final | Cota de vice `PRIZES.cup.finalLoss` (40.000, nova), `eliminated = true`, `finalPosition = 2`, toast "Vice-campeão da Taça Cacique." (info). |
| Perdeu R16/QF | `eliminated = true`; `completeBracket(b)` simula o resto na hora e o pódio aparece no painel. Toast atual. |

`cupRoundLabel`: com `thirdPlace` ligado, mostra `'Disputa de 3º Lugar'`; senão, os nomes atuais. `initCupForSeason` monta a chave (`seedCup` + `createBracket`) e põe `currentRival` = D1 com `serieCode: 'Série D'` (como hoje).

### 4.2 Continental: `competitions.applyContinentalResult(uGoals, oGoals, clubName, rivalName)`

Fase de grupos:

- O usuário é atualizado como hoje.
- **Muda a simulação dos rivais:** no grupo A, o outro par da rodada joga de verdade (`simulateMatchScore`), no lugar do resultado aleatório por time. Em B, C e D, os dois jogos da mesma rodada são simulados pelo calendário da seção 2.2. Assim as tabelas ficam coerentes (soma de gols, jogos entre si).
- Na 6ª rodada, os 4 grupos são ordenados, `seedContinentalQuarterFinals` monta os pares e `fillTieTeams` preenche as QF da chave criada no início.
  - Se o usuário ficou fora do G-2: `eliminated = true` e `completeBracket` simula o resto (o pódio aparece).
  - Se ficou no G-2: `stage = 'QF'`.

Mata-mata:

- Mesmo padrão da copa: `userPendingTie`, `playLeg`, `resolveTie(…, 0.55)`, simulação da fase e `propagate`.
- Cota por jogo (grupos e mata-mata, inclusive o 3º): `PRIZES.continental.win` (40.000) na vitória por placar e `PRIZES.continental.other` (20.000) no resto. Bônus de colocação ao fim: campeão `champion` 100.000, vice `runnerUp` 50.000, 3º `third` 25.000, 4º nada (seção 8).

| Situação | Efeito |
|---|---|
| Venceu QF | `stage = 'SF'`. |
| Venceu SF | `stage = 'FINAL'`. |
| Perdeu SF | `stage = 'THIRD'`, não é eliminado. Toast: "Eliminado na semifinal continental. Dispute o 3º lugar!" |
| THIRD | `finalPosition` 3 (+25.000 de bônus) ou 4, `eliminated = true`; a final é simulada nessa hora. |
| Venceu FINAL | Título e bônus de 100.000 (antes 500.000), `finalPosition = 1`. |
| Perdeu FINAL | Bônus de vice 50.000 (novo), `eliminated = true`, `finalPosition = 2`. |
| Perdeu QF | `eliminated = true`, `completeBracket`. |

`continentalOpponent`: em `GROUPS` continua como hoje. Nas outras fases, devolve o adversário de `userPendingTie(bracket)` com `{ name, power, style: 'Copa Condor' }`. **Isso corrige o erro do adversário repetido.**

`continentalStageLabel` ganha `'THIRD'` → `'Disputa de 3º Lugar Continental'`. `initContinentalForSeason(true, tier)` cria o grupo A, os outros grupos e a chave com o modelo de rótulos.

### 4.3 Série D e Série C: `league.recordRoundResults` e `league.evaluateStageProgression`

Arquivo novo `src/utils/leagueKnockout.ts` (adaptador puro entre jogos da liga e chave):

```ts
export const STAGE_TIE_COUNT: Partial<Record<CompetitionStageType, number>> =
  { D_R64: 32, D_R32: 16, D_R16: 8, D_QF: 4, D_SF: 2, D_FINAL: 1, D_THIRD: 1, C_FINAL: 1, C_THIRD: 1 }
export const SINGLE_LEG_STAGES: CompetitionStageType[] = ['D_THIRD', 'C_THIRD']
export const PARALLEL_STAGES: Partial<Record<CompetitionStageType, CompetitionStageType[]>> = {
  D_FINAL: ['D_THIRD'], D_THIRD: ['D_FINAL'],
  C_FINAL: ['C_THIRD'], C_THIRD: ['C_FINAL']
}
/** pairs: [mandanteDaVolta, visitante]. Ida: rodada 1 (visitante manda); volta: rodada 2. Jogo único: rodada 1, mandante = pairs[i][0]. id: fx_<stage>_t<k>_l<leg> | fx_<stage>_t<k>. */
export function buildKnockoutFixtures(stage: CompetitionStageType, pairs: Array<[string, string]>): LeagueFixture[]
/** Resolve os confrontos da fase com todos os jogos disputados; grava pênaltis no último jogo. Devolve vencedor/perdedor por tie. */
export function resolveStageTies(fixtures: LeagueFixture[], stage: CompetitionStageType,
  powerOf: (id: string) => number, rng?: Rng, userDrawWinProb?: number): Array<{ tie: number; winnerId: string; loserId: string }>
export function stageTieResults(fixtures: LeagueFixture[], stage: CompetitionStageType): Array<{ tie: number; winnerId: string; loserId: string }> | null // só lê; null se incompleto
/** Visão de chave (para BracketView) derivada dos jogos; fases ainda não criadas aparecem com rótulos. */
export function buildLeagueBracketView(a: {
  division: number; season: number; stage: CompetitionStageType; fixtures: LeagueFixture[]
  teams: LeagueTeam[]; clubName: string
}): Bracket | null
```

Mudanças em `stores/league.ts`:

1. **`recordRoundResults`:** o laço passa a aceitar `fx.stage === competitionStage || PARALLEL_STAGES[competitionStage]?.includes(fx.stage)` na mesma rodada. Jogos de fases em `KNOCKOUT_STAGES` usam `simulateMatchScore(homePower, awayPower)`; os demais mantêm a fórmula atual.
2. **`knockoutAggregateScore`:** filtrar só os jogos do confronto do usuário (`homeId === 'user' || awayId === 'user'`). Hoje ele somaria os 32 confrontos.
3. **`computeStandings` / `leagueStandings`:** nas fases de mata-mata, a tabela usa a última fase de grupos (Série D: `D_GROUPS`/`A1`; Série C: `C_QUADRANGULAR` com o grupo do usuário). Aceitar um parâmetro opcional `groupOverride` para montar a tabela do outro quadrangular. Sem isso, Dashboard, Header e Sidebar listariam os 64 clubes zerados.
4. **Novas funções internas:**
   - `startSerieDKnockout(userQualified)`: G-4 do A1, grupos virtuais, `seedSerieDR64`, extras em `leagueTeams` e jogos de `D_R64`.
   - `completeParallelStages(stage)`: simula as pernas restantes das fases paralelas.
   - `generateNextStages(stage)`: idempotente, só cria se ainda não existir. Tabela: R64→R32→R16→QF; QF → SF (vencedores); SF completa → FINAL (vencedores das SF) + THIRD (perdedores das SF); C_QUADRANGULAR → C_FINAL + C_THIRD.
   - `completeLeaguePostseason()`: simula, resolve e gera em laço até FINAL e THIRD estarem resolvidos (Série D) ou C_FINAL e C_THIRD (Série C). Na Série C, se o quadrangular ainda não existe, cria e simula com a fórmula atual dos grupos.
5. **Computeds novos:**
   - `knockoutBracket = buildLeagueBracketView(...)`: Série D em qualquer fase (na 1ª fase mostra o modelo de rótulos); Série C em qualquer fase (rótulos até o fim do quadrangular).
   - `knockoutPodium`: `knockoutBracket?.podium ?? null`.
   - `groupStageStandings` e `otherQuadrangularStandings`.

`evaluateStageProgression`, Série D (substitui o bloco `div === 4` atual). Os valores vêm de `PRIZES.serieD` (seção 8), nunca escritos no código como número solto:

```
D_GROUPS: rank > 4 -> startSerieDKnockout(false); completeLeaguePostseason(); end(4, PRIZES.serieD.groups, <toast atual>)
          senão    -> startSerieDKnockout(true); stage = 'D_R64'; advance(<toast atual>)
demais:   completeParallelStages(stage); const r = resolveStageTies(...stage e paralelas, 0.55 no confronto do usuário)
          userWon = vencedor do tie do usuário === 'user'; generateNextStages(stage)
  D_R64/R32/R16: perdeu -> completeLeaguePostseason(); end(4, PRIZES.serieD.knockout, <toast atual>)
                 venceu -> stage = próxima; advance(`Avançou para: ${STAGE_NAMES[next]}!`)
  D_QF:     venceu -> stage = 'D_SF'; advance(<atual>)
            perdeu -> completeLeaguePostseason(); end(4, PRIZES.serieD.qf, 'Eliminado nas Quartas de Final da Série D. Tente novamente!', 'warning')
  D_SF:     venceu -> stage = 'D_FINAL'; advance('Na Final Nacional da Série D! Acesso garantido.')
            perdeu -> stage = 'D_THIRD'; advance('Acesso garantido! Dispute o 3º lugar da Série D.', 'success')
  D_FINAL:  venceu -> end(3, PRIZES.serieD.champion, 'CAMPEÃO NACIONAL DA SÉRIE D!', 'title', 'Campeão da Série D')
            perdeu -> end(3, PRIZES.serieD.runnerUp, 'Vice-campeão da Série D. Acesso garantido!', 'success', 'promotion', 'Acesso Série D -> Série C')
  D_THIRD:  venceu -> end(3, PRIZES.serieD.third, '3º LUGAR NA SÉRIE D! ACESSO GARANTIDO!', 'success', 'promotion', ...)
            perdeu -> end(3, PRIZES.serieD.fourth, '4º lugar na Série D. Acesso garantido!', 'success', 'promotion', ...)
```

`evaluateStageProgression`, Série C. O acesso (quem sobe) é o atual: `rank <= 2` no quadrangular sobe; `rank > 2` fica. A final e o 3º só mudam título, prêmio e pódio. Valores de `PRIZES.serieC` (seção 8):

```
C_FIRST_STAGE: rank >= 17 -> completeLeaguePostseason(); end(4, PRIZES.serieC.relegated, <atual>)
               rank > 8   -> completeLeaguePostseason(); end(3, PRIZES.serieC.stayed, <atual>)
               rank <= 8  -> como hoje (quadrangulares)
C_QUADRANGULAR: generateNextStages; rank 1 -> stage = 'C_FINAL'; advance('Acesso garantido! Agora, a Final Nacional da Série C.')
                rank 2 -> stage = 'C_THIRD'; advance('Acesso garantido! Dispute o 3º lugar da Série C.')
                rank > 2 -> completeLeaguePostseason(); end(3, PRIZES.serieC.quadElim, <atual>)
C_FINAL: completeParallelStages; venceu -> end(2, PRIZES.serieC.champion, 'CAMPEÃO NACIONAL DA SÉRIE C!', 'title', 'Campeão da Série C')
                                 perdeu -> end(2, PRIZES.serieC.runnerUp, 'Vice-campeão da Série C. Acesso para a Série B!', 'success', 'promotion', 'Acesso Série C -> Série B')
C_THIRD: completeParallelStages; venceu -> end(2, PRIZES.serieC.third, '3º lugar na Série C! Acesso para a Série B!', ...promotion)
                                 perdeu -> end(2, PRIZES.serieC.fourth, '4º lugar na Série C. Acesso para a Série B!', ...promotion)
```

Hoje quem termina em 1º recebe o prêmio de campeão na hora. Com a final, o prêmio de campeão vai para quem vence a final; o 1º do grupo que perde a final continua subindo e recebe o valor de vice.

Em `leagueScheduler.ts`: `STAGE_NAMES` ganha `D_THIRD: 'Série D — Disputa de 3º Lugar'` e `C_THIRD: 'Série C — Disputa de 3º Lugar'`; `KNOCKOUT_STAGES` ganha os dois. `SERIE_META[3].formatSummary` passa a terminar em "→ Final (ida e volta) e disputa de 3º". `buildTwoLegTie` deixa de ser usado e é removido (ou fica marcado `@deprecated` até a migração).

---

## 5. Disputa de 3º lugar

### 5.1 Fluxo

| Competição | Quem joga | Formato | Quando |
|---|---|---|---|
| Taça Cacique | perdedores das semis | jogo único | junto com a final (a que o usuário não joga é simulada quando ele joga a dele) |
| Continental | perdedores das semis | jogo único | junto com a final |
| Série D | perdedores das semis | jogo único, rodada 1 | junto com a ida da final; a volta da final fecha quando o usuário termina a fase dele |
| Série C | 2º do Grupo B x 2º do Grupo C | jogo único, rodada 1 | junto com a ida da final |

Se o usuário perde a semifinal (ou termina em 2º no quadrangular da Série C), ele **joga** a disputa de 3º como partida normal: `prepareMatch` → pré-jogo → partida → `concludeMatch` → resultado com a cota de 3º. Caso contrário, a disputa é simulada.

### 5.2 Prêmios de 3º lugar

Os prêmios de 3º e 4º fazem parte da tabela única revisada da seção 8 (constante `PRIZES` em `src/utils/constants.ts`). Resumo da colocação final, já com os valores novos:

| Competição | Campeão | Vice | 3º | 4º |
|---|---|---|---|---|
| Taça Cacique (acumulado das cotas) | 160.000 | 130.000 | 75.000 | 60.000 |
| Continental (acumulado no mata-mata, vencendo no placar) | 220.000 | 150.000 | 125.000 | 80.000 |
| Série D (bônus de fim de temporada) | 99.000 | 91.000 | 86.000 | 82.000 |
| Série C (bônus de fim de temporada) | 148.500 | 136.500 | 129.000 | 123.000 |
| Série B (bônus; 2º a 4º sobem) | 223.000 | 205.000 | 193.500 | 184.500 |
| Série A (bônus) | 334.000 | 307.000 | 290.500 | 277.000 |

Critério: campeão > vice > 3º > 4º sempre, com degraus que crescem para o topo; e a escada entre séries da seção 8.2.

### 5.3 `isCompetitionPlayable`, `prepareMatch` e `useNavigation`

Não existe competição nova em `MatchCompetition`. A disputa de 3º usa `'cup'`, `'continental'` ou `'league'`:

- **Copa:** `isCompetitionPlayable('cup')` continua `!eliminated && !champion && !!currentRival`. Na disputa de 3º, `eliminated = false` e `currentRival` é o adversário, então a partida é jogável. Depois dela, `eliminated = true`, e `finishMatchAndReturn` devolve `activeMatchCompetition` para `'league'`, como hoje.
- **Continental:** continua `qualified && !eliminated && !champion`, com `stage === 'THIRD'` jogável.
- **Liga:** `nextUserFixture` encontra o jogo de `D_THIRD` ou `C_THIRD`, e `nextFixtureIsHome` funciona.
- **`activeMatchCompetitionLabel`:** copa = `'Taça Cacique • Disputa de 3º Lugar'` (vem de `cupRoundLabel`); continental vem de `continentalStageLabel`; liga no mata-mata = `currentStageLabel + ' • Jogo de Ida' | ' • Jogo de Volta' | ' • Jogo Único'` (pelo `leg` do próximo jogo) no lugar de "Rodada N".
- **`useNavigation`:** o selo de "Competições" mostra `'!'` também com `competitions.hasPendingThirdPlace` (computed novo: `cupState.thirdPlace || continentalState.stage === 'THIRD'` e jogável).

---

## 6. Interface

Componentes novos em `src/components/bracket/`. São apresentacionais: recebem a chave por prop e não leem store, exceto `TeamCrest`, que já lê `club`.

Paleta: 60% canvas, 30% surface e 10% ink e emeraldpro. `amberpro` e `dangerpro` ficam só para perigo. O caminho do usuário usa `emeraldpro`. O pódio não usa dourado: o campeão fica em `emeraldpro`, o vice em `ink-light` e o 3º em `subtle`.

### 6.1 `BracketTieCard.vue`

Props: `tie: BracketTie`, `teams: Record<string, BracketTeam>`, `userPower?: number`, `compact?: boolean`.

```html
<div :class="['rounded-xl border bg-surface text-xs overflow-hidden divide-y divide-borderline',
              isUserTie ? 'border-emeraldpro ring-1 ring-emeraldpro/30' : 'border-borderline']">
  <!-- uma linha por lado; o mandante do último jogo (homeId) fica sempre em cima -->
  <div v-for="side in sides" :key="side.key"
       :class="['flex items-center gap-2 px-2.5 py-1.5', side.isUser ? 'bg-emeraldpro-soft/50' : '']">
    <TeamCrest size="xs" :team="side.id ?? undefined" :name="side.name" :is-user="side.isUser" />
    <span :class="['flex-1 min-w-0 truncate',
                   side.isWinner ? 'font-bold text-ink' : tie.winnerId ? 'text-ink-muted' : 'text-ink',
                   !side.id ? 'italic text-ink-muted' : '']">
      {{ side.id ? side.name : side.label }}
    </span>
    <span v-if="side.power && !compact" class="hidden lg:inline text-[10px] font-score text-ink-muted">OVER {{ side.power }}</span>
    <!-- ida e volta: gols por jogo + agregado; jogo único: só o placar -->
    <span v-for="(g, i) in side.legGoals" :key="i" class="w-4 text-center font-score tabular-nums text-ink-muted">{{ g ?? '–' }}</span>
    <span v-if="tie.legCount === 2" class="w-5 text-center font-score font-extrabold tabular-nums text-ink">{{ side.aggregate ?? '' }}</span>
    <span v-if="tie.penalties" class="text-[10px] font-score text-ink-muted">({{ side.pens }})</span>
  </div>
  <div v-if="!compact && footer" class="px-2.5 py-1 bg-subtle text-[10px] text-ink-muted">{{ footer }}</div>
</div>
```

Rodapé (só fora do modo compacto): `'Ida 1x0 • Volta 2x2 • Agregado 3x2'`, `'Pênaltis 4 x 3'`, `'W.O.'` ou `'Resultado anterior à chave'` (legado). Para `id === 'user'`, o nome vem de `useClubStore().name` e o OVER de `userPower`.

### 6.2 `BracketView.vue`

Props: `bracket: Bracket`, `title?: string`, `userPower?: number`.

```html
<section class="bg-surface rounded-2xl p-4 sm:p-5 border border-borderline shadow-sm space-y-4">
  <header class="flex flex-wrap items-center justify-between gap-2">
    <h4 class="font-bold text-sm text-ink">{{ title ?? 'Chaveamento' }}</h4>
    <span class="flex items-center gap-1.5 text-[11px] text-ink-muted">
      <span class="w-2.5 h-2.5 rounded-sm bg-emeraldpro"></span> Seu caminho
    </span>
  </header>

  <!-- Celular: fases em abas -->
  <div class="md:hidden space-y-3">
    <div class="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
      <button v-for="(t, i) in tabs" :key="t.key" type="button" @click="activeTab = i"
        :class="['shrink-0 snap-start px-3 py-1.5 rounded-lg text-xs font-bold',
                 i === activeTab ? 'bg-emeraldpro text-white' : 'bg-subtle text-ink-muted']">{{ t.shortLabel }}</button>
    </div>
    <div class="space-y-2">
      <BracketTieCard v-for="tie in tabs[activeTab].ties" :key="tie.id" :tie="tie" :teams="bracket.teams" :user-power="userPower" />
    </div>
  </div>

  <!-- Desktop: árvore em colunas -->
  <div class="hidden md:block space-y-3">
    <div v-if="bracket.rounds.length > 4" class="flex flex-wrap items-center gap-1.5">
      <span class="text-[11px] text-ink-muted mr-1">Ver a partir de:</span>
      <button v-for="(r, i) in bracket.rounds.slice(0, -3)" ... :class="i === startRound ? 'bg-emeraldpro text-white' : 'bg-subtle text-ink-muted'">{{ r.shortLabel }}</button>
    </div>
    <div class="overflow-auto max-h-[70vh] -mx-1 px-1">
      <div class="flex gap-6 min-w-max" :style="{ height: treeHeight + 'px' }">
        <div v-for="(round, ri) in visibleRounds" :key="round.key" class="flex flex-col w-56">
          <div class="h-5 mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-muted">{{ round.label }}</div>
          <div class="flex-1 flex flex-col">
            <div v-for="(pair, pi) in pairsOf(round)" :key="pi" class="relative flex-1 flex flex-col">
              <div v-for="tie in pair" :key="tie.id" class="flex-1 flex items-center py-1">
                <BracketTieCard compact class="w-full" :tie="tie" :teams="bracket.teams" :user-power="userPower" />
              </div>
              <template v-if="ri < visibleRounds.length - 1 && pair.length === 2">
                <span :class="['absolute -right-3 top-1/4 bottom-1/4 w-3 border-y-2 border-r-2 rounded-r-md', lineClass(pair)]"></span>
                <span :class="['absolute -right-6 top-1/2 w-3 border-t-2', lineClass(pair)]"></span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Decisões extras (os dois layouts) -->
  <div v-if="bracket.thirdPlace || bracket.side" class="grid gap-3 sm:grid-cols-2">
    <div v-if="bracket.thirdPlace" class="space-y-1.5">
      <h5 class="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Disputa de 3º lugar</h5>
      <BracketTieCard :tie="bracket.thirdPlace" :teams="bracket.teams" :user-power="userPower" />
    </div>
    <div v-if="bracket.side" class="space-y-1.5">
      <h5 class="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{{ bracket.side.label }}</h5>
      <BracketTieCard v-for="t in bracket.side.ties" :key="t.id" :tie="t" :teams="bracket.teams" :user-power="userPower" />
    </div>
  </div>
</section>
```

Lógica:

- `pairsOf(round)` agrupa os confrontos de 2 em 2. Com o mesmo `flex-1` em todas as colunas, o centro do confronto `j` da fase N+1 cai exatamente no meio dos confrontos `2j` e `2j+1` da fase N. O traço vertical vai de `top-1/4` a `bottom-1/4` do par, e o horizontal sai em `top-1/2`, cobrindo os 24 px de `gap-6`.
- `lineClass(pair)` devolve `'border-emeraldpro'` se o usuário venceu um dos dois confrontos do par, e `'border-borderline'` caso contrário.
- `treeHeight = visibleRounds[0].ties.length * (compact ? 68 : 84) + 24`.
- `startRound` padrão: 0 se a 1ª fase tem até 8 confrontos. Senão, `min(faseDoUsuario ?? 0, rounds.length - 4)`. Na Série D isso abre nas oitavas, ou na fase em que o usuário estiver.
- `activeTab` padrão: a fase do confronto pendente do usuário; senão, a última com resultado.
- `tabs` = fases + `'3º lugar'` + lado (playoff).

### 6.3 `PodiumCard.vue`

Props: `podium: Podium`.

```html
<section class="bg-surface rounded-2xl p-5 border border-borderline shadow-sm space-y-4">
  <header class="flex items-center justify-between gap-2">
    <h4 class="font-bold text-sm text-ink flex items-center gap-2"><Trophy class="w-4 h-4 text-emeraldpro" /> Pódio — {{ podium.competitionLabel }}</h4>
    <span class="text-[11px] text-ink-muted">Temporada {{ podium.season }}</span>
  </header>
  <div class="grid grid-cols-3 items-end gap-2 sm:gap-4">
    <!-- ordem visual: 2º, 1º, 3º -->
    <div v-for="slot in [runnerUp, champion, third]" :key="slot.place" class="flex flex-col items-center gap-1.5 text-center min-w-0">
      <TeamCrest :size="slot.place === 1 ? 'lg' : 'md'" :team="slot.entry.teamId" :name="slot.entry.name" :is-user="slot.entry.isUser" />
      <span class="text-xs font-bold text-ink truncate max-w-full">{{ slot.entry.name }}</span>
      <span v-if="slot.entry.isUser" class="px-2 py-0.5 rounded-full bg-emeraldpro-soft text-emeraldpro text-[10px] font-bold">Seu clube</span>
      <div :class="['w-full rounded-t-xl flex flex-col items-center justify-center', slot.platform]">
        <span class="font-score text-2xl font-extrabold">{{ slot.place }}º</span>
        <span class="text-[10px] uppercase font-bold tracking-wide">{{ slot.title }}</span>
      </div>
    </div>
  </div>
  <p class="text-[11px] text-ink-muted text-center">Final: {{ podium.finalSummary }}<template v-if="podium.thirdSummary"> • 3º lugar: {{ podium.thirdSummary }}</template></p>
</section>
```

Plataformas: 1º `h-24 bg-emeraldpro text-white` ("Campeão"); 2º `h-16 bg-ink-light text-white` ("Vice"); 3º `h-12 bg-subtle border border-borderline text-ink` ("3º lugar"). Se `third` for null, a coluna mostra "—".

### 6.4 `PodiumArchiveCard.vue`

Props: `podiums: Podium[]`, `season: number`. Emite `close`.

É um cartão compacto "Pódios da Temporada N", com uma linha por competição: rótulo + 3 escudos `xs` com nome e colocação. A posição do usuário fica em `bg-emeraldpro-soft/50`, e há um botão "Ocultar" (`text-ink-muted hover:text-ink`). Layout: `space-y-2`, linhas `flex items-center gap-3 p-3 rounded-xl bg-subtle border border-borderline`; no celular, os 3 times quebram em `grid grid-cols-3`.

### 6.5 Onde entram

- **`CupPanel.vue`:**
  1. Cabeçalho: o selo "Mata-Mata Nacional • Jogo Único" passa de `amberpro` para `bg-emeraldpro-soft text-emeraldpro`. O botão usa `Jogar {{ cupRoundLabel }}`, então também cobre "Jogar Disputa de 3º Lugar". Selo de estado: `finalPosition` 1 = campeão (atual); 2 = "Vice-campeão" (`bg-subtle text-ink`); 3 = "3º lugar" (`bg-emeraldpro-soft text-emeraldpro`); 4 = "4º lugar" (`bg-subtle text-ink`); eliminado antes = selo atual.
  2. `PodiumCard` quando `cupState.bracket?.podium`.
  3. "Confronto da Fase Atual" (o atual, com o título "Disputa de 3º Lugar" quando for o caso).
  4. `BracketView` com `title="Chave da Taça Cacique"` e `:user-power="squad.teamStrength.total"`.
  5. Campanha (atual).
- **`ContinentalPanel.vue`:** CTA com rótulo por fase ("Jogar Disputa de 3º Lugar" em `THIRD`); `PodiumCard`; tabela do grupo A (atual, título "Grupo A"); "Outros grupos" em `grid gap-3 sm:grid-cols-3` com tabelas compactas (#, escudo, clube, P, SG); `BracketView` com `title="Mata-mata continental"`; resultados (atual).
- **`LeagueView.vue`:**
  - Abas locais "Classificação" e "Chave do Mata-Mata". Aparecem quando `league.knockoutBracket` existe (Série D ou C). A aba padrão é "Chave" quando `isKnockoutStage`.
  - Na aba Chave: `BracketView` à largura total.
  - Na aba Classificação da Série C em `C_QUADRANGULAR` ou depois: tabela do grupo do usuário + tabela do outro grupo.
  - O botão "Jogar Rodada N" vira "Jogar Ida", "Jogar Volta" ou "Jogar Jogo Único" no mata-mata.
  - O banner de confronto eliminatório troca `border-amberpro`/`text-amberpro` por `border-emeraldpro`/`text-emeraldpro`, e o texto "Ida e Volta" vira "Jogo Único" em `D_THIRD`/`C_THIRD`.
  - O pódio da liga aparece pelo `PodiumArchiveCard` no topo, porque a temporada vira no mesmo instante.
- **`CompetitionsView.vue`:** `PodiumArchiveCard` no topo, com pódios de copa e continental da temporada anterior que o usuário não viu.

---

## 7. Persistência e migração

### 7.1 Gravação

Nada muda em `saveGame`: as chaves continuam 17. Os campos novos ficam dentro de `cupState`, `continentalState`, `leagueFixtures`, `leagueTeams` e `club`.

### 7.2 Carga (`usePersistence.loadGame`)

Depois de `competitions.fromSave(...)`, chamar `competitions.ensureBrackets()`. Depois de `league.fromSave(p)` (e do `initLeagueSeason` de fallback), chamar `league.ensureKnockoutTies()`.

`competitions.fromSave` normaliza com `{ ...emptyCup(), ...data.cupState }` e `{ ...emptyContinental(), ...data.continentalState }`, para os campos novos receberem os valores padrão (`bracket: null`, `thirdPlace: false`, `finalPosition: null`, `otherGroups: []`). `club.fromSave` lê `podiumArchive ?? []`.

**`ensureBrackets()` na Taça Cacique, quando `bracket === null` (save antigo):**

1. Descobrir o id do `currentRival` por `TEAM_ID_BY_NAME`, ou pelo nome no `LEAGUE_CLUBS_POOL` (fallback `legacy_rival`).
2. `seedCup` sem esse id e `createBracket`.
3. Para cada fase `r < roundIndex`: o confronto do usuário vira vitória `legacy: true`, com o placar lido de `history` (procurar `roundName` e aplicar o regex `/(\d+) x (\d+)/` em `summary`; o primeiro número é do usuário; sem o placar, fica `null`, com `played: true`). Os outros confrontos são simulados, e então `propagate`.
4. Na fase `roundIndex`, se o adversário do usuário (X) não é o `currentRival`, **renomear X para o rival** em todo o mapa e nas pernas. É seguro, porque o caminho de X foi todo simulado.
5. Estados finais:
   - `champion`: usuário vence o restante como legado, `completeBracket` e `finalPosition = 1`.
   - `eliminated` com `roundIndex === 2` (semi): abrir a disputa de 3º (`eliminated = false`, `thirdPlace = true`, `currentRival` = adversário do 3º). É a regra nova aplicada a quem caiu na semi.
   - `eliminated` na final: `finalPosition = 2`.
   - Outro `eliminated`: `completeBracket`.

**`ensureBrackets()` no continental, quando `qualified` e falta `bracket` ou `otherGroups`:**

1. Criar B, C e D com `seedContinentalGroups`, mantendo o grupo A atual. Simular as rodadas já jogadas nos outros grupos: `groupRound - 1` em `GROUPS`, as 6 nas outras fases.
2. Criar a chave com o modelo. Fora de `GROUPS`, preencher as QF com a classificação. Se o usuário não estiver no G-2 pelos números, trocá-lo com o 2º.
3. As fases anteriores à atual viram vitórias do usuário como legado, com placar de `history` quando houver.
4. `eliminated` na SF vira `stage = 'THIRD'`, com `eliminated = false`. Nos outros casos, `completeBracket`. `champion` vira `finalPosition = 1`.

**`ensureBrackets()` geral:** se `bracket.season !== club.season` e a competição ainda está em andamento, manter a chave mesmo assim (a virada é quem a troca).

**`league.ensureKnockoutTies()`, quando `competitionStage` está em `KNOCKOUT_STAGES` e os jogos da fase não têm `tie`:**

1. Os dois jogos do usuário (`fx_<stage>_1` e `fx_<stage>_2`) recebem `tie: 0`, `leg: 1` e `leg: 2`, e ganham os ids novos.
2. Criar os outros `STAGE_TIE_COUNT[stage] - 1` confrontos. Os times vêm de `leagueTeams` (sem o usuário e sem o rival) e, se faltarem, de `EXTRA_D_CLUBS` (adicionados com `group: 'MM'`). Os pares são aleatórios. Se a ida do usuário já foi jogada, simular as idas dos outros.
3. Criar também as fases paralelas (`PARALLEL_STAGES`) com outros clubes, para o fluxo de final e 3º funcionar.
4. Fases anteriores não são reconstruídas: `buildLeagueBracketView` começa na primeira fase que existe.

### 7.3 Virada de temporada (`useSeason.startNewSeason`)

Antes de `club.season += 1`:

```ts
competitions.finishCupForSeason()          // se a chave da copa não tem pódio: completeBracket(b, rng, { forfeitUser: true }) (usuário pendente = W.O.)
competitions.finishContinentalForSeason()  // idem, se qualified
const podiums = [league.knockoutPodium, competitions.cupState.bracket?.podium, competitions.continentalState.bracket?.podium]
  .filter((p): p is Podium => !!p)
club.archivePodiums(podiums)               // unshift, mantém 12, sem duplicar (competition + season)
```

`wonCup` e `wonContinental` continuam vindo de `champion`, e W.O. nunca dá título, como no protótipo. `club.resetCareerRecords()` limpa `podiumArchive`. A store `ui` ganha `hiddenPodiumSeason = ref<number | null>(null)` (não é salva) para o botão "Ocultar".

---

## 8. Rebalanceamento de prêmios (autorizado pelo dono)

### 8.1 Economia atual (medida no código)

Fontes: `useEconomy.settleMatch`, `stores/club.ts`, `generatePlayer.ts`, `squad.initializeDefaultSquad`, `constants.ts` (`UPGRADE_COSTS`, `STAFF_CATALOG`, `SCOUT_MISSIONS`), `league.ts`, `competitions.ts` e `useSeason.ts`.

- **Por partida** (toda competição): bilheteria `6.500 × nível do estádio` em casa e 40% disso fora; patrocínio `7.500 × nível de finanças`; bônus de resultado 9.500 (vitória) ou 3.500 (empate); **menos a folha inteira do elenco a cada jogo** (`salário = 780 + (OVER − 55) × 58` por jogador, mínimo 850). O orçamento nunca fica negativo (`Math.max(0, …)`).
- **Elenco inicial:** 16 jogadores (11 titulares OVER 62–68, 5 reservas OVER 58–64), folha de cerca de 20.600 por jogo. Orçamento inicial: 280.000.
- **Custos:**
  - Instalações, por nível: 2º cerca de 53.000, 3º cerca de 125.000, 4º cerca de 270.000, 5º cerca de 530.000 (média dos 6 itens).
  - Staff: 40.000 a 50.000 (pagamento único).
  - Missões de olheiro: 8.000 a 55.000.
  - Jogador OVER 70 de 25 anos: cerca de 123.000; renovação = 22% do valor.
- **Jogos por temporada:**
  - Série D: 10 na 1ª fase + 2 por fase de mata-mata (até 22).
  - Série C: 19, mais 6 do quadrangular e 2 da final.
  - Séries B e A: 38.
  - Mais copa (até 4 ou 5 jogos), continental (até 10) e finais.

Script de cálculo: `C:\Users\elphant\AppData\Local\Temp\claude\0f8ef87c2114f600\48409bd1-6c12-4a38-8f86-3c063b9d548e\scratchpad\econ\econ3.mjs` (rodar com `node`; `econ2.mjs`, na mesma pasta, tem a versão v2). Premissas do "clube típico" de cada série:

| Série | Elenco (titulares/reservas, nº) | Nível estádio/finanças | Folha por jogo |
|---|---|---|---|
| D | 65 / 61, 16 | 1 | 20.600 |
| C | 70 / 65, 20 | 2 | 30.300 |
| B | 75 / 70, 22 | 3 | 39.600 |
| A | 80 / 75, 24 | 4 | 49.800 |

Taxa de resultados: 45% V, 25% E, 30% D. Metade dos jogos em casa.

Resultado por jogo, sem prêmios: D −3.080, C −660, B +2.285, A +4.305. **Na D e na C a operação dá prejuízo; quem sustenta o clube são os prêmios.** Por isso o rebalanceamento corta forte no topo e mantém, ou sobe um pouco, o piso.

### 8.2 Escada entre séries (decisão do dono: séries mais altas pagam melhor)

A versão anterior desta tabela (chamada "v2" abaixo) tinha inversões:

- o campeão da D (130 mil) recebia mais que quem permanece na B (110 mil) e na C (85 mil);
- vice, 3º e 4º da D (110 / 100 / 90 mil) recebiam acima do "permanece" da C;
- o "permanece" da A (140 mil) ficava perto do campeão da C.

**Regra nova:** cada prêmio de série = base por tipo de resultado (valores da Série D) × fator da série. O fator tem razão constante de 1,5 entre degraus: D 1; C 1,5; B 2,25; A 3,375. Arredondamento para 500.

| Tipo de resultado | Base (D) | Onde se aplica em cada série |
|---|---|---|
| eliminado cedo / rebaixado | 48.000 | D: cai na 1ª fase. C, B e A: rebaixado. |
| permanece / meio | 66.000 | D: cai na 2ª fase, 3ª fase ou oitavas. C: 9º a 18º. B: 5º a 16º. A: 5º a 16º. |
| fase final sem acesso | 72.000 | D: perde o playoff. C: 3º ou 4º do quadrangular. |
| acesso sem pódio | 78.000 | D: vence o playoff. |
| 4º | 82.000 | D e C: perde a disputa de 3º. B e A: 4º da tabela. |
| 3º | 86.000 | D e C: vence a disputa de 3º. B e A: 3º da tabela. |
| vice | 91.000 | D e C: perde a final. B e A: 2º da tabela. |
| campeão | 99.000 | D e C: vence a final. B e A: 1º da tabela. |

Garantias, conferidas automaticamente por `econ3.mjs`:

1. Para cada tipo de resultado, a série de cima paga **estritamente** mais que a de baixo (razão de 1,5).
2. Dentro de cada série, a ordem é estrita: campeão > vice > 3º > 4º > acesso > fase final > permanece > eliminado. Os degraus do pódio crescem para o topo (4, 5 e 8 mil na base).
3. O campeão de uma série recebe **no máximo** o "permanece" da série de cima: campeão D 99.000 = permanece C 99.000; campeão C 148.500 = permanece B 148.500; campeão B 223.000 = permanece A 223.000.
   - Isso fixa a razão campeão/permanece de cada série em 1,5. Subir de série passa a ser a recompensa maior, porque todos os prêmios da série seguinte são maiores.
   - Optei pela igualdade e não por "estritamente menor" para não apertar o pódio da D. Na D, a operação dá prejuízo por jogo, e o pódio precisa manter uma diferença visível para o "permanece". Não foi preciso relaxar nenhuma outra regra: a Série D continua viável (seção 8.3).

Copa, continental, Supercopa e Recopa (valores mantidos da v2, já coerentes):

- **Taça Cacique:** cotas por fase crescentes 20 / 30 / 40 / 70 mil. Acumulado: campeão 160 mil > vice 130 mil > 3º 75 mil > 4º 60 mil.
- **Continental:** cota de 40 mil por vitória e 20 mil no resto, mais bônus de 100 / 50 / 25 / 0 mil. Acumulado no mata-mata: 220 > 150 > 125 > 80 mil.
- **Supercopa:** 80 mil para o campeão e 30 mil para o vice. **Recopa** (decisão continental, por isso paga mais): 120 mil e 45 mil.

### 8.3 Saldo esperado por temporada (jogos + prêmios)

Script: `C:\Users\elphant\AppData\Local\Temp\claude\0f8ef87c2114f600\48409bd1-6c12-4a38-8f86-3c063b9d548e\scratchpad\econ\econ3.mjs`. Mesmas premissas de clube típico da seção 8.1. "xUp" = saldo ÷ custo médio do próximo nível de instalação (D 53 mil, C 125 mil, B 270 mil, A 530 mil).

| Série | Campanha | Antigo (protótipo) | v2 | **Novo** |
|---|---|---|---|---|
| D | eliminado na 1ª fase | — | — | 31.000 (0,59) |
| D | médio (cai no mata-mata; copa: vence oitavas) | 10.700 (0,20) | 35.700 (0,67) | **36.700 (0,69)** |
| D | campeão (+ copa até o 3º) | 286.800 (5,41) | 121.800 (2,30) | **90.800 (1,71)** |
| C | rebaixado | — | — | 78.100 (0,63) |
| C | médio (9º a 18º) | 61.100 (0,49) | 91.100 (0,73) | **105.100 (0,84)** |
| C | campeão (com a final) | 470.200 (3,76) | 210.200 (1,68) | **202.400 (1,62)** |
| B | médio | 206.400 (0,76) | 221.400 (0,82) | **259.900 (0,96)** |
| B | campeão | 818.300 (3,03) | 358.300 (1,33) | **396.300 (1,47)** |
| A | médio (+ continental, cai nas quartas) | 760.300 (1,43) | 556.300 (1,05) | **639.300 (1,21)** |
| A | campeão (+ continental até o 3º + Supercopa) | 2.165.500 (4,09) | 916.500 (1,73) | **1.020.500 (1,93)** |

Leitura:

- **Clube médio:** fica entre 0,69 e 1,21 ampliação por temporada. O valor cresce com a série, como o dono pediu. Com vendas, empréstimos e o caixa inicial de 280 mil, dá cerca de uma ampliação por temporada.
- **Campeão:** fica entre 1,5 e 1,9 ampliação, contra 3 a 5,4 no protótipo. Não acumula dinheiro desproporcional.
- **A Série D não trava no zero:** até o pior caso (cair na 1ª fase) fecha a temporada com cerca de +31 mil, mesmo com a operação dando −3.080 por jogo.

### 8.4 Tabela completa: antigo, v2 e novo

| Competição | Item (chave de `PRIZES`) | Antigo | v2 | **Novo** | Fator novo/antigo |
|---|---|---|---|---|---|
| Taça Cacique | `cup.rounds[0]` oitavas | 25.000 | 20.000 | **20.000** | 0,80 |
| | `cup.rounds[1]` quartas | 45.000 | 30.000 | **30.000** | 0,67 |
| | `cup.rounds[2]` semifinal | 80.000 | 40.000 | **40.000** | 0,50 |
| | `cup.rounds[3]` campeão | 350.000 | 70.000 | **70.000** | 0,20 |
| | `cup.finalLoss` vice | 0 | 40.000 | **40.000** | novo |
| | `cup.thirdWin` / `cup.thirdLoss` | — | 25.000 / 10.000 | **25.000 / 10.000** | novo |
| Continental | `continental.win` cota por vitória | 65.000 | 40.000 | **40.000** | 0,62 |
| | `continental.other` empate/derrota | 25.000 | 20.000 | **20.000** | 0,80 |
| | `continental.champion` bônus | 500.000 | 100.000 | **100.000** | 0,20 |
| | `continental.runnerUp` / `third` | 0 | 50.000 / 25.000 | **50.000 / 25.000** | novo |
| Supercopa | `supercup.champion` / `runnerUp` | 250.000 / 0 | 80.000 / 30.000 | **80.000 / 30.000** | 0,32 |
| Recopa | `recopa.champion` / `runnerUp` | 600.000 / 0 | 120.000 / 45.000 | **120.000 / 45.000** | 0,20 |
| Série D | `serieD.groups` cai na 1ª fase | 25.000 | 45.000 | **48.000** | 1,92 |
| | `serieD.knockout` cai na 2ª/3ª fase/oitavas | 35.000 | 65.000 | **66.000** | 1,89 |
| | `serieD.playoffLoss` | 35.000 | 65.000 | **72.000** | 2,06 |
| | `serieD.playoffWin` (acesso) | 120.000 | 85.000 | **78.000** | 0,65 |
| | `serieD.fourth` | 140.000* | 90.000 | **82.000** | 0,59 |
| | `serieD.third` | 140.000* | 100.000 | **86.000** | 0,61 |
| | `serieD.runnerUp` | 140.000 | 110.000 | **91.000** | 0,65 |
| | `serieD.champion` | 300.000 | 130.000 | **99.000** | 0,33 |
| Série C | `serieC.relegated` | 25.000 | 35.000 | **72.000** | 2,88 |
| | `serieC.stayed` 9º a 18º | 50.000 | 85.000 | **99.000** | 1,98 |
| | `serieC.quadElim` 3º/4º do quadrangular | 65.000 | 100.000 | **108.000** | 1,66 |
| | `serieC.fourth` | 220.000** | 125.000 | **123.000** | 0,56 |
| | `serieC.third` | 220.000** | 130.000 | **129.000** | 0,59 |
| | `serieC.runnerUp` | 420.000*** | 140.000 | **136.500** | 0,33 |
| | `serieC.champion` | 420.000 | 155.000 | **148.500** | 0,35 |
| Série B | `serieB.relegated` | 45.000 | 50.000 | **108.000** | 2,40 |
| | `serieB.stayed` 5º a 16º | 90.000 | 110.000 | **148.500** | 1,65 |
| | `serieB.fourth` (4º, sobe) **chave nova** | 320.000 | 150.000 | **184.500** | 0,58 |
| | `serieB.promotion` (mantida, = `fourth`) | 320.000 | 150.000 | **184.500** | 0,58 |
| | `serieB.third` (3º, sobe) **chave nova** | 320.000 | 150.000 | **193.500** | 0,60 |
| | `serieB.runnerUp` (2º, sobe) **chave nova** | 320.000 | 150.000 | **205.000** | 0,64 |
| | `serieB.champion` | 650.000 | 185.000 | **223.000** | 0,34 |
| Série A | `serieA.relegated` | 80.000 | 70.000 | **162.000** | 2,03 |
| | `serieA.stayed` 5º a 16º | 250.000 | 140.000 | **223.000** | 0,89 |
| | `serieA.fourth` **chave nova** | 250.000 | 140.000 | **277.000** | 1,11 |
| | `serieA.third` **chave nova** | 250.000 | 140.000 | **290.500** | 1,16 |
| | `serieA.runnerUp` **chave nova** | 250.000 | 140.000 | **307.000** | 1,23 |
| | `serieA.champion` | 1.200.000 | 230.000 | **334.000** | 0,28 |

\* No protótipo, os dois semifinalistas recebiam 140.000. \*\* O 2º do quadrangular recebia 220.000. \*\*\* O 1º do quadrangular era campeão direto.

### 8.5 Objeto `PRIZES` exato e onde editar

Em `src/utils/constants.ts`. As chaves da v2 continuam todas iguais; o código de T6 a T9 segue valendo, só os valores mudam. **Chaves novas:** `serieB.runnerUp`, `serieB.third`, `serieB.fourth`, `serieA.runnerUp`, `serieA.third` e `serieA.fourth`. `serieB.promotion` fica como alias de `serieB.fourth`, por compatibilidade.

```ts
export const PRIZES = {
  cup: { rounds: [20000, 30000, 40000, 70000], finalLoss: 25000, thirdWin: 25000, thirdLoss: 10000 },
  continental: { win: 40000, other: 20000, champion: 100000, runnerUp: 50000, third: 25000 },
  supercup: { champion: 80000, runnerUp: 30000 },
  recopa: { champion: 120000, runnerUp: 45000 },
  serieD: { groups: 48000, knockout: 66000, playoffLoss: 72000, playoffWin: 78000, fourth: 82000, third: 86000, runnerUp: 91000, champion: 99000 },
  serieC: { relegated: 72000, stayed: 99000, quadElim: 108000, fourth: 123000, third: 129000, runnerUp: 136500, champion: 148500 },
  serieB: { relegated: 108000, stayed: 148500, promotion: 184500, fourth: 184500, third: 193500, runnerUp: 205000, champion: 223000 },
  serieA: { relegated: 162000, stayed: 223000, fourth: 277000, third: 290500, runnerUp: 307000, champion: 334000 }
} as const
```

| Arquivo | O que muda |
|---|---|
| `src/utils/constants.ts` | valores de `PRIZES` acima e as 6 chaves novas. |
| `src/utils/leagueScheduler.ts` | `SERIE_META[n].championPrize` lê `PRIZES.serieX.champion` (99.000 / 148.500 / 223.000 / 334.000). |
| `src/stores/competitions.ts` | `applyCupResult`, `applyContinentalResult` e `applyFinalResult` (campeão e vice) só por `PRIZES`. |
| `src/stores/league.ts` | todos os `end(...)`. Série B: 1º `champion`, 2º `runnerUp`, 3º `third`, 4º `fourth`, ≥17º `relegated`, resto `stayed`. Série A: 1º `champion`, 2º a 4º `runnerUp`/`third`/`fourth`, ≥17º `relegated`, resto `stayed`. D e C conforme a seção 4.3. |
| `src/components/competitions/CupPanel.vue` e `SupercupsPanel.vue` | textos de prêmio lendo `PRIZES`. |

Saves antigos não são afetados: os prêmios são pagos na hora. Os troféus já recebidos mantêm o `prize` antigo na galeria.

**Efeito na T9 em andamento:** se os testes da T9 foram escritos com números fixos da v2, eles quebram quando os valores mudarem. Regra: testes comparam com `PRIZES.*`, nunca com literal. A troca de valores é feita só na T19 (sem mexer na lógica de D e C).

---

## 9. Tarefas para o implementador (Sonnet)

### Regras para todas as tarefas

- Projeto: `C:\Users\elphant\Downloads\Super XI`. Não fazer commit. Não mexer em arquivos fora da lista da tarefa.
- Critério de pronto comum: `npx vue-tsc --noEmit` e `npm run build` sem erro, mais o teste da tarefa passando.
- Os testes são scripts Node em `C:\Users\elphant\AppData\Local\Temp\claude\0f8ef87c2114f600\48409bd1-6c12-4a38-8f86-3c063b9d548e\scratchpad\`, com base no `rt.mjs` que já existe lá: `createServer` do Vite com `root: 'C:/Users/elphant/Downloads/Super XI'`, `vs.ssrLoadModule('/src/...')`, stubs de `localStorage`, `window`, `location`, `history` e `document`, e `setActivePinia(createPinia())`. Cada script imprime `OK <nome>` por verificação, sai com `process.exit(1)` na primeira falha e fecha o servidor (`await vs.close()`). Rodar com `node "<caminho completo do script>"`.
- Funções com sorteio recebem `rng`. Nos testes, usar `mulberry32(seed)` e semente fixa.
- Textos em português, nada de nomes reais e nenhuma citação a confederação ou federação. Poder sempre com o rótulo "OVER".

### Grafo e paralelismo

```
Onda 1: T1
Onda 2: T2, T3, T4                       (paralelas; dependem só de T1)
Onda 3: T5 (T2,T3), T6 (T2,T3)           (paralelas)
Onda 4: T7 (T6), T8 (T5)                 (paralelas)
Onda 5: T9 (T8), T13 (T4,T6), T14 (T4,T7) (paralelas)
Onda 6a: T19 (T7,T9), T10 (T7,T9), T12 (T7,T9), T15 (T4,T9)   (paralelas: arquivos distintos)
Onda 6b: T11 (T19; mesmos arquivos competitions.ts/league.ts)
Onda 7: T16 (T10,T15) -> T17 (todas) -> T18 (revisão Opus)
```

---

**T1. Tipos e nomes de fase**
- Arquivos: `src/types/bracket.ts` (novo), `src/types/index.ts`, `src/types/competitions.ts`, `src/types/league.ts`, `src/types/club.ts`, `src/utils/leagueScheduler.ts` (só `STAGE_NAMES` e `KNOCKOUT_STAGES`), `src/stores/competitions.ts` (só `emptyCup`/`emptyContinental` com os campos novos e `fromSave` com spread sobre o vazio).
- O que fazer: copiar exatamente os tipos das seções 1.1 a 1.4. Acrescentar `D_THIRD` e `C_THIRD` em `STAGE_NAMES` e `KNOCKOUT_STAGES`. Em `continentalStageLabel`, acrescentar o caso `'THIRD'`. Acrescentar a constante `PRIZES` (seção 8.5) em `src/utils/constants.ts`, sem usá-la ainda.
- Pronto: compila e o build passa. Sem teste de script.
- Não fazer: lógica nova.

**T2. Núcleo da chave e simulação** (depende de T1)
- Arquivos: `src/utils/random.ts` (`Rng`, `mulberry32`, `shuffle`), `src/utils/bracket.ts` (novo).
- O que fazer: implementar a seção 3 inteira com as assinaturas exatas.
- Teste `t02-bracket.mjs`:
  1. 20.000 jogos com OVER 800 x 800: média do mandante entre 1,10 e 1,28 e do visitante entre 0,88 e 1,05.
  2. OVER 900 x 800: o mais forte vence pelo menos 55% dos jogos únicos.
  3. `simulateShootout`: vencedor tem mais gols; cada lado entre 0 e 20; nas 5 primeiras cobranças nenhum lado passa de 5 sem morte súbita.
  4. `shootoutWithWinner('away')` sempre faz o visitante vencer.
  5. Chave de 16 com 1 perna e 3º: `completeBracket` gera pódio com 3 times diferentes; os times da disputa de 3º são os perdedores das semis; cada time aparece no máximo uma vez por fase.
  6. Confronto de 2 pernas com agregado 2x2 resolve com `penalties` não nulo.
  7. `forfeitUser` marca `walkover` e o usuário não fica no pódio.
  8. Mesma semente, mesmo resultado.
- Não fazer: importar Vue ou Pinia.

**T3. Semeadura e clubes extras** (depende de T1; em paralelo com T2)
- Arquivos: `src/utils/extraClubs.ts` (novo, lista da seção 2.3), `src/utils/bracketSeeding.ts` (novo: `seedCup`, `seedContinentalGroups`, `CONTINENTAL_QF_TEMPLATE`, `seedContinentalQuarterFinals`, `serieDDrawTemplate`, `seedSerieDR64`, `SERIE_C_FINAL_TEMPLATE`), `docs/catalogo-nomes-ficticios.md` (seção "Clubes extras do mata-mata da Série D").
- Teste `t03-seeding.mjs`:
  1. `seedCup`: 16 ids únicos, primeiro par com `'user'` e um clube `d_*`, distribuição 4 A, 4 B, 4 C e 3 D.
  2. Grupos continentais: 16 times únicos, 4 por grupo, usuário no grupo A como índice 0.
  3. `serieDDrawTemplate(5)` é igual em duas chamadas, tem 32 pares, nenhum par do mesmo grupo e cada rótulo exatamente uma vez.
  4. `seedSerieDR64`: 64 ids únicos; se o usuário está no confronto, ele é o primeiro do par.
  5. Nenhum nome de `EXTRA_D_CLUBS` repete um nome de `LEAGUE_CLUBS_POOL`, `CONTINENTAL_RIVALS` ou `OFFER_RIVAL_CLUBS`.
- Não fazer: mexer em `leagueScheduler.ts`.

**T4. Componentes visuais** (depende de T1; em paralelo com T2 e T3)
- Arquivos: `src/components/bracket/BracketTieCard.vue`, `BracketView.vue`, `PodiumCard.vue`, `PodiumArchiveCard.vue` (todos novos).
- O que fazer: seguir a seção 6 (markup e classes). `BracketView` monta abas e árvore só a partir das props.
- Pronto: compila e o build passa.
- Teste `t04-components.mjs`: `ssrLoadModule` de cada `.vue` com `createSSRApp` + `renderToString` (de `vue/server-renderer`) com uma chave de 16 montada à mão no próprio script, sem depender de T2. O HTML contém "Disputa de 3º lugar", "OVER" e "Campeão", e não contém "undefined".
- Não fazer: ler stores (exceto `useClubStore` para o nome do usuário em `BracketTieCard`) nem usar `amberpro` ou `dangerpro`.

**T5. Adaptador do mata-mata da liga** (depende de T2 e T3)
- Arquivos: `src/utils/leagueKnockout.ts` (novo, seção 4.3).
- O que fazer:
  - `buildLeagueBracketView` para a divisão 4: fases R64→FINAL (rótulos `'2ª Fase'`, `'3ª Fase'`, `'Oitavas'`, `'Quartas'`, `'Semifinal'`, `'Final'`), lado `'Playoff de Acesso'`, 3º `D_THIRD`. Na `D_GROUPS`, a R64 sai com os rótulos de `serieDDrawTemplate(season)`.
  - Para a divisão 3: só a fase `'Final'` + 3º, com rótulos `SERIE_C_FINAL_TEMPLATE` até existirem jogos.
  - Pódio quando final e 3º estão resolvidos.
- Teste `t05-league-knockout.mjs`:
  1. `buildKnockoutFixtures('D_R64', 32 pares)` gera 64 jogos, ida na rodada 1 com o visitante mandando e volta na rodada 2.
  2. `resolveStageTies` grava pênaltis só no jogo da volta quando o agregado empata.
  3. A visão da divisão 4 na `D_GROUPS` tem 6 fases, e a R64 com 32 confrontos rotulados.
  4. Jogos fabricados até a final + 3º geram pódio.
- Não fazer: mexer na store.

**T6. Taça Cacique na store** (depende de T2 e T3)
- Arquivos: `src/stores/competitions.ts` (valores sempre de `PRIZES.cup`).
- O que fazer:
  - `initCupForSeason` com chave.
  - `applyCupResult` conforme a seção 4.1.
  - `cupRoundLabel` com o 3º.
  - `finishCupForSeason()`.
  - Computed `hasPendingThirdPlace` (só a parte da copa por enquanto).
  - Exportar o que for novo.
- Teste `t06-cup.mjs`:
  1. Store real. `initCupForSeason`: chave com 8 confrontos nas oitavas e `currentRival` igual ao adversário do usuário.
  2. Vencer 3 jogos: a cada fase os outros confrontos ficam resolvidos e `currentRival` é o adversário real.
  3. Perder a semi: `thirdPlace = true`, `isCompetitionPlayable('cup')` true, `cupRoundLabel === 'Disputa de 3º Lugar'`.
  4. Vencer o 3º: `finalPosition 3`, +25.000 no orçamento, `bracket.podium.third.isUser`, final resolvida.
  5. Nova chave e derrota nas oitavas: pódio existe na hora.
  6. Empate: `penalties` gravado.
  7. Vencer as 4 fases soma 160.000; perder a final paga 40.000.
- Não fazer: escrever valores como número solto.

**T7. Continental na store** (depende de T6, mesmo arquivo)
- Arquivos: `src/stores/competitions.ts`.
- O que fazer: seção 4.2 inteira, mais `finishContinentalForSeason()` e o `hasPendingThirdPlace` completo.
- Teste `t07-continental.mjs`:
  1. `initContinentalForSeason(true)`: 4 grupos e QF com rótulos.
  2. Após 6 rodadas, a soma de gols pró é igual à de gols contra em cada grupo, e cada time jogou 6.
  3. QF preenchidas pelo modelo.
  4. `continentalOpponent` nas QF é o adversário da chave, e na SF é outro time.
  5. Perder a SF: `stage 'THIRD'` jogável; o 3º paga 40.000 ou 20.000 de cota, mais 25.000 de bônus se vencer. Campeão recebe +100.000 de bônus e vice +50.000.
  6. Pódio no fim.
  7. Ficar fora do G-2: pódio na hora.
- Não fazer: mexer em Supercopa ou Recopa.

**T8. Série D na store da liga** (depende de T5)
- Arquivos: `src/stores/league.ts`, `src/utils/leagueScheduler.ts` (só `computeStandings` com `groupOverride` e a regra de tabela no mata-mata; remover ou marcar `buildTwoLegTie`).
- O que fazer: itens 1 a 4 da seção 4.3 e o bloco `div === 4` de `evaluateStageProgression`.
- Teste `t08-serie-d.mjs`:
  1. Pinia + `initLeagueSeason(4, 1)`. Jogar a 1ª fase chamando `recordRoundResults(3, 0)` + `evaluateStageProgression()` até avançar.
  2. A `D_R64` tem 64 jogos e 64 times únicos, com 46 extras em `leagueTeams`.
  3. `knockoutAggregateScore` soma só o confronto do usuário.
  4. Ao fim de cada fase, a próxima existe completa.
  5. Perder nas quartas leva a `D_PLAYOFF` e a semi é simulada em paralelo.
  6. Perder a semi leva a `D_THIRD` jogável, com outcome `endSeason` de bônus `PRIZES.serieD.third` ou `PRIZES.serieD.fourth` depois dela. O teste compara com `PRIZES`, nunca com número fixo.
  7. Ser eliminado na 1ª fase: `knockoutPodium` não nulo antes do `end`.
  8. `leagueStandings` no mata-mata tem 6 linhas (grupo A1).
- Não fazer: mudar a fórmula dos jogos de grupo.

**T9. Série C e computeds de visão** (depende de T8, mesmo arquivo)
- Arquivos: `src/stores/league.ts`, `src/utils/leagueScheduler.ts` (`SERIE_META[3].formatSummary`).
- O que fazer: bloco `div === 3` da seção 4.3, `completeLeaguePostseason` para a Série C e os computeds `knockoutBracket`, `knockoutPodium`, `groupStageStandings` e `otherQuadrangularStandings`.
- Teste `t09-serie-c.mjs`:
  1. Fim do quadrangular em 1º leva a `C_FINAL` com 2 jogos e `C_THIRD` com 1 jogo.
  2. Em 2º, leva a `C_THIRD`.
  3. Vencer a final: `endSeason` com `PRIZES.serieC.champion`, `'title'` e `nextDivision 2`; perder: `PRIZES.serieC.runnerUp`, `'promotion'`, `nextDivision 2`. No 3º: `third` / `fourth`, ambos com `nextDivision 2`. O teste compara com `PRIZES`, nunca com número fixo.
  4. Terminar em 3º ou 4º no quadrangular: `nextDivision 3` (acesso inalterado) e o pódio da Série C existe.
  5. Eliminado na 1ª fase: pódio da Série C existe.
  6. `knockoutBracket` existe nas divisões 3 e 4 e é null nas 1 e 2.
- Não fazer: mexer nas Séries A e B nem na regra de acesso.

**T10. Virada de temporada e arquivo de pódios** (depende de T7 e T9)
- Arquivos: `src/stores/club.ts` (`podiumArchive`, `archivePodiums`, `toSave`/`fromSave`/`resetCareerRecords`), `src/composables/useSeason.ts`, `src/stores/ui.ts` (`hiddenPodiumSeason`).
- O que fazer: seção 7.3.
- Teste `t10-season.mjs`:
  1. Iniciar carreira, jogar a copa até a semi sem terminar e encerrar a liga da Série D: `club.podiumArchive` tem os pódios da liga e da copa (a copa com W.O. do usuário), o usuário não ganha título da copa e a nova temporada tem chave nova.
  2. Arquivo com no máximo 12 itens e sem duplicatas.

**T11. Persistência e migração** (depende de T7 e T9)
- Arquivos: `src/stores/competitions.ts` (`ensureBrackets`), `src/stores/league.ts` (`ensureKnockoutTies`), `src/composables/usePersistence.ts`.
- O que fazer: seção 7.2.
- Teste `t11-migration.mjs`:
  1. Gravar no `localStorage` um save no formato antigo, montado no script a partir de um `saveGame()` real, removendo os campos novos e trocando por: `cupState` com `roundIndex: 2`, `currentRival` Porto Praiano e `history` de 2 itens; `continentalState` qualificado em `'SF'`; liga na divisão 4 em `D_R16` com `fx_D_R16_1` jogado e `fx_D_R16_2` pendente.
  2. `loadGame()` devolve true.
  3. O adversário do usuário na semi da copa é Porto Praiano e `cupState.currentRival.name` não mudou.
  4. Continental com 4 grupos e confronto pendente do usuário na SF.
  5. `D_R16` com 8 confrontos e `nextUserFixture.leg === 2`.
  6. `saveGame()` produz exatamente as 17 chaves.
  7. Save → load → save dá JSON idêntico.
  8. Save antigo eliminado na semi da copa abre a disputa de 3º.

**T12. Rótulos e navegação** (depende de T7 e T9)
- Arquivos: `src/composables/useMatchSimulation.ts` (só `activeMatchCompetitionLabel`), `src/composables/useNavigation.ts` (selo).
- O que fazer: seção 5.3.
- Teste `t12-labels.mjs`: com a liga em `D_THIRD`, o rótulo termina em "Jogo Único"; na volta, em "Jogo de Volta"; com `cupState.thirdPlace`, o rótulo contém "Disputa de 3º Lugar".

**T13. CupPanel** (depende de T4 e T6)
- Arquivos: `src/components/competitions/CupPanel.vue`.
- O que fazer: seção 6.5 (copa), mais o texto de prêmio do campeão lendo `PRIZES.cup` (seção 8.5).
- Pronto: compila, build passa e teste `t13-cup-panel.mjs` (renderToString com a store preparada em semifinal perdida: contém "Jogar Disputa de 3º Lugar" e "Chave da Taça Cacique").

**T14. ContinentalPanel** (depende de T4 e T7)
- Arquivos: `src/components/competitions/ContinentalPanel.vue`.
- O que fazer: seção 6.5 (continental).
- Teste `t14-continental-panel.mjs`: renderiza com grupos B, C e D e a chave.

**T15. LeagueView** (depende de T4 e T9)
- Arquivos: `src/views/LeagueView.vue`.
- O que fazer: seção 6.5 (liga): abas, botão por perna, banner em emeraldpro e as duas tabelas do quadrangular.
- Teste `t15-league-view.mjs`: na Série D em `D_R16`, renderiza "Chave do Mata-Mata" e "Jogar Ida".

**T16. Cartão de pódios da temporada anterior** (depende de T10 e T15)
- Arquivos: `src/views/LeagueView.vue`, `src/views/CompetitionsView.vue`.
- O que fazer: mostrar `PodiumArchiveCard` com os pódios de `season === club.season - 1` quando `ui.hiddenPodiumSeason !== club.season - 1`. "Ocultar" grava `hiddenPodiumSeason`.
- Pronto: compila e build passa. Conferir visualmente em `npm run dev`, no celular (375 px) e no desktop.

**T17. Teste ponta a ponta** (depende de todas)
- Arquivos: só o script `t17-e2e.mjs`.
- O que fazer:
  1. Carreira nova; 3 temporadas forçando `club.division` 4, depois 3, depois 1, e um continental qualificado.
  2. Laço de até 600 partidas: escolher a primeira competição jogável na ordem copa → continental → supercopa → recopa → liga; `match.activeMatchCompetition = comp`; placar aleatório 0 a 4 x 0 a 3; chamar `concludeMatch()` de `useMatchSimulation`.
  3. Depois de cada partida, verificar a integridade de todas as chaves:
     - o vencedor é um dos dois times;
     - os times da fase N+1 são os vencedores da fase N;
     - nenhum time repete na mesma fase;
     - os times do 3º são os perdedores das semis;
     - o pódio tem 3 times distintos.
  4. A cada 50 partidas, conferir save/load com 17 chaves.
  5. Ao final, `club.podiumArchive` tem pelo menos 1 pódio por temporada com chave e o orçamento nunca fica `NaN`.
- Pronto: o script passa 3 vezes seguidas (sorteios diferentes), mais `npx vue-tsc --noEmit` e `npm run build`.

**T19. Rebalanceamento de prêmios** (depende de T7 e T9; antes de T11)
- Arquivos: `src/utils/constants.ts` (valores de `PRIZES` da seção 8.5 e as 6 chaves novas), `src/utils/leagueScheduler.ts` (`SERIE_META[n].championPrize` lendo `PRIZES`), `src/stores/competitions.ts` (só `applyFinalResult`: campeão e vice de Supercopa e Recopa), `src/stores/league.ts` (os `end(...)` das Séries A e B, com as chaves novas `runnerUp`/`third`/`fourth` para o 2º, 3º e 4º colocados; se T8 e T9 já foram feitos com a tabela anterior, só os valores de `PRIZES` mudam e o código continua valendo), `src/components/competitions/SupercupsPanel.vue` (textos de prêmio).
- O que fazer: seção 8.5. Nenhum valor de prêmio pode ficar como número solto nesses arquivos. O texto de prêmio do CupPanel fica com T13.
- Teste `t19-prizes.mjs`:
  1. Supercopa vencida: +80.000; perdida: +30.000. Recopa: +120.000 / +45.000.
  2. Série A: 1º → 334.000; 2º → 307.000; 3º → 290.500; 4º → 277.000; 10º → 223.000; 18º → 162.000.
  3. Série B: 1º → 223.000; 2º → 205.000; 3º → 193.500; 4º → 184.500 (todos com acesso); 10º → 148.500; 18º → 108.000.
  4. `SERIE_META` dá 99.000 / 148.500 / 223.000 / 334.000.
  5. A escada da seção 8.2 vale: para cada tipo de resultado, a série de cima paga estritamente mais; o campeão de cada série é no máximo o "permanece" da série de cima (checagem automática igual à de `econ3.mjs`).
  6. `grep` em `src/stores` e `src/utils` não encontra mais 350000, 500000, 600000, 1200000 nem 650000.
  7. Rodar `econ3.mjs` e conferir os saldos da seção 8.3 (tolerância de 5%).

**T18. Revisão final (Opus)**
- Revisar o diff completo contra este plano antes de qualquer commit: regras do protótipo preservadas, valores de prêmio, migração e paleta.

---

## 10. Riscos e decisões do dono

### Decisões já tomadas pelo dono (incorporadas)

- **Série C:** a final em ida e volta entre os campeões dos grupos decide o título. A disputa de 3º é em jogo único entre os 2º colocados. O acesso continua saindo do quadrangular.
- **Prêmios:** redução, nivelamento e escada entre séries (séries mais altas pagam mais; campeão de uma série recebe no máximo o "permanece" da série de cima), na seção 8. Substitui a antiga decisão sobre o vice da Série D.

Não há decisão pendente.

### Escolhas padrão (avisar se quiser diferente)

- Ao ser eliminado da copa ou do continental, o resto da chave é simulado na hora e o pódio aparece. A outra opção seria avançar uma fase por rodada da liga, que é mais complexa.
- Copa ou continental não terminados na virada da temporada: o confronto pendente do usuário vira W.O. (sem prêmio nem título). É o mesmo efeito do protótipo, que simplesmente reiniciava.
- Os rivais do grupo continental passam a jogar entre si pela fórmula de OVER, no lugar do resultado aleatório por time. Isso faz parte de "simular os outros jogos".
- O usuário continua mandante em todos os jogos de copa e continental (inclusive o 3º) e mandante da volta na liga, como no protótipo.

### Riscos

- **Arquivos compartilhados:** `competitions.ts` (T6, T7, T11) e `league.ts` (T8, T9, T11) concentram mudanças. As ondas evitam edição simultânea; não paralelizar fora do grafo.
- **Chave de 64 da Série D no desktop:** cerca de 130 cartões. A rolagem com `max-h-[70vh]`, o seletor "Ver a partir de" e o modo compacto resolvem; não usar SVG.
- **Migração aproximada:** fases antigas não têm placar dos outros jogos, por isso ficam marcadas como legado. Na liga, as fases anteriores à atual não aparecem.
- **Tabela no mata-mata:** passar a mostrar o grupo A1 (e não 20 linhas zeradas) muda o que Dashboard, Header e Sidebar exibem no mata-mata. A mudança é intencional.
- **Economia:** as premissas do clube típico (elenco, níveis, 45% de vitórias) são estimativas. Se o T17 mostrar orçamento travado em 0 na Série D por várias temporadas, o ajuste certo é na folha por jogo ou no patrocínio, não em voltar a subir os prêmios do topo.
- **Testes com sorteio:** todo sorteio novo aceita `rng`; testes estatísticos usam faixas largas e semente fixa.
- **`concludeMatch` na Série D:** a virada de temporada pode acontecer dentro de `evaluateStageProgression`. O pódio precisa ser calculado antes de `initLeagueSeason`, conforme a seção 7.3; T10 testa isso.

---

## Resumo

1. Chave genérica (`Bracket`, `BracketRound`, `BracketTie` com 1 ou 2 pernas, pênaltis, 3º lugar, `Podium`) num núcleo puro `utils/bracket.ts`, com `rng` injetável.
2. Copa: 16 clubes sorteados em potes (A, B, C, D), com o caminho provável do usuário igual à escalada do protótipo; chave em `cupState.bracket`.
3. Continental: 4 grupos de 4 (os 8 rivais continentais + 7 da Série A), QF pelo modelo A1xB2...; corrige o adversário repetido do protótipo.
4. Série D: 64 clubes (G-4 do A1 + 15 grupos virtuais com 46 clubes inventados), ida e volta, playoff paralelo às semis, 3º em jogo único.
5. Série C: final em ida e volta entre os campeões dos grupos (título e pódio) e 3º em jogo único entre os vices; o acesso continua saindo do quadrangular.
6. Outros jogos simulados por OVER em 45 ticks, com a mesma estrutura de `simulateMatchTick`, ±12 de forma e pênaltis por cobranças.
7. A chave anda junto com o usuário: cada partida dele fecha a fase inteira. `concludeMatch` não muda de estrutura.
8. Disputa de 3º jogada pelo usuário como partida normal, sem nova `MatchCompetition`.
9. Prêmios numa constante única `PRIZES` (seção 8), em escada: base por colocação × fator por série (D 1, C 1,5, B 2,25, A 3,375). Campeões D/C/B/A: 99/148,5/223/334 mil (antes 300/420/650/1.200 mil); o campeão de cada série recebe no máximo o "permanece" da série de cima. Copa: 160 mil (antes 500 mil). Recopa: 120 mil (antes 600 mil).
10. UI: `BracketView` (árvore com linhas no desktop, abas no celular), `BracketTieCard`, `PodiumCard` e `PodiumArchiveCard`, na paleta 60-30-10.
11. Save: 17 chaves mantidas (chave da liga dentro de `leagueFixtures`, pódios em `club`). Saves antigos ganham chave reconstruída na carga.
12. São 19 tarefas em 7 ondas (T19 = rebalanceamento), com testes por script Node; T18 é a revisão final em Opus. Não há decisão pendente.

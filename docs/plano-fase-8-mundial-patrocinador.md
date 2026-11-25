# Plano da Fase 8: Copa dos Continentes (Mundial) e Patrocinador Master

Só planejamento: nenhum arquivo de `src/`, nem o `package.json`, foi alterado. Origem: `_origem/roadmap_de_evolu_o_handoff_completo.md` (Fase 8, itens 8.1 e 8.2). Os valores em R$ são propostas e esperam a aprovação do dono (seção 11).

**Revisão 2 (decisão do dono):** a Copa dos Continentes deve ser o mais próxima possível do torneio real, com nomes fictícios, e formalizar um ecossistema em que cada competição dá vaga em outra. O formato de 4 clubes da revisão 1 saiu: a seção 1 compara o formato clássico de 7 clubes com o ampliado de 32 e recomenda o de 7; a seção 2 define o ecossistema de vagas. O patrocínio (8.2) não mudou, só a numeração das tarefas.

## 0. Como o código está hoje (verificado)

- **Mundial:** não existe nada em `src/`. As finais de jogo único (Supercopa e Recopa) moram em `src/stores/modules/competitions/finals.ts` (`FinalState`, `qualifySupercup`, `qualifyRecopa`, `applyFinalResult`). As vagas nascem na virada, em `useSeason.startNewSeason`: `if (wonLeagueTitle || wonCup) qualifySupercup()` e `if (wonContinental) qualifyRecopa()`. O rival é sorteado (`LEAGUE_CLUBS_POOL[1]` na Supercopa, `CONTINENTAL_RIVALS` na Recopa), sem ligação com quem ganhou de fato a outra competição. A disputa acontece na temporada seguinte, sem calendário; uma final pendente se perde na virada seguinte (relatório, item 10).
- **Continental:** `ContinentalState.tier`: `'libertadores'` (na tela, Copa Condor de Ouro: top 4 da Série A) ou `'sulamericana'` (Condor de Prata: 5º e 6º da A ou campeão da Taça Cacique). O estado só existe quando o usuário se classifica: sem vaga, não há chave e não se sabe quem é o campeão da IA.
- **Liga:** o jogo só simula a série do usuário. O campeão da Série A só é conhecido quando o usuário está na A.
- **Motor de chave** (`src/utils/bracket/bracket.ts`): `createBracket` monta árvores binárias. A 1ª fase tem N confrontos e cada fase seguinte tem a metade; em `propagate`, o confronto `s` recebe os vencedores de `2s` e `2s+1`. `thirdPlace` recebe os perdedores da semi; `side` recebe os perdedores das quartas (é o que serve para a disputa de 5º lugar). `fillFrom` só preenche um confronto quando ele está vazio dos dois lados, então não aceita um cabeça de chave já posto num lado. `simulateMatchScore` sempre dá o mando (+`HOME_ADVANTAGE`) ao `homeId`. `userFinalPosition` só conhece as posições 1 a 4. Os componentes `src/components/bracket/BracketView.vue`, `PodiumCard.vue` e `BracketTieCard.vue` desenham a chave com fases que vão se reduzindo à metade.
- **Patrocínio:** receita fixa por jogo `club.projectedSponsorIncome = sponsorBase × facilityIncomeFactor(financeLevel) × incomeMult` (`src/stores/club.ts:147`). Por jogo, `useEconomy.settleMatch` paga também `sponsorBase × 0,5` na vitória e `× 0,2` no empate (`ECONOMY.winBonusShare` e `drawBonusShare`, sobre o `sponsorBase` sem o fator da instalação). Não há contrato, meta nem escolha.
- **Save:** `saveGame` grava hoje 24 chaves de topo, não 17. Somaram-se `seasonAssists`, `seasonApps`, `seasonYellows`, `seasonReds`, `matchHistory`, `friendlies` e `prematchCompetition`, e `clubStaff` virou `staffContracts`. A asserção "17 chaves" do `t23-atletas.mjs` (h6) está desatualizada.
- **Calibração quebrada:** `docs/calibracao/calib-carreira.mjs` importa `/src/utils/constants.ts`, `/src/utils/generatePlayer.ts`, `/src/utils/calculateTeamStrength.ts` e `/src/utils/bracket.ts`. Esses caminhos deixaram de existir no commit `f673638`. Rodado hoje, o script falha antes de simular (`Failed to load url /src/utils/generatePlayer.ts`). Por isso ele é a tarefa T0.

## 1. Formato da Copa dos Continentes (8.1)

### 1.1 As duas opções, comparadas

| Critério | (a) Clássico, 7 clubes | (b) Ampliado, 32 clubes |
|---|---|---|
| Fidelidade ao real | Formato do Mundial anual de 2005 a 2023: os 6 campeões continentais mais o campeão do país-sede. Play-off (sede x Oceania), quartas (play-off + Ásia, África e América do Norte), semis (os campeões sul-americano e europeu entram aqui), final, disputa de 3º e de 5º lugar. | Formato de 2025: 8 grupos de 4 e mata-mata a partir das oitavas, de 4 em 4 anos, com vários clubes por confederação (12 europeus, 6 sul-americanos...). |
| Motor de chave | Extensão pequena: cabeças de chave que entram em fases diferentes (byes) e uma fase de 1 confronto antes das quartas. O 5º lugar já existe (`side`). Cerca de 80 linhas mais testes (seção 1.3). | Grupos de 4 com 8 grupos (hoje só o continental tem grupos, preso ao grupo "A" do usuário em `groups.ts`), mais oitavas de 16. Reuso parcial; os grupos precisam virar um módulo genérico. |
| Outros jogos (OVER) | 6 jogos de IA por edição (`simulateMatchScore`). | 48 jogos de grupo mais 15 de mata-mata, cerca de 60 jogos de IA. |
| Tamanho do save | 7 times e 9 confrontos: cerca de 3 a 4 KB. | 32 times, 8 tabelas e 16 confrontos: cerca de 20 a 30 KB. |
| Partidas do usuário | 2 (entra na semi como campeão sul-americano); até 5 se entrar pela vaga da sede. | De 3 a 7. |
| Ecossistema | Uma vaga por confederação: liga direto à Condor de Ouro e, nos anos de sede, à Série A. | Pediria várias vagas sul-americanas (ranking de 4 temporadas, Condor de Ouro, talvez a Prata), um ranking que o jogo não tem. |
| Calibração | O mesmo perfil da revisão 1 (2 jogos para o caminho normal) e prêmio só por colocação. | Cotas de participação reais para todos (contra a regra do dono "sem cota base"); até 7 jogos extras com bilheteria e prêmio; o teto do elenco máximo na A seria o primeiro a quebrar. De 4 em 4 anos, a maioria das carreiras nunca veria o torneio. |

**Recomendação: (a), o clássico de 7 clubes.** É o formato que o público reconhece como "o Mundial", é anual (casa com a Condor de Ouro, que também é anual), cabe no motor com uma extensão pequena, dá ao campeão sul-americano o mesmo caminho do real (2 jogos, semi e final) e não muda a forma da economia. O (b) custaria um módulo de grupos genérico, um ranking de clubes e uma recalibração inteira por um torneio que, de 4 em 4 anos, a maioria das carreiras nunca veria.

### 1.2 Regras do formato clássico (fiéis ao real)

| Fase | Confronto | Observação |
|---|---|---|
| Play-off | Campeão da sede x campeão da Oceania | jogo único |
| Quartas 1 | Vencedor do play-off x campeão de uma de Ásia, África e América do Norte (sorteio) | as duas quartas também são sorteadas |
| Quartas 2 | os outros dois campeões | |
| 5º lugar | perdedores das quartas | jogo único, simulado (o usuário joga se perder nas quartas) |
| Semi 1 | campeão sul-americano x vencedor das quartas 1 | o sul-americano entra aqui |
| Semi 2 | campeão europeu x vencedor das quartas 2 | o europeu entra aqui |
| 3º lugar | perdedores das semis | jogo único |
| Final | vencedores das semis | jogo único |

- Empate em qualquer jogo: pênaltis ao vivo (no real há prorrogação, que o motor não tem; os pênaltis seguem a regra da Copa).
- **Mando:** campo neutro para todos, exceto o clube da sede, que tem +3 de mando em todos os seus jogos (torcida da casa). Se o usuário for o clube da sede, `homeBonusApplies('mundial')` vale para ele; caso contrário, não.
- **Bilheteria do usuário:** jogo neutro rende a fatia de visitante (`ECONOMY.awayTicketShare`, 40%); como sede, a cheia.
- **Quando joga:** na temporada seguinte à da conquista, como a Supercopa e a Recopa. A vaga nasce na virada. Se ainda estiver pendente na virada seguinte, vira W.O. (sem prêmio, chave completada por `completeBracket(..., { forfeitUser: true })`) e o pódio vai para o arquivo.
- **Nome na tela:** Copa dos Continentes (id interno `mundial`). "Mundial de Clubes" e "Copa Intercontinental" são nomes reais.

### 1.3 Extensão do motor de chave (custo da opção a)

Mudanças aditivas, sem alterar o comportamento das 4 chaves que já existem (que não usam os campos novos):

1. **`BracketTie.from?: { home?: TieRef; away?: TieRef }`**, com `TieRef = { tieId: string; take: 'winner' | 'loser' }`. Em `propagate`, um confronto com `from` preenche cada lado vazio a partir do confronto citado e mantém o lado já ocupado por um cabeça de chave. Sem `from`, vale a regra atual (`2s` e `2s+1`).
2. **`createBracketFromSpec(spec)`**: monta a chave a partir de uma lista explícita de fases e confrontos (time fixo ou `TieRef` em cada lado), mais `thirdPlace` e `side` com `from`. `createBracket` continua igual.
3. **`Bracket.neutral?: { hostId: string | null }`**: com o campo presente, `resolveTie` só soma `HOME_ADVANTAGE` quando o mandante é o `hostId`; sem o campo, nada muda.
4. **`bracketPlacement(bracket, teamId): 1..7 | null`**: 1 e 2 na final, 3 e 4 na disputa de 3º, 5 e 6 na de 5º, 7 para o perdedor do play-off. `userFinalPosition` fica como está.
5. **`BracketCompetition`** ganha `'mundial'`.

Interface: o `BracketView` assume fases que se reduzem à metade (1, 2, 2, 1 não segue a regra). A recomendação é uma prop `layout="phases"`, que mostra abas por fase com os cards (`BracketTieCard`) e sem as linhas de ligação; o desenho em árvore continua o padrão das outras chaves.

## 2. Ecossistema de vagas

### 2.1 De onde vem cada vaga

| Competição | Vaga | Origem (dados que o jogo tem) |
|---|---|---|
| Condor de Ouro | top 4 da Série A | já existe |
| Condor de Prata | 5º e 6º da Série A ou campeão da Taça Cacique | já existe |
| Supercopa Soberana | campeão da Série A (ou de qualquer série, como hoje) x campeão da Taça Cacique | hoje o rival é sorteado; proposta na seção 2.3 |
| Recopa Condor | campeão da Condor de Ouro x campeão da Condor de Prata | hoje o rival é sorteado; proposta na seção 2.3 |
| **Copa dos Continentes** | **Campeão sul-americano** (vaga da Condor) = campeão da Condor de Ouro | usuário: `continentalState.champion && tier === 'libertadores'`. IA: campeão do pódio da chave da Condor de Ouro, se o usuário a disputou; senão, sorteado de `CONTINENTAL_RIVALS`. |
| | **Campeão europeu, asiático, africano, norte-americano e da Oceania** | sempre IA, sorteados de `MUNDIAL_RIVALS` (seção 3.2) |
| | **Campeão da sede** | campeão nacional do país-sede (seção 2.2). No ano em que a sede é o país do usuário, é o campeão da Série A. |

**A Condor de Prata e a Taça Cacique não dão vaga na Copa dos Continentes.** No real, só os 6 campeões continentais e o campeão da sede entram. A Prata já leva à Recopa e a Copa à Supercopa e à Prata, então as duas já estão ligadas ao ecossistema sem vaga duplicada.

### 2.2 País-sede

- **Rotação fixa de 4 temporadas** (`MUNDIAL_HOSTS`), sempre com nomes fictícios: Sakura (Ásia Oriental), Al-Rimal (Ásia Ocidental), Atlas (norte da África) e **o país do usuário** (sede da Liga Aurora). Sede da temporada disputada: `MUNDIAL_HOSTS[(season - 1) % 4]`. A tabela fica em `config` e pode ser trocada.
- Sede estrangeira: o campeão da sede é um clube IA de `MUNDIAL_HOSTS[i].clubs`, com OVER entre 64 e 69.
- **Sede no país do usuário:** a vaga é do campeão da Série A da temporada anterior. É a segunda porta de entrada do usuário (play-off, até 5 jogos, com o mando da casa). Se o usuário não estava na A, o campeão é um clube IA sorteado de `LEAGUE_CLUBS_POOL[1]` (como a Supercopa faz hoje), com o OVER da lista.
- **Regra real da vaga repetida:** se o campeão da sede também for o campeão sul-americano, ele entra pela vaga da Condor (na semi) e a vaga da sede passa ao vice da Série A. Com o usuário campeão das duas, o vice sai da tabela da A; sendo IA, sorteia-se outro clube da A.

### 2.3 Supercopa e Recopa no ecossistema (sem conflito)

As três decisões (Supercopa, Recopa e Copa dos Continentes) acontecem na temporada seguinte, cada uma com a sua `MatchCompetition`, sessão de partida e estado próprio. Não há disputa de data nem vaga duplicada: o campeão da Condor de Ouro joga a Recopa e a Copa dos Continentes, como no real.

Para fechar o ecossistema, proposta opcional (tarefa T11, depende do sim do dono): trocar o rival sorteado pelo campeão de verdade, quando o jogo o conhece.
- **Recopa:** o usuário campeão da Ouro enfrenta o campeão da Prata e vice-versa. Como o jogo só tem a chave da edição que o usuário jogou, o rival da outra edição é sorteado de `CONTINENTAL_RIVALS` com a etiqueta "Campeão da Condor de Prata" (ou "de Ouro").
- **Supercopa:** o campeão da liga enfrenta o campeão da Taça Cacique (pódio da chave da Copa, que existe todo ano). Se o usuário ganhou as duas, enfrenta o vice da Copa (finalista do pódio). Se o usuário ganhou só a Copa, enfrenta o campeão da Série A se estiver nela; senão, um clube sorteado da A.
- Não muda prêmio nem regra de vaga.

### 2.4 Como a vaga nasce na virada (`useSeason.startNewSeason`)

Ordem nova, com tudo lido antes de reiniciar o continental e a liga:
1. Ler `wonContinental`, `prevTier = continentalState.tier`, `ouroPodium = continentalState.bracket?.podium` (se `tier === 'libertadores'`), `wonLeagueTitle`, `prevDiv`, `prevRank`, o campeão e o vice da A (da tabela, se `prevDiv === 1`).
2. `finishMundialForSeason()` (W.O. do que está pendente) e arquivar o pódio junto com os outros.
3. `resetMundial()`. Calcular a sede da temporada nova. Montar o campo com a função pura `buildMundialField(...)` (seção 3.3). Se o usuário tiver vaga (Ouro ou campeão da A na sede), `qualifyMundial(field)`.
4. `resetFinals()`, Supercopa e Recopa como hoje (ou com os rivais da seção 2.3).

O Mundial **só é criado quando o usuário tem vaga**. Sem vaga, não há chave para simular nem para gravar.

## 3. Tipos e constantes

### 3.1 Tipos

`src/types/match.ts`:
```ts
export type MatchCompetition = 'league' | 'cup' | 'continental' | 'supercup' | 'recopa' | 'mundial' | 'friendly'
```
O `vue-tsc` vai apontar os `Record<MatchCompetition, ...>` sem a chave nova (`stores/match.ts` em `sessions`, `MatchSwitcher.vue` em `NAMES`, `utils/player/suspension.ts` em `COMP_SHORT`). Correntes de `if (comp === ...)` não são checadas (risco 1).

`src/types/bracket.ts`:
```ts
export type BracketCompetition = 'cup' | 'continental' | 'serieD' | 'serieC' | 'mundial'
export interface TieRef { tieId: string; take: 'winner' | 'loser' }
// em BracketTie:
from?: { home?: TieRef; away?: TieRef }
// em Bracket:
neutral?: { hostId: string | null }
```

`src/types/competitions.ts`:
```ts
export type MundialConfed = 'condor' | 'europa' | 'asia' | 'africa' | 'norte' | 'oceania' | 'sede'
export type MundialEntry = 'condor' | 'sede'

export interface MundialHistoryItem { roundName: string; summary: string; prize: number }

export interface MundialState {
  qualified: boolean
  season: number             // temporada em que é disputado
  hostId: string             // id de MUNDIAL_HOSTS
  userEntry: MundialEntry | null
  eliminated: boolean
  champion: boolean
  placement: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null
  history: MundialHistoryItem[]
  bracket: Bracket | null    // BracketTeam.tag = confederação ('Campeão europeu', 'Campeão da sede')
}
```

### 3.2 Constantes (`src/config/competitions.ts`)

```ts
export const MUNDIAL_LABEL = 'Copa dos Continentes'

// Nomes fictícios. OVER sorteado na faixa no momento da vaga.
export const MUNDIAL_RIVALS: Record<Exclude<MundialConfed, 'condor' | 'sede'>, { tag: string; minOver: number; maxOver: number; names: string[] }> = {
  europa:  { tag: 'Campeão europeu',        minOver: 79, maxOver: 82, names: ['Rheinstadt SV', 'AC Valdoro', 'Nordhavn FK', 'Athletic Brisamar'] },
  asia:    { tag: 'Campeão asiático',       minOver: 70, maxOver: 74, names: ['Sakura Minato FC', 'Shenhai Golden Dragons', 'Hanseong United', 'Al-Qamar Club'] },
  africa:  { tag: 'Campeão africano',       minOver: 69, maxOver: 73, names: ['Kilima Stars', 'Nilo Azul SC', 'Atlas Sahel FC', 'Savana Real'] },
  norte:   { tag: 'Campeão norte-americano', minOver: 69, maxOver: 73, names: ['Sierra Madre FC', 'Bahía Esmeralda', 'Lakeshore United', 'Monte Caribe SC'] },
  oceania: { tag: 'Campeão da Oceania',     minOver: 58, maxOver: 63, names: ['Coral Bay FC', 'Southern Cross AFC', 'Kauri United', 'Lagoon City'] }
}
// Campeão sul-americano IA sem pódio: CONTINENTAL_RIVALS (OVER 72 a 76), tag 'Campeão da Condor'.

export const MUNDIAL_HOSTS = [
  { id: 'sakura',  label: 'Sakura',  user: false, clubs: ['Kashiwa Sakura FC', 'Minato Bay'], minOver: 64, maxOver: 69 },
  { id: 'alrimal', label: 'Al-Rimal', user: false, clubs: ['Al-Rimal Club', 'Nakheel SC'],  minOver: 64, maxOver: 69 },
  { id: 'atlas',   label: 'Atlas',   user: false, clubs: ['Raja Atlas', 'Wydad Sahel'],      minOver: 64, maxOver: 69 },
  { id: 'aurora',  label: 'seu país', user: true,  clubs: [],                                minOver: 0,  maxOver: 0 }
]

// Em PRIZES (acréscimo):
mundial: { champion: 400000, runnerUp: 200000, third: 100000, fourth: 70000, fifth: 50000, sixth: 30000, seventh: 0 },
```

Escala de força: a A típica está em 71, o forte em 76 a 78 na T30, a Condor IA entre 72 e 76. Com isso o europeu é o chefão (3 a 10 acima do campeão sul-americano típico), Ásia, África e América do Norte ficam no nível da Condor ou um pouco abaixo, a Oceania é a zebra, e a sede estrangeira fica no meio. É a mesma hierarquia do real.

### 3.3 Funções puras novas

- `src/utils/bracket/bracket.ts`: `createBracketFromSpec`, `propagate` com `from`, `resolveTie` com `neutral`, `bracketPlacement` (seção 1.3).
- `src/utils/bracket/bracketSeeding.ts`: `seedMundial(field, rng): Bracket`. Sorteia quem da Ásia, África e América do Norte joga as quartas 1 contra o vencedor do play-off, e monta as fases da seção 1.2 com `from`, `thirdPlace` e `side` (5º lugar). `neutral.hostId` = id do campeão da sede.
- `src/utils/competitions/mundialField.ts` (novo): `buildMundialField({ season, userWonOuro, ouroPodiumChampion, userIsSerieAChampion, serieAChampion, serieAVice, rng })`. Devolve os 7 `BracketTeam` com `tag`, a sede, `userEntry` e a regra da vaga repetida (seção 2.2), ou `null` quando o usuário não tem vaga.

## 4. Patrocinador Master (8.2): decisões (sem mudança desde a revisão 1)

| Tema | Recomendação | Motivo |
|---|---|---|
| Duração | Contrato de 1 temporada, escolhido no começo de cada temporada. | Os valores dependem da série, que muda a cada temporada. |
| Ofertas | 3 por temporada, uma de cada perfil (Estável, Desempenho, Ousado), com marca fictícia sorteada. | A escolha fica entre segurança e risco. |
| Prazo | Até o 1º jogo oficial. Sem escolha, o Estável é assinado sozinho no 1º `settleMatch`, com aviso. | A calibração roda com o Estável, que é igual à economia de hoje. |
| Por jogo | Corte fixo sobre o `sponsorBase` cru (não sobre o ganho da instalação de Finanças) e fatia própria do bônus de vitória. O empate não muda. | O investimento em Finanças vale igual em todo contrato, e o equilíbrio não depende do nível. |
| Meta | Permanência (Estável), Acesso (Desempenho), Título (Ousado), paga uma vez na virada. | Usa `prevDiv`, `nextDivision`, `prevRank` e `trophyType`. |
| Bônus por título | Só no Ousado, por troféu de campeão (liga, Taça Cacique, continental, Supercopa, Recopa e Copa dos Continentes), pago em `recordTrophy('title', ...)`. | O "bônus variável por título" do roadmap, num ponto só. |
| Escala | Múltiplos do `sponsorBase`, arredondados a R$ 500. | A escada entre séries se mantém sozinha. |

| Meta | Série D | Séries C e B | Série A |
|---|---|---|---|
| Permanência | passou da 1ª fase (tem jogo em `D_R64`) | não foi rebaixado | não foi rebaixado |
| Acesso | subiu | subiu | top 6 (`prevRank <= 6`) |
| Título | campeão da série | campeão da série | campeão da série |

Tipos (`src/types/club.ts`, dentro de `ClubSave` como `sponsor?: ClubSponsorState`):

```ts
export type SponsorTier = 'estavel' | 'desempenho' | 'ousado'
export type SponsorGoal = 'permanencia' | 'acesso' | 'titulo'
export interface SponsorOffer {
  id: string; tier: SponsorTier; brand: string; division: number
  fixedCut: number; winBonus: number; goal: SponsorGoal; goalBonus: number; titleBonus: number
}
export interface SponsorContract extends SponsorOffer { season: number; signedAuto: boolean }
export interface SponsorSeasonResult {
  season: number; brand: string; tier: SponsorTier; goal: SponsorGoal
  goalMet: boolean; goalPaid: number; winPaid: number; titlePaid: number
}
export interface ClubSponsorState {
  season: number; offers: SponsorOffer[]; contract: SponsorContract | null
  earned: { win: number; title: number }; lastResult: SponsorSeasonResult | null
}
```

Constantes (`src/config/economy.ts`):

```ts
export const SPONSOR_TIERS: Record<SponsorTier, { label: string; fixedCutX: number; winShare: number; goal: SponsorGoal; goalBonusX: number; titleBonusX: number }> = {
  estavel:    { label: 'Estável',    fixedCutX: 0,    winShare: 0.50, goal: 'permanencia', goalBonusX: 1, titleBonusX: 0 },
  desempenho: { label: 'Desempenho', fixedCutX: 0.15, winShare: 0.85, goal: 'acesso',      goalBonusX: 4, titleBonusX: 0 },
  ousado:     { label: 'Ousado',     fixedCutX: 0.30, winShare: 1.10, goal: 'titulo',      goalBonusX: 8, titleBonusX: 2 }
}
export const SPONSOR_BRANDS = [
  'Vértice Telecom', 'Tropeiro Seguros', 'Maré Alta Bebidas', 'Cerrado Energia', 'Grupo Aurora Austral',
  'Ipê Roxo Construtora', 'Farol Azul Logística', 'Sabiá Pagamentos', 'Serra Fria Laticínios'
]
```

Funções puras em `src/utils/club/sponsor.ts`: `buildSponsorOffers(division, season, rng)`, `sponsorGoalMet(goal, ctx)`, `sponsorGoalLabel(goal, division)` e `roundTo500(v)`.

## 5. Stores e composables afetados

| Arquivo | Mudança |
|---|---|
| `src/utils/bracket/bracket.ts`, `bracketSeeding.ts`, `src/utils/competitions/mundialField.ts` (novo) | Seções 1.3 e 3.3. |
| `src/stores/modules/competitions/mundial.ts` (novo) | `createMundial({ mundialState, club })`: `qualifyMundial(field, rng?)`, `resetMundial()`, `finishMundialForSeason()`, `applyMundialResult(uGoals, oGoals, clubName, pens)` (avança com `simulatePhaseExceptUser` e `propagate`; quando o usuário é eliminado, `completeBracket`; paga pela `bracketPlacement` ao fim; troféu "Campeão da Copa dos Continentes"), `mundialStageLabel`, `mundialOpponent`, `hasPendingMundial`, `mundialUserHosts` (usuário é o clube da sede). |
| `defaults.ts`, `save.ts`, `src/stores/competitions.ts` | `emptyMundial()`; `mundialState` em `toSave`/`fromSave` (spread sobre o vazio); `isCompetitionPlayable('mundial')`; `hasPendingThirdPlace` com os 3º e 5º lugares do Mundial. |
| `src/composables/useMatchSimulation.ts` | `homeBonusApplies(comp)` passa a aceitar o caso `mundial` com o usuário como sede (`competitions.mundialUserHosts`); `rawIsHomeFor('mundial')` = `mundialUserHosts` (bilheteria de visitante no neutro); `rawOpponentFor`, `rawLabelFor` ("Copa dos Continentes • Semifinal"), `needsShootout` (`u === o`), ramo em `concludeMatch`. |
| `src/stores/match.ts` | `sessions.mundial`; `'mundial'` em `COMPETITIONS_ORDER` depois de `'recopa'`. |
| `src/composables/useSeason.ts` | Seção 2.4 (Mundial) e, para o patrocínio, meta antes de `club.season += 1` e ofertas depois de `club.division = nextDivision`; `initializeFreshCareer` gera as ofertas da T1. |
| `src/stores/modules/competitions/finals.ts` | Só na T11 (opcional): rivais reais da Supercopa e da Recopa (seção 2.3). |
| `src/composables/usePersistence.ts` | Passar `mundialState: p.mundialState` a `competitions.fromSave`. |
| `src/stores/club.ts` | Patrocínio: estado `sponsor`; `projectedSponsorIncome` menos `round(fixedCut × incomeMult)`, com piso 0; `signSponsor`, `ensureSponsorContract`, `recordSponsorWin`; bônus por título em `recordTrophy`; `closeSponsorSeason`/`openSponsorSeason`; normalização em `fromSave`; `resetCareerRecords`. |
| `src/composables/useEconomy.ts` | `settleMatch`: `ensureSponsorContract()`; bônus de vitória do contrato; `earned.win`. |
| Interface | `src/components/competitions/MundialPanel.vue` (novo), `CompetitionsView.vue`, `BracketView.vue` (prop `layout="phases"`), `src/components/club/SponsorCard.vue` (novo), `ClubView.vue`, `DashboardView.vue` (`'mundial'` em `CUP_COMPETITIONS` e banner do patrocínio), `PostMatchSummary.vue`, `SeasonReviewCard.vue`, `useNavigation.ts` (selos). |

## 6. Save e migração (idempotente, sem migração numerada)

- **`mundialState`:** chave de topo aditiva (25 no total), como `friendlies`. Save antigo sem a chave carrega `emptyMundial()`. A chave de 7 times ocupa cerca de 3 a 4 KB e só existe quando o usuário tem vaga. Os campos novos do motor (`from`, `neutral`) são opcionais: as chaves já gravadas de Copa, continental e Séries C e D carregam sem mudança. `migrateBalanceV2` e `migrateProgressionV3` não tocam no Mundial (os rivais nascem já na escala nova).
- **`club.sponsor`:** opcional dentro de `club`, normalizado em `fromSave`:
  1. Campo ausente (save antigo, quase sempre no meio da temporada): contrato Estável da série atual com `signedAuto: true` e ofertas vazias. Reproduz a economia de hoje, e as ofertas começam na próxima virada.
  2. Campo presente: validar cada número (finito, maior ou igual a 0) e descartar ofertas malformadas. Se `sponsor.season !== club.season`, cair no caso 1.
  3. Segunda carga: nada muda. Teste: load, save, load, save dá JSON idêntico.
- **Asserção das 17 chaves:** os testes novos conferem "as chaves de antes mais `mundialState`" e não um número fixo.

## 7. Impacto na calibração econômica

### 7.1 Copa dos Continentes

Prêmios por colocação (sem cota base nem cota por vitória). A distribuição real do formato clássico vai de 1,0 a 0,1 do prêmio do campeão (vice 0,8, 3º 0,5, 4º 0,4, 5º 0,3, 6º 0,2, 7º 0,1). Aqui ela foi comprimida para não quebrar a escada e para respeitar a regra do dono "quem cai cedo não recebe".

| Colocação | Prêmio | Comparação |
|---|---|---|
| Campeão | 400 mil | topo da escada: Supercopa 40 < Recopa 60 < Copa 330 < campeão continental (cerca de 380 a 420 mil, com cotas e bônus) <= Copa dos Continentes 400, e > Série A campeã (300). |
| Vice | 200 mil | > vice da Copa (140) e vice continental (70 mais cotas); < campeão da Série A. O real (0,8) daria 320 mil, acima do campeão da A. |
| 3º | 100 mil | > 3º continental (30) e da Copa (25). |
| 4º | 70 mil | piso de quem entra na semi (o campeão da Condor joga no máximo 2 jogos). |
| 5º | 50 mil | só para quem entra pela vaga da sede. |
| 6º | 30 mil | idem. |
| 7º | 0 | perdedor do play-off: "quem cai cedo não recebe". |

Efeito no `--check`:
- **`tipicoRot`:** quase nunca ganha a Condor de Ouro, e ser campeão da A num ano de sede no país é raro. O valor esperado fica em poucos mil por temporada, longe do teto de 650 mil na A.
- **Elenco máximo na A** (saldo menor que 400 mil), o ponto de atenção. Estimativa para o `maximoRot` (OVER 88): ganha a Condor de Ouro em cerca de 50% das temporadas. Entrando na semi, passa em cerca de 85% (contra 70 a 74) e vence a final em cerca de 70% (contra 79 a 82, com pênaltis). O valor esperado por vaga é de cerca de 305 mil (0,6 × 400 + 0,26 × 200 + 0,15 × cerca de 90), cerca de 150 mil por temporada. A porta da sede soma cerca de 0,075 × 230 mil ≈ 17 mil. Total: cerca de 170 mil por temporada (a revisão 1 estimava 140 mil). Com o saldo histórico desse perfil na A negativo (cerca de −240 mil, relatório, decisão 6), deve ficar abaixo de 400 mil, mas precisa ser medido (T9). A alavanca, se quebrar, é o campeão a 300 mil (o mesmo da Série A), antes de qualquer outra constante.
- **Jogos extras:** 2 para o caminho normal, até 5 pela sede. Rendem bilheteria de visitante (40%), patrocínio fixo e bônus de vitória como qualquer jogo oficial. No `maximoRot`, cerca de +1 a 1,5 jogo por temporada na A: alguns mil de receita contra a folha do mesmo jogo, o que é neutro para o teto.
- O `calib-carreira.mjs` precisa de `'mundial'` no `pickComp`; sem isso o Mundial vira W.O. e a medição sai otimista.

### 7.2 Patrocínio (sem mudança desde a revisão 1)

Por jogo, contra hoje: `Δ = sponsorBase × (−fixedCutX + (winShare − 0,5) × p)`. Equilíbrio: Desempenho em p = 0,43; Ousado em p = 0,50.

| | D | C | B | A |
|---|---|---|---|---|
| `sponsorBase` | 8.650 | 10.520 | 13.690 | 16.600 |
| Bônus de vitória hoje (= Estável) | 4.325 | 5.260 | 6.845 | 8.300 |
| Estável: meta (1 S) | 8.500 | 10.500 | 13.500 | 16.500 |
| Desempenho: corte por jogo / vitória | 1.298 / 7.353 | 1.578 / 8.942 | 2.054 / 11.637 | 2.490 / 14.110 |
| Desempenho: meta (4 S) | 34.500 | 42.000 | 55.000 | 66.500 |
| Ousado: corte por jogo / vitória | 2.595 / 9.515 | 3.156 / 11.572 | 4.107 / 15.059 | 4.980 / 18.260 |
| Ousado: meta (8 S) | 69.000 | 84.000 | 109.500 | 133.000 |
| Ousado: por troféu (2 S) | 17.500 | 21.000 | 27.500 | 33.000 |

Ganho esperado por temporada acima de hoje (probabilidades estimadas, medidas na T18):

| Clube | Estável | Desempenho | Ousado |
|---|---|---|---|
| D típico (p 0,40) | +6,4 mil | +3,8 mil | −5,5 mil |
| D forte (p 0,55) | +7,7 mil | +23,3 mil | +23,4 mil |
| D dominante (p 0,65) | +8,5 mil | +35,2 mil | +50,9 mil |
| A típico (p 0,45) | +14,9 mil | +28,5 mil | −3,5 mil |

A meta sozinha nunca passa o prêmio do campeão da série (D 69 contra 80; C 84 contra 140; B 109,5 contra 240; A 133 contra 300 mil). No `--check`, a política não escolhe e fica com o Estável: o saldo sem prêmio é igual ao de hoje, e o saldo total sobe cerca de +6 mil (D) a +15 mil (A), com folga de pelo menos 45 mil contra os tetos (D 130, C 220, B 380, A 650 mil). O elenco máximo na A soma cerca de +16 mil, o que, junto do Mundial, dá cerca de +185 mil a medir contra o teto de 400 mil.

## 8. Interface

**Copa dos Continentes**
- Aba "Continentes" em `CompetitionsView.vue` (depois de "Supercopa & Recopa"), com selo `!` quando há jogo pendente.
- `MundialPanel.vue`:
  - Travado: `EmptyState` com as duas portas ("Conquiste a Copa Condor de Ouro, ou seja campeão da Série A num ano em que o seu país é a sede"), mais a sede da próxima edição.
  - Qualificado: os 7 clubes com escudo, `tag` da confederação e "OVER N"; a sede destacada; o botão de entrada por fase (`prepareMatch('mundial')`, `matchEntryLabel`); a chave com `BracketView layout="phases"`; o `PodiumCard` ao fim e a colocação do usuário (1º a 7º). Prêmios lidos de `PRIZES.mundial`.
- Rótulos: "Copa dos Continentes • Play-off / Quartas de Final / Semifinal / Final / Disputa de 3º Lugar / Disputa de 5º Lugar". `MatchSwitcher` com "Continentes"; `COMP_SHORT` "CON".
- Galeria: "Campeão da Copa dos Continentes".
- Opcional (T11): os cards da Supercopa e da Recopa mostram a origem do rival ("Campeão da Taça Cacique", "Campeão da Condor de Prata").

**Patrocinador Master:** `SponsorCard.vue` na aba Clube (3 ofertas com os valores já calculados para o clube, equilíbrio "vale a pena acima de 43% / 50% de vitórias", "Assinar" com `ui.askConfirm`; com contrato: marca, meta, estado e o recebido; `lastResult`). Banner no Painel sem contrato; marca na linha do bônus do `PostMatchSummary`; toast e linha no `SeasonReviewCard` na virada.

## 9. Tarefas (uma por delegação a Sonnet, esforço low)

### Regras para todas as tarefas

- Projeto `C:\Users\elphant\Downloads\Super XI`. Não commitar nem mexer em `package.json`. Só os arquivos listados.
- Branches (`CLAUDE.md`): T0 em `chore/calib-imports`; T1 a T11 em `feature/copa-dos-continentes`; T12 a T19 em `feature/patrocinador-master`. Saem da `develop` e voltam com `--no-ff` depois da revisão do Opus; quem commita e faz o merge é a sessão principal.
- Pronto comum: `npm run build` sem erro, mais o teste da tarefa.
- Testes: scripts Node em `docs/calibracao/` (`t40` em diante), com o harness do `calib-carreira.mjs` consertado na T0 (Vite em middleware, `ssrLoadModule`, stubs de navegador, `setActivePinia(createPinia())`). Imprimem `OK <nome>`, saem com `exit(1)` na 1ª falha e fecham o servidor. Rodar com `node docs/calibracao/<script>.mjs`. Sorteios com `mulberry32(seed)`.
- Português, nenhum nome de clube, marca ou confederação real; poder sempre como "OVER".

### Grafo

```
T0
8.1: T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7 -> T8 -> T9 -> T10 (Opus)   [T11 opcional, depois de T6, antes de T10]
8.2: T12 -> T13 -> T14 -> T15 -> T16 -> T17 -> T18 -> T19 (Opus)
8.1 e 8.2 são independentes depois de T0 (as duas tocam em useSeason.ts e useNavigation.ts: quem integrar por último resolve).
```

---

**T0. Consertar os imports da calibração e tirar a linha de base** (`chore/calib-imports`)
- Arquivos: `docs/calibracao/calib-carreira.mjs`.
- Fazer: trocar os imports para `/src/config/index.ts`, `/src/utils/player/generatePlayer.ts`, `/src/utils/match/calculateTeamStrength.ts` e `/src/utils/bracket/bracket.ts` (conferir que tudo o que o script usa de `C.` é exportado; se faltar, importar do módulo certo).
- Pronto: `node docs/calibracao/calib-carreira.mjs 20 curva,tipicoRot:240,forteRot:80,fracoRot:80,maximoRot:120,tipico,tipicoD,forte,fraco,caroFraco,investidor --check` dá `CHECK OK`. Anotar os números por série do `tipicoRot` e do `maximoRot` na A: é a linha de base.
- Não fazer: mudar alvos, constantes ou políticas. Se a linha de base falhar, parar e reportar.

**T1. Tipos e constantes do Mundial**
- Arquivos: `src/types/match.ts`, `src/types/bracket.ts`, `src/types/competitions.ts`, `src/config/competitions.ts`, `src/stores/match.ts` (só `sessions` e `COMPETITIONS_ORDER`), `MatchSwitcher.vue` (só `NAMES`), `src/utils/player/suspension.ts` (só `COMP_SHORT`).
- Fazer: seções 3.1 e 3.2.
- Pronto: build. Não fazer: lógica.

**T2. Extensão do motor de chave** (depende de T1)
- Arquivos: `src/utils/bracket/bracket.ts`.
- Fazer: seção 1.3, itens 1 a 4.
- Teste `t40-bracket-ext.mjs`: (1) **regressão:** antes de editar, gravar em JSON o resultado de `seedCup` + `completeBracket` e da chave continental (sementes 1 a 20) rodando contra a `develop`; depois da mudança, o mesmo JSON, byte a byte; (2) uma chave por spec com cabeça de chave na semi preenche só o lado vazio; (3) `from` com `take: 'loser'` alimenta o 5º lugar; (4) com `neutral.hostId = 'x'`, em 20 mil jogos simulados entre times iguais o mandante que não é sede vence 40% ± 2 (sem mando) e a sede vence mais; (5) `bracketPlacement` cobre de 1 a 7.

**T3. Campo e sorteio do Mundial** (depende de T2)
- Arquivos: `src/utils/competitions/mundialField.ts` (novo), `src/utils/bracket/bracketSeeding.ts`.
- Fazer: seção 3.3 e as regras das seções 1.2 e 2.2.
- Teste `t41-mundial-field.mjs`: (1) campeão da Ouro: usuário na semi 1, sede pela tabela de rotação; (2) campeão da A num ano de sede no seu país: usuário no play-off contra a Oceania, `neutral.hostId = 'user'`; (3) campeão das duas no ano de sede: usuário na semi e o vice da A no play-off; (4) nenhum dos dois: `null`; (5) em 1.000 sementes, o europeu sempre na semi 2 e as faixas de OVER respeitadas; (6) o campeão IA da Condor vem do pódio quando há pódio.

**T4. Módulo e store do Mundial** (depende de T3)
- Arquivos: `src/stores/modules/competitions/mundial.ts` (novo), `defaults.ts`, `save.ts`, `src/stores/competitions.ts`.
- Fazer: seção 5 (linhas do módulo e da store). Seguir `cup.ts` para avançar, fazer W.O. e montar o pódio.
- Teste `t42-mundial-store.mjs`: (1) entrada pela Condor, vitória na semi e na final: campeão, troféu, +400 mil, `placement` 1; (2) derrota na semi e vitória no 3º: +100 mil; derrota no 3º: +70 mil; (3) entrada pela sede: perde o play-off: 7º, 0, eliminado e chave completada; vence o play-off e perde nas quartas: joga o 5º lugar (pendente), vence: +50 mil; (4) `finishMundialForSeason()` com jogo pendente: W.O., sem prêmio, pódio completo; (5) `fromSave({})` dá `emptyMundial()` e `fromSave(toSave())` preserva tudo.

**T5. Partida do Mundial** (depende de T4)
- Arquivos: `src/composables/useMatchSimulation.ts`, `src/views/DashboardView.vue` (só `CUP_COMPETITIONS`), `src/composables/useNavigation.ts` (só o selo de Competições).
- Fazer: as linhas correspondentes da seção 5. Buscar todas as correntes `comp === 'recopa'` / `'supercup'` em `src/` e decidir caso a caso.
- Teste `t43-mundial-match.mjs`: o adversário vem da chave (não da liga); o rótulo começa com "Copa dos Continentes"; `homeBonusApplies('mundial')` é falso pela Condor e verdadeiro pela sede no seu país; a bilheteria é 40% no neutro; o empate gera pênaltis; a chave avança.

**T6. Virada de temporada do Mundial** (depende de T5)
- Arquivos: `src/composables/useSeason.ts`.
- Fazer: seção 2.4.
- Teste `t44-mundial-season.mjs`: (1) campeão da Ouro: Mundial e Recopa na temporada seguinte; (2) campeão da Prata: só a Recopa; (3) campeão da Taça Cacique: Supercopa, sem Mundial; (4) campeão da A num ano de sede no seu país: Mundial pela sede e a Supercopa; (5) Mundial pendente na virada seguinte: W.O. em `podiumArchive` e estado zerado.

**T7. Persistência do Mundial** (depende de T6)
- Arquivos: `src/composables/usePersistence.ts`.
- Fazer: seção 6 (Mundial).
- Teste `t45-mundial-save.mjs`: save antigo sem `mundialState` carrega; save no meio do Mundial (quartas simuladas, semi pendente) recarrega igual; save, load, save idêntico; as chaves são as de antes mais `mundialState`; chaves antigas de Copa e continental (sem `from`) continuam funcionando.

**T8. Interface do Mundial** (depende de T7)
- Arquivos: `src/components/competitions/MundialPanel.vue` (novo), `src/views/CompetitionsView.vue`, `src/components/bracket/BracketView.vue` (só a prop `layout="phases"`; o padrão não muda).
- Fazer: seção 8 (Copa dos Continentes).
- Teste `t46-mundial-panel.mjs` (`renderToString`): travado contém as duas portas e a próxima sede; qualificado contém os 7 nomes e "Disputar Semifinal" (ou "Disputar Play-off" pela sede); a `CupPanel` continua renderizando a árvore com as linhas.

**T9. Calibração com o Mundial** (depende de T8)
- Arquivos: `docs/calibracao/calib-carreira.mjs` (só `'mundial'` no `pickComp`).
- Fazer: `--check` completo (comando da T0) e um extra informativo com `maximoRot:120`: temporadas com Mundial por porta (Condor e sede), colocação média e prêmio médio na A.
- Pronto: `CHECK OK`; comparação com a linha de base da T0; saldo do `maximoRot` na A abaixo de 400 mil. Se quebrar, **não** mexer em constantes: reportar (seção 7.1).

**T10. Revisão do Opus da branch `feature/copa-dos-continentes`** (Opus, esforço medium)
- Diff contra a `develop`, build, t40 a t46 (e t47 se houver T11), `--check`. Foco: regressão do motor nas chaves antigas, casos `comp === ...` esquecidos, mando e bilheteria da sede, ordem da virada, restauração de partida ao vivo (`LIVE_MATCH_KEY`) com `mundial`.

**T11. (Opcional, depende do sim do dono) Rivais reais da Supercopa e da Recopa** (depende de T6)
- Arquivos: `src/stores/modules/competitions/finals.ts`, `src/composables/useSeason.ts` (só os argumentos de `qualifySupercup`/`qualifyRecopa`), `src/components/competitions/SupercupsPanel.vue` (só o texto da origem do rival).
- Fazer: seção 2.3.
- Teste `t47-finals-ecossistema.mjs`: campeão da liga e da Copa enfrenta o vice da Copa; só campeão da Copa na A enfrenta o campeão da A; campeão da Ouro enfrenta um rival com etiqueta "Campeão da Condor de Prata". Prêmios iguais aos de hoje.

**T12. Tipos, constantes e funções puras do patrocínio** (`feature/patrocinador-master`)
- Arquivos: `src/types/club.ts`, `src/config/economy.ts`, `src/utils/club/sponsor.ts` (novo).
- Fazer: seção 4.
- Teste `t50-sponsor-pure.mjs`: 3 ofertas, uma por perfil, com os valores da tabela da seção 7.2 (D: Estável meta 8.500; Desempenho 1.298 / 7.353 / 34.500; Ousado 2.595 / 9.515 / 69.000 / 17.500); valores crescentes de D para A; `sponsorGoalMet` em todas as células da tabela de metas.

**T13. Estado do patrocínio no `club`** (depende de T12)
- Arquivos: `src/stores/club.ts`.
- Teste `t51-sponsor-club.mjs`: sem contrato, `projectedSponsorIncome` igual ao de hoje; Desempenho na D desconta 1.298 por jogo e o desconto não depende do nível de Finanças; Ousado: `recordTrophy('title')` soma 17.500 e `'promotion'` não; `signSponsor` recusa depois do 1º jogo oficial; `fromSave` sem `sponsor` dá o Estável com `signedAuto`; `fromSave(toSave())` idempotente.

**T14. Patrocínio no jogo** (depende de T13)
- Arquivos: `src/composables/useEconomy.ts`.
- Teste `t52-sponsor-match.mjs`: sem escolha, o 1º `settleMatch` assina o Estável e dá resultado idêntico ao de hoje; Ousado na D: vitória 9.515, empate 1.730; `earned.win` acumula; a renda offline usa a receita já descontada.

**T15. Patrocínio na virada** (depende de T14)
- Arquivos: `src/composables/useSeason.ts`, `src/stores/modules/league/getters.ts` (só `userReachedStage(stage)`, se não houver equivalente).
- Fazer: ordem: troféu, meta, `season += 1`, `division = nextDivision`, ofertas novas; ofertas da T1 em `initializeFreshCareer`.
- Teste `t53-sponsor-season.mjs`: Desempenho na C com acesso dá +42.000; Estável na A rebaixado dá 0; Ousado campeão da D dá 69.000 + 17.500; depois da virada, 3 ofertas novas com a série nova e o contrato nulo; carreira nova com 3 ofertas.

**T16. Interface do patrocínio** (depende de T15)
- Arquivos: `src/components/club/SponsorCard.vue` (novo), `ClubView.vue`, `DashboardView.vue` (banner), `PostMatchSummary.vue`, `SeasonReviewCard.vue`, `useNavigation.ts` (selo de Clube).
- Teste `t54-sponsor-ui.mjs`: sem contrato, 3 perfis e "Assinar"; com contrato, a marca e "Meta:"; o banner aparece só sem contrato.

**T17. Toasts e textos finais do patrocínio** (depende de T16)
- Arquivos: `src/composables/useSeason.ts` (toasts), `src/composables/usePersistence.ts` (aviso de save antigo, se aprovado). Conferir a quebra de linha a 390 px. Pronto: build e o t53 de novo.

**T18. Calibração com o patrocínio** (depende de T17)
- Arquivos: `docs/calibracao/calib-carreira.mjs` (variável de ambiente `SPONSOR_TIER`).
- Pronto: `--check` sem a variável dá `CHECK OK`; informativo com `tipicoRot:240` e `forteRot:80` por perfil: saldo e taxa medida de cada meta. Se algum perfil do típico passar o Estável em mais de 10 mil por temporada, reportar ao dono com a proposta de `goalBonusX`. Não alterar sozinho.

**T19. Revisão do Opus da branch `feature/patrocinador-master`** (Opus, esforço medium)
- Foco: idempotência do `fromSave`, ordem da virada, trava da escolha, renda offline e venda forçada com o corte do Ousado.

**Integração (sessão principal):** merge `--no-ff` de `chore/calib-imports`, `feature/copa-dos-continentes` e `feature/patrocinador-master` na `develop`, nessa ordem; depois do segundo merge, build e `--check` de novo. A versão não muda sem o dono.

## 10. Riscos

1. **Casos esquecidos de `comp === ...`:** um `if` sem `mundial` cai em `league.nextOpponent`. Mitigação: busca explícita na T5 e o adversário conferido no t43.
2. **Regressão do motor de chave:** a Copa, o continental e as Séries C e D usam `propagate` e `resolveTie`. Mitigação: campos opcionais e o teste de regressão byte a byte da T2.
3. **Teto do elenco máximo na A** com o Mundial (cerca de +170 mil) e o Estável (cerca de +16 mil). Medido na T9; a alavanca é o prêmio do campeão.
4. **Desenho da chave irregular** (1, 2, 2, 1 mais o 5º lugar): a árvore com linhas não serve. Mitigação: `layout="phases"` só no Mundial.
5. **Ordem na virada:** a vaga do Mundial depende do pódio da Condor e da tabela da A, que são reiniciados na virada. Mitigação: ler tudo no passo 1 da seção 2.4, conferido no t44.
6. **Porta da sede rara:** precisa de um título da A no ano certo (1 em 4). Se o dono quiser mais chances, a alternativa é sede no país de 2 em 4 anos (pergunta 4).
7. **Ruído da calibração** de ±10 a 20 mil por série: as diferenças do Estável ficam perto do ruído, mas longe dos tetos.
8. **Escolha dominante no patrocínio:** medida na T18; o ajuste é só no `goalBonusX`.
9. **Armadilha de caixa na D** (b1) agravada pelo Ousado para quem perde: é uma escolha consciente, e a interface mostra o equilíbrio.
10. **Conflito de merge** em `useSeason.ts` e `useNavigation.ts` entre as duas frentes: blocos separados, resolução simples.
11. **`npm run dev` com agentes editando** apaga a partida em andamento: não testar no navegador durante as tarefas.

## 11. Perguntas ao dono do produto

1. **Formato:** o clássico de 7 clubes (recomendado) ou o ampliado de 32 com grupos (de 4 em 4 anos, até 7 jogos, pede um ranking de clubes e uma recalibração)?
2. **Nome:** "Copa dos Continentes" serve?
3. **Sede:** a rotação de 4 temporadas (Sakura, Al-Rimal, Atlas e o seu país), com o campeão da Série A entrando pelo play-off quando o seu país é a sede, está boa?
4. **Frequência da sede no seu país:** 1 em 4 temporadas (recomendado) ou 2 em 4?
5. **Mando da sede:** só o clube da sede ganha os +3 de mando, todos os outros jogos são neutros, e a bilheteria do usuário no neutro é a de visitante (40%)?
6. **Vagas extras:** confirma que a Condor de Prata e a Taça Cacique **não** dão vaga na Copa dos Continentes (como no real)?
7. **Supercopa e Recopa com rivais reais** (T11 opcional): campeão da liga x campeão da Copa e Ouro x Prata, em vez do rival sorteado de hoje?
8. **Força dos rivais:** europeu 79 a 82, Ásia 70 a 74, África e América do Norte 69 a 73, Oceania 58 a 63, sede estrangeira 64 a 69?
9. **Prêmios do Mundial:** 400 / 200 / 100 / 70 / 50 / 30 / 0 mil (comprimido em relação ao real para não passar o campeão da A)? Alternativa se o teto quebrar: campeão a 300 mil.
10. **Patrocínio:** aprova os 3 perfis e a tabela em R$ da seção 7.2?
11. **Contrato** de 1 temporada (recomendado) ou plurianual?
12. **Prazo:** escolha travada no 1º jogo oficial, com o Estável automático?
13. **Bônus por título do Ousado:** vale para todos os títulos (incluindo Supercopa, Recopa e Copa dos Continentes) ou só para a liga e a Copa?
14. **Meta da Série D:** permanência = passar da 1ª fase?
15. **Nomes fictícios:** aprova as marcas de `SPONSOR_BRANDS`, os clubes de `MUNDIAL_RIVALS` e os países e clubes de `MUNDIAL_HOSTS`?
16. **Avisos e testes:** mostrar um aviso no save antigo sobre o patrocínio? Os scripts t40 a t54 ficam versionados em `docs/calibracao/`? Posso atualizar a asserção das 17 chaves do t23 numa `chore` separada?
17. **Versão do jogo:** hoje é 1.2.0. A Fase 8 sobe a versão (por exemplo, 1.3.0)? Num commit próprio ou só no lançamento? Uma subida para as duas frentes ou uma por frente?

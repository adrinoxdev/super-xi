# Amistosos — plano de implementação

> **Para agentes:** sub-skill recomendada: superpowers:subagent-driven-development (uma tarefa por subagente) ou superpowers:executing-plans. Os passos usam checkbox (`- [ ]`) para acompanhamento. Cada tarefa abaixo foi escrita para ser entregue sozinha a um subagente: leia só a seção da sua tarefa e as "Regras gerais".

**Objetivo:** implementar a modalidade "Amistosos" do Super XI (fichas com recarga por tempo real, sorteio de adversários com roleta e limite de 3 sorteios, partida `friendly` no fluxo normal, fama estilo Elo, ranking de 101 clubes com bots simulados, tela `/friendlies`, item de navegação e BottomNav com 4 itens + menu "+").

**Arquitetura:** regras em funções puras em `src/utils/friendlies/*` (recebem `now` e `rng`, sem `Date.now()`/`Math.random()` internos), estado numa store Pinia (`src/stores/friendlies.ts`) que fala com os adversários por uma interface trocável (`FriendlyOpponentProvider`, implementação local com bots), integração na simulação existente tratando `'friendly'` como mais uma `MatchCompetition` com ramos próprios em `useMatchSimulation.ts`.

**Stack:** Vue 3.5 + Pinia 2 + vue-router 4 + TypeScript 5 + Tailwind 3 + Vite 5, ícones `lucide-vue-next`. Sem backend: tudo no save local.

**Spec de origem (fonte da verdade):** `docs/superpowers/specs/2026-11-19-amistosos-design.md`. Seções citadas como "spec §N".

---

## Regras gerais (valem para todas as tarefas)

### Git

- Branch de trabalho: `feature/amistosos` (já existe). Antes de começar: `git branch --show-current` deve imprimir `feature/amistosos`. Se não imprimir, pare e avise.
- Uma tarefa = um commit, mensagem exatamente a indicada na tarefa (padrão `tipo(escopo): mensagem`).
- **Nunca** `git add -A` nem `git add .`: o repositório tem vários arquivos não rastreados em `docs/` que não pertencem a estas tarefas. Adicione só os arquivos listados na tarefa.
- **Nunca** alterar `package.json` (nem a versão, nem scripts, nem dependências). Não instalar pacotes.
- Sem merge, sem push, sem rebase, sem `--force`, sem `--no-verify`.

### Qualidade

- Portão único: `npm run build` (`vue-tsc && vite build`). Toda tarefa termina com ele passando (saída termina com `✓ built in ...`, sem erros de tipo).
- Não existe test runner e **não será adicionado**. Para as funções puras e a store há um verificador próprio, criado na Tarefa 1: `node scripts/verify-friendlies/run.mjs <nome>` (usa o `vite` já instalado para carregar TypeScript com o alias `@/`; mesmo padrão de `scripts/verify-league/run.mjs`). `tsx` **não** está no projeto: não use `npx tsx`.
- Comentários de código em português, curtos, explicando o porquê (padrão do repositório).

### Dependências e paralelismo

| Tarefa | Depende de | Pode rodar em paralelo com |
|---|---|---|
| 1 config, tipos, ranking, verificador | — | — |
| 2 fichas | 1 | 3, 5 |
| 3 fama | 1 | 2, 5 |
| 4 sorteio | 1, 3 | 5 (se 5 ainda não terminou) |
| 5 bots | 1 | 2, 3, 4 |
| 6 provedor | 4, 5 | 9 |
| 9 competição `friendly` | 1 | 2–6 |
| 7 store + save | 2, 3, 4, 5, 6, **9** | 10 |
| 6b correções do lote 1-7 | 1–7, 9, 10 | — (4 commits em sequência) |
| 8 ticker | 7, **6b**, **9** | 10, 17 |
| 10 força sem cansaço | 9 | 7, 8 |
| 11 fluxo até o apito | 2, 7, 10 | 17 |
| 12 regras ao vivo | 9, 11 (mesmo arquivo) | 17 |
| 13 encerramento | 7, 12 (mesmo arquivo) | 17 |
| 13b correções do bloco 8-13 | 8–13 | 17 (3 commits em sequência; os três mexem em `useMatchSimulation.ts`) |
| 14 pré-jogo e resumo | 3, 11, 13, **13b** | 17 |
| 15 tela | 2, 3, 4, 7, 10, 11, **13b** | 17 |
| 16 roleta | 15 | 17 |
| 17 navegação, subtítulo, cabeçalho | 7, 9 | 10–16 |
| 18 BottomNav | 17 (mesmo arquivo `useNavigation.ts`) | — |
| 19 verificação manual | todas | — |

**Atenção à numeração:** as Tarefas 7 e 8 usam o literal `'friendly'` em `MatchCompetition`, que só existe depois da Tarefa 9. Por isso a ordem de execução recomendada roda a 9 antes da 7.

**Ordem recomendada de execução:** 1 → (2, 3, 5 em paralelo) → 4 → 6 → 9 → (7 e 10 em paralelo) → **6b (6b.1 → 6b.2 → 6b.3 → 6b.4)** → 8 → 11 → 12 → 13 → **13b (13b.1 → 13b.2 → 13b.3)** → 14 → 15 → 16 → 17 → 18 → 19.

**Tarefa 13b:** as Tarefas 8 a 13 já estão commitadas; a 13b aplica as correções da revisão delas. As Tarefas 14, 15 e 19 abaixo já estão escritas contra o que sai da 13b (`squad.friendlyStrength`, `friendlyLiveBlock`, `beginMatch` com motivo, `cancelBegin`, checagem `strength`).

**Tarefa 6b:** as Tarefas 1–7, 9 e 10 já estão commitadas; a 6b aplica as correções da revisão delas. As Tarefas 11 a 16 abaixo já estão escritas contra a API que sai da 6b (`draw()` sem argumentos, `quote(opt, userOver, now)`, `FriendlyOption.offset`, `ranking.top`/`ranking.user` como linhas da tabela de classificação). Onde o texto das Tarefas 1–7 diverge da 6b, vale a 6b.

Paralelismo só com cada subagente numa worktree isolada ou com os commits serializados pelo coordenador (dois agentes commitando no mesmo diretório disputam o índice do git).

### Mapa de arquivos

Novos:

| Arquivo | Tarefa | Responsabilidade |
|---|---|---|
| `src/config/friendlies.ts` | 1 | `FRIENDLIES` (números da spec §6) e `FRIENDLY_BOT_NAME_PARTS` |
| `src/types/friendlies.ts` | 1 | tipos da spec §5 + `FriendlyOutcome`, `FriendlyDrawContext`, `FriendlyOpponentProvider` |
| `src/utils/friendlies/ranking.ts` | 1, 6b.1 | `userRank`, `rankedBots` (base comum de sorteio e ranking); na 6b.1, estatísticas e ordem da tabela da liga (`compareStanding`) |
| `src/utils/friendlies/rng.ts` | 6b.2 | contrato `[0, 1)` do `Rng` (`unit`, `safeRng`, `randIntWith`) |
| `scripts/verify-friendlies/run.mjs`, `assert.ts` | 1 | verificador das funções puras |
| `scripts/verify-friendlies/*.check.ts` | 1–7 | uma checagem por módulo |
| `src/utils/friendlies/tokens.ts` | 2 | fichas |
| `src/utils/friendlies/fame.ts` | 3 | Elo |
| `src/utils/friendlies/draw.ts` | 4 | bônus de posição, OVER do rival, prêmio, sorteio |
| `src/utils/friendlies/bots.ts` | 5 | geração, simulação, visão do ranking |
| `src/utils/friendlies/localBotProvider.ts` | 6 | provedor local |
| `src/utils/friendlies/strength.ts` | 13b.1 | OVER efetivo do amistoso (`isFriendlyEligible`, `friendlyStrengthOf`) |
| `scripts/verify-friendlies/strength.check.ts` | 13b.1 | checagem do OVER efetivo |
| `src/stores/friendlies.ts` | 7 | store |
| `src/composables/useFriendlies.ts` | 15 | orquestra a tela |
| `src/views/FriendliesView.vue` | 15 | tela `/friendlies` |
| `src/components/friendlies/TokenBar.vue`, `OpponentCard.vue`, `FriendlyRanking.vue`, `FriendlyHistory.vue` | 15 | peças da tela |
| `src/components/friendlies/OpponentRoulette.vue` | 16 | roleta |
| `src/components/layout/BottomNavMore.vue` | 18 | painel do "+" |

Alterados: `src/config/index.ts`, `src/types/index.ts` (1); `src/composables/usePersistence.ts`, `src/App.vue` (7); `src/composables/useScouting.ts` (8); `src/types/match.ts`, `src/stores/match.ts`, `src/utils/player/suspension.ts`, `src/utils/match/matchResult.ts`, `src/components/match/MatchSwitcher.vue`, `src/utils/navigation/sectionMemory.ts` (9); `src/utils/match/calculateTeamStrength.ts`, `src/stores/squad.ts` (10); `src/composables/useMatchSimulation.ts` (11, 12, 13); `src/components/match/SubstitutionDrawer.vue` (12); `src/components/match/PreMatch.vue`, `src/components/match/PostMatchSummary.vue` (14); `src/router/index.ts` (15); `src/composables/useNavigation.ts` (17, 18), `src/composables/usePageSubtitle.ts`, `src/composables/useHeaderStats.ts` (17); `src/components/layout/BottomNav.vue` (18). Na 13b: `src/utils/match/calculateTeamStrength.ts`, `src/stores/squad.ts`, `scripts/verify-friendlies/run.mjs` (13b.1); `src/types/friendlies.ts`, `src/stores/friendlies.ts`, `scripts/verify-friendlies/store.check.ts` (13b.2); `src/components/squad/SquadRoster.vue`, `src/components/match/SubstitutionDrawer.vue` (13b.3); `src/composables/useMatchSimulation.ts` (13b.1, 13b.2, 13b.3).

### Ajustes em relação à spec (decididos neste plano)

1. `userRank`/`rankedBots` ficam em `src/utils/friendlies/ranking.ts` (Tarefa 1) e `bots.ts` reexporta `userRank`. Motivo: `draw.ts` e `bots.ts` precisam deles e assim as Tarefas 4 e 5 não dependem uma da outra.
2. `FRIENDLIES` ganha `bots.overFloor: 40`, `bots.overCeil: 92`, `draw.rankWindowGrow: 5` e `rankingTop: 10`: são números que a spec §6 escreve nas fórmulas; ficam no config em vez de soltos no código.
3. O lugar `Bosque Real` da lista de nomes vira `Bosque das Garças` (com o prefixo `Real` geraria "Real Bosque Real"). Os 20 lugares foram conferidos: nenhum aparece em `src/` (inclui `TEAM_ID_BY_NAME` e `EXTRA_D_CLUBS`), em `docs/catalogo-nomes-ficticios.md` nem em `docs/identidades-times.md`.
4. `friendlies.settle()` devolve `FriendlySummary | null` (não um `LastMatchSummary`): quem monta o `LastMatchSummary` com `friendly` é o `concludeMatch` (Tarefa 13). Assim a store (Tarefa 7) não depende do tipo alterado na Tarefa 9.
5. Em `startLiveMatch`, o snapshot (adversário, mando, rótulo) é calculado **antes** de `beginMatch`, porque `beginMatch` limpa `options`/`selectedBotId` e o rótulo usa a posição do bot. `rawOpponentFor('friendly')` também cai em `friendlies.active` quando não há opção selecionada.
6. `lineupShort(comp)` (novo, exportado por `useMatchSimulation`) cobre "menos de 11 titulares", já que `lineupBlockers` devolve atletas.
7. `finishMatchAndReturn` de um amistoso devolve `activeMatchCompetition` para `'league'` quando não há outra partida aberta (senão o atalho "Partida" do cabeçalho abriria um pré-jogo de amistoso sem adversário).
8. O composable `useFriendlies` (spec §4.1) não tem tarefa própria na spec §10: entra na Tarefa 15, que é a primeira a usá-lo.
9. Recarregar a página no pré-jogo do amistoso: `activeMatchCompetition` não é salvo hoje (vale para as copas também), então o app volta ao pré-jogo da liga; em `/friendlies` as 3 opções, a seleção e o contador continuam e nenhuma ficha foi gasta. Comportamento aceito, igual ao das copas.
10. Revisão do lote 1-7 (Tarefa 6b, spec §11): opção com `offset` e OVER do rival recalculado no apito; ranking como tabela de classificação (fama → vitórias → saldo → gols pró) com estatísticas de amistoso; fama soma zero pelo aplicado; piso no alvo dos bots; saneamento; contrato do `Rng`; `FRIENDLIES` só leitura por `DeepReadonly`.
11. Revisão do bloco 8-13 (Tarefa 13b, spec §11): OVER efetivo `max(atual, melhor elegível)` sem cansaço, com a melhor escalação procurada em todas as formações (`src/utils/friendlies/strength.ts`, `squad.friendlyStrength`); `beginMatch` devolve `FriendlyBeginResult` e `cancelBegin` desfaz o apito na mesma sessão (estado só em memória); `abortStart` chama `saveLiveMatch()` em todas as competições; `concludeFriendly` idempotente; gaveta sem cansaço no amistoso; aviso de recuperação do Elenco com o critério do ticker; `friendlyLiveBlock` bloqueia o início do amistoso com outra partida ao vivo (o sorteio e o inverso seguem livres).

---

## Tarefa 1: config, tipos, ranking e verificador

**Commit:** `feat(amistosos): config e tipos`

**Arquivos:**
- Criar: `src/config/friendlies.ts`
- Criar: `src/types/friendlies.ts`
- Criar: `src/utils/friendlies/ranking.ts`
- Criar: `scripts/verify-friendlies/run.mjs`
- Criar: `scripts/verify-friendlies/assert.ts`
- Criar: `scripts/verify-friendlies/ranking.check.ts`
- Alterar: `src/config/index.ts` (fim do arquivo)
- Alterar: `src/types/index.ts` (fim do arquivo)

- [ ] **Passo 1: criar `src/config/friendlies.ts`**

```ts
/** Amistosos: todos os números da modalidade (spec docs/superpowers/specs/2026-11-19-amistosos-design.md, seção 6). */
export const FRIENDLIES = {
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
    simPull: 0.03
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
```

- [ ] **Passo 2: criar `src/types/friendlies.ts`**

```ts
/** Bot do ranking de amistosos. id 'fb_1'..'fb_100'. `over` é interno (só move o ranking), não é exibido. */
export interface FriendlyBot {
  id: string
  name: string
  over: number
  fame: number
}

/** Uma das 3 opções de um sorteio. `over` é o OVER do dia (exibido); `prize` já considera o limite diário. */
export interface FriendlyOption {
  botId: string
  name: string
  over: number
  fame: number
  rank: number
  prize: number
  fameWin: number
  fameDraw: number
  fameLoss: number
}

/** Desafio em andamento, gravado no apito inicial. */
export interface FriendlyChallenge {
  botId: string
  botName: string
  userOver: number
  oppOver: number
  prize: number
  rankBefore: number
  startedAt: number
}

/** Linha do histórico próprio (máx. 20, mais recente primeiro). */
export interface FriendlyResult {
  at: number
  botName: string
  oppOver: number
  userScore: number
  oppScore: number
  fameDelta: number
  prize: number
}

/** Resumo pós-jogo do amistoso (vai em LastMatchSummary.friendly). */
export interface FriendlySummary {
  prize: number
  fameDelta: number
  fameAfter: number
  rankBefore: number
  rankAfter: number
  paidCapReached: boolean
}

export interface FriendlyRankingView {
  top: Array<{ rank: number; name: string; fame: number; isUser: boolean }>
  user: { rank: number; fame: number }
}

export type FriendlyOutcome = 'win' | 'draw' | 'loss'

/** Dados do usuário que o sorteio precisa. `paidWinsLeft` pode ser Infinity (limite diário desligado). */
export interface FriendlyDrawContext {
  userOver: number
  userFame: number
  paidWinsLeft: number
}

/** Fonte dos adversários. Hoje: bots locais. Futuro: provedor remoto (jogadores reais), sem mudar a store. */
export interface FriendlyOpponentProvider {
  /** Avança o estado dos adversários até `now` (bots: simulação; futuro: busca remota). */
  refresh(now: number): void
  ranking(userFame: number): FriendlyRankingView
  drawOptions(ctx: FriendlyDrawContext, rng: () => number): FriendlyOption[]
  /** Aplica no adversário o efeito do resultado (bots: fama oposta). */
  reportResult(botId: string, userFameDelta: number): void
}

/** Campo `friendlies` do save principal (aditivo, sem migração numerada). */
export interface FriendliesSave {
  v: 1
  fame: number
  tokens: number
  tokenTickAt: number
  seed: number
  bots: FriendlyBot[]
  botsSimAt: number
  options: FriendlyOption[] | null
  /** 0..3 sorteios feitos no desafio atual; zera só em beginMatch. */
  drawsUsed: number
  selectedBotId: string | null
  active: FriendlyChallenge | null
  /** day = dayStart(ts) de src/config/time.ts */
  paidWins: { day: number; count: number }
  recent: FriendlyResult[]
}
```

- [ ] **Passo 3: criar `src/utils/friendlies/ranking.ts`**

```ts
import type { FriendlyBot } from '@/types/friendlies'

/** Posição do usuário: 1 + bots com fama maior (empate favorece o usuário). Vai de 1 a bots.length + 1. */
export function userRank(fame: number, bots: readonly FriendlyBot[]): number {
  return 1 + bots.filter((b) => b.fame > fame).length
}

/** Bots em ordem de fama (desc., estável) com a posição no ranking que inclui o usuário. */
export function rankedBots(bots: readonly FriendlyBot[], userFame: number): Array<{ bot: FriendlyBot; rank: number }> {
  const uRank = userRank(userFame, bots)
  return [...bots]
    .sort((a, b) => b.fame - a.fame)
    .map((bot, i) => ({ bot, rank: i + 1 >= uRank ? i + 2 : i + 1 }))
}
```

- [ ] **Passo 4: reexports**

Em `src/config/index.ts`, acrescentar no fim (depois de `export * from './time'`):

```ts
export * from './friendlies'
```

Em `src/types/index.ts`, acrescentar no fim (depois de `export * from './team'`):

```ts
export * from './friendlies'
```

- [ ] **Passo 5: criar o verificador `scripts/verify-friendlies/assert.ts`**

```ts
/** Checagens simples para as funções puras dos amistosos (sem test runner, ver spec §9). */
export function createChecker() {
  const fails: string[] = []
  return {
    fails,
    eq(name: string, got: unknown, expected: unknown) {
      const g = JSON.stringify(got)
      const e = JSON.stringify(expected)
      if (g !== e) fails.push(`${name}: esperado ${e}, veio ${g}`)
    },
    ok(name: string, cond: boolean, detail = '') {
      if (!cond) fails.push(detail ? `${name}: ${detail}` : name)
    }
  }
}
```

- [ ] **Passo 6: criar `scripts/verify-friendlies/run.mjs`**

```js
// Uso: node scripts/verify-friendlies/run.mjs [nome ...]   (sem nome: roda todos os que existirem)
// Carrega os .check.ts pelo vite (alias @/ e TypeScript), como scripts/verify-league/run.mjs.
import { createServer } from 'vite'
import { existsSync } from 'node:fs'

const ALL = ['ranking', 'tokens', 'fame', 'draw', 'bots', 'provider', 'store']
const wanted = process.argv.slice(2)
const names = wanted.length ? wanted : ALL
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
let failed = 0
try {
  for (const name of names) {
    const file = `scripts/verify-friendlies/${name}.check.ts`
    if (!existsSync(file)) {
      if (wanted.length) {
        console.error(`FALTA ${file}`)
        failed++
      } else console.log(`- ${name}: ainda não existe, pulado`)
      continue
    }
    const mod = await server.ssrLoadModule('/' + file)
    const fails = mod.run()
    if (fails.length) {
      failed += fails.length
      console.error(`FALHOU ${name}:\n  ` + fails.join('\n  '))
    } else console.log(`OK ${name}`)
  }
} finally {
  await server.close()
}
if (failed) process.exitCode = 1
```

- [ ] **Passo 7: criar `scripts/verify-friendlies/ranking.check.ts`**

```ts
import { createChecker } from './assert'
import { rankedBots, userRank } from '@/utils/friendlies/ranking'
import { FRIENDLIES, FRIENDLY_BOT_NAME_PARTS } from '@/config/friendlies'
import type { FriendlyBot } from '@/types/friendlies'

const bot = (n: number, fame: number): FriendlyBot => ({ id: `fb_${n}`, name: `Bot ${n}`, over: 60, fame })

export function run(): string[] {
  const c = createChecker()
  const bots = [bot(1, 100), bot(2, 50), bot(3, 50), bot(4, 10)]
  c.eq('userRank com fama 0', userRank(0, bots), 5)
  c.eq('userRank: empate favorece o usuario', userRank(50, bots), 2)
  c.eq('userRank acima de todos', userRank(500, bots), 1)
  c.eq(
    'rankedBots com usuario em 2o',
    rankedBots(bots, 50).map((r) => [r.bot.id, r.rank]),
    [['fb_1', 1], ['fb_2', 3], ['fb_3', 4], ['fb_4', 5]]
  )
  c.eq('rankedBots com usuario em ultimo', rankedBots(bots, 0).map((r) => r.rank), [1, 2, 3, 4])
  c.eq('rankedBots com usuario em 1o', rankedBots(bots, 500).map((r) => r.rank), [2, 3, 4, 5])
  c.ok(
    'combinacoes de nome suficientes',
    FRIENDLY_BOT_NAME_PARTS.prefixes.length * FRIENDLY_BOT_NAME_PARTS.places.length >= FRIENDLIES.bots.count
  )
  c.eq('lugares sem repeticao', new Set(FRIENDLY_BOT_NAME_PARTS.places).size, FRIENDLY_BOT_NAME_PARTS.places.length)
  return c.fails
}
```

- [ ] **Passo 8: verificar**

Rodar: `node scripts/verify-friendlies/run.mjs ranking`
Esperado: `OK ranking`.

Rodar: `npm run build`
Esperado: termina com `✓ built in ...`, sem erro de tipo.

- [ ] **Passo 9: commit**

```bash
git add src/config/friendlies.ts src/types/friendlies.ts src/utils/friendlies/ranking.ts src/config/index.ts src/types/index.ts scripts/verify-friendlies/run.mjs scripts/verify-friendlies/assert.ts scripts/verify-friendlies/ranking.check.ts
git commit -m "feat(amistosos): config e tipos"
```

**Pronto quando:** build passa, `OK ranking`, só os 8 arquivos acima no commit.

**Não fazer:** não alterar `src/types/match.ts` (é da Tarefa 9); não usar `as const` no `FRIENDLIES` (as outras tarefas esperam `number`, não literais); não criar store nem componentes.

---

## Tarefa 2: funções puras de fichas

**Commit:** `feat(amistosos): funcoes puras de fichas`
**Depende de:** Tarefa 1 (`FRIENDLIES`, verificador).

Regra (spec §2.1 e §6): máximo 10 fichas, +1 a cada 6 min de tempo real (inclusive offline: o primeiro cálculo aplica todo o tempo decorrido), mesmo padrão de `squad.regenStamina` em `src/stores/squad.ts`.

**Arquivos:**
- Criar: `src/utils/friendlies/tokens.ts`
- Criar: `scripts/verify-friendlies/tokens.check.ts`

- [ ] **Passo 1: escrever a checagem `scripts/verify-friendlies/tokens.check.ts`**

```ts
import { createChecker } from './assert'
import { formatTokenCountdown, msToNextToken, regenTokens, spendToken } from '@/utils/friendlies/tokens'

const MIN = 60 * 1000

export function run(): string[] {
  const c = createChecker()
  c.eq('30 min parado com 7: enche e zera o relogio', regenTokens({ tokens: 7, tokenTickAt: 0 }, 30 * MIN), { tokens: 10, tokenTickAt: 30 * MIN })
  c.eq('13 min com 5: +2 e guarda o resto', regenTokens({ tokens: 5, tokenTickAt: 0 }, 13 * MIN), { tokens: 7, tokenTickAt: 12 * MIN })
  c.eq('menos de 6 min: nada muda', regenTokens({ tokens: 5, tokenTickAt: 0 }, 5 * MIN), { tokens: 5, tokenTickAt: 0 })
  c.eq('relogio voltado: tokenTickAt = now', regenTokens({ tokens: 5, tokenTickAt: 1000 }, 500), { tokens: 5, tokenTickAt: 500 })
  c.eq('cheio: tokenTickAt = now', regenTokens({ tokens: 10, tokenTickAt: 0 }, 999), { tokens: 10, tokenTickAt: 999 })
  c.eq('acima do maximo volta a 10', regenTokens({ tokens: 14, tokenTickAt: 0 }, 50), { tokens: 10, tokenTickAt: 50 })
  c.eq('gastar com 10 reinicia o relogio', spendToken({ tokens: 10, tokenTickAt: 0 }, 5000), { tokens: 9, tokenTickAt: 5000 })
  c.eq('gastar com 4 mantem o relogio', spendToken({ tokens: 4, tokenTickAt: 100 }, 5000), { tokens: 3, tokenTickAt: 100 })
  c.eq('sem ficha: null', spendToken({ tokens: 0, tokenTickAt: 0 }, 1), null)
  c.eq('cheio: proxima em 0', msToNextToken({ tokens: 10, tokenTickAt: 0 }, 123), 0)
  c.eq('proxima ficha', msToNextToken({ tokens: 3, tokenTickAt: 0 }, MIN), 5 * MIN)
  c.eq('proxima nunca negativa', msToNextToken({ tokens: 3, tokenTickAt: 0 }, 99 * MIN), 0)
  c.eq('mm:ss 5 min', formatTokenCountdown(5 * MIN), '05:00')
  c.eq('mm:ss arredonda para cima', formatTokenCountdown(61001), '01:02')
  c.eq('mm:ss zero', formatTokenCountdown(0), '00:00')
  return c.fails
}
```

- [ ] **Passo 2: rodar e ver falhar**

Rodar: `node scripts/verify-friendlies/run.mjs tokens`
Esperado: erro de carregamento (módulo `@/utils/friendlies/tokens` não existe).

- [ ] **Passo 3: criar `src/utils/friendlies/tokens.ts`**

```ts
import { FRIENDLIES } from '@/config/friendlies'

export interface TokenState {
  tokens: number
  tokenTickAt: number
}

/**
 * Recarga por tempo real (mesmo padrão de squad.regenStamina): soma só fichas inteiras e guarda o resto de tempo em
 * tokenTickAt. Cheio, o relógio acompanha `now` para a próxima ficha não nascer "adiantada". Relógio do sistema voltado
 * não dá ganho negativo.
 */
export function regenTokens(s: TokenState, now: number): TokenState {
  const { max, msPerToken } = FRIENDLIES.tokens
  if (s.tokens >= max) return { tokens: max, tokenTickAt: now }
  const n = Math.floor((now - s.tokenTickAt) / msPerToken)
  if (n <= 0) return { tokens: s.tokens, tokenTickAt: now < s.tokenTickAt ? now : s.tokenTickAt }
  const tokens = Math.min(max, s.tokens + n)
  return { tokens, tokenTickAt: tokens >= max ? now : s.tokenTickAt + n * msPerToken }
}

/** Gasta 1 ficha. Com o estoque cheio, a contagem da próxima começa agora. Sem ficha: null. */
export function spendToken(s: TokenState, now: number): TokenState | null {
  if (s.tokens <= 0) return null
  return { tokens: s.tokens - 1, tokenTickAt: s.tokens >= FRIENDLIES.tokens.max ? now : s.tokenTickAt }
}

/** Milissegundos até a próxima ficha (0 com estoque cheio). */
export function msToNextToken(s: TokenState, now: number): number {
  if (s.tokens >= FRIENDLIES.tokens.max) return 0
  return Math.max(0, s.tokenTickAt + FRIENDLIES.tokens.msPerToken - now)
}

/** "mm:ss" para contadores de ficha (segundos arredondados para cima). */
export function formatTokenCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
```

- [ ] **Passo 4: verificar**

Rodar: `node scripts/verify-friendlies/run.mjs tokens` → `OK tokens`.
Rodar: `npm run build` → `✓ built in ...`.

- [ ] **Passo 5: commit**

```bash
git add src/utils/friendlies/tokens.ts scripts/verify-friendlies/tokens.check.ts
git commit -m "feat(amistosos): funcoes puras de fichas"
```

**Pronto quando:** `OK tokens` e build passando.

**Não fazer:** não usar `Date.now()` dentro das funções (recebem `now`); não mexer em store nem no ticker (Tarefas 7 e 8).

---

## Tarefa 3: funções puras de fama (Elo)

**Commit:** `feat(amistosos): funcoes puras de fama elo`
**Depende de:** Tarefa 1.

Regra (spec §6): `E = 1 / (1 + 10^((oppOver − userOver) / 20))`; vitória `max(4, round(30·(1−E)))`; empate `clamp(round(30·(0.5−E)), −6, 6)`; derrota `−max(3, round(30·E))`; fama nunca abaixo de 0.

**Arquivos:**
- Criar: `src/utils/friendlies/fame.ts`
- Criar: `scripts/verify-friendlies/fame.check.ts`

- [ ] **Passo 1: escrever a checagem `scripts/verify-friendlies/fame.check.ts`**

```ts
import { createChecker } from './assert'
import { applyFame, expectedScore, fameDelta, outcomeFromScore, signedFame } from '@/utils/friendlies/fame'

// Tabela da spec §6: diferença oppOver − userOver → vitória / empate / derrota.
const TABLE: Array<[number, number, number, number]> = [
  [0, 15, 0, -15],
  [5, 19, 4, -11],
  [-5, 11, -4, -19],
  [10, 23, 6, -7],
  [20, 27, 6, -3]
]

export function run(): string[] {
  const c = createChecker()
  c.eq('E com OVERs iguais', expectedScore(60, 60), 0.5)
  for (const [diff, w, d, l] of TABLE) {
    c.eq(`vitoria diff ${diff}`, fameDelta(60, 60 + diff, 'win'), w)
    c.eq(`empate diff ${diff}`, fameDelta(60, 60 + diff, 'draw'), d)
    c.eq(`derrota diff ${diff}`, fameDelta(60, 60 + diff, 'loss'), l)
  }
  c.eq('vitoria minima 4', fameDelta(90, 40, 'win'), 4)
  c.eq('derrota minima 3', fameDelta(40, 90, 'loss'), -3)
  c.eq('fama nao fica negativa', applyFame(10, -15), 0)
  c.eq('derrota com fama 0', applyFame(0, -3), 0)
  c.eq('soma normal', applyFame(5, 4), 9)
  c.eq('resultado vitoria', outcomeFromScore(2, 1), 'win')
  c.eq('resultado empate', outcomeFromScore(1, 1), 'draw')
  c.eq('resultado derrota', outcomeFromScore(0, 3), 'loss')
  c.eq('sinal positivo', signedFame(19), '+19')
  c.eq('sinal zero', signedFame(0), '0')
  c.eq('sinal negativo', signedFame(-11), '−11')
  return c.fails
}
```

- [ ] **Passo 2: rodar e ver falhar**

Rodar: `node scripts/verify-friendlies/run.mjs fame` → erro de módulo ausente.

- [ ] **Passo 3: criar `src/utils/friendlies/fame.ts`**

```ts
import type { FriendlyOutcome } from '@/types/friendlies'
import { FRIENDLIES } from '@/config/friendlies'
import { clamp } from '@/utils/core/random'

/** Chance esperada de vitória do usuário pelo Elo sobre OVER (não sobre fama: decisão da spec §11). */
export function expectedScore(userOver: number, oppOver: number): number {
  return 1 / (1 + 10 ** ((oppOver - userOver) / FRIENDLIES.fame.scale))
}

/** Variação de fama do usuário. O bot recebe o oposto. */
export function fameDelta(userOver: number, oppOver: number, outcome: FriendlyOutcome): number {
  const { k, minWin, minLoss, drawCap } = FRIENDLIES.fame
  const e = expectedScore(userOver, oppOver)
  if (outcome === 'win') return Math.max(minWin, Math.round(k * (1 - e)))
  if (outcome === 'draw') return clamp(Math.round(k * (0.5 - e)), -drawCap, drawCap) || 0
  return -Math.max(minLoss, Math.round(k * e))
}

/** Fama nunca fica abaixo de 0 (usuário e bots). */
export function applyFame(fame: number, delta: number): number {
  return Math.max(0, fame + delta)
}

export function outcomeFromScore(userScore: number, oppScore: number): FriendlyOutcome {
  return userScore > oppScore ? 'win' : userScore === oppScore ? 'draw' : 'loss'
}

/** "+19", "0", "−11" (sinal de menos tipográfico). */
export function signedFame(n: number): string {
  if (n > 0) return `+${n}`
  if (n < 0) return `−${Math.abs(n)}`
  return '0'
}
```

- [ ] **Passo 4: verificar**

Rodar: `node scripts/verify-friendlies/run.mjs fame` → `OK fame`.
Rodar: `npm run build` → `✓ built in ...`.

- [ ] **Passo 5: commit**

```bash
git add src/utils/friendlies/fame.ts scripts/verify-friendlies/fame.check.ts
git commit -m "feat(amistosos): funcoes puras de fama elo"
```

**Pronto quando:** `OK fame` (todas as linhas da tabela batem) e build passando.

**Não fazer:** não usar a fama dos times no Elo; não tocar em `club.reputation` (fama e reputação são separadas, spec §2.12).

---

## Tarefa 4: sorteio, bônus de posição e prêmio

**Commit:** `feat(amistosos): sorteio, bonus de posicao e premio`
**Depende de:** Tarefas 1 (`ranking.ts`, config, tipos) e 3 (`fameDelta`).

Regras (spec §6): `rankBonus(rank) = rank ≤ 10 ? 6 : rank ≤ 50 ? round1(6·(51 − rank)/41) : 0`; `oppOver = clamp(round(userOver + rankBonus(rankDoUsuario) + U(−5, +5)), 35, 99)` (cada opção sorteia o seu); prêmio `clamp(roundTo500(8000 + (oppOver − 50)·500), 8000, 25000)`, 0 se o limite diário esgotou; 3 bots distintos entre os de posição a até ±15 da posição do usuário (janela cresce de 5 em 5 se faltar bot).

**Arquivos:**
- Criar: `src/utils/friendlies/draw.ts`
- Criar: `scripts/verify-friendlies/draw.check.ts`

- [ ] **Passo 1: escrever a checagem `scripts/verify-friendlies/draw.check.ts`**

```ts
import { createChecker } from './assert'
import { drawOptions, friendlyPrize, opponentOver, rankBonus } from '@/utils/friendlies/draw'
import { fameDelta } from '@/utils/friendlies/fame'
import { mulberry32 } from '@/utils/core/random'
import type { FriendlyBot } from '@/types/friendlies'

export function run(): string[] {
  const c = createChecker()
  c.eq('bonus rank 1', rankBonus(1), 6)
  c.eq('bonus rank 10', rankBonus(10), 6)
  c.eq('bonus rank 11', rankBonus(11), 5.9)
  c.eq('bonus rank 30', rankBonus(30), 3.1)
  c.eq('bonus rank 50', rankBonus(50), 0.1)
  c.eq('bonus rank 51', rankBonus(51), 0)
  c.eq('bonus rank 101', rankBonus(101), 0)

  c.eq('premio OVER 50', friendlyPrize(50), 8000)
  c.eq('premio OVER 60', friendlyPrize(60), 13000)
  c.eq('premio OVER 61', friendlyPrize(61), 13500)
  c.eq('premio OVER 70', friendlyPrize(70), 18000)
  c.eq('premio OVER 84', friendlyPrize(84), 25000)
  c.eq('premio piso', friendlyPrize(40), 8000)
  c.eq('premio teto', friendlyPrize(99), 25000)

  c.eq('OVER do rival sem variacao', opponentOver(60, 101, () => 0.5), 60)
  c.eq('OVER do rival no minimo da variacao', opponentOver(60, 101, () => 0), 55)
  c.eq('OVER do rival no maximo da variacao', opponentOver(60, 101, () => 0.9999), 65)
  c.eq('OVER do rival com bonus de top 10', opponentOver(60, 5, () => 0.5), 66)
  c.eq('OVER do rival com teto 99', opponentOver(98, 1, () => 0.99), 99)
  c.eq('OVER do rival com piso 35', opponentOver(20, 101, () => 0), 35)

  const bots: FriendlyBot[] = Array.from({ length: 100 }, (_, i) => ({ id: `fb_${i + 1}`, name: `Bot ${i + 1}`, over: 60, fame: (100 - i) * 10 }))
  const ctx = { userOver: 60, userFame: 0, paidWinsLeft: 0, bots }
  const opts = drawOptions(ctx, mulberry32(1))
  c.eq('3 opcoes', opts.length, 3)
  c.ok('bots distintos', new Set(opts.map((o) => o.botId)).size === 3)
  c.ok('janela de +-15 posicoes (usuario em 101)', opts.every((o) => o.rank >= 86 && o.rank <= 100), JSON.stringify(opts.map((o) => o.rank)))
  c.ok('ordenadas por posicao', opts[0].rank <= opts[1].rank && opts[1].rank <= opts[2].rank)
  c.ok('OVER do dia em [55, 65]', opts.every((o) => o.over >= 55 && o.over <= 65))
  c.ok('premio 0 com limite esgotado', opts.every((o) => o.prize === 0))
  c.ok(
    'fama em jogo = fameDelta',
    opts.every(
      (o) => o.fameWin === fameDelta(60, o.over, 'win') && o.fameDraw === fameDelta(60, o.over, 'draw') && o.fameLoss === fameDelta(60, o.over, 'loss')
    )
  )
  c.ok('fama e nome do proprio bot', opts.every((o) => {
    const b = bots.find((x) => x.id === o.botId)
    return !!b && b.fame === o.fame && b.name === o.name
  }))
  c.eq('deterministico com a mesma semente', drawOptions(ctx, mulberry32(1)), opts)
  const paid = drawOptions({ ...ctx, paidWinsLeft: 5 }, mulberry32(2))
  c.ok('premio pago = friendlyPrize', paid.every((o) => o.prize === friendlyPrize(o.over)))
  const unlimited = drawOptions({ ...ctx, paidWinsLeft: Number.POSITIVE_INFINITY }, mulberry32(3))
  c.ok('sem limite diario paga', unlimited.every((o) => o.prize > 0))
  const few = drawOptions({ ...ctx, bots: bots.slice(0, 2) }, mulberry32(4))
  c.eq('com 2 bots devolve 2', few.length, 2)
  return c.fails
}
```

- [ ] **Passo 2: rodar e ver falhar**

Rodar: `node scripts/verify-friendlies/run.mjs draw` → erro de módulo ausente.

- [ ] **Passo 3: criar `src/utils/friendlies/draw.ts`**

```ts
import type { FriendlyBot, FriendlyDrawContext, FriendlyOption } from '@/types/friendlies'
import { FRIENDLIES } from '@/config/friendlies'
import { clamp, shuffle, type Rng } from '@/utils/core/random'
import { fameDelta } from './fame'
import { rankedBots, userRank } from './ranking'

const round1 = (x: number) => Math.round(x * 10) / 10

/** Bônus de posição do usuário: 6 no top 10, cai linearmente até ~0 na 50ª, 0 dali para baixo. */
export function rankBonus(rank: number): number {
  const { rankBonusMax, rankBonusTop, rankBonusFrom } = FRIENDLIES.draw
  if (rank <= rankBonusTop) return rankBonusMax
  if (rank <= rankBonusFrom) return round1((rankBonusMax * (rankBonusFrom + 1 - rank)) / (rankBonusFrom + 1 - rankBonusTop))
  return 0
}

/** OVER do dia do rival: OVER do usuário + bônus da posição do usuário + variação uniforme em [−5, +5]. */
export function opponentOver(userOver: number, rank: number, rng: Rng): number {
  const { spread, overMin, overMax } = FRIENDLIES.draw
  return clamp(Math.round(userOver + rankBonus(rank) + (rng() * 2 - 1) * spread), overMin, overMax)
}

/** Prêmio da vitória (antes do limite diário): escala com o OVER do rival, de 500 em 500. */
export function friendlyPrize(oppOver: number): number {
  const { base, refOver, perOver, min, max, step } = FRIENDLIES.prize
  return clamp(Math.round((base + (oppOver - refOver) * perOver) / step) * step, min, max)
}

/**
 * Um sorteio: bots distintos a até ±15 posições do usuário (a janela cresce de 5 em 5 se faltar bot), em ordem de
 * posição. O cartão mostra a fama e a posição do bot e o OVER do dia (não o `over` interno).
 */
export function drawOptions(ctx: FriendlyDrawContext & { bots: readonly FriendlyBot[] }, rng: Rng): FriendlyOption[] {
  const { rankWindow, rankWindowGrow, options } = FRIENDLIES.draw
  const uRank = userRank(ctx.userFame, ctx.bots)
  const ranked = rankedBots(ctx.bots, ctx.userFame)
  let windowSize = rankWindow
  let pool = ranked.filter((r) => Math.abs(r.rank - uRank) <= windowSize)
  while (pool.length < options && pool.length < ranked.length) {
    windowSize += rankWindowGrow
    pool = ranked.filter((r) => Math.abs(r.rank - uRank) <= windowSize)
  }
  const picked = shuffle(pool, rng)
    .slice(0, options)
    .sort((a, b) => a.rank - b.rank)
  const capped = ctx.paidWinsLeft <= 0
  return picked.map(({ bot, rank }) => {
    const over = opponentOver(ctx.userOver, uRank, rng)
    return {
      botId: bot.id,
      name: bot.name,
      over,
      fame: bot.fame,
      rank,
      prize: capped ? 0 : friendlyPrize(over),
      fameWin: fameDelta(ctx.userOver, over, 'win'),
      fameDraw: fameDelta(ctx.userOver, over, 'draw'),
      fameLoss: fameDelta(ctx.userOver, over, 'loss')
    }
  })
}
```

- [ ] **Passo 4: verificar**

Rodar: `node scripts/verify-friendlies/run.mjs draw` → `OK draw`.
Rodar: `npm run build` → `✓ built in ...`.

- [ ] **Passo 5: commit**

```bash
git add src/utils/friendlies/draw.ts scripts/verify-friendlies/draw.check.ts
git commit -m "feat(amistosos): sorteio, bonus de posicao e premio"
```

**Pronto quando:** `OK draw` e build passando.

**Não fazer:** não controlar aqui o limite de 3 sorteios (é da store, Tarefa 7); não usar `Math.random()` (recebe `rng`); não importar de `bots.ts`.

---

## Tarefa 5: geração e simulação dos bots

**Commit:** `feat(amistosos): geracao e simulacao dos bots`
**Depende de:** Tarefa 1.

Regras (spec §6): `generateBots(seed)` com `mulberry32(seed)` de `src/utils/core/random.ts`; para `i = 0..99`: `fame = max(10, round(1800·(1 − i/100)^1.6) + randInt(−20, 20))`, `over = clamp(round(48 + 40·fame/1800) + randInt(−4, 4), 40, 92)`, nome = combinação única prefixo + lugar embaralhada pelo mesmo seed. Simulação: `steps = min(72, floor((now − botsSimAt)/1h))`, `botsSimAt += floor((now − botsSimAt)/1h)·1h`; por passo e bot: `alvo = (over − 48)/40·1800`, `Δ = randInt(−6,6) + randInt(−6,6) + round((alvo − fame)·0.03)`, `fame = max(0, fame + Δ)`. O `over` interno não muda.

Os nomes já foram conferidos contra `docs/catalogo-nomes-ficticios.md`, `docs/identidades-times.md`, `TEAM_ID_BY_NAME` (`src/utils/identity/teamIdentities.ts`) e `EXTRA_D_CLUBS` (`src/utils/league/extraClubs.ts`); a checagem abaixo repete a conferência no código.

**Arquivos:**
- Criar: `src/utils/friendlies/bots.ts`
- Criar: `scripts/verify-friendlies/bots.check.ts`

- [ ] **Passo 1: escrever a checagem `scripts/verify-friendlies/bots.check.ts`**

```ts
import { createChecker } from './assert'
import { allBotNames, generateBots, rankingView, simulateBots, userRank } from '@/utils/friendlies/bots'
import { TEAM_ID_BY_NAME } from '@/utils/identity/teamIdentities'
import { EXTRA_D_CLUBS } from '@/utils/league/extraClubs'
import type { FriendlyBot } from '@/types/friendlies'

const H = 60 * 60 * 1000

export function run(): string[] {
  const c = createChecker()
  const bots = generateBots(42)
  c.eq('100 bots', bots.length, 100)
  c.eq('ids fb_1..fb_100', bots.map((b) => b.id), Array.from({ length: 100 }, (_, i) => `fb_${i + 1}`))
  c.eq('nomes unicos', new Set(bots.map((b) => b.name)).size, 100)
  c.ok('OVER interno em [40, 92]', bots.every((b) => b.over >= 40 && b.over <= 92))
  c.ok('fama inicial >= 10', bots.every((b) => b.fame >= 10))
  c.ok('topo ~1800', bots[0].fame >= 1780 && bots[0].fame <= 1820, String(bots[0].fame))
  c.ok('10o ~1550', bots[9].fame >= 1528 && bots[9].fame <= 1568, String(bots[9].fame))
  c.ok('100o entre 10 e 21', bots[99].fame >= 10 && bots[99].fame <= 21, String(bots[99].fame))
  c.eq('mesma semente, mesmos bots', generateBots(42), bots)
  c.ok('semente diferente muda', JSON.stringify(generateBots(43)) !== JSON.stringify(bots))
  c.eq('usuario com fama 0 em 101', userRank(0, bots), 101)

  const taken = new Set([...Object.keys(TEAM_ID_BY_NAME), ...EXTRA_D_CLUBS.map((x) => x.name)].map((n) => n.toLowerCase()))
  c.ok('nenhum nome igual a clube existente', allBotNames().every((n) => !taken.has(n.toLowerCase())))

  const same = simulateBots(bots, 0, 30 * 60 * 1000, () => 0.5)
  c.eq('menos de 1h: simAt nao anda', same.simAt, 0)
  c.eq('menos de 1h: bots iguais', same.bots, bots)
  c.eq('3h10: simAt = 3h', simulateBots(bots, 0, 3 * H + 10 * 60 * 1000, Math.random).simAt, 3 * H)
  c.eq('100h: excedente descartado, simAt = 100h', simulateBots(bots, 0, 100 * H, Math.random).simAt, 100 * H)
  c.eq('relogio voltado: simAt = now', simulateBots(bots, 5 * H, 2 * H, Math.random).simAt, 2 * H)
  c.ok('fama nunca negativa', simulateBots(bots, 0, 72 * H, Math.random).bots.every((b) => b.fame >= 0))
  c.ok('over interno nao muda', simulateBots(bots, 0, 72 * H, Math.random).bots.every((b, i) => b.over === bots[i].over))
  // rng 0.5 zera o ruído: só o puxão para o alvo age (OVER 88 → alvo 1800).
  const pulled = simulateBots([{ id: 'fb_1', name: 'X', over: 88, fame: 0 }], 0, 72 * H, () => 0.5)
  c.ok('puxao em direcao ao alvo', pulled.bots[0].fame > 500, String(pulled.bots[0].fame))
  c.ok('nao muta a entrada', bots[0].fame === generateBots(42)[0].fame)

  const small: FriendlyBot[] = [
    { id: 'fb_1', name: 'A', over: 60, fame: 100 },
    { id: 'fb_2', name: 'B', over: 60, fame: 50 },
    { id: 'fb_3', name: 'C', over: 60, fame: 50 },
    { id: 'fb_4', name: 'D', over: 60, fame: 10 }
  ]
  c.eq('rankingView', rankingView(small, { name: 'Voce', fame: 50 }), {
    top: [
      { rank: 1, name: 'A', fame: 100, isUser: false },
      { rank: 2, name: 'Voce', fame: 50, isUser: true },
      { rank: 3, name: 'B', fame: 50, isUser: false },
      { rank: 4, name: 'C', fame: 50, isUser: false },
      { rank: 5, name: 'D', fame: 10, isUser: false }
    ],
    user: { rank: 2, fame: 50 }
  })
  c.eq('rankingView corta no top 10', rankingView(bots, { name: 'Voce', fame: 0 }).top.length, 10)
  c.eq('rankingView usuario fora do top', rankingView(bots, { name: 'Voce', fame: 0 }).user, { rank: 101, fame: 0 })
  return c.fails
}
```

- [ ] **Passo 2: rodar e ver falhar**

Rodar: `node scripts/verify-friendlies/run.mjs bots` → erro de módulo ausente.

- [ ] **Passo 3: criar `src/utils/friendlies/bots.ts`**

```ts
import type { FriendlyBot, FriendlyRankingView } from '@/types/friendlies'
import { FRIENDLIES, FRIENDLY_BOT_NAME_PARTS } from '@/config/friendlies'
import { clamp, mulberry32, shuffle, type Rng } from '@/utils/core/random'
import { rankedBots, userRank } from './ranking'

export { userRank }

const randIntWith = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min

/** Todas as combinações prefixo + lugar (200). */
export function allBotNames(): string[] {
  return FRIENDLY_BOT_NAME_PARTS.prefixes.flatMap((p) => FRIENDLY_BOT_NAME_PARTS.places.map((pl) => `${p} ${pl}`))
}

/** 100 bots determinísticos pela semente: fama em curva (topo ~1800, 100º ~10) e OVER interno ligado à fama. */
export function generateBots(seed: number): FriendlyBot[] {
  const b = FRIENDLIES.bots
  const rng = mulberry32(seed)
  const names = shuffle(allBotNames(), rng).slice(0, b.count)
  return Array.from({ length: b.count }, (_, i) => {
    const fame = Math.max(b.fameMinStart, Math.round(b.fameTop * (1 - i / b.count) ** b.fameCurve) + randIntWith(rng, -b.fameJitter, b.fameJitter))
    const over = clamp(Math.round(b.overMin + (b.overSpan * fame) / b.fameTop) + randIntWith(rng, -b.overJitter, b.overJitter), b.overFloor, b.overCeil)
    return { id: `fb_${i + 1}`, name: names[i], over, fame }
  })
}

/**
 * Evolução dos bots desde `lastSimAt`: um passo por hora inteira, no máximo 72 (o excedente é descartado, o resto de
 * tempo fica). Ruído ± e puxão de volta ao alvo do OVER interno: o ranking se mexe sem deriva infinita. Não muta a entrada.
 */
export function simulateBots(bots: readonly FriendlyBot[], lastSimAt: number, now: number, rng: Rng): { bots: FriendlyBot[]; simAt: number } {
  const b = FRIENDLIES.bots
  const elapsed = Math.floor((now - lastSimAt) / b.simStepMs)
  if (elapsed <= 0) return { bots: bots.map((x) => ({ ...x })), simAt: now < lastSimAt ? now : lastSimAt }
  const steps = Math.min(b.simMaxSteps, elapsed)
  const next = bots.map((x) => ({ ...x }))
  for (let s = 0; s < steps; s++) {
    for (const bot of next) {
      const target = ((bot.over - b.overMin) / b.overSpan) * b.fameTop
      const delta = randIntWith(rng, -b.simNoise, b.simNoise) + randIntWith(rng, -b.simNoise, b.simNoise) + Math.round((target - bot.fame) * b.simPull)
      bot.fame = Math.max(0, bot.fame + delta)
    }
  }
  return { bots: next, simAt: lastSimAt + elapsed * b.simStepMs }
}

/** Top 10 do ranking (usuário incluído na posição dele) + a linha do usuário. */
export function rankingView(bots: readonly FriendlyBot[], user: { name: string; fame: number }): FriendlyRankingView {
  const uRank = userRank(user.fame, bots)
  const rows = rankedBots(bots, user.fame).map((r) => ({ rank: r.rank, name: r.bot.name, fame: r.bot.fame, isUser: false }))
  rows.splice(uRank - 1, 0, { rank: uRank, name: user.name, fame: user.fame, isUser: true })
  return { top: rows.slice(0, FRIENDLIES.rankingTop), user: { rank: uRank, fame: user.fame } }
}
```

- [ ] **Passo 4: verificar**

Rodar: `node scripts/verify-friendlies/run.mjs bots` → `OK bots`.
Rodar: `npm run build` → `✓ built in ...`.

- [ ] **Passo 5: commit**

```bash
git add src/utils/friendlies/bots.ts scripts/verify-friendlies/bots.check.ts
git commit -m "feat(amistosos): geracao e simulacao dos bots"
```

**Pronto quando:** `OK bots` e build passando.

**Não fazer:** não usar timer nem `Date.now()`; não alterar `FRIENDLY_BOT_NAME_PARTS` (se a checagem de nomes falhar, pare e reporte o nome em conflito em vez de inventar outro).

---

## Tarefa 6: provedor local de adversários

**Commit:** `feat(amistosos): provedor local de adversarios`
**Depende de:** Tarefas 4 (`drawOptions`) e 5 (`simulateBots`, `rankingView`).

A store (Tarefa 7) só fala com `FriendlyOpponentProvider` (`src/types/friendlies.ts`). Esta implementação local opera sobre os `bots` e o `botsSimAt` da store por meio de acessores, para a store continuar dona do estado reativo.

**Arquivos:**
- Criar: `src/utils/friendlies/localBotProvider.ts`
- Criar: `scripts/verify-friendlies/provider.check.ts`

- [ ] **Passo 1: escrever a checagem `scripts/verify-friendlies/provider.check.ts`**

```ts
import { createChecker } from './assert'
import { createLocalBotProvider } from '@/utils/friendlies/localBotProvider'
import { generateBots } from '@/utils/friendlies/bots'
import { mulberry32 } from '@/utils/core/random'
import type { FriendlyBot } from '@/types/friendlies'

const H = 60 * 60 * 1000

export function run(): string[] {
  const c = createChecker()
  let bots: FriendlyBot[] = generateBots(7)
  let simAt = 0
  const p = createLocalBotProvider({
    getBots: () => bots,
    setBots: (b) => (bots = b),
    getSimAt: () => simAt,
    setSimAt: (t) => (simAt = t),
    rng: mulberry32(9)
  })
  p.refresh(2 * H + 5)
  c.eq('refresh avanca o relogio dos bots', simAt, 2 * H)
  const view = p.ranking(0)
  c.eq('ranking: usuario em 101', view.user, { rank: 101, fame: 0 })
  c.eq('ranking: usuario fora do top 10', view.top.some((r) => r.isUser), false)
  const target = bots[0]
  p.reportResult(target.id, 15)
  c.eq('vitoria do usuario tira fama do bot', bots[0].fame, Math.max(0, target.fame - 15))
  const second = bots[1]
  p.reportResult(second.id, -10)
  c.eq('derrota do usuario da fama ao bot', bots[1].fame, second.fame + 10)
  const low = bots.findIndex((b) => b.fame < 5)
  if (low >= 0) {
    p.reportResult(bots[low].id, 50)
    c.eq('fama do bot nao fica negativa', bots[low].fame, 0)
  }
  const opts = p.drawOptions({ userOver: 60, userFame: 0, paidWinsLeft: 5 }, mulberry32(1))
  c.eq('drawOptions devolve 3', opts.length, 3)
  c.ok('opcoes sao bots da store', opts.every((o) => bots.some((b) => b.id === o.botId)))
  return c.fails
}
```

- [ ] **Passo 2: rodar e ver falhar**

Rodar: `node scripts/verify-friendlies/run.mjs provider` → erro de módulo ausente.

- [ ] **Passo 3: criar `src/utils/friendlies/localBotProvider.ts`**

```ts
import type { FriendlyBot, FriendlyOpponentProvider } from '@/types/friendlies'
import type { Rng } from '@/utils/core/random'
import { applyFame } from './fame'
import { drawOptions } from './draw'
import { rankingView, simulateBots } from './bots'

/** Acesso ao estado dos bots guardado na store (a store continua dona do estado reativo e do save). */
export interface LocalBotState {
  getBots(): FriendlyBot[]
  setBots(bots: FriendlyBot[]): void
  getSimAt(): number
  setSimAt(t: number): void
  /** Sorteio da simulação do ranking (na store: Math.random). */
  rng: Rng
}

/** Adversários simulados localmente. Para jogadores reais no futuro, troca-se por um provedor remoto. */
export function createLocalBotProvider(state: LocalBotState): FriendlyOpponentProvider {
  return {
    refresh(now) {
      const r = simulateBots(state.getBots(), state.getSimAt(), now, state.rng)
      state.setBots(r.bots)
      state.setSimAt(r.simAt)
    },
    ranking(userFame) {
      // O nome do usuário é trocado pelo nome do clube na tela (FriendlyRanking).
      return rankingView(state.getBots(), { name: 'Você', fame: userFame })
    },
    drawOptions(ctx, rng) {
      return drawOptions({ ...ctx, bots: state.getBots() }, rng)
    },
    reportResult(botId, userFameDelta) {
      state.setBots(state.getBots().map((b) => (b.id === botId ? { ...b, fame: applyFame(b.fame, -userFameDelta) } : b)))
    }
  }
}
```

- [ ] **Passo 4: verificar**

Rodar: `node scripts/verify-friendlies/run.mjs provider` → `OK provider`.
Rodar: `npm run build` → `✓ built in ...`.

- [ ] **Passo 5: commit**

```bash
git add src/utils/friendlies/localBotProvider.ts scripts/verify-friendlies/provider.check.ts
git commit -m "feat(amistosos): provedor local de adversarios"
```

**Pronto quando:** `OK provider` e build passando.

**Não fazer:** não importar Pinia nem stores aqui; não guardar estado próprio no provedor (tudo pelos acessores).

---

## Tarefa 7: store de amistosos com save

**Commit:** `feat(amistosos): store de amistosos com save`
**Depende de:** Tarefas 2, 3, 4, 5, 6 e **9** (o `App.vue` usa `match.isCompetitionLive('friendly')`, que só compila depois da Tarefa 9).

Regras: spec §2 (fichas gastas só em `beginMatch`; até 3 sorteios por desafio, contador no save, zera só em `beginMatch`; limite diário de 5 vitórias pagas; fama e reputação separadas: **nunca** tocar em `club.reputation`), spec §5 (modelo e validação do `fromSave`), spec §8 (partida órfã).

A store **não** chama `saveGame` (evita ciclo: `usePersistence` importa esta store). Quem salva é quem chama a ação (`useFriendlies`, `useMatchSimulation`, `App.vue`).

**Arquivos:**
- Criar: `src/stores/friendlies.ts`
- Criar: `scripts/verify-friendlies/store.check.ts`
- Alterar: `src/composables/usePersistence.ts`
- Alterar: `src/App.vue`

- [ ] **Passo 1: escrever a checagem `scripts/verify-friendlies/store.check.ts`**

```ts
import { createPinia, setActivePinia } from 'pinia'
import { createChecker } from './assert'
import { useFriendliesStore } from '@/stores/friendlies'
import { useClubStore } from '@/stores/club'
import { fameDelta } from '@/utils/friendlies/fame'
import { friendlyPrize } from '@/utils/friendlies/draw'
import { dayStart } from '@/config/time'

export function run(): string[] {
  setActivePinia(createPinia())
  const c = createChecker()
  const f = useFriendliesStore()
  const club = useClubStore()
  const now = Date.now()

  c.eq('estado novo: fichas', f.tokens, 10)
  c.eq('estado novo: fama', f.fame, 0)
  c.eq('estado novo: 100 bots', f.bots.length, 100)
  c.eq('estado novo: posicao 101', f.rank, 101)
  c.eq('estado novo: 3 sorteios', f.drawsLeft, 3)

  c.ok('1o sorteio', f.draw(60, now))
  c.eq('3 opcoes', f.options?.length, 3)
  c.eq('restam 2', f.drawsLeft, 2)
  c.ok('2o sorteio', f.draw(60, now))
  c.ok('3o sorteio', f.draw(60, now))
  c.ok('4o sorteio recusado', !f.draw(60, now))
  c.eq('restam 0', f.drawsLeft, 0)

  const saved = JSON.parse(JSON.stringify(f.toSave()))
  f.reset()
  c.eq('reset zera sorteios', f.drawsUsed, 0)
  f.fromSave(saved)
  c.eq('recarregar mantem o contador', f.drawsUsed, 3)
  c.eq('recarregar mantem as opcoes', f.options?.length, 3)

  c.ok('beginMatch sem selecao falha', !f.beginMatch(60, now))
  const pick = f.options![0]
  c.ok('select', f.select(pick.botId))
  c.eq('selectedOption', f.selectedOption?.botId, pick.botId)
  const budget = club.budget
  const reputation = club.reputation
  c.ok('beginMatch', f.beginMatch(60, now))
  c.eq('ficha gasta no apito', f.tokens, 9)
  c.eq('sorteios zerados no apito', f.drawsUsed, 0)
  c.eq('opcoes limpas', f.options, null)
  c.eq('selecao limpa', f.selectedBotId, null)
  c.eq('desafio gravado', f.active?.botId, pick.botId)
  c.eq('premio fixado no apito', f.active?.prize, friendlyPrize(pick.over))
  c.ok('sem sorteio com amistoso em andamento', !f.draw(60, now))

  const s = f.settle(3, 0, now)
  c.ok('settle devolve resumo', !!s)
  c.eq('fama apos vitoria', f.fame, fameDelta(60, pick.over, 'win'))
  c.eq('premio creditado', club.budget - budget, s?.prize)
  c.eq('premio = friendlyPrize', s?.prize, friendlyPrize(pick.over))
  c.eq('reputacao intacta', club.reputation, reputation)
  c.eq('desafio limpo', f.active, null)
  c.eq('historico com 1', f.recent.length, 1)
  c.eq('vitoria paga contada', f.paidWins.count, 1)

  f.paidWins = { day: dayStart(now), count: 5 }
  c.eq('limite diario esgotado', f.paidWinsLeft(now), 0)
  c.eq('virada do dia libera', f.paidWinsLeft(now + 2 * 24 * 60 * 60 * 1000), 5)

  f.fromSave({ ...saved, tokens: 99, drawsUsed: 7, options: null, fame: -5, tokenTickAt: now + 1e9, botsSimAt: now + 1e9, bots: [] })
  c.eq('tokens limitado a 10', f.tokens, 10)
  c.eq('drawsUsed 0 sem opcoes', f.drawsUsed, 0)
  c.eq('fama >= 0', f.fame, 0)
  c.ok('tokenTickAt <= now', f.tokenTickAt <= Date.now())
  c.ok('botsSimAt <= now', f.botsSimAt <= Date.now())
  c.eq('bots regenerados', f.bots.length, 100)
  f.fromSave(undefined)
  c.eq('save antigo sem campo: estado novo', f.tokens, 10)
  f.fromSave({ v: 2 })
  c.eq('versao desconhecida: estado novo', f.fame, 0)

  f.draw(60, now)
  f.select(f.options![1].botId)
  f.beginMatch(60, now)
  c.ok('orfa resolvida', f.resolveOrphan(false))
  c.eq('orfa: desafio limpo', f.active, null)
  c.eq('orfa: ficha nao volta', f.tokens, 9)
  c.ok('sem desafio nada a resolver', !f.resolveOrphan(false))
  return c.fails
}
```

- [ ] **Passo 2: rodar e ver falhar**

Rodar: `node scripts/verify-friendlies/run.mjs store` → erro de módulo ausente.

- [ ] **Passo 3: criar `src/stores/friendlies.ts`**

```ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { FriendliesSave, FriendlyBot, FriendlyChallenge, FriendlyOption, FriendlyResult, FriendlySummary } from '@/types/friendlies'
import { FRIENDLIES } from '@/config/friendlies'
import { dayStart } from '@/config/time'
import { clamp } from '@/utils/core/random'
import { msToNextToken, regenTokens as regenTokenState, spendToken, type TokenState } from '@/utils/friendlies/tokens'
import { applyFame, fameDelta, outcomeFromScore } from '@/utils/friendlies/fame'
import { friendlyPrize } from '@/utils/friendlies/draw'
import { generateBots, userRank } from '@/utils/friendlies/bots'
import { createLocalBotProvider } from '@/utils/friendlies/localBotProvider'
import { useClubStore } from '@/stores/club'

function freshState(now: number): FriendliesSave {
  const seed = now
  return {
    v: 1,
    fame: FRIENDLIES.fame.start,
    tokens: FRIENDLIES.tokens.initial,
    tokenTickAt: now,
    seed,
    bots: generateBots(seed),
    botsSimAt: now,
    options: null,
    drawsUsed: 0,
    selectedBotId: null,
    active: null,
    paidWins: { day: 0, count: 0 },
    recent: []
  }
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const nums = (o: Record<string, unknown>, keys: string[]) => keys.every((k) => isNum(o[k]))

function isBot(v: unknown): v is FriendlyBot {
  const o = v as Record<string, unknown> | null
  return !!o && isStr(o.id) && isStr(o.name) && nums(o, ['over', 'fame'])
}
function isOption(v: unknown): v is FriendlyOption {
  const o = v as Record<string, unknown> | null
  return !!o && isStr(o.botId) && isStr(o.name) && nums(o, ['over', 'fame', 'rank', 'prize', 'fameWin', 'fameDraw', 'fameLoss'])
}
function isChallenge(v: unknown): v is FriendlyChallenge {
  const o = v as Record<string, unknown> | null
  return !!o && isStr(o.botId) && isStr(o.botName) && nums(o, ['userOver', 'oppOver', 'prize', 'rankBefore', 'startedAt'])
}
function isResult(v: unknown): v is FriendlyResult {
  const o = v as Record<string, unknown> | null
  return !!o && isStr(o.botName) && nums(o, ['at', 'oppOver', 'userScore', 'oppScore', 'fameDelta', 'prize'])
}

export const useFriendliesStore = defineStore('friendlies', () => {
  const club = useClubStore()
  const init = freshState(Date.now())

  const fame = ref(init.fame)
  const tokens = ref(init.tokens)
  const tokenTickAt = ref(init.tokenTickAt)
  const seed = ref(init.seed)
  const bots = ref<FriendlyBot[]>(init.bots)
  const botsSimAt = ref(init.botsSimAt)
  const options = ref<FriendlyOption[] | null>(init.options)
  const drawsUsed = ref(init.drawsUsed)
  const selectedBotId = ref<string | null>(init.selectedBotId)
  const active = ref<FriendlyChallenge | null>(init.active)
  const paidWins = ref(init.paidWins)
  const recent = ref<FriendlyResult[]>(init.recent)

  // A store só fala com a interface do provedor (spec §4.3); o local opera sobre bots/botsSimAt daqui.
  const provider = createLocalBotProvider({
    getBots: () => bots.value,
    setBots: (b) => (bots.value = b),
    getSimAt: () => botsSimAt.value,
    setSimAt: (t) => (botsSimAt.value = t),
    rng: Math.random
  })

  const rank = computed(() => userRank(fame.value, bots.value))
  const ranking = computed(() => provider.ranking(fame.value))
  const drawsLeft = computed(() => Math.max(0, FRIENDLIES.draw.maxDraws - drawsUsed.value))
  const selectedOption = computed(() => options.value?.find((o) => o.botId === selectedBotId.value) ?? null)
  // club.clubNow é atualizado a cada 1 s pelo ticker (useScouting): o contador da tela anda sozinho.
  const msToNext = computed(() => msToNextToken({ tokens: tokens.value, tokenTickAt: tokenTickAt.value }, club.clubNow))

  function setTokens(s: TokenState) {
    if (s.tokens !== tokens.value) tokens.value = s.tokens
    if (s.tokenTickAt !== tokenTickAt.value) tokenTickAt.value = s.tokenTickAt
  }

  /** Vitórias pagas que ainda restam no dia de `now` (Infinity com o limite desligado). */
  function paidWinsLeft(now: number): number {
    const cap = FRIENDLIES.prize.paidWinsPerDay
    if (cap <= 0) return Number.POSITIVE_INFINITY
    const used = paidWins.value.day === dayStart(now) ? paidWins.value.count : 0
    return Math.max(0, cap - used)
  }

  function regenTokens(now: number) {
    setTokens(regenTokenState({ tokens: tokens.value, tokenTickAt: tokenTickAt.value }, now))
  }

  /** Avança o ranking dos bots até agora (chamado ao abrir /friendlies; sem timer em segundo plano). */
  function refresh(now: number) {
    provider.refresh(now)
  }

  /** Um sorteio do desafio atual. Recusa com 3 já feitos ou com amistoso em andamento. Não exige ficha. */
  function draw(userOver: number, now: number): boolean {
    if (active.value) return false
    if (drawsUsed.value >= FRIENDLIES.draw.maxDraws) return false
    options.value = provider.drawOptions({ userOver, userFame: fame.value, paidWinsLeft: paidWinsLeft(now) }, Math.random)
    drawsUsed.value += 1
    selectedBotId.value = null
    return true
  }

  function select(botId: string): boolean {
    if (!options.value?.some((o) => o.botId === botId)) return false
    selectedBotId.value = botId
    return true
  }

  /**
   * Apito inicial: gasta 1 ficha, fixa o prêmio (recalculado agora, por causa da virada do dia), grava o desafio e
   * zera o contador de sorteios. Devolve false sem opção escolhida, sem ficha ou com outro amistoso em andamento.
   */
  function beginMatch(userOver: number, now: number): boolean {
    const opt = selectedOption.value
    if (!opt || active.value) return false
    const regen = regenTokenState({ tokens: tokens.value, tokenTickAt: tokenTickAt.value }, now)
    const spent = spendToken(regen, now)
    if (!spent) {
      setTokens(regen)
      return false
    }
    setTokens(spent)
    active.value = {
      botId: opt.botId,
      botName: opt.name,
      userOver,
      oppOver: opt.over,
      prize: paidWinsLeft(now) > 0 ? friendlyPrize(opt.over) : 0,
      rankBefore: rank.value,
      startedAt: now
    }
    options.value = null
    selectedBotId.value = null
    drawsUsed.value = 0
    return true
  }

  /**
   * Fim do amistoso: fama (Elo), prêmio da vitória (creditado no clube), fama oposta no bot, histórico próprio.
   * Nunca toca em club.reputation (spec §2.12).
   */
  function settle(userScore: number, oppScore: number, now: number): FriendlySummary | null {
    const a = active.value
    if (!a) return null
    const outcome = outcomeFromScore(userScore, oppScore)
    const delta = fameDelta(a.userOver, a.oppOver, outcome)
    const before = fame.value
    fame.value = applyFame(before, delta)
    let prize = 0
    if (outcome === 'win' && a.prize > 0) {
      prize = a.prize
      const today = dayStart(now)
      paidWins.value = { day: today, count: (paidWins.value.day === today ? paidWins.value.count : 0) + 1 }
      club.earn(prize)
    }
    provider.reportResult(a.botId, delta)
    const applied = fame.value - before
    recent.value = [
      { at: now, botName: a.botName, oppOver: a.oppOver, userScore, oppScore, fameDelta: applied, prize },
      ...recent.value
    ].slice(0, FRIENDLIES.recentMax)
    active.value = null
    return {
      prize,
      fameDelta: applied,
      fameAfter: fame.value,
      rankBefore: a.rankBefore,
      rankAfter: rank.value,
      paidCapReached: outcome === 'win' && a.prize === 0 && FRIENDLIES.prize.paidWinsPerDay > 0
    }
  }

  /** Boot: desafio gravado sem partida ao vivo (save ao vivo perdido) não conta. Devolve true se limpou. */
  function resolveOrphan(isLive: boolean): boolean {
    if (!active.value || isLive) return false
    active.value = null
    return true
  }

  function apply(s: FriendliesSave) {
    fame.value = s.fame
    tokens.value = s.tokens
    tokenTickAt.value = s.tokenTickAt
    seed.value = s.seed
    bots.value = s.bots
    botsSimAt.value = s.botsSimAt
    options.value = s.options
    drawsUsed.value = s.drawsUsed
    selectedBotId.value = s.selectedBotId
    active.value = s.active
    paidWins.value = s.paidWins
    recent.value = s.recent
  }

  function toSave(): FriendliesSave {
    return {
      v: 1,
      fame: fame.value,
      tokens: tokens.value,
      tokenTickAt: tokenTickAt.value,
      seed: seed.value,
      bots: bots.value,
      botsSimAt: botsSimAt.value,
      options: options.value,
      drawsUsed: drawsUsed.value,
      selectedBotId: selectedBotId.value,
      active: active.value,
      paidWins: paidWins.value,
      recent: recent.value
    }
  }

  /** Campo ausente ou de outra versão: estado novo. Presente: valida campo a campo (spec §5, Persistência). */
  function fromSave(raw: unknown) {
    const now = Date.now()
    const d = raw as Partial<Record<keyof FriendliesSave, unknown>> | null | undefined
    if (!d || typeof d !== 'object' || d.v !== 1) {
      apply(freshState(now))
      return
    }
    const seedV = isNum(d.seed) ? d.seed : now
    const botsV =
      Array.isArray(d.bots) && d.bots.length === FRIENDLIES.bots.count && d.bots.every(isBot) ? (d.bots as FriendlyBot[]) : generateBots(seedV)
    const optionsV = Array.isArray(d.options) && d.options.length && d.options.every(isOption) ? (d.options as FriendlyOption[]) : null
    // Sem opções não há desafio em curso: o contador volta a 0 (o usuário não fica travado sem nada para escolher).
    const drawsV = optionsV && isNum(d.drawsUsed) ? clamp(Math.round(d.drawsUsed), 0, FRIENDLIES.draw.maxDraws) : 0
    const pw = d.paidWins as { day?: unknown; count?: unknown } | null | undefined
    apply({
      v: 1,
      fame: isNum(d.fame) ? Math.max(0, Math.round(d.fame)) : 0,
      tokens: isNum(d.tokens) ? clamp(Math.floor(d.tokens), 0, FRIENDLIES.tokens.max) : FRIENDLIES.tokens.initial,
      tokenTickAt: isNum(d.tokenTickAt) ? Math.min(d.tokenTickAt, now) : now,
      seed: seedV,
      bots: botsV,
      botsSimAt: isNum(d.botsSimAt) ? Math.min(d.botsSimAt, now) : now,
      options: optionsV,
      drawsUsed: drawsV,
      selectedBotId: optionsV && isStr(d.selectedBotId) && optionsV.some((o) => o.botId === d.selectedBotId) ? d.selectedBotId : null,
      active: isChallenge(d.active) ? d.active : null,
      paidWins: pw && isNum(pw.day) && isNum(pw.count) ? { day: pw.day, count: Math.max(0, Math.round(pw.count)) } : { day: 0, count: 0 },
      recent: Array.isArray(d.recent) ? (d.recent.filter(isResult) as FriendlyResult[]).slice(0, FRIENDLIES.recentMax) : []
    })
  }

  /** Nova carreira (clearSave): volta ao estado novo. */
  function reset() {
    apply(freshState(Date.now()))
  }

  return {
    fame,
    tokens,
    tokenTickAt,
    seed,
    bots,
    botsSimAt,
    options,
    drawsUsed,
    selectedBotId,
    active,
    paidWins,
    recent,
    rank,
    ranking,
    drawsLeft,
    selectedOption,
    msToNext,
    paidWinsLeft,
    regenTokens,
    refresh,
    draw,
    select,
    beginMatch,
    settle,
    resolveOrphan,
    toSave,
    fromSave,
    reset
  }
})
```

- [ ] **Passo 4: rodar a checagem**

Rodar: `node scripts/verify-friendlies/run.mjs store` → `OK store`.

- [ ] **Passo 5: persistência em `src/composables/usePersistence.ts`**

5a. Import (junto dos outros imports de store, depois de `import { useCompetitionsStore } from '@/stores/competitions'`):

```ts
import { useFriendliesStore } from '@/stores/friendlies'
```

5b. Dentro de `usePersistence()`, depois de `const competitions = useCompetitionsStore()`:

```ts
  const friendlies = useFriendliesStore()
```

5c. Em `saveGame`, localizar:

```ts
          staffContracts: club.staffContracts,
          ...competitions.toSave()
```

substituir por:

```ts
          staffContracts: club.staffContracts,
          ...competitions.toSave(),
          // Campo aditivo (sem trocar STORAGE_KEY nem migração numerada): saves antigos ganham estado novo no load.
          friendlies: friendlies.toSave()
```

5d. Em `loadGame`, localizar:

```ts
        competitions.ensureBrackets()
```

substituir por:

```ts
        competitions.ensureBrackets()
        friendlies.fromSave(p.friendlies)
```

5e. Em `clearSave`, localizar:

```ts
    club.resetClub()
    scouting.reset()
    match.resetMatchState()
```

substituir por:

```ts
    club.resetClub()
    scouting.reset()
    match.resetMatchState()
    friendlies.reset()
```

- [ ] **Passo 6: partida órfã no boot em `src/App.vue`**

6a. Imports: depois de `import { useMatchSimulation } from '@/composables/useMatchSimulation'`, acrescentar:

```ts
import { useMatchStore } from '@/stores/match'
import { useUiStore } from '@/stores/ui'
import { useFriendliesStore } from '@/stores/friendlies'
```

6b. Depois de `const { restoreLiveMatches } = useMatchSimulation()`, acrescentar:

```ts
const match = useMatchStore()
const ui = useUiStore()
const friendlies = useFriendliesStore()
```

6c. Localizar:

```ts
  if (loadGame()) restoreLiveMatches()
  else initializeFreshCareer()
```

substituir por:

```ts
  if (loadGame()) {
    restoreLiveMatches()
    // Amistoso gravado como em andamento que não voltou (save ao vivo ausente ou corrompido): não conta e a ficha não volta.
    if (friendlies.resolveOrphan(match.isCompetitionLive('friendly'))) {
      ui.showToast('O amistoso anterior foi interrompido e não contou.', 'warning')
      saveGame()
    }
  } else initializeFreshCareer()
```

- [ ] **Passo 7: verificar**

Rodar: `node scripts/verify-friendlies/run.mjs` → todas as linhas `OK ...` (ranking, tokens, fame, draw, bots, provider, store).
Rodar: `npm run build` → `✓ built in ...`.

- [ ] **Passo 8: commit**

```bash
git add src/stores/friendlies.ts scripts/verify-friendlies/store.check.ts src/composables/usePersistence.ts src/App.vue
git commit -m "feat(amistosos): store de amistosos com save"
```

**Pronto quando:** `OK store`, todas as outras checagens seguem OK, build passa.

**Não fazer:** não chamar `saveGame`/`usePersistence` dentro da store; não alterar `STORAGE_KEY` nem criar migração em `src/migrations/`; não mexer em `club.reputation`; não chamar a store a partir de `useSeason.applyEndOfSeason` (fim de temporada não afeta amistosos).

---

## Tarefa 6b: correções do lote 1-7

**Origem:** revisão das Tarefas 1 a 7 (já commitadas) e decisões do dono do produto registradas na spec §11 ("Revisão do lote 1-7"). Roda **depois da Tarefa 7 e antes da Tarefa 8** (as Tarefas 11, 14, 15 e 16 abaixo já foram escritas contra o resultado desta).
**Depende de:** Tarefas 1–7 e 9–10 commitadas.

O que muda (spec §2.3, §2.10, §5, §6, §8):

1. **Brecha de farm**: a opção do sorteio guarda o deslocamento do rival (`offset` = bônus de posição + variação), não o OVER absoluto. No apito, `oppOver = clamp(round(OVER do apito + offset), 35, 99)`; prêmio e fama saem desse `oppOver`. Cartão e PreMatch mostram estimativa (`quote`).
2. **Ranking como tabela de classificação**: mesma ordem da liga (`src/utils/league/leagueScheduler.ts:275`: `points → won → gd → gf`) com fama no lugar dos pontos. Usuário e bots ganham `stats` (J, V, E, D, GP, GC); a simulação dos bots gera jogos coerentes com a variação de fama. Empate total favorece o usuário; entre bots, nome (`pt-BR`) e `id`.
3. Fama soma zero pelo delta **aplicado** ao usuário; piso `fameMinStart` no alvo da simulação; saneamento `Number.isFinite` em fichas e `fromSave`; contrato `[0, 1)` do `Rng` com clamp; `FRIENDLIES` só leitura; `simulateBots` sem array novo quando não há passo; checagens determinísticas e mais completas.

**Por que 4 commits e não 1:** os tipos compartilhados (`FriendlyBot`, `FriendlyOption`, `FriendlyDrawContext`, provedor) mudam em etapas. Cada sub-passo foi cortado num ponto em que `npm run build` e **todas** as checagens (`node scripts/verify-friendlies/run.mjs`) passam. Onde um sub-passo precisa tocar um arquivo que um sub-passo seguinte reescreve inteiro, ele faz só a ponte mínima (indicada como "ponte").

**Regras desta tarefa:** as da seção "Regras gerais". Em especial: `git branch --show-current` = `feature/amistosos`; nunca `git add -A`/`.`; nunca alterar `package.json`; sem merge/push. As checagens em `scripts/` não passam pelo `vue-tsc` (o `tsconfig.json` inclui só `src/`), mas rodam pelo `vite`: precisam funcionar em tempo de execução.

---

### 6b.1: tipos, config, ranking e estatísticas

**Commit:** `fix(amistosos): ranking como tabela com estatisticas`

**Arquivos:**
- Substituir: `src/config/friendlies.ts`, `src/utils/friendlies/ranking.ts`, `scripts/verify-friendlies/ranking.check.ts`
- Alterar: `src/types/friendlies.ts`, `src/stores/friendlies.ts`
- Ponte: `src/utils/friendlies/bots.ts`, `src/utils/friendlies/draw.ts`, `src/utils/friendlies/localBotProvider.ts`, `scripts/verify-friendlies/bots.check.ts`, `scripts/verify-friendlies/draw.check.ts`, `scripts/verify-friendlies/provider.check.ts`

- [ ] **Passo 1: substituir `src/config/friendlies.ts` inteiro**

```ts
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
} as const
```

- [ ] **Passo 2: tipos em `src/types/friendlies.ts`**

2a. Localizar:

```ts
/** Bot do ranking de amistosos. id 'fb_1'..'fb_100'. `over` é interno (só move o ranking), não é exibido. */
export interface FriendlyBot {
  id: string
  name: string
  over: number
  fame: number
}
```

substituir por:

```ts
/** Estatísticas de amistoso (mesmas colunas da tabela da liga). `played` = won + drawn + lost. */
export interface FriendlyStats {
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
}

/** Quem entra no ranking: fama + estatísticas (FriendlyBot satisfaz por estrutura). */
export interface FriendlyStanding {
  fame: number
  stats: FriendlyStats
}

/** Bot do ranking de amistosos. id 'fb_1'..'fb_100'. `over` é interno (só move o ranking), não é exibido. */
export interface FriendlyBot {
  id: string
  name: string
  over: number
  fame: number
  stats: FriendlyStats
}
```

2b. Localizar:

```ts
export interface FriendlyRankingView {
  top: Array<{ rank: number; name: string; fame: number; isUser: boolean }>
  user: { rank: number; fame: number }
}
```

substituir por:

```ts
/** Linha da tabela de classificação dos amistosos. id = botId ou 'user'; gd = gf − ga. */
export interface FriendlyRankingRow {
  rank: number
  id: string
  name: string
  fame: number
  isUser: boolean
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
}

/** Top da tabela (usuário incluído na posição dele, se couber) + a linha do usuário. */
export interface FriendlyRankingView {
  top: FriendlyRankingRow[]
  user: FriendlyRankingRow
}
```

2c. Localizar:

```ts
export interface FriendlyDrawContext {
  userOver: number
  userFame: number
  paidWinsLeft: number
}
```

substituir por:

```ts
export interface FriendlyDrawContext {
  userOver: number
  user: FriendlyStanding
  paidWinsLeft: number
}
```

2d. Localizar:

```ts
  ranking(userFame: number): FriendlyRankingView
```

substituir por:

```ts
  ranking(user: FriendlyStanding): FriendlyRankingView
```

2e. Localizar:

```ts
export interface FriendliesSave {
  v: 1
  fame: number
```

substituir por:

```ts
export interface FriendliesSave {
  v: 1
  fame: number
  /** Campo novo (revisão do lote 1-7): ausente em save antigo → zerado. */
  stats: FriendlyStats
```

- [ ] **Passo 3: substituir `src/utils/friendlies/ranking.ts` inteiro**

```ts
import type { FriendlyBot, FriendlyStanding, FriendlyStats } from '@/types/friendlies'

export const emptyStats = (): FriendlyStats => ({ played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 })

/** Saldo de gols. */
export const goalDiff = (s: FriendlyStats): number => s.gf - s.ga

const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0)

/** Estatísticas vindas do save: cada campo inteiro >= 0 (NaN, undefined e texto viram 0); played sempre = V + E + D. */
export function sanitizeStats(raw: unknown): FriendlyStats {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const won = count(o.won)
  const drawn = count(o.drawn)
  const lost = count(o.lost)
  return { played: won + drawn + lost, won, drawn, lost, gf: count(o.gf), ga: count(o.ga) }
}

/** Soma um jogo, com gols do ponto de vista de quem recebe. Não muta a entrada. */
export function addResult(s: FriendlyStats, gf: number, ga: number): FriendlyStats {
  return {
    played: s.played + 1,
    won: s.won + (gf > ga ? 1 : 0),
    drawn: s.drawn + (gf === ga ? 1 : 0),
    lost: s.lost + (gf < ga ? 1 : 0),
    gf: s.gf + gf,
    ga: s.ga + ga
  }
}

/**
 * Ordem da tabela de classificação: a mesma da liga (computeStandings em src/utils/league/leagueScheduler.ts:
 * pontos → vitórias → saldo → gols pró), com a fama no lugar dos pontos. Negativo: `a` fica acima de `b`.
 */
export function compareStanding(a: FriendlyStanding, b: FriendlyStanding): number {
  return b.fame - a.fame || b.stats.won - a.stats.won || goalDiff(b.stats) - goalDiff(a.stats) || b.stats.gf - a.stats.gf
}

/** Entre bots, depois dos critérios da liga: nome (pt-BR) e por último id. Ordem total e determinística. */
function compareBots(a: FriendlyBot, b: FriendlyBot): number {
  return compareStanding(a, b) || a.name.localeCompare(b.name, 'pt-BR') || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

/**
 * Posição do usuário: 1 + bots estritamente à frente pelos critérios da liga. Empate total favorece o usuário.
 * Vai de 1 a bots.length + 1.
 */
export function userRank(user: FriendlyStanding, bots: readonly FriendlyBot[]): number {
  return 1 + bots.filter((b) => compareStanding(b, user) < 0).length
}

/** Bots na ordem da tabela, com a posição no ranking que inclui o usuário. */
export function rankedBots(bots: readonly FriendlyBot[], user: FriendlyStanding): Array<{ bot: FriendlyBot; rank: number }> {
  const uRank = userRank(user, bots)
  return [...bots].sort(compareBots).map((bot, i) => ({ bot, rank: i + 1 >= uRank ? i + 2 : i + 1 }))
}
```

Por que a posição continua correta: `compareStanding` é lexicográfica. Todo bot estritamente à frente do usuário vem, na ordenação, antes de qualquer bot empatado ou atrás dele; logo os `uRank − 1` primeiros da lista são exatamente os que estão à frente.

- [ ] **Passo 4: substituir `scripts/verify-friendlies/ranking.check.ts` inteiro**

```ts
import { createChecker } from './assert'
import { addResult, compareStanding, emptyStats, goalDiff, rankedBots, sanitizeStats, userRank } from '@/utils/friendlies/ranking'
import { FRIENDLIES, FRIENDLY_BOT_NAME_PARTS } from '@/config/friendlies'
import type { FriendlyBot, FriendlyStats } from '@/types/friendlies'

/** V vitórias, gols pró e contra; empates e derrotas opcionais. */
const st = (won: number, gf: number, ga: number, drawn = 0, lost = 0): FriendlyStats => ({ played: won + drawn + lost, won, drawn, lost, gf, ga })
const bot = (n: number, fame: number, stats: FriendlyStats = emptyStats(), name = `Bot ${n}`): FriendlyBot => ({ id: `fb_${n}`, name, over: 60, fame, stats })
const user = (fame: number, stats: FriendlyStats = emptyStats()) => ({ fame, stats })

export function run(): string[] {
  const c = createChecker()

  // Só fama (estatísticas zeradas): o mesmo comportamento de antes.
  const bots = [bot(1, 100), bot(2, 50), bot(3, 50), bot(4, 10)]
  c.eq('userRank com fama 0', userRank(user(0), bots), 5)
  c.eq('userRank: empate total favorece o usuario', userRank(user(50), bots), 2)
  c.eq('userRank acima de todos', userRank(user(500), bots), 1)
  c.eq(
    'rankedBots com usuario em 2o',
    rankedBots(bots, user(50)).map((r) => [r.bot.id, r.rank]),
    [['fb_1', 1], ['fb_2', 3], ['fb_3', 4], ['fb_4', 5]]
  )
  c.eq('rankedBots com usuario em ultimo', rankedBots(bots, user(0)).map((r) => r.rank), [1, 2, 3, 4])
  c.eq('rankedBots com usuario em 1o', rankedBots(bots, user(500)).map((r) => r.rank), [2, 3, 4, 5])

  // Desempate da liga com fama no lugar dos pontos: fama → vitórias → saldo → gols pró.
  const me = user(50, st(2, 4, 2)) // V 2, SG +2, GP 4
  const tie = [
    bot(1, 100),
    bot(2, 50, st(3, 3, 3)), // mais vitórias: acima
    bot(3, 50, st(2, 5, 2)), // mesmas V, saldo +3: acima
    bot(4, 50, st(2, 5, 3)), // mesmas V e saldo, mais gols pró: acima
    bot(5, 50, st(2, 4, 2)), // empate total: abaixo do usuário
    bot(6, 10)
  ]
  c.eq('desempate: usuario em 5o', userRank(me, tie), 5)
  c.eq(
    'desempate: ordem da tabela',
    rankedBots(tie, me).map((r) => [r.bot.id, r.rank]),
    [['fb_1', 1], ['fb_2', 2], ['fb_3', 3], ['fb_4', 4], ['fb_5', 6], ['fb_6', 7]]
  )
  c.ok('compareStanding: mais fama fica acima', compareStanding(user(60), user(50)) < 0)
  c.ok('compareStanding: fama manda sobre vitorias', compareStanding(user(51), user(50, st(9, 9, 0))) < 0)
  c.eq('compareStanding: empate total da 0', compareStanding(me, user(50, st(2, 4, 2))), 0)

  // Entre bots empatados em tudo: nome e depois id, qualquer que seja a ordem de entrada.
  const zeta = bot(8, 30, st(1, 1, 0), 'Zeta FC')
  const alfa = bot(9, 30, st(1, 1, 0), 'Alfa FC')
  c.eq('bots empatados: nome decide', rankedBots([zeta, alfa], user(0)).map((r) => r.bot.id), ['fb_9', 'fb_8'])
  c.eq('bots empatados: ordem de entrada nao importa', rankedBots([alfa, zeta], user(0)).map((r) => r.bot.id), ['fb_9', 'fb_8'])
  c.eq('mesmo nome: id decide', rankedBots([bot(11, 30, emptyStats(), 'Mesmo'), bot(10, 30, emptyStats(), 'Mesmo')], user(0)).map((r) => r.bot.id), ['fb_10', 'fb_11'])

  // Estatísticas.
  c.eq('addResult vitoria', addResult(emptyStats(), 3, 1), st(1, 3, 1))
  c.eq('addResult empate', addResult(st(1, 3, 1), 2, 2), st(1, 5, 3, 1))
  c.eq('addResult derrota', addResult(emptyStats(), 0, 2), st(0, 0, 2, 0, 1))
  c.eq('saldo', goalDiff(st(2, 5, 3)), 2)
  c.eq(
    'sanitizeStats: lixo vira 0 e played = V+E+D',
    sanitizeStats({ played: 99, won: 2.7, drawn: -1, lost: Number.NaN, gf: 3, ga: 'x' }),
    st(2, 3, 0)
  )
  c.eq('sanitizeStats: ausente', sanitizeStats(undefined), emptyStats())

  c.ok(
    'combinacoes de nome suficientes',
    FRIENDLY_BOT_NAME_PARTS.prefixes.length * FRIENDLY_BOT_NAME_PARTS.places.length >= FRIENDLIES.bots.count
  )
  c.eq('lugares sem repeticao', new Set(FRIENDLY_BOT_NAME_PARTS.places).size, FRIENDLY_BOT_NAME_PARTS.places.length)
  return c.fails
}
```

- [ ] **Passo 5: ponte em `src/utils/friendlies/bots.ts`** (a 6b.2 reescreve o arquivo inteiro)

5a. Localizar:

```ts
import type { FriendlyBot, FriendlyRankingView } from '@/types/friendlies'
```

substituir por:

```ts
import type { FriendlyBot, FriendlyRankingRow, FriendlyRankingView, FriendlyStanding, FriendlyStats } from '@/types/friendlies'
```

5b. Localizar:

```ts
import { rankedBots, userRank } from './ranking'
```

substituir por:

```ts
import { emptyStats, goalDiff, rankedBots, userRank } from './ranking'
```

5c. Localizar:

```ts
    return { id: `fb_${i + 1}`, name: names[i], over, fame }
```

substituir por:

```ts
    return { id: `fb_${i + 1}`, name: names[i], over, fame, stats: emptyStats() }
```

5d. Localizar a função `rankingView` inteira (do comentário `/** Top 10 do ranking` até o `}` final do arquivo) e substituir por:

```ts
function toRow(rank: number, id: string, name: string, fame: number, isUser: boolean, s: FriendlyStats): FriendlyRankingRow {
  return { rank, id, name, fame, isUser, played: s.played, won: s.won, drawn: s.drawn, lost: s.lost, gf: s.gf, ga: s.ga, gd: goalDiff(s) }
}

/** Tabela de classificação: topo (usuário incluído na posição dele, se couber) + a linha do usuário. */
export function rankingView(bots: readonly FriendlyBot[], user: FriendlyStanding & { name: string }): FriendlyRankingView {
  const uRank = userRank(user, bots)
  const userRow = toRow(uRank, 'user', user.name, user.fame, true, user.stats)
  const rows = rankedBots(bots, user).map(({ bot, rank }) => toRow(rank, bot.id, bot.name, bot.fame, false, bot.stats))
  rows.splice(uRank - 1, 0, userRow)
  return { top: rows.slice(0, FRIENDLIES.rankingTop), user: userRow }
}
```

- [ ] **Passo 6: ponte em `src/utils/friendlies/draw.ts`** (a 6b.3 reescreve o arquivo inteiro)

Localizar:

```ts
  const uRank = userRank(ctx.userFame, ctx.bots)
  const ranked = rankedBots(ctx.bots, ctx.userFame)
```

substituir por:

```ts
  const uRank = userRank(ctx.user, ctx.bots)
  const ranked = rankedBots(ctx.bots, ctx.user)
```

- [ ] **Passo 7: ponte em `src/utils/friendlies/localBotProvider.ts`** (a 6b.2 reescreve o arquivo inteiro)

Localizar:

```ts
    ranking(userFame) {
      // O nome do usuário é trocado pelo nome do clube na tela (FriendlyRanking).
      return rankingView(state.getBots(), { name: 'Você', fame: userFame })
    },
```

substituir por:

```ts
    ranking(user) {
      // O nome do usuário é trocado pelo nome do clube na tela (FriendlyRanking).
      return rankingView(state.getBots(), { name: 'Você', ...user })
    },
```

- [ ] **Passo 8: estatísticas do usuário em `src/stores/friendlies.ts`** (a 6b.3 reescreve o arquivo inteiro; aqui só o necessário para o ranking com estatísticas)

8a. Localizar:

```ts
import type { FriendliesSave, FriendlyBot, FriendlyChallenge, FriendlyOption, FriendlyResult, FriendlySummary } from '@/types/friendlies'
```

substituir por:

```ts
import type {
  FriendliesSave,
  FriendlyBot,
  FriendlyChallenge,
  FriendlyOption,
  FriendlyResult,
  FriendlyStanding,
  FriendlyStats,
  FriendlySummary
} from '@/types/friendlies'
```

8b. Localizar:

```ts
import { generateBots, userRank } from '@/utils/friendlies/bots'
```

substituir por:

```ts
import { generateBots, userRank } from '@/utils/friendlies/bots'
import { addResult, emptyStats, sanitizeStats } from '@/utils/friendlies/ranking'
```

8c. Localizar:

```ts
    fame: FRIENDLIES.fame.start,
    tokens: FRIENDLIES.tokens.initial,
```

substituir por:

```ts
    fame: FRIENDLIES.fame.start,
    stats: emptyStats(),
    tokens: FRIENDLIES.tokens.initial,
```

8d. Localizar:

```ts
function isBot(v: unknown): v is FriendlyBot {
  const o = v as Record<string, unknown> | null
  return !!o && isStr(o.id) && isStr(o.name) && nums(o, ['over', 'fame'])
}
```

substituir por:

```ts
/** Bot do save: id/nome/OVER/fama válidos; OVER na faixa da geração, fama >= 0, estatísticas saneadas (save antigo sem `stats` → zeradas). */
function toBot(v: unknown): FriendlyBot | null {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object' || !isStr(o.id) || !isStr(o.name) || !isNum(o.over) || !isNum(o.fame)) return null
  const b = FRIENDLIES.bots
  return { id: o.id, name: o.name, over: clamp(Math.round(o.over), b.overFloor, b.overCeil), fame: Math.max(0, Math.round(o.fame)), stats: sanitizeStats(o.stats) }
}
```

8e. Localizar:

```ts
  const fame = ref(init.fame)
```

substituir por:

```ts
  const fame = ref(init.fame)
  const stats = ref<FriendlyStats>(init.stats)
```

8f. Localizar:

```ts
  const rank = computed(() => userRank(fame.value, bots.value))
  const ranking = computed(() => provider.ranking(fame.value))
```

substituir por:

```ts
  // Posição pela tabela de classificação (fama → vitórias → saldo → gols pró), como a liga.
  const standing = computed<FriendlyStanding>(() => ({ fame: fame.value, stats: stats.value }))
  const rank = computed(() => userRank(standing.value, bots.value))
  const ranking = computed(() => provider.ranking(standing.value))
```

8g. Localizar:

```ts
    options.value = provider.drawOptions({ userOver, userFame: fame.value, paidWinsLeft: paidWinsLeft(now) }, Math.random)
```

substituir por:

```ts
    options.value = provider.drawOptions({ userOver, user: standing.value, paidWinsLeft: paidWinsLeft(now) }, Math.random)
```

8h. Localizar:

```ts
    fame.value = applyFame(before, delta)
```

substituir por:

```ts
    fame.value = applyFame(before, delta)
    stats.value = addResult(stats.value, userScore, oppScore)
```

8i. Localizar:

```ts
    fame.value = s.fame
    tokens.value = s.tokens
```

substituir por:

```ts
    fame.value = s.fame
    stats.value = s.stats
    tokens.value = s.tokens
```

8j. Localizar:

```ts
      fame: fame.value,
      tokens: tokens.value,
```

substituir por:

```ts
      fame: fame.value,
      stats: stats.value,
      tokens: tokens.value,
```

8k. Localizar:

```ts
    const botsV =
      Array.isArray(d.bots) && d.bots.length === FRIENDLIES.bots.count && d.bots.every(isBot) ? (d.bots as FriendlyBot[]) : generateBots(seedV)
```

substituir por:

```ts
    // Bot inválido ou quantidade errada: regenera os bots (fama e estatísticas do usuário ficam).
    const botList = Array.isArray(d.bots) ? d.bots.map(toBot) : []
    const botsV = botList.length === FRIENDLIES.bots.count && botList.every((b): b is FriendlyBot => b !== null) ? botList : generateBots(seedV)
```

8l. Localizar:

```ts
      fame: isNum(d.fame) ? Math.max(0, Math.round(d.fame)) : 0,
```

substituir por:

```ts
      fame: isNum(d.fame) ? Math.max(0, Math.round(d.fame)) : 0,
      stats: sanitizeStats(d.stats),
```

8m. No `return` final da store, localizar:

```ts
  return {
    fame,
    tokens,
```

substituir por:

```ts
  return {
    fame,
    stats,
    standing,
    tokens,
```

- [ ] **Passo 9: pontes nas checagens** (as 6b.2 e 6b.3 reescrevem estes arquivos inteiros)

9a. `scripts/verify-friendlies/bots.check.ts`: localizar

```ts
import type { FriendlyBot } from '@/types/friendlies'
```

substituir por

```ts
import { emptyStats } from '@/utils/friendlies/ranking'
import type { FriendlyBot } from '@/types/friendlies'
```

localizar

```ts
  c.eq('usuario com fama 0 em 101', userRank(0, bots), 101)
```

substituir por

```ts
  c.eq('usuario com fama 0 em 101', userRank({ fame: 0, stats: emptyStats() }, bots), 101)
```

e localizar o bloco desde `  const small: FriendlyBot[] = [` até a linha `  c.eq('rankingView usuario fora do top', rankingView(bots, { name: 'Voce', fame: 0 }).user, { rank: 101, fame: 0 })`, substituindo por:

```ts
  const small: FriendlyBot[] = [
    { id: 'fb_1', name: 'A', over: 60, fame: 100, stats: emptyStats() },
    { id: 'fb_2', name: 'B', over: 60, fame: 50, stats: emptyStats() },
    { id: 'fb_3', name: 'C', over: 60, fame: 50, stats: emptyStats() },
    { id: 'fb_4', name: 'D', over: 60, fame: 10, stats: emptyStats() }
  ]
  const row = (rank: number, id: string, name: string, fame: number, isUser = false) => ({ rank, id, name, fame, isUser, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0 })
  c.eq('rankingView', rankingView(small, { name: 'Voce', fame: 50, stats: emptyStats() }), {
    top: [row(1, 'fb_1', 'A', 100), row(2, 'user', 'Voce', 50, true), row(3, 'fb_2', 'B', 50), row(4, 'fb_3', 'C', 50), row(5, 'fb_4', 'D', 10)],
    user: row(2, 'user', 'Voce', 50, true)
  })
  c.eq('rankingView corta no top 10', rankingView(bots, { name: 'Voce', fame: 0, stats: emptyStats() }).top.length, 10)
  c.eq('rankingView usuario fora do top', rankingView(bots, { name: 'Voce', fame: 0, stats: emptyStats() }).user.rank, 101)
```

9b. `scripts/verify-friendlies/draw.check.ts`: localizar

```ts
import type { FriendlyBot } from '@/types/friendlies'
```

substituir por

```ts
import { emptyStats } from '@/utils/friendlies/ranking'
import type { FriendlyBot } from '@/types/friendlies'
```

localizar

```ts
  const bots: FriendlyBot[] = Array.from({ length: 100 }, (_, i) => ({ id: `fb_${i + 1}`, name: `Bot ${i + 1}`, over: 60, fame: (100 - i) * 10 }))
  const ctx = { userOver: 60, userFame: 0, paidWinsLeft: 0, bots }
```

substituir por

```ts
  const bots: FriendlyBot[] = Array.from({ length: 100 }, (_, i) => ({ id: `fb_${i + 1}`, name: `Bot ${i + 1}`, over: 60, fame: (100 - i) * 10, stats: emptyStats() }))
  const ctx = { userOver: 60, user: { fame: 0, stats: emptyStats() }, paidWinsLeft: 0, bots }
```

9c. `scripts/verify-friendlies/provider.check.ts`: localizar

```ts
import type { FriendlyBot } from '@/types/friendlies'
```

substituir por

```ts
import { emptyStats } from '@/utils/friendlies/ranking'
import type { FriendlyBot } from '@/types/friendlies'
```

localizar

```ts
  const view = p.ranking(0)
  c.eq('ranking: usuario em 101', view.user, { rank: 101, fame: 0 })
```

substituir por

```ts
  const view = p.ranking({ fame: 0, stats: emptyStats() })
  c.eq('ranking: usuario em 101', [view.user.rank, view.user.fame, view.user.isUser], [101, 0, true])
```

e localizar

```ts
  const opts = p.drawOptions({ userOver: 60, userFame: 0, paidWinsLeft: 5 }, mulberry32(1))
```

substituir por

```ts
  const opts = p.drawOptions({ userOver: 60, user: { fame: 0, stats: emptyStats() }, paidWinsLeft: 5 }, mulberry32(1))
```

- [ ] **Passo 10: verificar**

Rodar: `node scripts/verify-friendlies/run.mjs` → `OK` em ranking, tokens, fame, draw, bots, provider, store.
Rodar: `npm run build` → `✓ built in ...`.

- [ ] **Passo 11: commit**

```bash
git add src/config/friendlies.ts src/types/friendlies.ts src/utils/friendlies/ranking.ts src/utils/friendlies/bots.ts src/utils/friendlies/draw.ts src/utils/friendlies/localBotProvider.ts src/stores/friendlies.ts scripts/verify-friendlies/ranking.check.ts scripts/verify-friendlies/bots.check.ts scripts/verify-friendlies/draw.check.ts scripts/verify-friendlies/provider.check.ts
git commit -m "fix(amistosos): ranking como tabela com estatisticas"
```

**Pronto quando:** todas as checagens `OK`, build passa, `userRank` e `rankedBots` recebem `{ fame, stats }` e desempatam por vitórias → saldo → gols pró → (bots) nome → id.

**Não fazer:** não usar `as const` em `FRIENDLIES` (só em `FRIENDLY_BOT_NAME_PARTS`); não mexer em `src/utils/league/*` (a regra é copiada, não importada: a liga ordena `LeagueStandingRow`, aqui é `FriendlyStanding`); não trocar `FriendliesSave.v`; não mexer ainda em `simulateBots`, `reportResult`, `tokens.ts` nem no formato de `FriendlyOption` (6b.2 e 6b.3).

---

### 6b.2: bots, provedor, fichas e rng

**Commit:** `fix(amistosos): simulacao com jogos, fama soma zero e saneamento`

**Arquivos:**
- Criar: `src/utils/friendlies/rng.ts`
- Substituir: `src/utils/friendlies/bots.ts`, `src/utils/friendlies/localBotProvider.ts`, `src/utils/friendlies/tokens.ts`, `scripts/verify-friendlies/bots.check.ts`, `scripts/verify-friendlies/provider.check.ts`, `scripts/verify-friendlies/tokens.check.ts`
- Alterar: `src/types/friendlies.ts`
- Ponte: `src/stores/friendlies.ts`

- [ ] **Passo 1: criar `src/utils/friendlies/rng.ts`**

```ts
import type { Rng } from '@/utils/core/random'

/**
 * Contrato do Rng nos amistosos: devolve um número em [0, 1). `unit` garante isso mesmo com um rng fora do contrato
 * (ex.: `() => 1` num teste, ou NaN): sem o clamp, `floor(1 · n)` estoura o índice em randInt/shuffle.
 */
export function unit(rng: Rng): number {
  const x = rng()
  return Number.isFinite(x) ? Math.min(Math.max(x, 0), 1 - 1e-12) : 0
}

/** Rng que sempre respeita o contrato [0, 1): é o que se passa a `shuffle` de src/utils/core/random.ts. */
export const safeRng =
  (rng: Rng): Rng =>
  () =>
    unit(rng)

/** Inteiro uniforme em [min, max] (inclusive). */
export const randIntWith = (rng: Rng, min: number, max: number): number => Math.floor(unit(rng) * (max - min + 1)) + min
```

- [ ] **Passo 2: substituir `src/utils/friendlies/bots.ts` inteiro**

```ts
import type { FriendlyBot, FriendlyOutcome, FriendlyRankingRow, FriendlyRankingView, FriendlyStanding, FriendlyStats } from '@/types/friendlies'
import { FRIENDLIES, FRIENDLY_BOT_NAME_PARTS } from '@/config/friendlies'
import { clamp, mulberry32, shuffle, type Rng } from '@/utils/core/random'
import { addResult, emptyStats, goalDiff, rankedBots, userRank } from './ranking'
import { randIntWith, safeRng } from './rng'

export { userRank }

/** Todas as combinações prefixo + lugar (200). */
export function allBotNames(): string[] {
  return FRIENDLY_BOT_NAME_PARTS.prefixes.flatMap((p) => FRIENDLY_BOT_NAME_PARTS.places.map((pl) => `${p} ${pl}`))
}

/**
 * 100 bots determinísticos pela semente: fama em curva (topo ~1800, 100º ~10), OVER interno ligado à fama e
 * estatísticas zeradas (a tabela começa junto com o usuário).
 */
export function generateBots(seed: number): FriendlyBot[] {
  const b = FRIENDLIES.bots
  const rng = safeRng(mulberry32(seed))
  const names = shuffle(allBotNames(), rng).slice(0, b.count)
  return Array.from({ length: b.count }, (_, i) => {
    const fame = Math.max(b.fameMinStart, Math.round(b.fameTop * (1 - i / b.count) ** b.fameCurve) + randIntWith(rng, -b.fameJitter, b.fameJitter))
    const over = clamp(Math.round(b.overMin + (b.overSpan * fame) / b.fameTop) + randIntWith(rng, -b.overJitter, b.overJitter), b.overFloor, b.overCeil)
    return { id: `fb_${i + 1}`, name: names[i], over, fame, stats: emptyStats() }
  })
}

/** Placar plausível para o resultado de um passo simulado (gf = gols do bot simulado). */
export function simScore(outcome: FriendlyOutcome, rng: Rng): { gf: number; ga: number } {
  const b = FRIENDLIES.bots
  if (outcome === 'draw') {
    const g = randIntWith(rng, 0, b.simDrawGoalsMax)
    return { gf: g, ga: g }
  }
  const winner = randIntWith(rng, 1, b.simWinGoalsMax)
  const loser = randIntWith(rng, 0, winner - 1)
  return outcome === 'win' ? { gf: winner, ga: loser } : { gf: loser, ga: winner }
}

/**
 * Evolução dos bots desde `lastSimAt`: um passo por hora inteira, no máximo 72 (o excedente é descartado, o resto de
 * tempo fica). Cada passo é um jogo por bot: ruído ± e puxão de volta ao alvo do OVER interno decidem a variação de
 * fama, e o resultado e o placar seguem essa variação. Não muta a entrada. Sem passo a dar, devolve o mesmo array
 * (a store não troca `bots`: nada reativo dispara e o save não muda à toa).
 */
export function simulateBots(bots: FriendlyBot[], lastSimAt: number, now: number, rng: Rng): { bots: FriendlyBot[]; simAt: number } {
  const b = FRIENDLIES.bots
  const elapsed = Math.floor((now - lastSimAt) / b.simStepMs)
  if (!(elapsed > 0)) return { bots, simAt: now < lastSimAt ? now : lastSimAt }
  const r = safeRng(rng)
  const steps = Math.min(b.simMaxSteps, elapsed)
  const next = bots.map((x) => ({ ...x }))
  for (let s = 0; s < steps; s++) {
    for (const bot of next) {
      // Piso no alvo: bot de OVER interno baixo não afunda até 0 e fica preso lá.
      const target = Math.max(b.fameMinStart, ((bot.over - b.overMin) / b.overSpan) * b.fameTop)
      const delta = randIntWith(r, -b.simNoise, b.simNoise) + randIntWith(r, -b.simNoise, b.simNoise) + Math.round((target - bot.fame) * b.simPull)
      // Resultado coerente com a fama: sobe na vitória, cai na derrota, mexe no máximo simDrawBand no empate.
      const outcome: FriendlyOutcome = delta > b.simDrawBand ? 'win' : delta < -b.simDrawBand ? 'loss' : 'draw'
      const score = simScore(outcome, r)
      bot.fame = Math.max(0, bot.fame + delta)
      bot.stats = addResult(bot.stats, score.gf, score.ga)
    }
  }
  return { bots: next, simAt: lastSimAt + elapsed * b.simStepMs }
}

function toRow(rank: number, id: string, name: string, fame: number, isUser: boolean, s: FriendlyStats): FriendlyRankingRow {
  return { rank, id, name, fame, isUser, played: s.played, won: s.won, drawn: s.drawn, lost: s.lost, gf: s.gf, ga: s.ga, gd: goalDiff(s) }
}

/** Tabela de classificação: topo (usuário incluído na posição dele, se couber) + a linha do usuário. */
export function rankingView(bots: readonly FriendlyBot[], user: FriendlyStanding & { name: string }): FriendlyRankingView {
  const uRank = userRank(user, bots)
  const userRow = toRow(uRank, 'user', user.name, user.fame, true, user.stats)
  const rows = rankedBots(bots, user).map(({ bot, rank }) => toRow(rank, bot.id, bot.name, bot.fame, false, bot.stats))
  rows.splice(uRank - 1, 0, userRow)
  return { top: rows.slice(0, FRIENDLIES.rankingTop), user: userRow }
}
```

`generateBots` continua gerando exatamente os mesmos bots para a mesma semente (o `mulberry32` nunca devolve 1, então o clamp não muda nenhum valor): saves existentes regeneram iguais.

- [ ] **Passo 3: tipos em `src/types/friendlies.ts`**

Localizar:

```ts
  /** Aplica no adversário o efeito do resultado (bots: fama oposta). */
  reportResult(botId: string, userFameDelta: number): void
}
```

substituir por:

```ts
  /** Aplica no adversário o efeito do resultado: fama oposta à aplicada ao usuário e o jogo nas estatísticas. */
  reportResult(botId: string, result: FriendlyReport): void
}

/** Resultado repassado ao provedor: delta de fama EFETIVAMENTE aplicado ao usuário e o placar do ponto de vista dele. */
export interface FriendlyReport {
  userFameDelta: number
  userScore: number
  oppScore: number
}
```

- [ ] **Passo 4: substituir `src/utils/friendlies/localBotProvider.ts` inteiro**

```ts
import type { FriendlyBot, FriendlyOpponentProvider } from '@/types/friendlies'
import type { Rng } from '@/utils/core/random'
import { applyFame } from './fame'
import { drawOptions } from './draw'
import { addResult } from './ranking'
import { rankingView, simulateBots } from './bots'

/** Acesso ao estado dos bots guardado na store (a store continua dona do estado reativo e do save). */
export interface LocalBotState {
  getBots(): FriendlyBot[]
  setBots(bots: FriendlyBot[]): void
  getSimAt(): number
  setSimAt(t: number): void
  /** Sorteio da simulação do ranking (na store: Math.random). Contrato [0, 1). */
  rng: Rng
}

/** Adversários simulados localmente. Para jogadores reais no futuro, troca-se por um provedor remoto. */
export function createLocalBotProvider(state: LocalBotState): FriendlyOpponentProvider {
  return {
    refresh(now) {
      const cur = state.getBots()
      const simAt = state.getSimAt()
      const r = simulateBots(cur, simAt, now, state.rng)
      // Só grava o que mudou: sem passo a dar, nada reativo dispara.
      if (r.bots !== cur) state.setBots(r.bots)
      if (r.simAt !== simAt) state.setSimAt(r.simAt)
    },
    ranking(user) {
      // O nome do usuário é trocado pelo nome do clube na tela (FriendlyRanking).
      return rankingView(state.getBots(), { name: 'Você', ...user })
    },
    drawOptions(ctx, rng) {
      return drawOptions({ ...ctx, bots: state.getBots() }, rng)
    },
    reportResult(botId, result) {
      // Soma zero: o bot recebe o oposto do que o usuário EFETIVAMENTE ganhou ou perdeu, e o jogo espelhado.
      state.setBots(
        state
          .getBots()
          .map((b) =>
            b.id === botId ? { ...b, fame: applyFame(b.fame, -result.userFameDelta), stats: addResult(b.stats, result.oppScore, result.userScore) } : b
          )
      )
    }
  }
}
```

- [ ] **Passo 5: ponte em `src/stores/friendlies.ts`** (a 6b.3 reescreve o arquivo inteiro)

Localizar:

```ts
    provider.reportResult(a.botId, delta)
    const applied = fame.value - before
```

substituir por:

```ts
    const applied = fame.value - before
    // Soma zero pelo que o usuário EFETIVAMENTE ganhou ou perdeu (o piso 0 pode cortar o delta calculado).
    provider.reportResult(a.botId, { userFameDelta: applied, userScore, oppScore })
```

- [ ] **Passo 6: substituir `src/utils/friendlies/tokens.ts` inteiro**

```ts
import { FRIENDLIES } from '@/config/friendlies'
import { clamp } from '@/utils/core/random'

export interface TokenState {
  tokens: number
  tokenTickAt: number
}

/**
 * Saneia um estado vindo de fora (save editado, NaN, undefined): fichas inválidas = estoque cheio (mesmo padrão do
 * fromSave, onde initial = max); fichas finitas viram inteiro em [0, max]; relógio inválido = now (ou 0 se now também for).
 */
function clean(s: TokenState, now: number): TokenState {
  const { max } = FRIENDLIES.tokens
  return {
    tokens: Number.isFinite(s.tokens) ? clamp(Math.floor(s.tokens), 0, max) : max,
    tokenTickAt: Number.isFinite(s.tokenTickAt) ? s.tokenTickAt : Number.isFinite(now) ? now : 0
  }
}

/**
 * Recarga por tempo real (mesmo padrão de squad.regenStamina): soma só fichas inteiras e guarda o resto de tempo em
 * tokenTickAt. Cheio, o relógio acompanha `now` para a próxima ficha não nascer "adiantada". Relógio do sistema voltado
 * não dá ganho negativo. `now` inválido não avança nada.
 */
export function regenTokens(s: TokenState, now: number): TokenState {
  const { max, msPerToken } = FRIENDLIES.tokens
  const c = clean(s, now)
  if (!Number.isFinite(now)) return c
  if (c.tokens >= max) return { tokens: max, tokenTickAt: now }
  const n = Math.floor((now - c.tokenTickAt) / msPerToken)
  if (n <= 0) return { tokens: c.tokens, tokenTickAt: now < c.tokenTickAt ? now : c.tokenTickAt }
  const tokens = Math.min(max, c.tokens + n)
  return { tokens, tokenTickAt: tokens >= max ? now : c.tokenTickAt + n * msPerToken }
}

/** Gasta 1 ficha. Com o estoque cheio, a contagem da próxima começa agora. Sem ficha: null. */
export function spendToken(s: TokenState, now: number): TokenState | null {
  const c = clean(s, now)
  if (c.tokens <= 0) return null
  const restart = c.tokens >= FRIENDLIES.tokens.max && Number.isFinite(now)
  return { tokens: c.tokens - 1, tokenTickAt: restart ? now : c.tokenTickAt }
}

/** Milissegundos até a próxima ficha (0 com estoque cheio ou `now` inválido). */
export function msToNextToken(s: TokenState, now: number): number {
  const c = clean(s, now)
  if (c.tokens >= FRIENDLIES.tokens.max || !Number.isFinite(now)) return 0
  return Math.max(0, c.tokenTickAt + FRIENDLIES.tokens.msPerToken - now)
}

/** "mm:ss" para contadores de ficha (segundos arredondados para cima). */
export function formatTokenCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil((Number.isFinite(ms) ? ms : 0) / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
```

- [ ] **Passo 7: substituir `scripts/verify-friendlies/tokens.check.ts` inteiro**

```ts
import { createChecker } from './assert'
import { formatTokenCountdown, msToNextToken, regenTokens, spendToken } from '@/utils/friendlies/tokens'

const MIN = 60 * 1000

export function run(): string[] {
  const c = createChecker()
  c.eq('30 min parado com 7: enche e zera o relogio', regenTokens({ tokens: 7, tokenTickAt: 0 }, 30 * MIN), { tokens: 10, tokenTickAt: 30 * MIN })
  c.eq('13 min com 5: +2 e guarda o resto', regenTokens({ tokens: 5, tokenTickAt: 0 }, 13 * MIN), { tokens: 7, tokenTickAt: 12 * MIN })
  c.eq('menos de 6 min: nada muda', regenTokens({ tokens: 5, tokenTickAt: 0 }, 5 * MIN), { tokens: 5, tokenTickAt: 0 })
  c.eq('relogio voltado: tokenTickAt = now', regenTokens({ tokens: 5, tokenTickAt: 1000 }, 500), { tokens: 5, tokenTickAt: 500 })
  c.eq('cheio: tokenTickAt = now', regenTokens({ tokens: 10, tokenTickAt: 0 }, 999), { tokens: 10, tokenTickAt: 999 })
  c.eq('acima do maximo volta a 10', regenTokens({ tokens: 14, tokenTickAt: 0 }, 50), { tokens: 10, tokenTickAt: 50 })
  c.eq('gastar com 10 reinicia o relogio', spendToken({ tokens: 10, tokenTickAt: 0 }, 5000), { tokens: 9, tokenTickAt: 5000 })
  c.eq('gastar com 4 mantem o relogio', spendToken({ tokens: 4, tokenTickAt: 100 }, 5000), { tokens: 3, tokenTickAt: 100 })
  c.eq('sem ficha: null', spendToken({ tokens: 0, tokenTickAt: 0 }, 1), null)
  c.eq('cheio: proxima em 0', msToNextToken({ tokens: 10, tokenTickAt: 0 }, 123), 0)
  c.eq('proxima ficha', msToNextToken({ tokens: 3, tokenTickAt: 0 }, MIN), 5 * MIN)
  c.eq('proxima nunca negativa', msToNextToken({ tokens: 3, tokenTickAt: 0 }, 99 * MIN), 0)
  c.eq('mm:ss 5 min', formatTokenCountdown(5 * MIN), '05:00')
  c.eq('mm:ss arredonda para cima', formatTokenCountdown(61001), '01:02')
  c.eq('mm:ss zero', formatTokenCountdown(0), '00:00')

  // Saneamento (save editado ou corrompido).
  c.eq('fichas NaN: estoque cheio', regenTokens({ tokens: Number.NaN, tokenTickAt: 0 }, 100), { tokens: 10, tokenTickAt: 100 })
  c.eq('fichas undefined: estoque cheio', regenTokens({ tokens: undefined as unknown as number, tokenTickAt: 0 }, 100), { tokens: 10, tokenTickAt: 100 })
  c.eq('fichas fracionadas: arredonda para baixo', regenTokens({ tokens: 7.9, tokenTickAt: 0 }, MIN), { tokens: 7, tokenTickAt: 0 })
  c.eq('relogio NaN: comeca agora', regenTokens({ tokens: 5, tokenTickAt: Number.NaN }, 13 * MIN), { tokens: 5, tokenTickAt: 13 * MIN })
  c.eq('now NaN: nada avanca', regenTokens({ tokens: 5, tokenTickAt: 0 }, Number.NaN), { tokens: 5, tokenTickAt: 0 })
  c.eq('gastar com fichas NaN', spendToken({ tokens: Number.NaN, tokenTickAt: 0 }, 5000), { tokens: 9, tokenTickAt: 5000 })
  c.eq('proxima com relogio NaN', msToNextToken({ tokens: 3, tokenTickAt: Number.NaN }, MIN), 6 * MIN)
  c.eq('proxima com now NaN', msToNextToken({ tokens: 3, tokenTickAt: 0 }, Number.NaN), 0)
  c.eq('mm:ss com NaN', formatTokenCountdown(Number.NaN), '00:00')
  return c.fails
}
```

- [ ] **Passo 8: substituir `scripts/verify-friendlies/bots.check.ts` inteiro**

```ts
import { createChecker } from './assert'
import { allBotNames, generateBots, rankingView, simScore, simulateBots, userRank } from '@/utils/friendlies/bots'
import { emptyStats } from '@/utils/friendlies/ranking'
import { mulberry32 } from '@/utils/core/random'
import { FRIENDLIES } from '@/config/friendlies'
import { TEAM_ID_BY_NAME } from '@/utils/identity/teamIdentities'
import { EXTRA_D_CLUBS } from '@/utils/league/extraClubs'
import type { FriendlyBot, FriendlyStats } from '@/types/friendlies'

const H = 60 * 60 * 1000
const bot = (n: number, over: number, fame: number, stats: FriendlyStats = emptyStats(), name = `Bot ${n}`): FriendlyBot => ({ id: `fb_${n}`, name, over, fame, stats })
const row = (rank: number, id: string, name: string, fame: number, isUser = false) => ({ rank, id, name, fame, isUser, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0 })

// Toda simulação usa rng com semente (ou constante): a checagem é determinística, sem Math.random.
export function run(): string[] {
  const c = createChecker()
  const bots = generateBots(42)
  c.eq('100 bots', bots.length, 100)
  c.eq('ids fb_1..fb_100', bots.map((b) => b.id), Array.from({ length: 100 }, (_, i) => `fb_${i + 1}`))
  c.eq('nomes unicos', new Set(bots.map((b) => b.name)).size, 100)
  c.ok('OVER interno em [40, 92]', bots.every((b) => b.over >= 40 && b.over <= 92))
  c.ok('fama inicial >= 10', bots.every((b) => b.fame >= 10))
  c.ok('estatisticas iniciais zeradas', bots.every((b) => JSON.stringify(b.stats) === JSON.stringify(emptyStats())))
  c.ok('topo ~1800', bots[0].fame >= 1780 && bots[0].fame <= 1820, String(bots[0].fame))
  c.ok('10o ~1550', bots[9].fame >= 1528 && bots[9].fame <= 1568, String(bots[9].fame))
  c.ok('100o entre 10 e 21', bots[99].fame >= 10 && bots[99].fame <= 21, String(bots[99].fame))
  c.eq('mesma semente, mesmos bots', generateBots(42), bots)
  c.ok('semente diferente muda', JSON.stringify(generateBots(43)) !== JSON.stringify(bots))
  c.eq('usuario com fama 0 em 101', userRank({ fame: 0, stats: emptyStats() }, bots), 101)

  const taken = new Set([...Object.keys(TEAM_ID_BY_NAME), ...EXTRA_D_CLUBS.map((x) => x.name)].map((n) => n.toLowerCase()))
  c.ok('nenhum nome igual a clube existente', allBotNames().every((n) => !taken.has(n.toLowerCase())))

  // Relógio da simulação.
  const same = simulateBots(bots, 0, 30 * 60 * 1000, mulberry32(1))
  c.eq('menos de 1h: simAt nao anda', same.simAt, 0)
  c.ok('menos de 1h: mesmo array (sem copia)', same.bots === bots)
  c.eq('3h10: simAt = 3h', simulateBots(bots, 0, 3 * H + 10 * 60 * 1000, mulberry32(2)).simAt, 3 * H)
  c.eq('100h: excedente descartado, simAt = 100h', simulateBots(bots, 0, 100 * H, mulberry32(3)).simAt, 100 * H)
  const back = simulateBots(bots, 5 * H, 2 * H, mulberry32(4))
  c.eq('relogio voltado: simAt = now', back.simAt, 2 * H)
  c.ok('relogio voltado: mesmo array', back.bots === bots)

  // 72 passos: fama, jogos e determinismo.
  const r72 = simulateBots(bots, 0, 72 * H, mulberry32(5))
  c.ok('fama nunca negativa', r72.bots.every((b) => b.fame >= 0))
  c.ok('over interno nao muda', r72.bots.every((b, i) => b.over === bots[i].over))
  c.ok('72 passos: 72 jogos por bot', r72.bots.every((b) => b.stats.played === 72))
  c.ok('jogos = V + E + D', r72.bots.every((b) => b.stats.won + b.stats.drawn + b.stats.lost === b.stats.played))
  c.eq('deterministico com a mesma semente', simulateBots(bots, 0, 72 * H, mulberry32(5)), r72)
  c.ok('nao muta a entrada', JSON.stringify(bots) === JSON.stringify(generateBots(42)))
  const drawRate = r72.bots.reduce((n, b) => n + b.stats.drawn, 0) / (72 * bots.length)
  c.ok('empates entre 5% e 40% dos jogos', drawRate >= 0.05 && drawRate <= 0.4, String(drawRate))

  // Coerência jogo x fama: vitória sobe mais de 1, derrota cai mais de 1, empate mexe no máximo 1.
  for (let seed = 1; seed <= 30; seed++) {
    const r = simulateBots([bot(1, 60, 500)], 0, H, mulberry32(seed)).bots[0]
    const d = r.fame - 500
    const s = r.stats
    if (s.won) c.ok(`seed ${seed}: vitoria com fama subindo`, d > 1 && s.gf > s.ga, `d=${d} ${s.gf}x${s.ga}`)
    if (s.lost) c.ok(`seed ${seed}: derrota com fama caindo`, d < -1 && s.gf < s.ga, `d=${d} ${s.gf}x${s.ga}`)
    if (s.drawn) c.ok(`seed ${seed}: empate com fama quase parada`, Math.abs(d) <= 1 && s.gf === s.ga, `d=${d} ${s.gf}x${s.ga}`)
  }

  // rng 0.5 zera o ruído: só o puxão para o alvo age.
  const pulled = simulateBots([bot(1, 88, 0)], 0, 72 * H, () => 0.5)
  c.ok('puxao em direcao ao alvo (OVER 88 → 1800)', pulled.bots[0].fame > 500, String(pulled.bots[0].fame))
  // Piso no alvo: OVER 40 daria alvo −360 e afundaria o bot a 0; com o piso ele para perto de fameMinStart.
  const floored = simulateBots([bot(1, 40, 100)], 0, 72 * H, () => 0.5)
  c.ok('piso no alvo: nao afunda a 0', floored.bots[0].fame >= FRIENDLIES.bots.fameMinStart, String(floored.bots[0].fame))

  // Placar simulado.
  c.eq('placar: vitoria minima', simScore('win', () => 0), { gf: 1, ga: 0 })
  c.eq('placar: derrota maxima', simScore('loss', () => 0.99), { gf: 3, ga: 4 })
  c.eq('placar: empate', simScore('draw', () => 0.99), { gf: 2, ga: 2 })
  c.eq('placar: rng 1 fora do contrato nao estoura', simScore('win', () => 1), { gf: 4, ga: 3 })

  // Tabela de classificação.
  const small: FriendlyBot[] = [bot(1, 60, 100, emptyStats(), 'A'), bot(2, 60, 50, emptyStats(), 'B'), bot(3, 60, 50, emptyStats(), 'C'), bot(4, 60, 10, emptyStats(), 'D')]
  c.eq('rankingView', rankingView(small, { name: 'Voce', fame: 50, stats: emptyStats() }), {
    top: [row(1, 'fb_1', 'A', 100), row(2, 'user', 'Voce', 50, true), row(3, 'fb_2', 'B', 50), row(4, 'fb_3', 'C', 50), row(5, 'fb_4', 'D', 10)],
    user: row(2, 'user', 'Voce', 50, true)
  })
  c.eq(
    'rankingView com estatisticas e saldo',
    rankingView([bot(1, 60, 10, { played: 3, won: 2, drawn: 1, lost: 0, gf: 5, ga: 2 })], { name: 'Voce', fame: 0, stats: emptyStats() }).top[0],
    { rank: 1, id: 'fb_1', name: 'Bot 1', fame: 10, isUser: false, played: 3, won: 2, drawn: 1, lost: 0, gf: 5, ga: 2, gd: 3 }
  )
  c.eq('rankingView corta no top 10', rankingView(bots, { name: 'Voce', fame: 0, stats: emptyStats() }).top.length, 10)
  c.eq('rankingView usuario fora do top', rankingView(bots, { name: 'Voce', fame: 0, stats: emptyStats() }).user.rank, 101)
  return c.fails
}
```

Conferência dos números fixos: `simScore('loss', () => 0.99)`: vencedor `floor(0.99·4)+1 = 4`, perdedor `floor(0.99·4) = 3` → `{ gf: 3, ga: 4 }`. `simScore('win', () => 1)`: `unit` limita a `1 − 1e-12` → `{ gf: 4, ga: 3 }`. Piso: com ruído zero, o bot de OVER 40 e fama 100 desce até 26 e para (`round((10 − 26) · 0.03) = 0`); sem o piso desceria a 0. Taxa de empates esperada ≈ 21% (conferida numa simulação à parte com a semente 5).

- [ ] **Passo 9: substituir `scripts/verify-friendlies/provider.check.ts` inteiro**

```ts
import { createChecker } from './assert'
import { createLocalBotProvider } from '@/utils/friendlies/localBotProvider'
import { generateBots } from '@/utils/friendlies/bots'
import { emptyStats } from '@/utils/friendlies/ranking'
import { mulberry32 } from '@/utils/core/random'
import type { FriendlyBot } from '@/types/friendlies'

const H = 60 * 60 * 1000

export function run(): string[] {
  const c = createChecker()
  // Bot de fama 2 montado à mão: o piso 0 é testado sempre, não só quando a semente gera um bot assim.
  const low: FriendlyBot = { id: 'fb_low', name: 'Bot Baixo', over: 50, fame: 2, stats: emptyStats() }
  let bots: FriendlyBot[] = [...generateBots(7).slice(0, 99), low]
  let simAt = 0
  let botWrites = 0
  let simWrites = 0
  const p = createLocalBotProvider({
    getBots: () => bots,
    setBots: (b) => {
      bots = b
      botWrites++
    },
    getSimAt: () => simAt,
    setSimAt: (t) => {
      simAt = t
      simWrites++
    },
    rng: mulberry32(9)
  })
  const find = (id: string) => bots.find((b) => b.id === id)!

  const view = p.ranking({ fame: 0, stats: emptyStats() })
  c.eq('ranking: usuario em 101', [view.user.rank, view.user.fame, view.user.isUser], [101, 0, true])
  c.eq('ranking: usuario fora do top 10', view.top.some((r) => r.isUser), false)

  const target = bots[0]
  p.reportResult(target.id, { userFameDelta: 15, userScore: 2, oppScore: 1 })
  c.eq('vitoria do usuario tira a fama aplicada do bot', find(target.id).fame, Math.max(0, target.fame - 15))
  c.eq('bot soma a derrota espelhada', find(target.id).stats, { played: 1, won: 0, drawn: 0, lost: 1, gf: 1, ga: 2 })
  const second = bots[1]
  p.reportResult(second.id, { userFameDelta: -5, userScore: 0, oppScore: 3 })
  c.eq('derrota do usuario da ao bot so o aplicado', find(second.id).fame, second.fame + 5)
  c.eq('bot soma a vitoria espelhada', find(second.id).stats, { played: 1, won: 1, drawn: 0, lost: 0, gf: 3, ga: 0 })
  p.reportResult('fb_low', { userFameDelta: 15, userScore: 1, oppScore: 1 })
  c.eq('fama do bot nao fica negativa (fama 2)', find('fb_low').fame, 0)
  c.eq('empate espelhado', find('fb_low').stats, { played: 1, won: 0, drawn: 1, lost: 0, gf: 1, ga: 1 })

  botWrites = 0
  simWrites = 0
  const before = bots
  p.refresh(30 * 60 * 1000)
  c.eq('refresh sem passo: nao grava nada', [botWrites, simWrites], [0, 0])
  c.ok('refresh sem passo: mesmo array', bots === before)
  p.refresh(2 * H + 5)
  c.eq('refresh avanca o relogio dos bots', simAt, 2 * H)
  c.eq('refresh grava uma vez cada', [botWrites, simWrites], [1, 1])
  c.eq('refresh soma 2 jogos por bot', find('fb_low').stats.played, 3)

  const opts = p.drawOptions({ userOver: 60, user: { fame: 0, stats: emptyStats() }, paidWinsLeft: 5 }, mulberry32(1))
  c.eq('drawOptions devolve 3', opts.length, 3)
  c.ok('opcoes sao bots da store', opts.every((o) => bots.some((b) => b.id === o.botId)))
  return c.fails
}
```

- [ ] **Passo 10: verificar**

Rodar: `node scripts/verify-friendlies/run.mjs` → `OK` em ranking, tokens, fame, draw, bots, provider, store.
Rodar: `npm run build` → `✓ built in ...`.

- [ ] **Passo 11: commit**

```bash
git add src/utils/friendlies/rng.ts src/utils/friendlies/bots.ts src/utils/friendlies/localBotProvider.ts src/utils/friendlies/tokens.ts src/types/friendlies.ts src/stores/friendlies.ts scripts/verify-friendlies/bots.check.ts scripts/verify-friendlies/provider.check.ts scripts/verify-friendlies/tokens.check.ts
git commit -m "fix(amistosos): simulacao com jogos, fama soma zero e saneamento"
```

**Pronto quando:** todas as checagens `OK` e build passa; `bots.check.ts` não usa `Math.random`; `simulateBots` sem passo devolve o mesmo array e o provedor não chama `setBots`/`setSimAt`; o bot recebe `−applied`.

**Não fazer:** não alterar `src/utils/core/random.ts` (o clamp fica em `rng.ts`, para não mudar o comportamento do resto do jogo); não mudar a fórmula de geração dos bots (os saves existentes regeneram os mesmos bots pela semente); não usar `Math.random` nas checagens.

---

### 6b.3: sorteio e store com o deslocamento do rival

**Commit:** `fix(amistosos): rival pelo OVER do apito com offset do sorteio`

**Arquivos:**
- Substituir: `src/types/friendlies.ts`, `src/utils/friendlies/draw.ts`, `src/stores/friendlies.ts`, `scripts/verify-friendlies/draw.check.ts`, `scripts/verify-friendlies/store.check.ts`
- Alterar: `scripts/verify-friendlies/provider.check.ts` (uma linha)

- [ ] **Passo 1: substituir `src/types/friendlies.ts` inteiro (versão final)**

```ts
/** Estatísticas de amistoso (mesmas colunas da tabela da liga). `played` = won + drawn + lost. */
export interface FriendlyStats {
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
}

/** Quem entra no ranking: fama + estatísticas (FriendlyBot satisfaz por estrutura). */
export interface FriendlyStanding {
  fame: number
  stats: FriendlyStats
}

/** Bot do ranking de amistosos. id 'fb_1'..'fb_100'. `over` é interno (só move o ranking), não é exibido. */
export interface FriendlyBot {
  id: string
  name: string
  over: number
  fame: number
  stats: FriendlyStats
}

/**
 * Uma das 3 opções de um sorteio. Guarda o DESLOCAMENTO do rival (bônus de posição + variação), não o OVER absoluto:
 * o OVER do rival, o prêmio e a fama em jogo saem de quoteOption com o OVER do usuário (estimativa até o apito).
 */
export interface FriendlyOption {
  botId: string
  name: string
  fame: number
  rank: number
  offset: number
}

/** Valores de uma opção com um OVER do usuário: estimativa no cartão e no PreMatch; fixados no apito (beginMatch). */
export interface FriendlyQuote {
  oppOver: number
  /** Já considera o limite diário (0 se esgotado). */
  prize: number
  fameWin: number
  fameDraw: number
  fameLoss: number
}

/** Desafio em andamento, gravado no apito inicial (OVERs e prêmio já fixados). */
export interface FriendlyChallenge {
  botId: string
  botName: string
  userOver: number
  oppOver: number
  prize: number
  rankBefore: number
  startedAt: number
}

/** Linha do histórico próprio (máx. 20, mais recente primeiro). */
export interface FriendlyResult {
  at: number
  botName: string
  oppOver: number
  userScore: number
  oppScore: number
  fameDelta: number
  prize: number
}

/** Resumo pós-jogo do amistoso (vai em LastMatchSummary.friendly). */
export interface FriendlySummary {
  prize: number
  fameDelta: number
  fameAfter: number
  rankBefore: number
  rankAfter: number
  paidCapReached: boolean
}

/** Linha da tabela de classificação dos amistosos. id = botId ou 'user'; gd = gf − ga. */
export interface FriendlyRankingRow {
  rank: number
  id: string
  name: string
  fame: number
  isUser: boolean
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
}

/** Top da tabela (usuário incluído na posição dele, se couber) + a linha do usuário. */
export interface FriendlyRankingView {
  top: FriendlyRankingRow[]
  user: FriendlyRankingRow
}

export type FriendlyOutcome = 'win' | 'draw' | 'loss'

/** Dados do usuário que o sorteio precisa: só a posição (o OVER entra depois, na cotação). */
export interface FriendlyDrawContext {
  user: FriendlyStanding
}

/** Resultado repassado ao provedor: delta de fama EFETIVAMENTE aplicado ao usuário e o placar do ponto de vista dele. */
export interface FriendlyReport {
  userFameDelta: number
  userScore: number
  oppScore: number
}

/** Fonte dos adversários. Hoje: bots locais. Futuro: provedor remoto (jogadores reais), sem mudar a store. */
export interface FriendlyOpponentProvider {
  /** Avança o estado dos adversários até `now` (bots: simulação; futuro: busca remota). Sem passo, não troca o array. */
  refresh(now: number): void
  ranking(user: FriendlyStanding): FriendlyRankingView
  drawOptions(ctx: FriendlyDrawContext, rng: () => number): FriendlyOption[]
  /** Aplica no adversário o efeito do resultado: fama oposta à aplicada ao usuário e o jogo nas estatísticas. */
  reportResult(botId: string, result: FriendlyReport): void
}

/** Campo `friendlies` do save principal (aditivo, sem migração numerada). */
export interface FriendliesSave {
  v: 1
  fame: number
  /** Campo novo (revisão do lote 1-7): ausente em save antigo → zerado. */
  stats: FriendlyStats
  tokens: number
  tokenTickAt: number
  seed: number
  bots: FriendlyBot[]
  botsSimAt: number
  options: FriendlyOption[] | null
  /** 0..3 sorteios feitos no desafio atual; zera só em beginMatch. */
  drawsUsed: number
  selectedBotId: string | null
  active: FriendlyChallenge | null
  /** day = dayStart(ts) de src/config/time.ts */
  paidWins: { day: number; count: number }
  recent: FriendlyResult[]
}
```

- [ ] **Passo 2: substituir `src/utils/friendlies/draw.ts` inteiro**

```ts
import type { FriendlyBot, FriendlyDrawContext, FriendlyOption, FriendlyQuote } from '@/types/friendlies'
import { FRIENDLIES } from '@/config/friendlies'
import { clamp, shuffle, type Rng } from '@/utils/core/random'
import { fameDelta } from './fame'
import { rankedBots, userRank } from './ranking'
import { safeRng, unit } from './rng'

const round1 = (x: number) => Math.round(x * 10) / 10

/** Bônus de posição do usuário: 6 no top 10, cai linearmente até ~0 na 50ª, 0 dali para baixo. */
export function rankBonus(rank: number): number {
  const { rankBonusMax, rankBonusTop, rankBonusFrom } = FRIENDLIES.draw
  if (rank <= rankBonusTop) return rankBonusMax
  if (rank <= rankBonusFrom) return round1((rankBonusMax * (rankBonusFrom + 1 - rank)) / (rankBonusFrom + 1 - rankBonusTop))
  return 0
}

/** Deslocamento do rival gravado na opção: bônus da posição do usuário + variação uniforme em [−spread, +spread]. */
export function drawOffset(rank: number, rng: Rng): number {
  return round1(rankBonus(rank) + (unit(rng) * 2 - 1) * FRIENDLIES.draw.spread)
}

/** OVER do rival a partir do OVER do usuário e do deslocamento, limitado a [overMin, overMax]. */
export function opponentOverFrom(userOver: number, offset: number): number {
  const { overMin, overMax } = FRIENDLIES.draw
  return clamp(Math.round(userOver + offset), overMin, overMax)
}

/** OVER do rival num sorteio direto: OVER do usuário + bônus da posição + variação. */
export function opponentOver(userOver: number, rank: number, rng: Rng): number {
  return opponentOverFrom(userOver, drawOffset(rank, rng))
}

/** Prêmio da vitória (antes do limite diário): escala com o OVER do rival, de 500 em 500. */
export function friendlyPrize(oppOver: number): number {
  const { base, refOver, perOver, min, max, step } = FRIENDLIES.prize
  return clamp(Math.round((base + (oppOver - refOver) * perOver) / step) * step, min, max)
}

/**
 * Valores de uma opção com um OVER do usuário. É a mesma conta na estimativa (cartão, PreMatch, com o OVER do momento)
 * e no apito (beginMatch, com o OVER do time que vai a campo): por isso sortear com reservas não rende rival fraco.
 */
export function quoteOption(offset: number, userOver: number, paidWinsLeft: number): FriendlyQuote {
  const oppOver = opponentOverFrom(userOver, offset)
  return {
    oppOver,
    prize: paidWinsLeft > 0 ? friendlyPrize(oppOver) : 0,
    fameWin: fameDelta(userOver, oppOver, 'win'),
    fameDraw: fameDelta(userOver, oppOver, 'draw'),
    fameLoss: fameDelta(userOver, oppOver, 'loss')
  }
}

/**
 * Candidatos do sorteio: posição a até ±span da do usuário. A janela cresce de `grow` em `grow` (mínimo 1, para não
 * travar) enquanto faltar candidato e ainda sobrar bot fora dela.
 */
export function rankPool<T extends { rank: number }>(
  ranked: readonly T[],
  uRank: number,
  need: number,
  span: number = FRIENDLIES.draw.rankWindow,
  grow: number = FRIENDLIES.draw.rankWindowGrow
): T[] {
  const step = Math.max(1, grow)
  let size = span
  let pool = ranked.filter((r) => Math.abs(r.rank - uRank) <= size)
  while (pool.length < need && pool.length < ranked.length) {
    size += step
    pool = ranked.filter((r) => Math.abs(r.rank - uRank) <= size)
  }
  return pool
}

/**
 * Um sorteio: bots distintos perto da posição do usuário, em ordem de posição. Cada opção guarda o deslocamento do
 * rival (offset), a fama e a posição do bot; o OVER do rival é calculado depois, com o OVER do usuário (quoteOption).
 */
export function drawOptions(ctx: FriendlyDrawContext & { bots: readonly FriendlyBot[] }, rng: Rng): FriendlyOption[] {
  const r = safeRng(rng)
  const need = FRIENDLIES.draw.options
  const uRank = userRank(ctx.user, ctx.bots)
  const pool = rankPool(rankedBots(ctx.bots, ctx.user), uRank, need)
  return shuffle(pool, r)
    .slice(0, need)
    .sort((a, b) => a.rank - b.rank)
    .map(({ bot, rank }) => ({ botId: bot.id, name: bot.name, fame: bot.fame, rank, offset: drawOffset(uRank, r) }))
}
```

- [ ] **Passo 3: substituir `src/stores/friendlies.ts` inteiro**

```ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  FriendliesSave,
  FriendlyBot,
  FriendlyChallenge,
  FriendlyOption,
  FriendlyQuote,
  FriendlyResult,
  FriendlyStanding,
  FriendlyStats,
  FriendlySummary
} from '@/types/friendlies'
import { FRIENDLIES } from '@/config/friendlies'
import { dayStart } from '@/config/time'
import { clamp } from '@/utils/core/random'
import { msToNextToken, regenTokens as regenTokenState, spendToken, type TokenState } from '@/utils/friendlies/tokens'
import { applyFame, fameDelta, outcomeFromScore } from '@/utils/friendlies/fame'
import { quoteOption } from '@/utils/friendlies/draw'
import { generateBots, userRank } from '@/utils/friendlies/bots'
import { addResult, emptyStats, sanitizeStats } from '@/utils/friendlies/ranking'
import { createLocalBotProvider } from '@/utils/friendlies/localBotProvider'
import { useClubStore } from '@/stores/club'

function freshState(now: number): FriendliesSave {
  const seed = now
  return {
    v: 1,
    fame: FRIENDLIES.fame.start,
    stats: emptyStats(),
    tokens: FRIENDLIES.tokens.initial,
    tokenTickAt: now,
    seed,
    bots: generateBots(seed),
    botsSimAt: now,
    options: null,
    drawsUsed: 0,
    selectedBotId: null,
    active: null,
    paidWins: { day: 0, count: 0 },
    recent: []
  }
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const nums = (o: Record<string, unknown>, keys: string[]) => keys.every((k) => isNum(o[k]))

/** Bot do save: id/nome/OVER/fama válidos; OVER na faixa da geração, fama >= 0, estatísticas saneadas (save antigo sem `stats` → zeradas). */
function toBot(v: unknown): FriendlyBot | null {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object' || !isStr(o.id) || !isStr(o.name) || !isNum(o.over) || !isNum(o.fame)) return null
  const b = FRIENDLIES.bots
  return { id: o.id, name: o.name, over: clamp(Math.round(o.over), b.overFloor, b.overCeil), fame: Math.max(0, Math.round(o.fame)), stats: sanitizeStats(o.stats) }
}
/** Opção do save: só no formato com `offset` (a antiga, com `over`, é descartada); offset limitado à faixa possível do sorteio. */
function toOption(v: unknown): FriendlyOption | null {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object' || !isStr(o.botId) || !isStr(o.name) || !nums(o, ['fame', 'rank', 'offset'])) return null
  const d = FRIENDLIES.draw
  return { botId: o.botId, name: o.name, fame: o.fame as number, rank: o.rank as number, offset: clamp(o.offset as number, -d.spread, d.rankBonusMax + d.spread) }
}
function isChallenge(v: unknown): v is FriendlyChallenge {
  const o = v as Record<string, unknown> | null
  return !!o && isStr(o.botId) && isStr(o.botName) && nums(o, ['userOver', 'oppOver', 'prize', 'rankBefore', 'startedAt'])
}
function isResult(v: unknown): v is FriendlyResult {
  const o = v as Record<string, unknown> | null
  return !!o && isStr(o.botName) && nums(o, ['at', 'oppOver', 'userScore', 'oppScore', 'fameDelta', 'prize'])
}

export const useFriendliesStore = defineStore('friendlies', () => {
  const club = useClubStore()
  const init = freshState(Date.now())

  const fame = ref(init.fame)
  const stats = ref<FriendlyStats>(init.stats)
  const tokens = ref(init.tokens)
  const tokenTickAt = ref(init.tokenTickAt)
  const seed = ref(init.seed)
  const bots = ref<FriendlyBot[]>(init.bots)
  const botsSimAt = ref(init.botsSimAt)
  const options = ref<FriendlyOption[] | null>(init.options)
  const drawsUsed = ref(init.drawsUsed)
  const selectedBotId = ref<string | null>(init.selectedBotId)
  const active = ref<FriendlyChallenge | null>(init.active)
  const paidWins = ref(init.paidWins)
  const recent = ref<FriendlyResult[]>(init.recent)

  // A store só fala com a interface do provedor (spec §4.3); o local opera sobre bots/botsSimAt daqui.
  const provider = createLocalBotProvider({
    getBots: () => bots.value,
    setBots: (b) => (bots.value = b),
    getSimAt: () => botsSimAt.value,
    setSimAt: (t) => (botsSimAt.value = t),
    rng: Math.random
  })

  // Posição pela tabela de classificação (fama → vitórias → saldo → gols pró), como a liga.
  const standing = computed<FriendlyStanding>(() => ({ fame: fame.value, stats: stats.value }))
  const rank = computed(() => userRank(standing.value, bots.value))
  const ranking = computed(() => provider.ranking(standing.value))
  const drawsLeft = computed(() => Math.max(0, FRIENDLIES.draw.maxDraws - drawsUsed.value))
  const selectedOption = computed(() => options.value?.find((o) => o.botId === selectedBotId.value) ?? null)
  // club.clubNow é atualizado a cada 1 s pelo ticker (useScouting): o contador da tela anda sozinho.
  const msToNext = computed(() => msToNextToken({ tokens: tokens.value, tokenTickAt: tokenTickAt.value }, club.clubNow))

  function setTokens(s: TokenState) {
    if (s.tokens !== tokens.value) tokens.value = s.tokens
    if (s.tokenTickAt !== tokenTickAt.value) tokenTickAt.value = s.tokenTickAt
  }

  /** Vitórias pagas que ainda restam no dia de `now` (Infinity com o limite desligado). */
  function paidWinsLeft(now: number): number {
    const cap = FRIENDLIES.prize.paidWinsPerDay
    if (cap <= 0) return Number.POSITIVE_INFINITY
    const used = paidWins.value.day === dayStart(now) ? paidWins.value.count : 0
    return Math.max(0, cap - used)
  }

  /** Cotação de uma opção com o OVER informado: estimativa na tela e no PreMatch; o apito usa a mesma conta (beginMatch). */
  function quote(opt: FriendlyOption, userOver: number, now: number): FriendlyQuote {
    return quoteOption(opt.offset, userOver, paidWinsLeft(now))
  }

  function regenTokens(now: number) {
    setTokens(regenTokenState({ tokens: tokens.value, tokenTickAt: tokenTickAt.value }, now))
  }

  /** Avança o ranking dos bots até agora (chamado ao abrir /friendlies; sem timer em segundo plano). */
  function refresh(now: number) {
    provider.refresh(now)
  }

  /** Um sorteio do desafio atual (depende só da posição). Recusa com 3 já feitos ou com amistoso em andamento. Não exige ficha. */
  function draw(): boolean {
    if (active.value) return false
    if (drawsUsed.value >= FRIENDLIES.draw.maxDraws) return false
    options.value = provider.drawOptions({ user: standing.value }, Math.random)
    drawsUsed.value += 1
    selectedBotId.value = null
    return true
  }

  function select(botId: string): boolean {
    if (!options.value?.some((o) => o.botId === botId)) return false
    selectedBotId.value = botId
    return true
  }

  /**
   * Apito inicial: gasta 1 ficha, fixa o OVER do rival pelo OVER do time que vai a campo (não o do sorteio: fecha a brecha
   * de sortear com reservas e jogar com titulares), recalcula prêmio (com a virada do dia) e fama, grava o desafio e zera
   * o contador de sorteios. Devolve false sem opção escolhida, com OVER inválido, sem ficha ou com outro amistoso em andamento.
   */
  function beginMatch(userOver: number, now: number): boolean {
    const opt = selectedOption.value
    if (!opt || active.value || !Number.isFinite(userOver)) return false
    const regen = regenTokenState({ tokens: tokens.value, tokenTickAt: tokenTickAt.value }, now)
    const spent = spendToken(regen, now)
    if (!spent) {
      setTokens(regen)
      return false
    }
    setTokens(spent)
    const q = quote(opt, userOver, now)
    active.value = {
      botId: opt.botId,
      botName: opt.name,
      userOver,
      oppOver: q.oppOver,
      prize: q.prize,
      rankBefore: rank.value,
      startedAt: now
    }
    options.value = null
    selectedBotId.value = null
    drawsUsed.value = 0
    return true
  }

  /**
   * Fim do amistoso: fama (Elo com os OVERs do apito), estatísticas, prêmio da vitória (creditado no clube), bot com a
   * fama oposta à aplicada e o jogo espelhado, histórico próprio. Nunca toca em club.reputation (spec §2.12).
   */
  function settle(userScore: number, oppScore: number, now: number): FriendlySummary | null {
    const a = active.value
    if (!a) return null
    const outcome = outcomeFromScore(userScore, oppScore)
    const before = fame.value
    fame.value = applyFame(before, fameDelta(a.userOver, a.oppOver, outcome))
    const applied = fame.value - before
    stats.value = addResult(stats.value, userScore, oppScore)
    let prize = 0
    if (outcome === 'win' && a.prize > 0) {
      prize = a.prize
      const today = dayStart(now)
      paidWins.value = { day: today, count: (paidWins.value.day === today ? paidWins.value.count : 0) + 1 }
      club.earn(prize)
    }
    // Soma zero pelo que o usuário EFETIVAMENTE ganhou ou perdeu (o piso 0 pode cortar o delta calculado).
    provider.reportResult(a.botId, { userFameDelta: applied, userScore, oppScore })
    recent.value = [
      { at: now, botName: a.botName, oppOver: a.oppOver, userScore, oppScore, fameDelta: applied, prize },
      ...recent.value
    ].slice(0, FRIENDLIES.recentMax)
    active.value = null
    return {
      prize,
      fameDelta: applied,
      fameAfter: fame.value,
      rankBefore: a.rankBefore,
      rankAfter: rank.value,
      paidCapReached: outcome === 'win' && a.prize === 0 && FRIENDLIES.prize.paidWinsPerDay > 0
    }
  }

  /** Boot: desafio gravado sem partida ao vivo (save ao vivo perdido) não conta. Devolve true se limpou. */
  function resolveOrphan(isLive: boolean): boolean {
    if (!active.value || isLive) return false
    active.value = null
    return true
  }

  function apply(s: FriendliesSave) {
    fame.value = s.fame
    stats.value = s.stats
    tokens.value = s.tokens
    tokenTickAt.value = s.tokenTickAt
    seed.value = s.seed
    bots.value = s.bots
    botsSimAt.value = s.botsSimAt
    options.value = s.options
    drawsUsed.value = s.drawsUsed
    selectedBotId.value = s.selectedBotId
    active.value = s.active
    paidWins.value = s.paidWins
    recent.value = s.recent
  }

  function toSave(): FriendliesSave {
    return {
      v: 1,
      fame: fame.value,
      stats: stats.value,
      tokens: tokens.value,
      tokenTickAt: tokenTickAt.value,
      seed: seed.value,
      bots: bots.value,
      botsSimAt: botsSimAt.value,
      options: options.value,
      drawsUsed: drawsUsed.value,
      selectedBotId: selectedBotId.value,
      active: active.value,
      paidWins: paidWins.value,
      recent: recent.value
    }
  }

  /** Campo ausente ou de outra versão: estado novo. Presente: valida campo a campo com Number.isFinite (spec §5, Persistência). */
  function fromSave(raw: unknown) {
    const now = Date.now()
    const d = raw as Partial<Record<keyof FriendliesSave, unknown>> | null | undefined
    if (!d || typeof d !== 'object' || d.v !== 1) {
      apply(freshState(now))
      return
    }
    const seedV = isNum(d.seed) ? d.seed : now
    // Bot inválido ou quantidade errada: regenera os bots (fama e estatísticas do usuário ficam).
    const botList = Array.isArray(d.bots) ? d.bots.map(toBot) : []
    const botsV = botList.length === FRIENDLIES.bots.count && botList.every((b): b is FriendlyBot => b !== null) ? botList : generateBots(seedV)
    const optList = Array.isArray(d.options) ? d.options.map(toOption) : []
    const optionsV = optList.length > 0 && optList.every((o): o is FriendlyOption => o !== null) ? optList : null
    // Sem opções não há desafio em curso: o contador volta a 0 (o usuário não fica travado sem nada para escolher).
    const drawsV = optionsV && isNum(d.drawsUsed) ? clamp(Math.round(d.drawsUsed), 0, FRIENDLIES.draw.maxDraws) : 0
    const pw = d.paidWins as { day?: unknown; count?: unknown } | null | undefined
    apply({
      v: 1,
      fame: isNum(d.fame) ? Math.max(0, Math.round(d.fame)) : 0,
      stats: sanitizeStats(d.stats),
      tokens: isNum(d.tokens) ? clamp(Math.floor(d.tokens), 0, FRIENDLIES.tokens.max) : FRIENDLIES.tokens.initial,
      tokenTickAt: isNum(d.tokenTickAt) ? Math.min(d.tokenTickAt, now) : now,
      seed: seedV,
      bots: botsV,
      botsSimAt: isNum(d.botsSimAt) ? Math.min(d.botsSimAt, now) : now,
      options: optionsV,
      drawsUsed: drawsV,
      selectedBotId: optionsV && isStr(d.selectedBotId) && optionsV.some((o) => o.botId === d.selectedBotId) ? d.selectedBotId : null,
      active: isChallenge(d.active) ? d.active : null,
      paidWins: pw && isNum(pw.day) && isNum(pw.count) ? { day: pw.day, count: Math.max(0, Math.round(pw.count)) } : { day: 0, count: 0 },
      recent: Array.isArray(d.recent) ? (d.recent.filter(isResult) as FriendlyResult[]).slice(0, FRIENDLIES.recentMax) : []
    })
  }

  /** Nova carreira (clearSave): volta ao estado novo. */
  function reset() {
    apply(freshState(Date.now()))
  }

  return {
    fame,
    stats,
    standing,
    tokens,
    tokenTickAt,
    seed,
    bots,
    botsSimAt,
    options,
    drawsUsed,
    selectedBotId,
    active,
    paidWins,
    recent,
    rank,
    ranking,
    drawsLeft,
    selectedOption,
    msToNext,
    paidWinsLeft,
    quote,
    regenTokens,
    refresh,
    draw,
    select,
    beginMatch,
    settle,
    resolveOrphan,
    toSave,
    fromSave,
    reset
  }
})
```

- [ ] **Passo 4: substituir `scripts/verify-friendlies/draw.check.ts` inteiro**

```ts
import { createChecker } from './assert'
import { drawOffset, drawOptions, friendlyPrize, opponentOver, opponentOverFrom, quoteOption, rankBonus, rankPool } from '@/utils/friendlies/draw'
import { fameDelta } from '@/utils/friendlies/fame'
import { emptyStats, rankedBots, userRank } from '@/utils/friendlies/ranking'
import { mulberry32 } from '@/utils/core/random'
import type { FriendlyBot, FriendlyStats } from '@/types/friendlies'

const st = (won: number, gf: number, ga: number, drawn = 0, lost = 0): FriendlyStats => ({ played: won + drawn + lost, won, drawn, lost, gf, ga })
const mk = (n: number, fame: number, stats: FriendlyStats = emptyStats()): FriendlyBot => ({ id: `fb_${n}`, name: `Bot ${n}`, over: 60, fame, stats })

export function run(): string[] {
  const c = createChecker()
  c.eq('bonus rank 1', rankBonus(1), 6)
  c.eq('bonus rank 10', rankBonus(10), 6)
  c.eq('bonus rank 11', rankBonus(11), 5.9)
  c.eq('bonus rank 30', rankBonus(30), 3.1)
  c.eq('bonus rank 50', rankBonus(50), 0.1)
  c.eq('bonus rank 51', rankBonus(51), 0)
  c.eq('bonus rank 101', rankBonus(101), 0)

  c.eq('premio OVER 50', friendlyPrize(50), 8000)
  c.eq('premio OVER 60', friendlyPrize(60), 13000)
  c.eq('premio OVER 61', friendlyPrize(61), 13500)
  c.eq('premio OVER 70', friendlyPrize(70), 18000)
  c.eq('premio OVER 84', friendlyPrize(84), 25000)
  c.eq('premio piso', friendlyPrize(40), 8000)
  c.eq('premio teto', friendlyPrize(99), 25000)

  c.eq('OVER do rival sem variacao', opponentOver(60, 101, () => 0.5), 60)
  c.eq('OVER do rival no minimo da variacao', opponentOver(60, 101, () => 0), 55)
  c.eq('OVER do rival no maximo da variacao', opponentOver(60, 101, () => 0.9999), 65)
  c.eq('OVER do rival com bonus de top 10', opponentOver(60, 5, () => 0.5), 66)
  c.eq('OVER do rival com teto 99', opponentOver(98, 1, () => 0.99), 99)
  c.eq('OVER do rival com piso 35', opponentOver(20, 101, () => 0), 35)
  c.eq('rng 1 fora do contrato: limitado ao teto da variacao', opponentOver(60, 101, () => 1), 65)

  // Deslocamento (gravado na opção) e OVER a partir dele.
  c.eq('offset sem variacao, usuario em 101', drawOffset(101, () => 0.5), 0)
  c.eq('offset no top 10 com variacao maxima', drawOffset(1, () => 0.99999), 11)
  c.eq('opponentOverFrom soma e arredonda', opponentOverFrom(60.4, 2.3), 63)
  c.eq('opponentOverFrom teto', opponentOverFrom(95, 11), 99)
  c.eq('opponentOverFrom piso', opponentOverFrom(30, -5), 35)

  // Cotação: a mesma conta no cartão (estimativa) e no apito.
  const q = quoteOption(3, 60, 5)
  c.eq('cotacao: OVER', q.oppOver, 63)
  c.eq('cotacao: premio', q.prize, friendlyPrize(63))
  c.eq('cotacao: fama V/E/D', [q.fameWin, q.fameDraw, q.fameLoss], [fameDelta(60, 63, 'win'), fameDelta(60, 63, 'draw'), fameDelta(60, 63, 'loss')])
  c.eq('cotacao: limite esgotado zera o premio', quoteOption(3, 60, 0).prize, 0)
  c.ok('cotacao: limite desligado (Infinity) paga', quoteOption(3, 60, Number.POSITIVE_INFINITY).prize > 0)
  // Brecha de farm: o mesmo offset com OVER maior dá rival maior.
  c.eq('farm: reservas OVER 45', quoteOption(2, 45, 5).oppOver, 47)
  c.eq('farm: titulares OVER 80', quoteOption(2, 80, 5).oppOver, 82)

  // Sorteio com o usuário em 101 (100 bots com fama distinta).
  const bots: FriendlyBot[] = Array.from({ length: 100 }, (_, i) => mk(i + 1, (100 - i) * 10))
  const ctx = { user: { fame: 0, stats: emptyStats() }, bots }
  const opts = drawOptions(ctx, mulberry32(1))
  c.eq('3 opcoes', opts.length, 3)
  c.ok('bots distintos', new Set(opts.map((o) => o.botId)).size === 3)
  c.ok('janela de +-15 posicoes (usuario em 101)', opts.every((o) => o.rank >= 86 && o.rank <= 100), JSON.stringify(opts.map((o) => o.rank)))
  c.ok('ordenadas por posicao', opts[0].rank <= opts[1].rank && opts[1].rank <= opts[2].rank)
  c.ok('offset em [-5, 5] (sem bonus em 101)', opts.every((o) => o.offset >= -5 && o.offset <= 5))
  c.ok('opcao sem OVER absoluto nem premio', opts.every((o) => !('over' in o) && !('prize' in o)))
  c.ok(
    'fama e nome do proprio bot',
    opts.every((o) => {
      const b = bots.find((x) => x.id === o.botId)
      return !!b && b.fame === o.fame && b.name === o.name
    })
  )
  c.eq('deterministico com a mesma semente', drawOptions(ctx, mulberry32(1)), opts)
  c.eq('com 2 bots devolve 2', drawOptions({ ...ctx, bots: bots.slice(0, 2) }, mulberry32(4)).length, 2)

  // Usuário em 1º: candidatos nas posições 2..16 e bônus máximo no offset.
  const top = drawOptions({ user: { fame: 5000, stats: emptyStats() }, bots }, mulberry32(5))
  c.ok('usuario em 1o: posicoes 2..16', top.every((o) => o.rank >= 2 && o.rank <= 16), JSON.stringify(top.map((o) => o.rank)))
  c.ok('usuario em 1o: offset em [1, 11]', top.every((o) => o.offset >= 1 && o.offset <= 11))

  // Janela crescente: com janela 1, o usuário em 1º só alcança a posição 2; ela cresce até haver 3 candidatos.
  const ranked10 = rankedBots(bots.slice(0, 10), { fame: 5000, stats: emptyStats() })
  c.eq('janela 1 cresce de 5 em 5 ate ter 3', rankPool(ranked10, 1, 3, 1, 5).map((r) => r.rank), [2, 3, 4, 5, 6, 7])
  c.eq('passo 0 nao trava (passo minimo 1)', rankPool(ranked10, 1, 3, 1, 0).map((r) => r.rank), [2, 3, 4])
  c.eq('bots esparsos (so 2): devolve os 2 sem laco infinito', rankPool(ranked10.slice(0, 2), 1, 3, 1, 5).length, 2)

  // Desempate no sorteio: usuário empatado em fama com 2 bots, atrás de um (mais vitórias) e à frente do outro.
  const tied = [mk(1, 900), mk(2, 50, st(3, 6, 2)), mk(3, 50, st(1, 2, 1)), mk(4, 10), mk(5, 5)]
  const me = { fame: 50, stats: st(2, 4, 2) }
  c.eq('desempate: usuario em 3o', userRank(me, tied), 3)
  const table = rankedBots(tied, me)
  c.eq('desempate: rival com menos vitorias fica abaixo do usuario', table.find((r) => r.bot.id === 'fb_3')?.rank, 4)
  const tiedOpts = drawOptions({ user: me, bots: tied }, mulberry32(6))
  c.ok('desempate: posicoes das opcoes seguem a tabela', tiedOpts.every((o) => o.rank === table.find((r) => r.bot.id === o.botId)?.rank))
  return c.fails
}
```

Conferência dos números fixos: `drawOffset(1, () => 0.99999)` = `round1(6 + 4.9999)` = 11; `opponentOverFrom(60.4, 2.3)` = `round(62.7)` = 63; `rankPool` com janela 1 e usuário em 1º: só a posição 2 → janela 6 → posições 2..7.

- [ ] **Passo 5: substituir `scripts/verify-friendlies/store.check.ts` inteiro**

```ts
import { createPinia, setActivePinia } from 'pinia'
import { createChecker } from './assert'
import { useFriendliesStore } from '@/stores/friendlies'
import { useClubStore } from '@/stores/club'
import { fameDelta } from '@/utils/friendlies/fame'
import { friendlyPrize, opponentOverFrom } from '@/utils/friendlies/draw'
import { emptyStats } from '@/utils/friendlies/ranking'
import { dayStart } from '@/config/time'

const H = 60 * 60 * 1000

export function run(): string[] {
  setActivePinia(createPinia())
  const c = createChecker()
  const f = useFriendliesStore()
  const club = useClubStore()
  const now = Date.now()

  c.eq('estado novo: fichas', f.tokens, 10)
  c.eq('estado novo: fama', f.fame, 0)
  c.eq('estado novo: estatisticas zeradas', f.stats, emptyStats())
  c.eq('estado novo: 100 bots', f.bots.length, 100)
  c.ok('estado novo: bots sem jogos', f.bots.every((b) => b.stats.played === 0))
  c.eq('estado novo: posicao 101', f.rank, 101)
  c.eq('estado novo: 3 sorteios', f.drawsLeft, 3)
  c.eq('ranking: linha do usuario', [f.ranking.user.rank, f.ranking.user.isUser], [101, true])
  c.ok('ranking: top 10 sem o usuario', f.ranking.top.length === 10 && f.ranking.top.every((r) => !r.isUser))

  // Simulação ao abrir a tela: sem passo não troca o array; com 2 passos cada bot soma 2 jogos.
  const before = f.bots
  f.refresh(f.botsSimAt + 30 * 60 * 1000)
  c.ok('refresh sem passo: mesmo array', f.bots === before)
  f.refresh(f.botsSimAt + 2 * H)
  c.ok('refresh com 2 passos: 2 jogos por bot', f.bots.every((b) => b.stats.played === 2))

  c.ok('1o sorteio', f.draw())
  c.eq('3 opcoes', f.options?.length, 3)
  c.ok('opcoes guardam offset, nao OVER', f.options!.every((o) => typeof o.offset === 'number' && !('over' in o)))
  c.eq('restam 2', f.drawsLeft, 2)
  c.ok('2o sorteio', f.draw())
  c.ok('3o sorteio', f.draw())
  c.ok('4o sorteio recusado', !f.draw())
  c.eq('restam 0', f.drawsLeft, 0)

  const saved = JSON.parse(JSON.stringify(f.toSave()))
  f.reset()
  c.eq('reset zera sorteios', f.drawsUsed, 0)
  f.fromSave(saved)
  c.eq('recarregar mantem o contador', f.drawsUsed, 3)
  c.eq('recarregar mantem as opcoes', f.options, saved.options)

  c.ok('beginMatch sem selecao falha', !f.beginMatch(60, now))
  const pick = f.options![0]
  c.ok('select', f.select(pick.botId))
  c.eq('selectedOption', f.selectedOption?.botId, pick.botId)

  // Brecha de farm: estimativa com reservas (OVER 45), apito com titulares (OVER 80).
  const low = f.quote(pick, 45, now)
  c.eq('estimativa com o OVER do momento', low.oppOver, opponentOverFrom(45, pick.offset))
  const budget = club.budget
  const reputation = club.reputation
  const botFame = f.bots.find((b) => b.id === pick.botId)!.fame
  const botPlayed = f.bots.find((b) => b.id === pick.botId)!.stats.played
  c.ok('beginMatch', f.beginMatch(80, now))
  const oppOver = opponentOverFrom(80, pick.offset)
  c.eq('OVER do rival recalculado no apito', f.active?.oppOver, oppOver)
  c.ok('apito nao usa o OVER da estimativa com reservas', f.active!.oppOver > low.oppOver)
  c.eq('userOver do apito gravado', f.active?.userOver, 80)
  c.eq('premio recalculado no apito', f.active?.prize, friendlyPrize(oppOver))
  c.eq('ficha gasta no apito', f.tokens, 9)
  c.eq('sorteios zerados no apito', f.drawsUsed, 0)
  c.eq('opcoes limpas', f.options, null)
  c.eq('selecao limpa', f.selectedBotId, null)
  c.ok('sem sorteio com amistoso em andamento', !f.draw())

  const s = f.settle(3, 1, now)
  c.ok('settle devolve resumo', !!s)
  const win = fameDelta(80, oppOver, 'win')
  c.eq('fama apos vitoria (OVERs do apito)', f.fame, win)
  c.eq('premio creditado', club.budget - budget, s?.prize)
  c.eq('premio = friendlyPrize do apito', s?.prize, friendlyPrize(oppOver))
  c.eq('reputacao intacta', club.reputation, reputation)
  c.eq('estatisticas do usuario', f.stats, { played: 1, won: 1, drawn: 0, lost: 0, gf: 3, ga: 1 })
  const botAfter = f.bots.find((b) => b.id === pick.botId)!
  c.eq('bot perde a fama aplicada', botAfter.fame, Math.max(0, botFame - win))
  c.eq('bot soma a derrota espelhada', [botAfter.stats.played, botAfter.stats.lost >= 1], [botPlayed + 1, true])
  c.eq('desafio limpo', f.active, null)
  c.eq('historico com 1', f.recent.length, 1)
  c.eq('vitoria paga contada', f.paidWins.count, 1)

  // Soma zero pelo aplicado: usuário com fama 2 perde; o piso 0 corta o delta e o bot só ganha o que o usuário perdeu.
  f.fame = 2
  c.ok('novo sorteio depois do apito', f.draw())
  const pick2 = f.options![0]
  f.select(pick2.botId)
  const bot2Fame = f.bots.find((b) => b.id === pick2.botId)!.fame
  c.ok('beginMatch 2', f.beginMatch(60, now))
  const s2 = f.settle(0, 2, now)
  c.eq('derrota com fama 2 vai a 0', f.fame, 0)
  c.eq('resumo com o delta aplicado', s2?.fameDelta, -2)
  c.eq('bot ganha so o aplicado', f.bots.find((b) => b.id === pick2.botId)!.fame, bot2Fame + 2)
  c.eq('historico com o aplicado', f.recent[0].fameDelta, -2)
  c.eq('estatisticas somam a derrota', f.stats, { played: 2, won: 1, drawn: 0, lost: 1, gf: 3, ga: 3 })

  f.paidWins = { day: dayStart(now), count: 5 }
  c.eq('limite diario esgotado', f.paidWinsLeft(now), 0)
  c.eq('virada do dia libera', f.paidWinsLeft(now + 2 * 24 * 60 * 60 * 1000), 5)

  // Saneamento do save.
  f.fromSave({ ...saved, tokens: 99, drawsUsed: 7, options: null, fame: -5, tokenTickAt: now + 1e9, botsSimAt: now + 1e9, bots: [] })
  c.eq('tokens limitado a 10', f.tokens, 10)
  c.eq('drawsUsed 0 sem opcoes', f.drawsUsed, 0)
  c.eq('fama >= 0', f.fame, 0)
  c.ok('tokenTickAt <= now', f.tokenTickAt <= Date.now())
  c.ok('botsSimAt <= now', f.botsSimAt <= Date.now())
  c.eq('bots regenerados', f.bots.length, 100)
  f.fromSave({ ...saved, fame: Number.NaN, tokens: Number.NaN, stats: { won: Number.NaN, gf: 'x', ga: 4 } })
  c.eq('NaN: fama 0', f.fame, 0)
  c.eq('NaN: fichas no valor inicial', f.tokens, 10)
  c.eq('estatisticas invalidas saneadas', f.stats, { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 4 })
  f.fromSave({ ...saved, options: saved.options.map((o: Record<string, unknown>) => ({ ...o, offset: 50 })) })
  c.ok('offset fora da faixa limitado a 11', f.options!.every((o) => o.offset === 11))

  // Save anterior a esta revisão: bots e usuário sem `stats`, opções no formato antigo (com `over`, sem `offset`).
  const legacyBots = saved.bots.map((b: Record<string, unknown>) => ({ id: b.id, name: b.name, over: b.over, fame: b.fame }))
  const legacyOptions = [{ botId: saved.bots[0].id, name: saved.bots[0].name, over: 60, fame: 1, rank: 2, prize: 0, fameWin: 1, fameDraw: 0, fameLoss: -1 }]
  f.fromSave({ ...saved, stats: undefined, bots: legacyBots, options: legacyOptions, drawsUsed: 2, selectedBotId: saved.bots[0].id })
  c.eq('legado: bots mantidos', f.bots.map((b) => b.fame), saved.bots.map((b: { fame: number }) => b.fame))
  c.ok('legado: bots com estatisticas zeradas', f.bots.every((b) => JSON.stringify(b.stats) === JSON.stringify(emptyStats())))
  c.eq('legado: usuario com estatisticas zeradas', f.stats, emptyStats())
  c.eq('legado: opcoes antigas descartadas', f.options, null)
  c.eq('legado: contador volta a 0', f.drawsUsed, 0)
  c.eq('legado: selecao limpa', f.selectedBotId, null)

  f.fromSave(undefined)
  c.eq('save antigo sem campo: estado novo', f.tokens, 10)
  f.fromSave({ v: 2 })
  c.eq('versao desconhecida: estado novo', f.fame, 0)

  f.draw()
  f.select(f.options![1].botId)
  f.beginMatch(60, now)
  c.ok('orfa resolvida', f.resolveOrphan(false))
  c.eq('orfa: desafio limpo', f.active, null)
  c.eq('orfa: ficha nao volta', f.tokens, 9)
  c.ok('sem desafio nada a resolver', !f.resolveOrphan(false))

  f.draw()
  f.select(f.options![0].botId)
  c.ok('beginMatch com OVER invalido falha', !f.beginMatch(Number.NaN, now))
  c.eq('OVER invalido: ficha intacta', f.tokens, 9)
  return c.fails
}
```

Notas para quem implementa: `offset` no 101º fica em `[−5, 5]`, então `80 + offset > 45 + offset` sempre (a checagem "apito não usa o OVER da estimativa" não depende do sorteio). O bot escolhido pode já ter perdido jogos na simulação do `refresh`, por isso a checagem do bot compara `played + 1` e `lost >= 1`, e não as estatísticas exatas.

- [ ] **Passo 6: `scripts/verify-friendlies/provider.check.ts` (uma linha)**

Localizar:

```ts
  const opts = p.drawOptions({ userOver: 60, user: { fame: 0, stats: emptyStats() }, paidWinsLeft: 5 }, mulberry32(1))
```

substituir por:

```ts
  const opts = p.drawOptions({ user: { fame: 0, stats: emptyStats() } }, mulberry32(1))
```

- [ ] **Passo 7: verificar**

Rodar: `node scripts/verify-friendlies/run.mjs` → `OK` em ranking, tokens, fame, draw, bots, provider, store.
Rodar: `npm run build` → `✓ built in ...`.
Conferir (busca no código): nenhum uso restante de `option.over`, `opt.over`, `opponentOver(` fora de `draw.ts`/`draw.check.ts`, nem de `draw(userOver` ou `draw(60`.

- [ ] **Passo 8: commit**

```bash
git add src/types/friendlies.ts src/utils/friendlies/draw.ts src/stores/friendlies.ts scripts/verify-friendlies/draw.check.ts scripts/verify-friendlies/store.check.ts scripts/verify-friendlies/provider.check.ts
git commit -m "fix(amistosos): rival pelo OVER do apito com offset do sorteio"
```

**Pronto quando:** todas as checagens `OK` e build passa; `FriendlyOption` não tem `over`/`prize`/`fame*`; `beginMatch(userOver)` grava `oppOver = opponentOverFrom(userOver, offset)` e o prêmio desse `oppOver`; `settle` usa só `active`; `draw()` não recebe argumentos.

**Não fazer:** não chamar `saveGame` na store; não mudar `FriendliesSave.v`; não guardar prêmio/fama na opção (ficariam velhos); não mexer em `useMatchSimulation.ts`, `PreMatch.vue` nem telas (Tarefas 11, 14, 15 e 16 já foram escritas para a API nova: `draw()`, `quote(opt, userOver, now)`, `ranking.top/user` como linhas da tabela).

---

### 6b.4: checagens finais e UI do ranking

**Commit:** só se a conferência abaixo exigir correção: `fix(amistosos): ajustes das checagens do lote 1-7` (com os arquivos corrigidos, um a um). Sem correção, **não** fazer commit vazio.

As checagens pedidas pela revisão já entraram junto com o módulo que mudaram, para cada commit da 6b ficar verde: `provider.check.ts` com o bot de fama 2 montado à mão (6b.2), `bots.check.ts` determinístico (6b.2), `draw.check.ts` com usuário em 1º, janela crescente com bots esparsos e desempate (6b.3), `ranking.check.ts` com os critérios da liga (6b.1), `tokens.check.ts` e `store.check.ts` com `NaN`/`undefined` (6b.2 e 6b.3).

**UI do ranking:** ainda não existe (`src/components/friendlies/` não foi criada; a tela é da Tarefa 15). A tabela com as colunas da liga (`# · Clube · Fama · J · V · E · D · GP · GC · SG`) já está escrita na Tarefa 15, Passo 4, e o `PreMatch` com valores recalculados na Tarefa 14. Nada a fazer aqui além de conferir que essas tarefas usam a API final.

- [ ] **Passo 1: bateria completa**

Rodar: `node scripts/verify-friendlies/run.mjs` → 7 linhas `OK` (ranking, tokens, fame, draw, bots, provider, store).
Rodar: `npm run build` → `✓ built in ...`.

- [ ] **Passo 2: conferência dos invariantes (leitura do código)**

1. `grep -rn "Math.random" scripts/verify-friendlies` → só aparece onde a store usa `Math.random` internamente (nenhum `.check.ts` chama `Math.random` diretamente).
2. `grep -rn "\.over\b" src/utils/friendlies src/stores/friendlies.ts` → só o `over` interno dos bots (`bot.over`, `o.over` em `toBot`); nenhum `option.over`/`opt.over`.
3. `src/stores/friendlies.ts`: `provider.reportResult` recebe `applied`, não `delta`.
4. `src/utils/friendlies/bots.ts`: `Math.max(b.fameMinStart, …)` no alvo; `simulateBots` devolve `bots` (mesma referência) quando `elapsed <= 0`.
5. `src/config/friendlies.ts`: `FRIENDLIES: DeepReadonly<…>`; `FRIENDLY_BOT_NAME_PARTS … as const`.
6. `src/utils/friendlies/rng.ts`: `Math.min(…, 1 - 1e-12)`; `bots.ts` e `draw.ts` passam `safeRng(rng)` a `shuffle`.

- [ ] **Passo 3: commit (só se houve correção)**

```bash
git add <arquivos corrigidos, um a um>
git commit -m "fix(amistosos): ajustes das checagens do lote 1-7"
```

**Pronto quando:** bateria completa `OK`, build passa e os 6 invariantes conferem.

**Não fazer:** não criar componentes de tela aqui (Tarefa 15); não alterar `package.json`; não adicionar test runner.

---

## Tarefa 8: recarga de fichas no ticker

**Commit:** `feat(amistosos): recarga de fichas no ticker`
**Depende de:** Tarefas 7 (store) e 9 (literal `'friendly'`).

Regras (spec §2.1 e §2.5): fichas recarregam a cada segundo pelo ticker de 1 s (`useScouting().startMissionTicker`, iniciado em `src/App.vue`); a energia só congela se houver partida ao vivo **de outra competição** (amistoso ao vivo não congela a recuperação natural).

**Arquivos:**
- Alterar: `src/composables/useScouting.ts`

- [ ] **Passo 1: import**

Depois de `import { useClubStore } from '@/stores/club'`, acrescentar:

```ts
import { useFriendliesStore } from '@/stores/friendlies'
```

- [ ] **Passo 2: instância da store**

Dentro de `useScouting()`, depois de `const scouting = useScoutingStore()`, acrescentar:

```ts
  const friendlies = useFriendliesStore()
```

- [ ] **Passo 3: ticker**

Localizar:

```ts
      // Partida ao vivo congela a recuperação: a energia não muda no meio do jogo.
      if (match.liveCompetitions.length) club.staminaTickAt = nowTick.value
      else squad.regenStamina(nowTick.value)
```

substituir por:

```ts
      // Partida ao vivo congela a recuperação: a energia não muda no meio do jogo. O amistoso não congela (todos jogam
      // como se tivessem energia 100 e o jogo não consome nem recupera energia).
      if (match.liveCompetitions.some((c) => c !== 'friendly')) club.staminaTickAt = nowTick.value
      else squad.regenStamina(nowTick.value)
      // Fichas de amistoso: +1 a cada 6 min de tempo real; o primeiro tick depois de abrir aplica o tempo offline.
      friendlies.regenTokens(nowTick.value)
```

- [ ] **Passo 4: verificar**

Rodar: `npm run build` → `✓ built in ...`.
Manual (`npm run dev`): no DevTools, editar `super_xi_full_save_v7` com `friendlies.tokens = 5` e `friendlies.tokenTickAt` = agora − 30 min; recarregar; depois de 1 s o estado da store mostra 10 fichas (ou ver na tela quando a Tarefa 15 existir).

- [ ] **Passo 5: commit**

```bash
git add src/composables/useScouting.ts
git commit -m "feat(amistosos): recarga de fichas no ticker"
```

**Pronto quando:** build passa; com só um amistoso ao vivo a energia continua recuperando.

**Não fazer:** não criar outro `setInterval`; não chamar `saveGame` a cada tick.

---

## Tarefa 9: competição `friendly` no tipo e nas sessões

**Commit:** `feat(partida): competicao friendly no tipo e nas sessoes`
**Depende de:** Tarefa 1 (`FriendlySummary`).

Com `'friendly'` em `MatchCompetition` e em `COMPETITIONS_ORDER`, `saveLiveMatch`/`restoreLiveMatches`, `liveCompetitions`, `openCompetitions` e `MatchSwitcher` passam a cobrir o amistoso sem código novo (spec §4.2). `isSuspendedFor(p, 'friendly')` = suspenso em qualquer competição (regra 4).

**Arquivos:**
- Alterar: `src/types/match.ts`
- Alterar: `src/stores/match.ts`
- Alterar: `src/utils/player/suspension.ts`
- Alterar: `src/utils/match/matchResult.ts`
- Alterar: `src/components/match/MatchSwitcher.vue`
- Alterar: `src/utils/navigation/sectionMemory.ts`

- [ ] **Passo 1: `src/types/match.ts`**

1a. Primeira linha do arquivo (antes de `export type TacticalMentality`):

```ts
import type { FriendlySummary } from './friendlies'

```

1b. Localizar:

```ts
export type MatchCompetition = 'league' | 'cup' | 'continental' | 'supercup' | 'recopa'
```

substituir por:

```ts
export type MatchCompetition = 'league' | 'cup' | 'continental' | 'supercup' | 'recopa' | 'friendly'
```

1c. Em `LastMatchSummary`, localizar:

```ts
  /** Títulos dos marcos de progressão atingidos nesta partida. */
  milestones?: string[]
}
```

substituir por:

```ts
  /** Títulos dos marcos de progressão atingidos nesta partida. */
  milestones?: string[]
  /** Só em amistoso: prêmio, fama e posição (ticket, sponsor, wages, interest e maintenance ficam 0). */
  friendly?: FriendlySummary
}
```

- [ ] **Passo 2: `src/stores/match.ts`**

2a. Localizar:

```ts
export const COMPETITIONS_ORDER: MatchCompetition[] = ['league', 'cup', 'continental', 'supercup', 'recopa']
```

substituir por:

```ts
export const COMPETITIONS_ORDER: MatchCompetition[] = ['league', 'cup', 'continental', 'supercup', 'recopa', 'friendly']
```

2b. Localizar:

```ts
    supercup: newSession(),
    recopa: newSession()
  })
```

substituir por:

```ts
    supercup: newSession(),
    recopa: newSession(),
    friendly: newSession()
  })
```

- [ ] **Passo 3: `src/utils/player/suspension.ts`**

Localizar o bloco do topo:

```ts
export const COMP_SHORT: Record<MatchCompetition, string> = {
  league: 'Liga',
  cup: 'Taça Cacique',
  continental: 'Copa Condor',
  supercup: 'Supercopa',
  recopa: 'Recopa'
}

const ORDER = Object.keys(COMP_SHORT) as MatchCompetition[]

/** O atleta está suspenso para a próxima partida desta competição? */
export function isSuspendedFor(p: Pick<Player, 'suspension'>, comp: MatchCompetition): boolean {
  return (p.suspension?.[comp] ?? 0) > 0
}
```

substituir por:

```ts
export const COMP_SHORT: Record<MatchCompetition, string> = {
  league: 'Liga',
  cup: 'Taça Cacique',
  continental: 'Copa Condor',
  supercup: 'Supercopa',
  recopa: 'Recopa',
  friendly: 'Amistoso'
}

// Amistoso não tem suspensão própria: fora da lista para suspensionsOf/yellowsOf não mostrarem "suspenso no Amistoso".
const ORDER = (Object.keys(COMP_SHORT) as MatchCompetition[]).filter((c) => c !== 'friendly')

/** O atleta está suspenso para a próxima partida desta competição? No amistoso: suspenso em qualquer competição. */
export function isSuspendedFor(p: Pick<Player, 'suspension'>, comp: MatchCompetition): boolean {
  if (comp === 'friendly') return Object.values(p.suspension ?? {}).some((n) => (n ?? 0) > 0)
  return (p.suspension?.[comp] ?? 0) > 0
}
```

- [ ] **Passo 4: `src/utils/match/matchResult.ts`**

Localizar:

```ts
  supercup: 'Supercopa',
  recopa: 'Recopa'
}
```

substituir por:

```ts
  supercup: 'Supercopa',
  recopa: 'Recopa',
  friendly: 'Amistoso'
}
```

(O filtro de `src/views/MatchesView.vue` só lista competições presentes no histórico; amistoso não entra em `matchHistory`, então não aparece filtro novo.)

- [ ] **Passo 5: `src/components/match/MatchSwitcher.vue`**

Localizar:

```ts
  supercup: 'Supercopa',
  recopa: 'Recopa'
}
```

substituir por:

```ts
  supercup: 'Supercopa',
  recopa: 'Recopa',
  friendly: 'Amistoso'
}
```

- [ ] **Passo 6: `src/utils/navigation/sectionMemory.ts`**

Substituir o arquivo inteiro por:

```ts
import type { MatchCompetition } from '@/types/match'

export type MatchNavId = 'league' | 'competitions' | 'friendlies'

/** A partida é subpágina: o item de navegação "dono" dela é o da competição que está sendo jogada. */
export function navIdForCompetition(comp: MatchCompetition): MatchNavId {
  if (comp === 'league') return 'league'
  if (comp === 'friendly') return 'friendlies'
  return 'competitions'
}

export interface SectionMemory {
  path: string
  /** Competição da partida, quando a última tela da seção foi o pré-jogo ou a partida. */
  comp?: MatchCompetition
}

/** Última tela visitada em cada seção que tem partida (Liga, Competições e Amistosos). Fora do estado reativo de propósito. */
export const sectionMemory: Partial<Record<MatchNavId, SectionMemory>> = {}

const MAIN_PATHS: Record<string, MatchNavId> = { '/league': 'league', '/competitions': 'competitions', '/friendlies': 'friendlies' }

/** Chamado a cada navegação: guarda onde o usuário estava dentro da seção. */
export function rememberSection(path: string, activeComp: MatchCompetition): void {
  if (path === '/match' || path === '/pre-match') {
    sectionMemory[navIdForCompetition(activeComp)] = { path, comp: activeComp }
    return
  }
  const id = MAIN_PATHS[path]
  if (id) sectionMemory[id] = { path }
}
```

- [ ] **Passo 7: verificar**

Rodar: `npm run build` → `✓ built in ...`. Se o `vue-tsc` apontar outro `Record<MatchCompetition, ...>` sem a chave `friendly`, acrescente `friendly` com o rótulo `'Amistoso'` nesse objeto e cite o arquivo no relatório (a busca feita para este plano só achou os quatro acima).
Rodar: `node scripts/verify-friendlies/run.mjs` → nada quebrou (`OK` em todas as checagens existentes).

- [ ] **Passo 8: commit**

```bash
git add src/types/match.ts src/stores/match.ts src/utils/player/suspension.ts src/utils/match/matchResult.ts src/components/match/MatchSwitcher.vue src/utils/navigation/sectionMemory.ts
git commit -m "feat(partida): competicao friendly no tipo e nas sessoes"
```

**Pronto quando:** build passa; nenhuma tela existente muda de comportamento (nada inicia amistoso ainda).

**Não fazer:** não mexer em `useMatchSimulation.ts` (Tarefas 11–13); não adicionar item de navegação (Tarefa 17).

---

## Tarefa 10: força do time sem cansaço

**Commit:** `feat(partida): forca do time sem cansaco`
**Depende de:** Tarefa 9 (`isSuspendedFor(p, 'friendly')`).

Regra 5: no amistoso todos jogam como se tivessem energia 100 (sem o −3 de `stamina < 60`). O padrão das demais competições não muda.

**Arquivos:**
- Alterar: `src/utils/match/calculateTeamStrength.ts`
- Alterar: `src/stores/squad.ts`

- [ ] **Passo 1: `getEffectiveOvr` com opção**

Em `src/utils/match/calculateTeamStrength.ts`, localizar:

```ts
export function getEffectiveOvr(player: Player | null, slotRole: PlayerPosition): number {
  if (!player) return 0
  const posPenalty = positionPenalty(player.position, slotRole)
  const fatiguePenalty = (player.stamina ?? 100) < 60 ? -3 : 0
```

substituir por:

```ts
/** `ignoreFatigue`: amistoso, todos jogam como se tivessem energia 100. */
export interface StrengthOpts {
  ignoreFatigue?: boolean
}

export function getEffectiveOvr(player: Player | null, slotRole: PlayerPosition, opts?: StrengthOpts): number {
  if (!player) return 0
  const posPenalty = positionPenalty(player.position, slotRole)
  const fatiguePenalty = !opts?.ignoreFatigue && (player.stamina ?? 100) < 60 ? -3 : 0
```

- [ ] **Passo 2: `calculateTeamStrength` repassando a opção**

Localizar:

```ts
export function calculateTeamStrength(
  slots: Array<{ player: Player | null; role: PlayerPosition }>,
  unavailable?: ReadonlySet<string>
): TeamStrengthBreakdown {
```

substituir por:

```ts
export function calculateTeamStrength(
  slots: Array<{ player: Player | null; role: PlayerPosition }>,
  unavailable?: ReadonlySet<string>,
  opts?: StrengthOpts
): TeamStrengthBreakdown {
```

e, no mesmo corpo, localizar:

```ts
    const eff = slot.player && !out ? getEffectiveOvr(slot.player, slot.role) : 0 // vaga vazia (ou indisponível) conta como 0
```

substituir por:

```ts
    const eff = slot.player && !out ? getEffectiveOvr(slot.player, slot.role, opts) : 0 // vaga vazia (ou indisponível) conta como 0
```

- [ ] **Passo 3: `src/stores/squad.ts`**

3a. Imports: depois de `import { useClubStore } from '@/stores/club'`, acrescentar:

```ts
import { isSuspendedFor } from '@/utils/player/suspension'
```

3b. Localizar:

```ts
  const teamStrength = computed(() => calculateTeamStrength(pitchSlots.value))
```

substituir por:

```ts
  const teamStrength = computed(() => calculateTeamStrength(pitchSlots.value))
  // OVER do amistoso: a mesma escalação com energia 100 (regra 5 da spec de amistosos).
  const freshTeamStrength = computed(() => calculateTeamStrength(pitchSlots.value, undefined, { ignoreFatigue: true }))
  // Atletas que podem jogar amistoso: sem lesão, sem suspensão em nenhuma competição e não emprestados.
  const friendlyEligibleCount = computed(
    () => players.value.filter((p) => !p.injury && !p.isLoanedOut && !isSuspendedFor(p, 'friendly')).length
  )
```

3c. No `return` da store, localizar:

```ts
    teamStrength,
```

substituir por:

```ts
    teamStrength,
    freshTeamStrength,
    friendlyEligibleCount,
```

- [ ] **Passo 4: verificar**

Rodar: `npm run build` → `✓ built in ...`.
Rodar: `node scripts/verify-league/run.mjs` → `OK: saida identica a baseline` (o padrão de força não mudou). Se a baseline não existir no seu checkout, registre isso no relatório e siga só com o build.

- [ ] **Passo 5: commit**

```bash
git add src/utils/match/calculateTeamStrength.ts src/stores/squad.ts
git commit -m "feat(partida): forca do time sem cansaco"
```

**Pronto quando:** build passa e a força das outras competições continua idêntica.

**Não fazer:** não mudar `teamStrength`; não mexer em `pickBestLineup` nem em `regenStamina`.

---

## Tarefa 11: fluxo do amistoso na simulação (até o apito)

**Commit:** `feat(partida): fluxo do amistoso na simulacao`
**Depende de:** Tarefas 2 (`formatTokenCountdown`), 7 (store), **6b** (`friendlies.quote`, `beginMatch` com OVER do apito), 10 (`freshTeamStrength`, opção `ignoreFatigue`).

Arquivo único: `src/composables/useMatchSimulation.ts`. Spec §4.4 até `startLiveMatch`. Ajuste deste plano: o snapshot é calculado **antes** de `beginMatch` (que limpa a opção escolhida) e `rawOpponentFor` cai em `friendlies.active`. Depois da 6b, a opção não tem OVER absoluto: `rawOpponentFor` usa a cotação viva (`friendlies.quote(opt, squad.freshTeamStrength.rating, Date.now()).oppOver`) e, logo depois de `beginMatch`, o `power` congelado é sobrescrito por `friendlies.active.oppOver` (o valor fixado no apito).

**Arquivos:**
- Alterar: `src/composables/useMatchSimulation.ts`

- [ ] **Passo 1: imports**

Depois de `import { useUiStore } from '@/stores/ui'`, acrescentar:

```ts
import { useFriendliesStore } from '@/stores/friendlies'
import { formatTokenCountdown } from '@/utils/friendlies/tokens'
```

- [ ] **Passo 2: instância da store**

Dentro de `useMatchSimulation()`, localizar:

```ts
  const ui = useUiStore()
  const { saveGame } = usePersistence()
```

substituir por:

```ts
  const ui = useUiStore()
  const friendlies = useFriendliesStore()
  const { saveGame } = usePersistence()
```

- [ ] **Passo 3: `rawOpponentFor`**

Localizar:

```ts
  function rawOpponentFor(comp: MatchCompetition): MatchOpponent {
    if (comp === 'supercup') {
```

substituir por:

```ts
  function rawOpponentFor(comp: MatchCompetition): MatchOpponent {
    if (comp === 'friendly') {
      // Opção escolhida na roleta: OVER do rival estimado com a escalação atual (offset do sorteio + OVER de agora), que
      // acompanha as trocas no PreMatch; depois do apito vale o desafio gravado. Sem nenhum, um rival neutro só para os computeds.
      const opt = friendlies.selectedOption
      if (opt) return { name: opt.name, power: friendlies.quote(opt, squad.freshTeamStrength.rating, Date.now()).oppOver, style: 'Amistoso' }
      const a = friendlies.active
      if (a) return { name: a.botName, power: a.oppOver, style: 'Amistoso' }
      return { name: 'Adversário', power: Math.round(squad.freshTeamStrength.rating), style: 'Amistoso' }
    }
    if (comp === 'supercup') {
```

- [ ] **Passo 4: `rawLabelFor`**

Localizar:

```ts
  function rawLabelFor(comp: MatchCompetition): string {
    if (comp === 'supercup') return 'Supercopa Soberana • Final Única'
```

substituir por:

```ts
  function rawLabelFor(comp: MatchCompetition): string {
    if (comp === 'friendly') {
      const opt = friendlies.selectedOption
      return opt ? 'Amistoso • Ranking #' + opt.rank : 'Amistoso'
    }
    if (comp === 'supercup') return 'Supercopa Soberana • Final Única'
```

- [ ] **Passo 5: `userBaseRating`**

Localizar:

```ts
  function userBaseRating(comp: MatchCompetition): number {
    const ids = unavailableIds(comp)
    return ids.size ? calculateTeamStrength(squad.pitchSlots, ids).rating : squad.teamStrength.rating
  }
```

substituir por:

```ts
  function userBaseRating(comp: MatchCompetition): number {
    const ids = unavailableIds(comp)
    // Amistoso: todos jogam como se tivessem energia 100, sem a penalidade de cansaço.
    if (comp === 'friendly') return calculateTeamStrength(squad.pitchSlots, ids, { ignoreFatigue: true }).rating
    return ids.size ? calculateTeamStrength(squad.pitchSlots, ids).rating : squad.teamStrength.rating
  }
```

- [ ] **Passo 6: `lineupBlockers` e `lineupShort`**

Localizar:

```ts
  function lineupBlockers(comp: MatchCompetition) {
    const starters = new Set(squad.starterIds)
```

substituir por:

```ts
  function lineupBlockers(comp: MatchCompetition) {
    // Amistoso: titular lesionado ou suspenso em qualquer competição bloqueia sempre, haja reserva ou não.
    if (comp === 'friendly') return squad.currentStartersList.filter((p) => !!p.injury || isSuspendedFor(p, comp))
    const starters = new Set(squad.starterIds)
```

E logo depois do fim da função `lineupBlockers` (antes do comentário `// Suspenso na competição sai da escalação...`), acrescentar:

```ts
  /** Amistoso exige 11 titulares escalados. */
  function lineupShort(comp: MatchCompetition): boolean {
    return comp === 'friendly' && squad.currentStartersList.length < 11
  }

```

- [ ] **Passo 7: `prepareMatch`**

Localizar:

```ts
    if (!competitions.isCompetitionPlayable(comp)) {
      ui.showToast('Competição já encerrada.', 'warning')
      router.push(comp === 'league' ? '/league' : '/competitions')
      return
    }
    clearMatchTimer(comp)
    discardInProgressGoals(comp)
    match.activeMatchCompetition = comp
    match.resetMatchState(comp)
    fixLineupFor(comp).forEach((sw) =>
      ui.showToast(`Desfalque na ${COMP_SHORT[comp]}: ${sw.out.name} está suspenso e ${sw.in.name} assume a vaga.`, 'warning')
    )
    router.push('/pre-match')
```

substituir por:

```ts
    if (!competitions.isCompetitionPlayable(comp)) {
      ui.showToast('Competição já encerrada.', 'warning')
      router.push(comp === 'league' ? '/league' : '/competitions')
      return
    }
    if (comp === 'friendly' && !friendlies.selectedOption) {
      ui.showToast('Sorteie um adversário.', 'warning')
      router.push('/friendlies')
      return
    }
    clearMatchTimer(comp)
    discardInProgressGoals(comp)
    match.activeMatchCompetition = comp
    match.resetMatchState(comp)
    fixLineupFor(comp).forEach((sw) =>
      ui.showToast(
        comp === 'friendly'
          ? `Desfalque no Amistoso: ${sw.out.name} está lesionado ou suspenso e ${sw.in.name} assume a vaga.`
          : `Desfalque na ${COMP_SHORT[comp]}: ${sw.out.name} está suspenso e ${sw.in.name} assume a vaga.`,
        'warning'
      )
    )
    router.push('/pre-match')
```

- [ ] **Passo 8: `startLiveMatch`**

Localizar:

```ts
    const blockers = lineupBlockers(comp)
    if (blockers.length) {
      ui.showToast(`${blockers.map((p) => p.name).join(', ')} ${blockers.length === 1 ? 'está suspenso' : 'estão suspensos'} na ${COMP_SHORT[comp]}. Substitua antes de iniciar.`, 'danger')
      return
    }
    discardInProgressGoals(comp)
    // Congela adversário, mando e rótulo antes de ativar a sessão (depois do apito o estado das competições avança).
    match.sessions[comp].snapshot = { opponent: { ...rawOpponentFor(comp) }, isHome: rawIsHomeFor(comp), label: rawLabelFor(comp) }
```

substituir por:

```ts
    const blockers = lineupBlockers(comp)
    if (blockers.length) {
      const names = blockers.map((p) => p.name).join(', ')
      ui.showToast(
        comp === 'friendly'
          ? `${names} ${blockers.length === 1 ? 'está lesionado ou suspenso' : 'estão lesionados ou suspensos'}. Substitua antes de iniciar o amistoso.`
          : `${names} ${blockers.length === 1 ? 'está suspenso' : 'estão suspensos'} na ${COMP_SHORT[comp]}. Substitua antes de iniciar.`,
        'danger'
      )
      return
    }
    if (lineupShort(comp)) {
      ui.showToast('São precisos 11 titulares para iniciar o amistoso.', 'danger')
      return
    }
    // Congela adversário, mando e rótulo antes de ativar a sessão (depois do apito o estado das competições avança).
    // No amistoso, antes de beginMatch: ele limpa a opção escolhida, que dá o nome e a posição do rival.
    const frozen = { opponent: { ...rawOpponentFor(comp) }, isHome: rawIsHomeFor(comp), label: rawLabelFor(comp) }
    if (comp === 'friendly') {
      if (!friendlies.selectedOption) {
        ui.showToast('Sorteie um adversário.', 'warning')
        router.push('/friendlies')
        return
      }
      // A ficha é gasta no apito inicial; grava o desafio e zera os sorteios.
      if (!friendlies.beginMatch(squad.freshTeamStrength.rating, Date.now())) {
        ui.showToast(`Sem fichas. Próxima em ${formatTokenCountdown(friendlies.msToNext)}.`, 'warning')
        return
      }
      // beginMatch recalculou e fixou o OVER do rival com o OVER do apito: o motor usa exatamente o mesmo número que fama e prêmio.
      if (friendlies.active) frozen.opponent.power = friendlies.active.oppOver
      saveGame()
    }
    discardInProgressGoals(comp)
    match.sessions[comp].snapshot = frozen
```

- [ ] **Passo 9: exportar `lineupShort`**

No `return` final de `useMatchSimulation`, localizar:

```ts
    lineupBlockers,
```

substituir por:

```ts
    lineupBlockers,
    lineupShort,
```

- [ ] **Passo 10: verificar**

Rodar: `npm run build` → `✓ built in ...`.
Rodar: `node scripts/verify-friendlies/run.mjs` → todas `OK`.

- [ ] **Passo 11: commit**

```bash
git add src/composables/useMatchSimulation.ts
git commit -m "feat(partida): fluxo do amistoso na simulacao"
```

**Pronto quando:** build passa; liga e copas seguem com o mesmo fluxo (as mudanças só valem para `comp === 'friendly'`).

**Não fazer:** não mexer em `simulateMatchTick`, `rollLiveInjury`, `needsShootout`, `concludeMatch` nem `finishMatchAndReturn` (Tarefas 12 e 13); não alterar `rawIsHomeFor`/`homeBonusApplies` (já dão mando `true` sem bônus no amistoso).

---

## Tarefa 12: regras ao vivo do amistoso

**Commit:** `feat(partida): regras ao vivo do amistoso`
**Depende de:** Tarefas 9 e 11 (mesmo arquivo `useMatchSimulation.ts`; rode depois da 11 para não conflitar).

Regras (spec §2.6–2.9, §4.4): amistoso não credita gols/assistências (estatísticas de temporada e carreira intactas; logs `matchGoalLogs/matchAssistLogs` vazios); lesão ao vivo sem efeito de cansaço e sem o `+1` (o amistoso não desconta jogo); sem pênaltis; no painel de substituição, reserva lesionado não entra.

**Arquivos:**
- Alterar: `src/composables/useMatchSimulation.ts`
- Alterar: `src/components/match/SubstitutionDrawer.vue`

- [ ] **Passo 1: helper `credit` (nível de módulo)**

Em `src/composables/useMatchSimulation.ts`, localizar:

```ts
/** Mando de +3 OVER só vale na liga e no continental; Copa, Supercopa e Recopa não dão mando ao usuário. */
export function homeBonusApplies(comp: MatchCompetition | null | undefined): boolean {
```

substituir por:

```ts
/** Amistoso não credita gols nem assistências: nada entra nas estatísticas de temporada/carreira nem nos logs da partida. */
function credit(comp: MatchCompetition, fn: () => void) {
  if (comp !== 'friendly') fn()
}

/** Mando de +3 OVER só vale na liga e no continental; Copa, Supercopa e Recopa não dão mando ao usuário. */
export function homeBonusApplies(comp: MatchCompetition | null | undefined): boolean {
```

- [ ] **Passo 2: gol de falta (em `simulateMatchTick`, função `freeKick`)**

Localizar:

```ts
          if (kicker) {
            club.recordGoal(kicker)
            ;(matchGoalLogs[comp] ??= []).push(kicker.id)
          }
```

substituir por:

```ts
          if (kicker) {
            credit(comp, () => {
              club.recordGoal(kicker)
              ;(matchGoalLogs[comp] ??= []).push(kicker.id)
            })
          }
```

- [ ] **Passo 3: gol de jogada**

Localizar:

```ts
          if (shooter && !ownGoal) {
            club.recordGoal(shooter)
            ;(matchGoalLogs[comp] ??= []).push(shooter.id)
```

substituir por:

```ts
          if (shooter && !ownGoal) {
            credit(comp, () => {
              club.recordGoal(shooter)
              ;(matchGoalLogs[comp] ??= []).push(shooter.id)
            })
```

- [ ] **Passo 4: assistência**

Localizar:

```ts
                assisterName = assister.name
                club.recordAssist(assister)
                ;(matchAssistLogs[comp] ??= []).push(assister.id)
```

substituir por:

```ts
                assisterName = assister.name
                credit(comp, () => {
                  club.recordAssist(assister)
                  ;(matchAssistLogs[comp] ??= []).push(assister.id)
                })
```

- [ ] **Passo 5: gol de pênalti**

Localizar:

```ts
        if (taker) {
          club.recordGoal(taker)
          ;(matchGoalLogs[comp] ??= []).push(taker.id)
        }
```

substituir por:

```ts
        if (taker) {
          credit(comp, () => {
            club.recordGoal(taker)
            ;(matchGoalLogs[comp] ??= []).push(taker.id)
          })
        }
```

Conferência: depois dos passos 2–5, `grep -n "club.record\(Goal\|Assist\)" src/composables/useMatchSimulation.ts` deve mostrar só chamadas dentro de `credit(comp, () => { ... })`.

- [ ] **Passo 6: `rollLiveInjury`**

Localizar:

```ts
      const tired = Math.max(0, 60 - (p.stamina ?? 100)) / 60
```

substituir por:

```ts
      // Amistoso: todos jogam com energia 100, então o cansaço não aumenta a chance de lesão.
      const tired = comp === 'friendly' ? 0 : Math.max(0, 60 - (p.stamina ?? 100)) / 60
```

e localizar:

```ts
      // +1: o fim desta partida já desconta um jogo de quem for substituído.
      p.injury = { matchesLeft: matches + 1 }
```

substituir por:

```ts
      // +1: o fim desta partida já desconta um jogo de quem for substituído. O amistoso não desconta jogo, então sem o +1.
      p.injury = { matchesLeft: comp === 'friendly' ? matches : matches + 1 }
```

- [ ] **Passo 7: `needsShootout`**

Localizar:

```ts
  function needsShootout(comp: MatchCompetition, u: number, o: number): boolean {
    if (comp === 'cup' || comp === 'supercup' || comp === 'recopa') return u === o
```

substituir por:

```ts
  function needsShootout(comp: MatchCompetition, u: number, o: number): boolean {
    if (comp === 'friendly') return false // amistoso: sem prorrogação nem pênaltis
    if (comp === 'cup' || comp === 'supercup' || comp === 'recopa') return u === o
```

- [ ] **Passo 8: `src/components/match/SubstitutionDrawer.vue`**

Localizar:

```ts
// Suspenso na competição desta partida não pode entrar.
const benchCandidates = computed(() => squad.availableBenchList.filter((p) => !isSuspendedFor(p, match.activeMatchCompetition)))
```

substituir por:

```ts
// Suspenso na competição desta partida não pode entrar. No amistoso, lesionado também não.
const benchCandidates = computed(() =>
  squad.availableBenchList.filter(
    (p) => !isSuspendedFor(p, match.activeMatchCompetition) && !(match.activeMatchCompetition === 'friendly' && p.injury)
  )
)
```

- [ ] **Passo 9: verificar**

Rodar: `npm run build` → `✓ built in ...`.

- [ ] **Passo 10: commit**

```bash
git add src/composables/useMatchSimulation.ts src/components/match/SubstitutionDrawer.vue
git commit -m "feat(partida): regras ao vivo do amistoso"
```

**Pronto quando:** build passa; as 4 chamadas de crédito estão protegidas; amistoso empatado não vai para pênaltis.

**Não fazer:** não mudar a narração nem o sorteio de cartões (cartões valem dentro da partida); não tocar em `concludeMatch` (Tarefa 13).

---

## Tarefa 13: encerramento do amistoso

**Commit:** `feat(partida): encerramento do amistoso`
**Depende de:** Tarefas 7 (`friendlies.settle`) e 12 (mesmo arquivo).

Spec §4.4 (`concludeMatch('friendly')`): ramo próprio que retorna cedo. Limpa logs e cartões (sem `applyDiscipline`), agrava lesão de quem ficou em campo lesionado (`INJURY.aggravateMatches`, teto `aggravateCap`), ninguém cumpre jogo de lesão antiga, `friendlies.settle`, monta o `LastMatchSummary` com `friendly`, salva. **Não** chama `settleMatch`, `applyPostMatchProgression`, marcos, `addMatchRecord` nem `generateIncomingTransferOffer`. Não toca em `club.reputation`.

**Arquivos:**
- Alterar: `src/composables/useMatchSimulation.ts`

- [ ] **Passo 1: funções do encerramento**

Localizar o início de `concludeMatch`:

```ts
  function concludeMatch(comp: MatchCompetition = match.activeMatchCompetition) {
    const session = match.sessions[comp]
```

substituir por:

```ts
  // Amistoso: lesionado que ficou em campo agrava; ninguém cumpre jogo de lesão antiga (senão vira cura por farm).
  function applyFriendlyInjuries() {
    squad.players.forEach((p) => {
      if (!p.injury || !squad.starterIds.includes(p.id)) return
      p.injury.matchesLeft = Math.min(INJURY.aggravateCap, p.injury.matchesLeft + INJURY.aggravateMatches)
      ui.showToast(`${p.name} agravou a lesão por jogar machucado: agora são ${p.injury.matchesLeft} jogos fora.`, 'danger')
    })
    squad.replaceInjuredStarters()
  }

  // Fim do amistoso: fora da temporada. Sem disciplina, economia da partida, desgaste, evolução, marcos, histórico de
  // partidas nem propostas; club.reputation não muda (a fama é separada).
  function concludeFriendly() {
    const comp: MatchCompetition = 'friendly'
    const session = match.sessions[comp]
    matchGoalLogs[comp] = []
    matchAssistLogs[comp] = []
    delete matchCards[comp]
    applyFriendlyInjuries()
    const fs = friendlies.settle(session.matchState.userScore, session.matchState.opponentScore, Date.now())
    const prize = fs?.prize ?? 0
    session.lastMatchSummary = {
      ticket: 0,
      sponsor: 0,
      winBonus: prize,
      wages: 0,
      net: prize,
      interest: 0,
      maintenance: 0,
      ...(fs ? { friendly: fs } : {})
    }
    saveGame()
    saveLiveMatch()
  }

  function concludeMatch(comp: MatchCompetition = match.activeMatchCompetition) {
    if (comp === 'friendly') {
      concludeFriendly()
      return
    }
    const session = match.sessions[comp]
```

- [ ] **Passo 2: `finishMatchAndReturn`**

Localizar:

```ts
    router.push(comp === 'league' ? '/league' : '/competitions')
    // Se outra partida segue aberta, ela vira o alvo do item "Partidas"; senão, competição encerrada volta para a liga.
    const other = match.openCompetitions.find((c) => c !== comp)
    if (other) match.activeMatchCompetition = other
    else if (!competitions.isCompetitionPlayable(comp)) match.activeMatchCompetition = 'league'
```

substituir por:

```ts
    router.push(comp === 'league' ? '/league' : comp === 'friendly' ? '/friendlies' : '/competitions')
    // Se outra partida segue aberta, ela vira o alvo do item "Partidas"; senão, competição encerrada volta para a liga.
    // Amistoso encerrado também volta para a liga: o próximo exige novo sorteio, não há pré-jogo a reabrir.
    const other = match.openCompetitions.find((c) => c !== comp)
    if (other) match.activeMatchCompetition = other
    else if (comp === 'friendly' || !competitions.isCompetitionPlayable(comp)) match.activeMatchCompetition = 'league'
```

- [ ] **Passo 3: verificar**

Rodar: `npm run build` → `✓ built in ...`.
Conferência: em `concludeFriendly` não há chamada a `settleMatch`, `applyDiscipline`, `applyPostMatchProgression`, `club.addMilestones`, `match.addMatchRecord`, `market.generateIncomingTransferOffer` nem `club.reputation`.

- [ ] **Passo 4: commit**

```bash
git add src/composables/useMatchSimulation.ts
git commit -m "feat(partida): encerramento do amistoso"
```

**Pronto quando:** build passa e o ramo `friendly` retorna antes de qualquer efeito de temporada.

**Não fazer:** não alterar o ramo das outras competições; a rota `/friendlies` só existe na Tarefa 15 (até lá o `router.push('/friendlies')` não tem destino, o que é esperado nesta etapa).

---

## Tarefa 13b: correções do bloco 8-13

**Contexto:** as Tarefas 8 a 13 já estão commitadas (último commit `9f78b18 feat(partida): encerramento do amistoso`). A revisão desse bloco achou uma brecha de farm, uma trava de estado e detalhes de cansaço e de texto; o dono do produto aprovou as correções abaixo (spec §2.3, §2.11, §4.4, §6 "OVER do usuário no amistoso", §8 e §11 "Revisão do bloco 8-13"). São **3 commits em sequência** (13b.1 → 13b.2 → 13b.3), cada um entregue sozinho a um subagente. Os três mexem em `src/composables/useMatchSimulation.ts`: nunca rode dois em paralelo.

Antes de cada sub-passo: `git branch --show-current` deve imprimir `feature/amistosos`. Valem as "Regras gerais" (sem `git add -A`, sem mexer em `package.json`, sem merge/push).

### 13b.1: OVER efetivo pela melhor escalação elegível

**Commit:** `fix(amistosos): rival pela melhor escalacao elegivel`

**Problema:** o apito fixa o rival com o OVER da escalação do momento (`squad.freshTeamStrength.rating`). Dá para apitar com titulares fora de posição ou reservas fracos (rival fraco, prêmio e fama de rival fraco) e corrigir o time ao vivo com "Reorganizar" (não gasta substituição) ou com as 5 trocas.

**Correção (aprovada):** `userOver = max(OVER da escalação atual, OVER da melhor escalação elegível)`, ambos sem cansaço; elegível = sem lesão, sem suspensão em nenhuma competição, não emprestado. A melhor escalação é procurada em todas as formações (o "Reorganizar" também troca de formação), com `pickBestLineup`. A conta mora numa função pura nova, testada pelo verificador, e a store `squad` expõe o resultado. Cartão (Tarefa 15), PreMatch (Tarefa 14), `rawOpponentFor` e o apito passam a usar o mesmo número: `squad.friendlyStrength.over`.

**Arquivos:**
- Alterar: `src/utils/match/calculateTeamStrength.ts`
- Criar: `src/utils/friendlies/strength.ts`
- Alterar: `src/stores/squad.ts`
- Alterar: `src/composables/useMatchSimulation.ts`
- Criar: `scripts/verify-friendlies/strength.check.ts`
- Alterar: `scripts/verify-friendlies/run.mjs`

- [ ] **Passo 1: `pickBestLineup` aceita `opts`**

Em `src/utils/match/calculateTeamStrength.ts`, localizar:

```ts
/** `exclude`: atletas a evitar (ex.: suspensos na competição); só entram se não houver outro para a vaga. */
export function pickBestLineup(players: Player[], formation: FormationName, exclude?: (p: Player) => boolean): string[] {
  const layout = FORMATIONS[formation] || FORMATIONS['4-3-3']
  const available = players.filter((p) => !p.isLoanedOut)
  const picked: string[] = []
  for (const slot of layout) {
    const open = available.filter((p) => !picked.includes(p.id))
    const preferred = exclude ? open.filter((p) => !exclude(p)) : open
    const best = (preferred.length ? preferred : open)
      .sort((a, b) => getEffectiveOvr(b, slot.role) - getEffectiveOvr(a, slot.role))[0]
```

substituir por:

```ts
/**
 * `exclude`: atletas a evitar (ex.: suspensos na competição); só entram se não houver outro para a vaga.
 * `opts`: repassado a getEffectiveOvr (amistoso: `ignoreFatigue`). Sem `opts`, comportamento de antes.
 */
export function pickBestLineup(
  players: Player[],
  formation: FormationName,
  exclude?: (p: Player) => boolean,
  opts?: StrengthOpts
): string[] {
  const layout = FORMATIONS[formation] || FORMATIONS['4-3-3']
  const available = players.filter((p) => !p.isLoanedOut)
  const picked: string[] = []
  for (const slot of layout) {
    const open = available.filter((p) => !picked.includes(p.id))
    const preferred = exclude ? open.filter((p) => !exclude(p)) : open
    const best = (preferred.length ? preferred : open)
      .sort((a, b) => getEffectiveOvr(b, slot.role, opts) - getEffectiveOvr(a, slot.role, opts))[0]
```

(O resto da função não muda. `StrengthOpts` já é declarado no mesmo arquivo.)

- [ ] **Passo 2: criar `src/utils/friendlies/strength.ts`**

```ts
import type { Player } from '@/types/player'
import type { FormationName } from '@/types/match'
import { FORMATIONS } from '@/config'
import { buildFormationSlots, calculateTeamStrength, pickBestLineup, type StrengthOpts } from '@/utils/match/calculateTeamStrength'
import { isSuspendedFor } from '@/utils/player/suspension'

// Amistoso: todos jogam como se tivessem energia 100 (spec §2.5).
const FRESH: StrengthOpts = { ignoreFatigue: true }

/** Pode jogar amistoso: sem lesão, sem suspensão em nenhuma competição e não emprestado (spec §2.4). */
export function isFriendlyEligible(p: Player): boolean {
  return !p.injury && !p.isLoanedOut && !isSuspendedFor(p, 'friendly')
}

export interface FriendlyStrength {
  /** OVER da escalação atual com energia 100, sem arredondar (força real em campo). */
  current: number
  /** OVER da melhor escalação elegível com energia 100, entre todas as formações, sem arredondar. */
  best: number
  /** Formação da melhor escalação (null sem nenhum elegível). */
  bestFormation: FormationName | null
  /** OVER efetivo do amistoso: max(current, best). Rival, prêmio e fama saem dele (spec §6). */
  over: number
}

function ratingOf(byId: Map<string, Player>, formation: FormationName, ids: string[]): number {
  const starters = ids.map((id) => byId.get(id) ?? null)
  return calculateTeamStrength(buildFormationSlots(formation, starters), undefined, FRESH).rating
}

/**
 * OVER efetivo do amistoso (spec §6). O piso da melhor escalação elegível fecha a brecha de apitar com o time mal
 * escalado (rival fraco fixado) e corrigir ao vivo com "Reorganizar" ou trocas. Todas as formações entram porque o
 * "Reorganizar" também troca de formação. O max cobre a escalação montada à mão que supera a heurística gulosa.
 */
export function friendlyStrengthOf(players: Player[], formation: FormationName, starterIds: string[]): FriendlyStrength {
  const byId = new Map(players.map((p) => [p.id, p] as const))
  const current = ratingOf(byId, formation, starterIds)
  const eligible = players.filter(isFriendlyEligible)
  let best = 0
  let bestFormation: FormationName | null = null
  if (eligible.length) {
    for (const f of Object.keys(FORMATIONS) as FormationName[]) {
      const rating = ratingOf(byId, f, pickBestLineup(eligible, f, undefined, FRESH))
      if (rating > best + 1e-9) {
        best = rating
        bestFormation = f
      }
    }
  }
  return { current, best, bestFormation, over: Math.max(current, best) }
}
```

- [ ] **Passo 3: `src/stores/squad.ts`**

3a. Localizar:

```ts
import { isSuspendedFor } from '@/utils/player/suspension'
```

substituir por:

```ts
import { friendlyStrengthOf, isFriendlyEligible } from '@/utils/friendlies/strength'
```

(`isSuspendedFor` só era usado em `friendlyEligibleCount`, que passa a usar `isFriendlyEligible`. Conferir com `grep -n "isSuspendedFor" src/stores/squad.ts`: depois da troca não pode sobrar uso.)

3b. Localizar:

```ts
  // Atletas que podem jogar amistoso: sem lesão, sem suspensão em nenhuma competição e não emprestados.
  const friendlyEligibleCount = computed(
    () => players.value.filter((p) => !p.injury && !p.isLoanedOut && !isSuspendedFor(p, 'friendly')).length
  )
```

substituir por:

```ts
  // Atletas que podem jogar amistoso: sem lesão, sem suspensão em nenhuma competição e não emprestados.
  const friendlyEligibleCount = computed(() => players.value.filter(isFriendlyEligible).length)
  // OVER efetivo do amistoso: max(escalação atual, melhor escalação elegível), sem cansaço (spec §6). É o que fixa o rival.
  const friendlyStrength = computed(() => friendlyStrengthOf(players.value, formation.value, starterIds.value))
```

3c. No `return` da store, localizar:

```ts
    freshTeamStrength,
    friendlyEligibleCount,
```

substituir por:

```ts
    freshTeamStrength,
    friendlyEligibleCount,
    friendlyStrength,
```

- [ ] **Passo 4: `src/composables/useMatchSimulation.ts` usa o OVER efetivo**

4a. Em `rawOpponentFor`, localizar:

```ts
      if (opt) return { name: opt.name, power: friendlies.quote(opt, squad.freshTeamStrength.rating, Date.now()).oppOver, style: 'Amistoso' }
      const a = friendlies.active
      if (a) return { name: a.botName, power: a.oppOver, style: 'Amistoso' }
      return { name: 'Adversário', power: Math.round(squad.freshTeamStrength.rating), style: 'Amistoso' }
```

substituir por:

```ts
      // OVER efetivo (piso da melhor escalação elegível): escalar mal não baixa o rival (spec §6).
      if (opt) return { name: opt.name, power: friendlies.quote(opt, squad.friendlyStrength.over, Date.now()).oppOver, style: 'Amistoso' }
      const a = friendlies.active
      if (a) return { name: a.botName, power: a.oppOver, style: 'Amistoso' }
      return { name: 'Adversário', power: Math.round(squad.friendlyStrength.over), style: 'Amistoso' }
```

4b. Em `startLiveMatch`, localizar:

```ts
      if (!friendlies.beginMatch(squad.freshTeamStrength.rating, Date.now())) {
```

substituir por:

```ts
      if (!friendlies.beginMatch(squad.friendlyStrength.over, Date.now())) {
```

(O `if` continua booleano aqui; o motivo da recusa entra em 13b.2.) `userBaseRating` **não** muda: o motor joga com a força real de quem está em campo.

- [ ] **Passo 5: criar `scripts/verify-friendlies/strength.check.ts`**

```ts
import { createChecker } from './assert'
import type { Player, PlayerPosition } from '@/types/player'
import { friendlyStrengthOf, isFriendlyEligible } from '@/utils/friendlies/strength'
import { opponentOverFrom } from '@/utils/friendlies/draw'

// 4-3-3 na ordem das vagas de FORMATIONS['4-3-3'].
const XI: PlayerPosition[] = ['LW', 'ST', 'RW', 'CM', 'CDM', 'CM', 'LB', 'CB', 'CB', 'RB', 'GK']

function mk(id: string, position: PlayerPosition, overall: number, extra: Partial<Player> = {}): Player {
  return {
    id,
    name: id,
    age: 25,
    nationality: 'BR',
    position,
    overall,
    potential: overall,
    attributes: { pace: overall, shooting: overall, passing: overall, dribbling: overall, defending: overall, physical: overall },
    value: 0,
    wage: 0,
    form: 70,
    stamina: 100,
    contractYears: 2,
    isYouth: false,
    isLoanedOut: false,
    isLoanedIn: false,
    trainingFocus: 'balanced',
    marketStatus: 'available',
    ...extra
  }
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6

export function run(): string[] {
  const c = createChecker()
  const starters = XI.map((pos, i) => mk('t' + i, pos, 70))
  const bench = [mk('r0', 'GK', 50), mk('r1', 'CB', 50), mk('r2', 'CAM', 50)]
  const squad = [...starters, ...bench]
  const strongIds = starters.map((p) => p.id)

  const strong = friendlyStrengthOf(squad, '4-3-3', strongIds)
  c.ok('titulares na posicao: current 70', near(strong.current, 70), String(strong.current))
  c.ok('melhor escalacao 70', near(strong.best, 70), String(strong.best))
  c.ok('over = max(current, best)', near(strong.over, Math.max(strong.current, strong.best)))
  c.ok('formacao da melhor definida', strong.bestFormation !== null)

  // Time fraco no apito: ordem invertida (goleiro na ponta, atacantes na defesa).
  const weak = friendlyStrengthOf(squad, '4-3-3', [...strongIds].reverse())
  c.ok('fora de posicao derruba o current', weak.current < strong.current - 5, String(weak.current))
  c.ok('fora de posicao nao reduz o over efetivo', near(weak.over, strong.over), `${weak.over} vs ${strong.over}`)

  // Reservas no lugar dos dois zagueiros e do goleiro.
  const reserves = friendlyStrengthOf(squad, '4-3-3', [...strongIds.slice(0, 7), 'r1', 'r2', strongIds[9], 'r0'])
  c.ok('reservas derrubam o current', reserves.current < strong.current - 1, String(reserves.current))
  c.ok('reservas nao reduzem o over efetivo', near(reserves.over, strong.over), `${reserves.over} vs ${strong.over}`)

  // Formação ruim para o elenco: o piso considera todas as formações.
  const otherFormation = friendlyStrengthOf(squad, '5-3-2', strongIds)
  c.ok('formacao ruim nao reduz o over efetivo', near(otherFormation.over, strong.over), `${otherFormation.over} vs ${strong.over}`)

  // Mesmo offset do sorteio: o rival fixado no apito é o mesmo com o time fraco ou forte.
  c.eq('rival do apito igual com time fraco ou forte', opponentOverFrom(weak.over, 3.4), opponentOverFrom(strong.over, 3.4))

  // Cansaço não conta no amistoso.
  const tired = friendlyStrengthOf(squad.map((p) => ({ ...p, stamina: 30 })), '4-3-3', strongIds)
  c.ok('cansaco ignorado no current', near(tired.current, strong.current), String(tired.current))
  c.ok('cansaco ignorado no best', near(tired.best, strong.best), String(tired.best))

  // Elegibilidade: craque no banco só entra na melhor escalação se puder jogar.
  const withStar = (extra: Partial<Player>) => friendlyStrengthOf([...squad, mk('s', 'ST', 95, extra)], '4-3-3', strongIds)
  c.ok('craque saudavel no banco sobe o best', withStar({}).best > strong.best + 1, String(withStar({}).best))
  c.ok('craque lesionado fora do best', near(withStar({ injury: { matchesLeft: 2 } }).best, strong.best))
  c.ok('craque suspenso na liga fora do best', near(withStar({ suspension: { league: 1 } }).best, strong.best))
  c.ok('craque emprestado fora do best', near(withStar({ isLoanedOut: true }).best, strong.best))

  // Craque lesionado escalado: o current conta com a penalidade de lesão, o best não o usa; o over nunca fica abaixo de nenhum.
  const injuredIn = friendlyStrengthOf([...squad, mk('s', 'ST', 95, { injury: { matchesLeft: 2 } })], '4-3-3', strongIds.map((id) => (id === 't1' ? 's' : id)))
  for (const [name, s] of [['forte', strong], ['fraco', weak], ['reservas', reserves], ['lesionado escalado', injuredIn]] as const) {
    c.ok(`over >= current e >= best (${name})`, s.over >= s.current && s.over >= s.best)
  }

  c.ok('elegivel: saudavel', isFriendlyEligible(mk('a', 'CM', 60)))
  c.ok('inelegivel: lesionado', !isFriendlyEligible(mk('a', 'CM', 60, { injury: { matchesLeft: 1 } })))
  c.ok('inelegivel: suspenso em qualquer competicao', !isFriendlyEligible(mk('a', 'CM', 60, { suspension: { cup: 1 } })))
  c.ok('elegivel: suspensao zerada', isFriendlyEligible(mk('a', 'CM', 60, { suspension: { league: 0 } })))
  c.ok('inelegivel: emprestado', !isFriendlyEligible(mk('a', 'CM', 60, { isLoanedOut: true })))

  const none = friendlyStrengthOf([], '4-3-3', [])
  c.eq('sem atletas', [none.current, none.best, none.bestFormation, none.over], [0, 0, null, 0])
  return c.fails
}
```

- [ ] **Passo 6: registrar a checagem em `scripts/verify-friendlies/run.mjs`**

Localizar:

```js
const ALL = ['ranking', 'tokens', 'fame', 'draw', 'bots', 'provider', 'store']
```

substituir por:

```js
const ALL = ['ranking', 'tokens', 'fame', 'draw', 'bots', 'provider', 'store', 'strength']
```

- [ ] **Passo 7: verificar**

Rodar: `node scripts/verify-friendlies/run.mjs strength` → `OK strength`.
Rodar: `node scripts/verify-friendlies/run.mjs` → `OK` nas 8 checagens.
Rodar: `npm run build` → `✓ built in ...`.
Conferência: `grep -n "freshTeamStrength" src/composables/useMatchSimulation.ts` não mostra mais nada (o `userBaseRating` usa `calculateTeamStrength` direto).

- [ ] **Passo 8: commit**

```bash
git add src/utils/match/calculateTeamStrength.ts src/utils/friendlies/strength.ts src/stores/squad.ts src/composables/useMatchSimulation.ts scripts/verify-friendlies/strength.check.ts scripts/verify-friendlies/run.mjs
git commit -m "fix(amistosos): rival pela melhor escalacao elegivel"
```

**Pronto quando:** as 8 checagens dão `OK`, o build passa e o apito, `rawOpponentFor` e a store `squad` usam `friendlyStrength.over`.

**Não fazer:** não mudar `userBaseRating` nem `freshTeamStrength` (força real em campo, usada pelo motor e pela chance do PreMatch); não chamar `pickBestLineup` sem `opts` no cálculo do amistoso; não alterar `useSquad.autoPickBestLineup` nem a escalação do usuário (a função só calcula, não escala); não mexer em `PreMatch.vue` nem em telas (Tarefas 14 e 15).

### 13b.2: desfazer o apito, motivo do `beginMatch` e encerramento idempotente

**Commit:** `fix(amistosos): desfazer apito e encerramento idempotente`
**Depende de:** 13b.1 (mesmo arquivo `useMatchSimulation.ts`; a linha do `beginMatch` já usa `squad.friendlyStrength.over`).

**Problemas:** (1) se `router.push('/match')` falha depois do apito, `abortStart` limpa a sessão mas a ficha já foi gasta e `friendlies.active` fica preenchido: `draw()` e um novo apito recusam até recarregar (e, sem `saveLiveMatch()`, a sessão abortada continua no save ao vivo). (2) `beginMatch` devolve só `false`, e o toast diz "Sem fichas" mesmo quando o motivo é outro. (3) `concludeFriendly` sem `active` ainda agrava lesões e sobrescreve o resumo com zeros.

**Correção:** `beginMatch` devolve `FriendlyBeginResult`; a store guarda **só em memória** o estado de antes do apito e `cancelBegin()` o restaura (ficha, `tokenTickAt`, opções, seleção, contador de sorteios, `active` limpo). Escolha: restaurar tudo, e não só devolver a ficha, para a falha de rota não dar 3 sorteios grátis nem tirar a opção escolhida; o usuário continua no PreMatch e tenta de novo. Depois de recarregar não há desfazer: vale a regra de órfão (`resolveOrphan`, ficha não volta), como antes. `concludeFriendly` chama `settle` primeiro e sai cedo se ele devolver `null`.

**Arquivos:**
- Alterar: `src/types/friendlies.ts`
- Alterar: `src/stores/friendlies.ts`
- Alterar: `scripts/verify-friendlies/store.check.ts`
- Alterar: `src/composables/useMatchSimulation.ts`

- [ ] **Passo 1: tipo do resultado**

Em `src/types/friendlies.ts`, localizar:

```ts
export type FriendlyOutcome = 'win' | 'draw' | 'loss'
```

substituir por:

```ts
export type FriendlyOutcome = 'win' | 'draw' | 'loss'

/** Resultado de beginMatch: 'ok' ou o motivo da recusa (cada um tem o seu toast em startLiveMatch). */
export type FriendlyBeginResult = 'ok' | 'active' | 'no-option' | 'invalid-over' | 'no-token'
```

- [ ] **Passo 2: store `src/stores/friendlies.ts`**

2a. Localizar:

```ts
  FriendliesSave,
  FriendlyBot,
```

substituir por:

```ts
  FriendliesSave,
  FriendlyBeginResult,
  FriendlyBot,
```

2b. Localizar:

```ts
  const recent = ref<FriendlyResult[]>(init.recent)
```

substituir por:

```ts
  const recent = ref<FriendlyResult[]>(init.recent)
  // Estado de antes do último apito, só em memória: desfaz o apito se a tela da partida não abrir (cancelBegin).
  // Fora do save de propósito: depois de recarregar, desafio sem partida ao vivo é órfão e a ficha não volta (resolveOrphan).
  let beginUndo: {
    botId: string
    tokens: number
    tokenTickAt: number
    options: FriendlyOption[] | null
    selectedBotId: string | null
    drawsUsed: number
  } | null = null
```

2c. Substituir a função `beginMatch` inteira (do comentário `/**` que começa com "Apito inicial" até o `}` que fecha a função) por:

```ts
  /**
   * Apito inicial: gasta 1 ficha, fixa o OVER do rival pelo OVER efetivo do apito (não o do sorteio nem o da escalação
   * mal montada: fecha as brechas de farm), recalcula prêmio (com a virada do dia) e fama, grava o desafio e zera o
   * contador de sorteios. Recusa com o motivo: desafio já em andamento, sem opção escolhida, OVER inválido ou sem ficha.
   */
  function beginMatch(userOver: number, now: number): FriendlyBeginResult {
    if (active.value) return 'active'
    const opt = selectedOption.value
    if (!opt) return 'no-option'
    if (!Number.isFinite(userOver)) return 'invalid-over'
    const undo = {
      botId: opt.botId,
      tokens: tokens.value,
      tokenTickAt: tokenTickAt.value,
      options: options.value,
      selectedBotId: selectedBotId.value,
      drawsUsed: drawsUsed.value
    }
    const regen = regenTokenState({ tokens: tokens.value, tokenTickAt: tokenTickAt.value }, now)
    const spent = spendToken(regen, now)
    if (!spent) {
      setTokens(regen)
      return 'no-token'
    }
    setTokens(spent)
    const q = quote(opt, userOver, now)
    active.value = {
      botId: opt.botId,
      botName: opt.name,
      userOver,
      oppOver: q.oppOver,
      prize: q.prize,
      rankBefore: rank.value,
      startedAt: now
    }
    options.value = null
    selectedBotId.value = null
    drawsUsed.value = 0
    beginUndo = undo
    return 'ok'
  }

  /**
   * A partida não abriu depois do apito: volta ao estado de antes de beginMatch (ficha, relógio das fichas, opções,
   * seleção e contador de sorteios) e limpa o desafio. Só vale na mesma sessão e antes do settle. Devolve true se desfez.
   */
  function cancelBegin(): boolean {
    const u = beginUndo
    beginUndo = null
    if (!u || !active.value || active.value.botId !== u.botId) return false
    tokens.value = u.tokens
    tokenTickAt.value = u.tokenTickAt
    options.value = u.options
    selectedBotId.value = u.selectedBotId
    drawsUsed.value = u.drawsUsed
    active.value = null
    return true
  }
```

2d. Em `settle`, localizar:

```ts
    const a = active.value
    if (!a) return null
    const outcome = outcomeFromScore(userScore, oppScore)
```

substituir por:

```ts
    const a = active.value
    if (!a) return null
    beginUndo = null // o resultado vai contar: o apito não pode mais ser desfeito
    const outcome = outcomeFromScore(userScore, oppScore)
```

2e. Em `resolveOrphan`, localizar:

```ts
    if (!active.value || isLive) return false
    active.value = null
    return true
```

substituir por:

```ts
    if (!active.value || isLive) return false
    active.value = null
    beginUndo = null
    return true
```

2f. Em `apply`, localizar:

```ts
  function apply(s: FriendliesSave) {
    fame.value = s.fame
```

substituir por:

```ts
  function apply(s: FriendliesSave) {
    beginUndo = null // carregar save ou nova carreira: não há apito desta sessão a desfazer
    fame.value = s.fame
```

2g. No `return` da store, localizar:

```ts
    beginMatch,
    settle,
```

substituir por:

```ts
    beginMatch,
    cancelBegin,
    settle,
```

- [ ] **Passo 3: `scripts/verify-friendlies/store.check.ts`**

3a. Localizar `  c.ok('beginMatch sem selecao falha', !f.beginMatch(60, now))` e substituir por:

```ts
  c.eq('beginMatch sem selecao falha', f.beginMatch(60, now), 'no-option')
```

3b. Localizar `  c.ok('beginMatch', f.beginMatch(80, now))` e substituir por:

```ts
  c.eq('beginMatch', f.beginMatch(80, now), 'ok')
```

3c. Localizar `  c.ok('beginMatch 2', f.beginMatch(60, now))` e substituir por:

```ts
  c.eq('beginMatch 2', f.beginMatch(60, now), 'ok')
```

3d. Localizar:

```ts
  c.ok('beginMatch com OVER invalido falha', !f.beginMatch(Number.NaN, now))
  c.eq('OVER invalido: ficha intacta', f.tokens, 9)
  return c.fails
```

substituir por:

```ts
  c.eq('beginMatch com OVER invalido falha', f.beginMatch(Number.NaN, now), 'invalid-over')
  c.eq('OVER invalido: ficha intacta', f.tokens, 9)

  // Desfazer o apito (a tela da partida não abriu): ficha, relógio, opções, seleção e contador voltam como estavam.
  const undoOpts = JSON.parse(JSON.stringify(f.options))
  const undoSel = f.selectedBotId
  const undoDraws = f.drawsUsed
  const undoTick = f.tokenTickAt
  c.eq('beginMatch para desfazer', f.beginMatch(60, now), 'ok')
  c.eq('ficha gasta antes de desfazer', f.tokens, 8)
  c.eq('beginMatch com desafio ativo', f.beginMatch(60, now), 'active')
  c.ok('cancelBegin', f.cancelBegin())
  c.eq('cancelBegin: ficha devolvida', f.tokens, 9)
  c.eq('cancelBegin: tokenTickAt restaurado', f.tokenTickAt, undoTick)
  c.eq('cancelBegin: desafio limpo', f.active, null)
  c.eq('cancelBegin: opcoes de volta', f.options, undoOpts)
  c.eq('cancelBegin: selecao de volta', f.selectedBotId, undoSel)
  c.eq('cancelBegin: contador de volta', f.drawsUsed, undoDraws)
  c.ok('cancelBegin sem apito pendente nao faz nada', !f.cancelBegin())

  // Sem ficha: motivo próprio (o toast certo) e nada gravado.
  f.tokens = 0
  f.tokenTickAt = now
  c.eq('beginMatch sem ficha', f.beginMatch(60, now), 'no-token')
  c.eq('sem ficha: nada gravado', f.active, null)

  // Depois do settle o apito não pode mais ser desfeito (o resultado já contou).
  f.tokens = 10
  c.eq('beginMatch para settle', f.beginMatch(60, now), 'ok')
  f.settle(1, 1, now)
  c.ok('cancelBegin depois do settle recusa', !f.cancelBegin())
  c.eq('settle repetido devolve null', f.settle(1, 1, now), null)
  return c.fails
```

- [ ] **Passo 4: `startLiveMatch` com o motivo da recusa**

Em `src/composables/useMatchSimulation.ts`, localizar:

```ts
      // A ficha é gasta no apito inicial; grava o desafio e zera os sorteios.
      if (!friendlies.beginMatch(squad.friendlyStrength.over, Date.now())) {
        ui.showToast(`Sem fichas. Próxima em ${formatTokenCountdown(friendlies.msToNext)}.`, 'warning')
        return
      }
```

substituir por:

```ts
      // A ficha é gasta no apito inicial; grava o desafio e zera os sorteios. A recusa traz o motivo (toast certo).
      const begun = friendlies.beginMatch(squad.friendlyStrength.over, Date.now())
      if (begun !== 'ok') {
        if (begun === 'no-token') ui.showToast(`Sem fichas. Próxima em ${formatTokenCountdown(friendlies.msToNext)}.`, 'warning')
        else if (begun === 'active') ui.showToast('Já há um amistoso em andamento.', 'warning')
        else if (begun === 'no-option') {
          ui.showToast('Sorteie um adversário.', 'warning')
          router.push('/friendlies')
        } else ui.showToast('Não foi possível calcular a força do time. Recarregue a página.', 'danger')
        return
      }
```

- [ ] **Passo 5: `abortStart` desfaz o apito**

Localizar:

```ts
    const abortStart = () => {
      clearMatchTimer(comp)
      match.resetMatchState(comp)
      ui.showToast('Não foi possível abrir a partida. Recarregue a página.', 'danger')
    }
```

substituir por:

```ts
    const abortStart = () => {
      clearMatchTimer(comp)
      match.resetMatchState(comp)
      // A sessão abortada sai do save ao vivo (senão voltaria ao recarregar a página).
      saveLiveMatch()
      // Amistoso: a ficha foi gasta no apito e a partida não abriu. Desfaz o apito (ficha, opções e sorteios voltam) e salva.
      if (comp === 'friendly' && friendlies.cancelBegin()) {
        saveGame()
        ui.showToast('Não foi possível abrir a partida. A ficha foi devolvida; tente de novo.', 'danger')
        return
      }
      ui.showToast('Não foi possível abrir a partida. Recarregue a página.', 'danger')
    }
```

- [ ] **Passo 6: `concludeFriendly` idempotente**

Substituir a função `concludeFriendly` inteira (do comentário "// Fim do amistoso: fora da temporada." até o `}` que fecha a função) por:

```ts
  // Fim do amistoso: fora da temporada. Sem disciplina, economia da partida, desgaste, evolução, marcos, histórico de
  // partidas nem propostas; club.reputation não muda (a fama é separada).
  function concludeFriendly() {
    const comp: MatchCompetition = 'friendly'
    const session = match.sessions[comp]
    matchGoalLogs[comp] = []
    matchAssistLogs[comp] = []
    delete matchCards[comp]
    // settle antes das lesões: sem desafio gravado (fim repetido ou apito desfeito) devolve null e nada mais é aplicado
    // (nem lesão agravada de novo, nem resumo sobrescrito com zeros).
    const fs = friendlies.settle(session.matchState.userScore, session.matchState.opponentScore, Date.now())
    if (!fs) {
      if (!session.lastMatchSummary) {
        // Resumo neutro só para a tela pós-jogo ter o botão "Voltar aos Amistosos".
        session.lastMatchSummary = {
          ticket: 0,
          sponsor: 0,
          winBonus: 0,
          wages: 0,
          net: 0,
          interest: 0,
          maintenance: 0,
          friendly: { prize: 0, fameDelta: 0, fameAfter: friendlies.fame, rankBefore: friendlies.rank, rankAfter: friendlies.rank, paidCapReached: false }
        }
        ui.showToast('Este amistoso não contou: o desafio já tinha sido encerrado.', 'info')
      }
      saveLiveMatch()
      return
    }
    applyFriendlyInjuries()
    session.lastMatchSummary = {
      ticket: 0,
      sponsor: 0,
      winBonus: fs.prize,
      wages: 0,
      net: fs.prize,
      interest: 0,
      maintenance: 0,
      friendly: fs
    }
    saveGame()
    saveLiveMatch()
  }
```

- [ ] **Passo 7: verificar**

Rodar: `node scripts/verify-friendlies/run.mjs store` → `OK store`.
Rodar: `node scripts/verify-friendlies/run.mjs` → `OK` nas 8 checagens.
Rodar: `npm run build` → `✓ built in ...` (o `vue-tsc` acusa qualquer chamada que ainda trate `beginMatch` como booleano).
Conferência: `grep -n "beginMatch(" src scripts -r` mostra só a store, `startLiveMatch` (comparando com `'ok'`) e o `store.check.ts`.

- [ ] **Passo 8: commit**

```bash
git add src/types/friendlies.ts src/stores/friendlies.ts scripts/verify-friendlies/store.check.ts src/composables/useMatchSimulation.ts
git commit -m "fix(amistosos): desfazer apito e encerramento idempotente"
```

**Pronto quando:** checagens e build passam; `abortStart` no amistoso devolve a ficha e as opções e salva; `concludeFriendly` sem `active` não aplica lesão nem sobrescreve resumo.

**Não fazer:** não gravar `beginUndo` no save nem mexer em `toSave`/`fromSave` além do `apply`; não devolver ficha em `resolveOrphan` (órfão continua sem devolução); não alterar o ramo de `concludeMatch` das outras competições; não mudar a ordem "snapshot antes de `beginMatch`" em `startLiveMatch`.

### 13b.3: gaveta sem cansaço, aviso de recuperação e bloqueio com outra partida ao vivo

**Commit:** `fix(amistosos): gaveta sem cansaco e bloqueio com partida ao vivo`
**Depende de:** 13b.2 (mesmo arquivo `useMatchSimulation.ts`).

**Problemas:** (1) no amistoso todos jogam com energia 100, mas "Reorganizar", "Recomendar" e o rótulo "OVER x → y na vaga" da gaveta ainda descontam cansaço e "Recomendar" desempata pela energia. (2) O Elenco diz "Recuperação natural pausada durante a partida" com só um amistoso ao vivo, mas a recuperação não pausa (o ticker usa `liveCompetitions.some(c => c !== 'friendly')`). (3) Decisão do dono: amistoso **bloqueado** enquanto outra partida (não amistosa) está ao vivo, para evitar escalação compartilhada e lesão agravada em duplicidade.

**Onde o bloqueio mora:** uma função só, `friendlyLiveBlock(): string | null` em `useMatchSimulation` (exportada), com a mensagem "Há uma partida da {COMP_SHORT} ao vivo. Termine-a antes de jogar um amistoso.". Usada por `prepareMatch('friendly')` e `startLiveMatch` (aqui, antes de `fixLineupFor`, para não mexer na escalação de uma partida ao vivo; nada é gasto); a Tarefa 14 desabilita "Iniciar" no PreMatch com ela e a Tarefa 15 desabilita "Jogar" na tela. Não entra em `lineupBlockers` (que devolve atletas, não motivos). Sortear continua liberado. O inverso (iniciar liga ou copa com amistoso rodando) segue permitido.

**Arquivos:**
- Alterar: `src/composables/useMatchSimulation.ts`
- Alterar: `src/components/match/SubstitutionDrawer.vue`
- Alterar: `src/components/squad/SquadRoster.vue`

- [ ] **Passo 1: `friendlyLiveBlock`**

Em `src/composables/useMatchSimulation.ts`, localizar:

```ts
  /** Amistoso exige 11 titulares escalados. */
  function lineupShort(comp: MatchCompetition): boolean {
    return comp === 'friendly' && squad.currentStartersList.length < 11
  }
```

substituir por:

```ts
  /** Amistoso exige 11 titulares escalados. */
  function lineupShort(comp: MatchCompetition): boolean {
    return comp === 'friendly' && squad.currentStartersList.length < 11
  }

  /**
   * Amistoso não começa com partida de outra competição ao vivo (rodando ou pausada na gaveta): a escalação é uma só e
   * o lesionado em campo agravaria nas duas. Devolve o motivo (toast, botão e aviso) ou null.
   */
  function friendlyLiveBlock(): string | null {
    const other = match.liveCompetitions.find((c) => c !== 'friendly')
    return other ? `Há uma partida da ${COMP_SHORT[other]} ao vivo. Termine-a antes de jogar um amistoso.` : null
  }
```

- [ ] **Passo 2: `prepareMatch` recusa**

Localizar:

```ts
    if (comp === 'friendly' && !friendlies.selectedOption) {
      ui.showToast('Sorteie um adversário.', 'warning')
      router.push('/friendlies')
      return
    }
    clearMatchTimer(comp)
```

substituir por:

```ts
    if (comp === 'friendly' && !friendlies.selectedOption) {
      ui.showToast('Sorteie um adversário.', 'warning')
      router.push('/friendlies')
      return
    }
    if (comp === 'friendly') {
      const liveBlock = friendlyLiveBlock()
      if (liveBlock) {
        ui.showToast(liveBlock, 'warning')
        router.push('/friendlies')
        return
      }
    }
    clearMatchTimer(comp)
```

- [ ] **Passo 3: `startLiveMatch` recusa antes de mexer na escalação**

Localizar:

```ts
    // Suspenso na competição não entra: o melhor reserva disponível assume a vaga.
    fixLineupFor(comp)
```

substituir por:

```ts
    // Amistoso não começa com outra partida ao vivo (escalação compartilhada): recusa antes de mexer na escalação e de gastar ficha.
    if (comp === 'friendly') {
      const liveBlock = friendlyLiveBlock()
      if (liveBlock) {
        ui.showToast(liveBlock, 'warning')
        return
      }
    }
    // Suspenso na competição não entra: o melhor reserva disponível assume a vaga.
    fixLineupFor(comp)
```

- [ ] **Passo 4: exportar**

No `return` final de `useMatchSimulation`, localizar:

```ts
    lineupShort,
```

substituir por:

```ts
    lineupShort,
    friendlyLiveBlock,
```

- [ ] **Passo 5: `reorganizeTeam` sem cansaço no amistoso**

5a. Localizar:

```ts
    const unavailable = (p: Player) => isSentOff(comp, p.id) || isSuspendedFor(p, comp)
    const starters = squad.currentStartersList
```

substituir por:

```ts
    const unavailable = (p: Player) => isSentOff(comp, p.id) || isSuspendedFor(p, comp)
    // Amistoso: todos com energia 100 (mesma conta de userBaseRating), senão o cansaço distorce a escolha e a comparação.
    const opts = { ignoreFatigue: comp === 'friendly' }
    const starters = squad.currentStartersList
```

5b. Localizar:

```ts
            .sort((a, b) => getEffectiveOvr(b, layout[i].role) - getEffectiveOvr(a, layout[i].role))[0]
```

substituir por:

```ts
            .sort((a, b) => getEffectiveOvr(b, layout[i].role, opts) - getEffectiveOvr(a, layout[i].role, opts))[0]
```

5c. Localizar:

```ts
        const rating = calculateTeamStrength(layout.map((slot, i) => ({ role: slot.role, player: picked[i] }))).rating
```

substituir por:

```ts
        const rating = calculateTeamStrength(layout.map((slot, i) => ({ role: slot.role, player: picked[i] })), undefined, opts).rating
```

- [ ] **Passo 6: `recommendSubstitution` sem cansaço nem desempate por energia no amistoso**

Localizar a função inteira, do comentário até o fim:

```ts
  // Sugere a melhor troca: maior ganho de OVER efetivo na vaga (posição, cansaço e lesão contam). Só preenche a
  // seleção; quem confirma é o usuário. Sem substituições restantes, só lesionados podem sair.
  function recommendSubstitution() {
    const subsLeft = match.matchState.subsUsed < 5
    const bench = squad.availableBenchList.filter((p) => !p.injury && !isSuspendedFor(p, match.activeMatchCompetition))
    let best: { outId: string; inId: string; gain: number } | null = null
    squad.currentStartersList.forEach((starter) => {
      if (isSentOff(match.activeMatchCompetition, starter.id)) return
      if (!subsLeft && !starter.injury) return
      const slot = squad.starterIds.indexOf(starter.id)
      const role = (FORMATIONS[squad.formation] || FORMATIONS['4-3-3'])[slot]?.role
      if (!role) return
      const current = getEffectiveOvr(starter, role)
      for (const cand of bench) {
        // Energia desempata: a diferença de stamina vale até ~1 ponto de OVER.
        const gain = getEffectiveOvr(cand, role) - current + ((cand.stamina ?? 100) - (starter.stamina ?? 100)) * 0.01
        if (!best || gain > best.gain) best = { outId: starter.id, inId: cand.id, gain }
      }
    })
```

substituir por:

```ts
  // Sugere a melhor troca: maior ganho de OVER efetivo na vaga (posição, cansaço e lesão contam; no amistoso, sem
  // cansaço). Só preenche a seleção; quem confirma é o usuário. Sem substituições restantes, só lesionados podem sair.
  function recommendSubstitution() {
    const comp = match.activeMatchCompetition
    // Amistoso: todos com energia 100, então nem a penalidade de cansaço nem o desempate por energia valem.
    const fresh = comp === 'friendly'
    const opts = { ignoreFatigue: fresh }
    const subsLeft = match.matchState.subsUsed < 5
    const bench = squad.availableBenchList.filter((p) => !p.injury && !isSuspendedFor(p, comp))
    let best: { outId: string; inId: string; gain: number } | null = null
    squad.currentStartersList.forEach((starter) => {
      if (isSentOff(comp, starter.id)) return
      if (!subsLeft && !starter.injury) return
      const slot = squad.starterIds.indexOf(starter.id)
      const role = (FORMATIONS[squad.formation] || FORMATIONS['4-3-3'])[slot]?.role
      if (!role) return
      const current = getEffectiveOvr(starter, role, opts)
      for (const cand of bench) {
        // Energia desempata: a diferença de stamina vale até ~1 ponto de OVER (fora do amistoso).
        const energy = fresh ? 0 : ((cand.stamina ?? 100) - (starter.stamina ?? 100)) * 0.01
        const gain = getEffectiveOvr(cand, role, opts) - current + energy
        if (!best || gain > best.gain) best = { outId: starter.id, inId: cand.id, gain }
      }
    })
```

(O resto da função, de `const pick = best as ...` em diante, não muda.)

- [ ] **Passo 7: rótulo da gaveta, `src/components/match/SubstitutionDrawer.vue`**

Localizar:

```ts
function effectiveLabel(p: Player): string {
  if (!slotRole.value) return `OVER ${p.overall}`
  const eff = getEffectiveOvr(p, slotRole.value)
```

substituir por:

```ts
function effectiveLabel(p: Player): string {
  if (!slotRole.value) return `OVER ${p.overall}`
  // Amistoso: todos jogam com energia 100; o rótulo não desconta cansaço.
  const eff = getEffectiveOvr(p, slotRole.value, { ignoreFatigue: match.activeMatchCompetition === 'friendly' })
```

- [ ] **Passo 8: aviso de recuperação, `src/components/squad/SquadRoster.vue`**

Localizar:

```ts
// Recuperação natural: aviso só enquanto alguém está abaixo de 100; pausa durante partida ao vivo.
const regenLabel = computed(() => {
  if (!squad.players.some((p) => (p.stamina ?? 100) < 100)) return ''
  if (match.liveCompetitions.length) return `Recuperação natural pausada durante a partida (+${STAMINA_REGEN_PER_HOUR} de energia/h)`
```

substituir por:

```ts
// Recuperação natural: aviso só enquanto alguém está abaixo de 100; pausa durante partida ao vivo de outra competição
// (amistoso não pausa: mesmo critério do ticker em useScouting).
const regenLabel = computed(() => {
  if (!squad.players.some((p) => (p.stamina ?? 100) < 100)) return ''
  if (match.liveCompetitions.some((c) => c !== 'friendly')) return `Recuperação natural pausada durante a partida (+${STAMINA_REGEN_PER_HOUR} de energia/h)`
```

- [ ] **Passo 9: verificar**

Rodar: `node scripts/verify-friendlies/run.mjs` → `OK` nas 8 checagens.
Rodar: `npm run build` → `✓ built in ...`.
Conferência: `grep -n "getEffectiveOvr(" src/composables/useMatchSimulation.ts` mostra `opts` em todas as chamadas de `reorganizeTeam` e `recommendSubstitution`; `grep -n "liveCompetitions" src/components/squad/SquadRoster.vue src/composables/useScouting.ts` mostra o mesmo critério `some((c) => c !== 'friendly')` nos dois.
Manual rápido (`npm run dev`): com uma partida de liga ao vivo, chamar o pré-jogo do amistoso (opção já escolhida em `/friendlies`) → toast "Há uma partida da Liga ao vivo. Termine-a antes de jogar um amistoso." e nenhuma ficha gasta.

- [ ] **Passo 10: commit**

```bash
git add src/composables/useMatchSimulation.ts src/components/match/SubstitutionDrawer.vue src/components/squad/SquadRoster.vue
git commit -m "fix(amistosos): gaveta sem cansaco e bloqueio com partida ao vivo"
```

**Pronto quando:** build e checagens passam; fora do amistoso, gaveta e aviso do Elenco se comportam como antes; amistoso não começa com outra partida ao vivo.

**Não fazer:** não bloquear o sorteio nem o início de liga/copa com amistoso rodando (a decisão cobre só o início do amistoso); não colocar o bloqueio em `lineupBlockers`; não mudar `useScouting.ts` (já usa o critério certo); não mexer em `PreMatch.vue` nem na tela (Tarefas 14 e 15).

---

## Tarefa 14: pré-jogo e resumo do amistoso

**Commit:** `feat(partida): pre-jogo e resumo do amistoso`
**Depende de:** Tarefas 3 (`signedFame`), 6b (`friendlies.quote`), 11 (`lineupShort`), 13 (summary com `friendly`), **13b** (`squad.friendlyStrength`, `friendlyLiveBlock`).

**Revisão do bloco 8-13 (já incorporada abaixo):** a cotação do PreMatch usa o OVER efetivo `squad.friendlyStrength.over` (o mesmo do apito); a chance de vitória (`estimateOutcome`) continua com a força real em campo (`squad.freshTeamStrength.rating`); "Iniciar" fica desabilitado também com outra partida ao vivo (`friendlyLiveBlock`), com o motivo no `title` e num aviso; aviso âmbar quando a escalação atual está abaixo da melhor elegível. Os dois latentes apontados na revisão já são cobertos por esta tarefa: o texto "está suspenso na Amistoso" para lesionado (Passo 3, ramo `isFriendly`: "está lesionado ou suspenso") e o botão que ignorava `lineupShort` (Passos 1c e 2: `startDisabled`/`startTitle`).

Depois da 6b, a opção escolhida guarda só o `offset`: o OVER do rival (vem de `activeMatchOpponent`, Tarefa 11), o prêmio e a fama em jogo do pré-jogo saem de `friendlies.quote(opção, squad.friendlyStrength.over, club.clubNow)` (OVER efetivo, 13b.1): piorar a escalação em "Ajustar Tática" não os baixa. As legendas deixam claro que são estimativa até o apito.

**Arquivos:**
- Alterar: `src/components/match/PreMatch.vue`
- Substituir: `src/components/match/PostMatchSummary.vue`

- [ ] **Passo 1: `PreMatch.vue`, script**

1a. Localizar:

```ts
import { ECONOMY, MATCH_SIM } from '@/config'
import { useSquadStore } from '@/stores/squad'
import { COMP_SHORT } from '@/utils/player/suspension'
```

substituir por:

```ts
import { ECONOMY, FRIENDLIES, MATCH_SIM } from '@/config'
import { useSquadStore } from '@/stores/squad'
import { useFriendliesStore } from '@/stores/friendlies'
import { COMP_SHORT } from '@/utils/player/suspension'
import { formatTokenCountdown } from '@/utils/friendlies/tokens'
import { signedFame } from '@/utils/friendlies/fame'
```

1b. Localizar:

```ts
  lineupBlockers,
  startLiveMatch
} = useMatchSimulation()
```

substituir por:

```ts
  lineupBlockers,
  lineupShort,
  friendlyLiveBlock,
  startLiveMatch
} = useMatchSimulation()
```

1c. Localizar:

```ts
const squad = useSquadStore()
// Titulares suspensos na competição que ainda dá para trocar: a partida só começa depois de escalar outro.
const blockers = computed(() => lineupBlockers(match.activeMatchCompetition))
const homeBonus = computed(() => homeBonusApplies(match.activeMatchCompetition))
const estimate = computed(() =>
  estimateOutcome(squad.teamStrength.rating, activeMatchOpponent.value.power, {
```

substituir por:

```ts
const squad = useSquadStore()
const friendlies = useFriendliesStore()
const isFriendly = computed(() => match.activeMatchCompetition === 'friendly')
// Titulares suspensos na competição que ainda dá para trocar: a partida só começa depois de escalar outro.
// No amistoso: lesionados ou suspensos em qualquer competição, sempre.
const blockers = computed(() => lineupBlockers(match.activeMatchCompetition))
const short = computed(() => lineupShort(match.activeMatchCompetition))
const noToken = computed(() => isFriendly.value && friendlies.tokens < 1)
// Amistoso não começa com partida de outra competição ao vivo (spec §2.11): motivo vem de friendlyLiveBlock.
const liveBlock = computed(() => (isFriendly.value ? friendlyLiveBlock() : null))
// Escalação atual abaixo da melhor elegível: o rival é calculado pela mais forte (spec §6), então vale avisar.
const belowBest = computed(() => isFriendly.value && squad.friendlyStrength.best > squad.friendlyStrength.current + 0.5)
const startDisabled = computed(() => !!liveBlock.value || blockers.value.length > 0 || short.value || noToken.value)
const startTitle = computed(() => {
  if (liveBlock.value) return liveBlock.value
  if (blockers.value.length) return isFriendly.value ? 'Escalação irregular: troque o lesionado ou suspenso em Ajustar Tática.' : 'Escalação irregular: substitua o suspenso em Ajustar Tática.'
  if (short.value) return 'São precisos 11 titulares.'
  if (noToken.value) return `Sem fichas — próxima em ${formatTokenCountdown(friendlies.msToNext)}`
  return undefined
})
const friendlyOption = computed(() => friendlies.selectedOption)
// Cotação viva (spec §2.3): OVER do rival, prêmio e fama com o OVER efetivo (o mesmo do apito); só ficam fixos no apito.
const friendlyQuote = computed(() =>
  friendlyOption.value ? friendlies.quote(friendlyOption.value, squad.friendlyStrength.over, club.clubNow) : null
)
const homeBonus = computed(() => homeBonusApplies(match.activeMatchCompetition))
// Amistoso: chance com a força real em campo e energia 100 (o motor joga com quem está escalado; o rival vem do OVER efetivo).
const estimate = computed(() =>
  estimateOutcome(isFriendly.value ? squad.freshTeamStrength.rating : squad.teamStrength.rating, activeMatchOpponent.value.power, {
```

- [ ] **Passo 2: `PreMatch.vue`, botão Iniciar**

Localizar:

```vue
        <BaseButton
          @click="startLiveMatch"
          :disabled="blockers.length > 0"
          :title="blockers.length ? 'Escalação irregular: substitua o suspenso em Ajustar Tática.' : undefined"
```

substituir por:

```vue
        <BaseButton
          @click="startLiveMatch"
          :disabled="startDisabled"
          :title="startTitle"
```

- [ ] **Passo 3: `PreMatch.vue`, avisos**

Localizar:

```vue
    <div v-if="blockers.length" class="p-3 rounded-xl bg-dangerpro-soft border border-dangerpro/40 text-xs text-ink break-words" role="alert">
      <strong class="text-dangerpro">Escalação irregular:</strong>
      {{ blockers.map((p) => p.name).join(', ') }} {{ blockers.length === 1 ? 'está suspenso' : 'estão suspensos' }} na {{ COMP_SHORT[match.activeMatchCompetition] }}.
      Troque em <strong>Ajustar Tática</strong> antes de iniciar a partida.
    </div>
```

substituir por:

```vue
    <p v-if="isFriendly" class="text-xs text-ink-muted break-words">
      Custa 1 ficha (<strong class="text-ink">{{ friendlies.tokens }}/{{ FRIENDLIES.tokens.max }}</strong>).
      <template v-if="noToken"> Sem fichas — próxima em <strong class="text-ink">{{ formatTokenCountdown(friendlies.msToNext) }}</strong>.</template>
    </p>

    <div v-if="blockers.length" class="p-3 rounded-xl bg-dangerpro-soft border border-dangerpro/40 text-xs text-ink break-words" role="alert">
      <strong class="text-dangerpro">Escalação irregular:</strong>
      <template v-if="isFriendly">
        {{ blockers.map((p) => p.name).join(', ') }} {{ blockers.length === 1 ? 'está lesionado ou suspenso' : 'estão lesionados ou suspensos' }}.
      </template>
      <template v-else>
        {{ blockers.map((p) => p.name).join(', ') }} {{ blockers.length === 1 ? 'está suspenso' : 'estão suspensos' }} na {{ COMP_SHORT[match.activeMatchCompetition] }}.
      </template>
      Troque em <strong>Ajustar Tática</strong> antes de iniciar a partida.
    </div>

    <div v-if="short" class="p-3 rounded-xl bg-dangerpro-soft border border-dangerpro/40 text-xs text-ink break-words" role="alert">
      <strong class="text-dangerpro">Escalação incompleta:</strong> são precisos 11 titulares para o amistoso.
    </div>

    <div v-if="liveBlock" class="p-3 rounded-xl bg-dangerpro-soft border border-dangerpro/40 text-xs text-ink break-words" role="alert">
      <strong class="text-dangerpro">Outra partida ao vivo:</strong> {{ liveBlock }}
    </div>

    <p v-if="belowBest" class="p-3 rounded-xl border border-amberpro/40 bg-amberpro-soft text-xs text-amberpro font-semibold break-words">
      Sua escalação (OVER {{ Math.round(squad.friendlyStrength.current) }}) está abaixo da melhor possível
      (OVER {{ Math.round(squad.friendlyStrength.best) }}). O rival, o prêmio e a fama são calculados pela mais forte.
    </p>
```

Classes `bg-amberpro-soft`/`text-amberpro`/`border-amberpro/40` são as mesmas do aviso de limite diário do `PostMatchSummary` (Passo 5).

- [ ] **Passo 4: `PreMatch.vue`, bilheteria/patrocínio viram prêmio/fama no amistoso**

Localizar:

```vue
      <ListRow padding="p-3.5" layout="block" class="min-w-0 break-words">
        <span class="text-[11px] font-bold uppercase text-ink-muted block">Bilheteria Estimada</span>
```

substituir por:

```vue
      <template v-if="isFriendly">
        <ListRow padding="p-3.5" layout="block" class="min-w-0 break-words">
          <span class="text-[11px] font-bold uppercase text-ink-muted block">Prêmio da Vitória</span>
          <strong class="font-score text-lg text-emeraldpro block mt-0.5">+{{ formatCurrency(friendlyQuote?.prize ?? 0) }}</strong>
          <span class="text-[11px] text-ink-muted">{{ friendlyQuote && friendlyQuote.prize === 0 ? 'Limite diário de vitórias pagas atingido' : 'Só na vitória • estimativa, fixado no apito inicial' }}</span>
        </ListRow>
        <ListRow padding="p-3.5" layout="block" class="min-w-0 break-words">
          <span class="text-[11px] font-bold uppercase text-ink-muted block">Fama em Jogo</span>
          <strong class="font-score text-lg text-ink block mt-0.5">
            {{ friendlyQuote ? `${signedFame(friendlyQuote.fameWin)} / ${signedFame(friendlyQuote.fameDraw)} / ${signedFame(friendlyQuote.fameLoss)}` : '—' }}
          </strong>
          <span class="text-[11px] text-ink-muted">Vitória / Empate / Derrota • estimativa, fixada no apito inicial</span>
        </ListRow>
      </template>
      <ListRow v-if="!isFriendly" padding="p-3.5" layout="block" class="min-w-0 break-words">
        <span class="text-[11px] font-bold uppercase text-ink-muted block">Bilheteria Estimada</span>
```

e localizar:

```vue
      <ListRow padding="p-3.5" layout="block" class="min-w-0 break-words">
        <span class="text-[11px] font-bold uppercase text-ink-muted block">Cota Patrocínio</span>
```

substituir por:

```vue
      <ListRow v-if="!isFriendly" padding="p-3.5" layout="block" class="min-w-0 break-words">
        <span class="text-[11px] font-bold uppercase text-ink-muted block">Cota Patrocínio</span>
```

- [ ] **Passo 5: substituir `src/components/match/PostMatchSummary.vue` inteiro**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useMatchStore } from '@/stores/match'
import { useMatchSimulation } from '@/composables/useMatchSimulation'
import { formatCurrency } from '@/utils/format/formatCurrency'
import { signedFame } from '@/utils/friendlies/fame'
import { FRIENDLIES } from '@/config'
import Badge from '@/components/ui/Badge.vue'

const match = useMatchStore()
const { finishMatchAndReturn } = useMatchSimulation()
// Amistoso: bloco próprio no lugar da grade financeira (sem bilheteria, patrocínio nem folha).
const friendly = computed(() => match.lastMatchSummary?.friendly ?? null)
</script>

<template>
  <div v-if="match.lastMatchSummary" class="bg-surface rounded-2xl p-4 sm:p-5 border-2 border-emeraldpro shadow-sm space-y-4 animate-pop">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="min-w-0">
        <span class="text-xs font-bold uppercase text-emeraldpro">{{ friendly ? 'Resultado do Amistoso' : 'Relatório Financeiro da Partida' }}</span>
        <h3 v-if="friendly" class="text-lg font-extrabold text-ink break-words">
          Fama:
          <span :class="friendly.fameDelta > 0 ? 'text-emeraldpro' : friendly.fameDelta < 0 ? 'text-dangerpro' : 'text-ink'">
            {{ signedFame(friendly.fameDelta) }}
          </span>
        </h3>
        <h3 v-else class="text-lg font-extrabold text-ink break-words">
          Balanço Líquido:
          <span :class="match.lastMatchSummary.net >= 0 ? 'text-emeraldpro' : 'text-dangerpro'">
            {{ match.lastMatchSummary.net >= 0 ? '+' : '' }}{{ formatCurrency(match.lastMatchSummary.net) }}
          </span>
        </h3>
      </div>
      <button
        type="button"
        @click="finishMatchAndReturn"
        class="shrink-0 px-5 py-2.5 min-h-11 md:min-h-0 rounded-xl bg-emeraldpro hover:bg-emeraldpro-hover text-night text-xs sm:text-sm font-bold"
      >
        {{ friendly ? 'Voltar aos Amistosos' : 'Continuar Temporada' }}
      </button>
    </div>

    <template v-if="friendly">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Prêmio</span>
          <strong class="text-emeraldpro font-bold">+{{ formatCurrency(friendly.prize) }}</strong>
        </div>
        <div class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Fama</span>
          <strong class="font-bold" :class="friendly.fameDelta > 0 ? 'text-emeraldpro' : friendly.fameDelta < 0 ? 'text-dangerpro' : 'text-ink'">
            {{ signedFame(friendly.fameDelta) }}
          </strong>
        </div>
        <div class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Fama atual</span>
          <strong class="text-ink font-bold">{{ friendly.fameAfter }}</strong>
        </div>
        <div class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Posição</span>
          <strong class="text-ink font-bold">#{{ friendly.rankBefore }} → #{{ friendly.rankAfter }}</strong>
        </div>
      </div>
      <p
        v-if="friendly.paidCapReached"
        class="min-w-0 p-3 rounded-xl border border-amberpro/40 bg-amberpro-soft text-xs text-amberpro font-semibold break-words"
      >
        Limite diário de {{ FRIENDLIES.prize.paidWinsPerDay }} vitórias pagas atingido: esta vitória rendeu só fama. O limite renova à meia-noite.
      </p>
    </template>

    <template v-else>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Bilheteria</span>
          <strong class="text-emeraldpro font-bold">+{{ formatCurrency(match.lastMatchSummary.ticket) }}</strong>
        </div>
        <div class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Patrocínio</span>
          <strong class="text-emeraldpro font-bold">+{{ formatCurrency(match.lastMatchSummary.sponsor) }}</strong>
        </div>
        <div class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Bônus Resultado</span>
          <strong class="text-emeraldpro font-bold">+{{ formatCurrency(match.lastMatchSummary.winBonus) }}</strong>
        </div>
        <div class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Folha Salarial</span>
          <strong class="text-ink font-bold">-{{ formatCurrency(match.lastMatchSummary.wages) }}</strong>
        </div>
        <div v-if="(match.lastMatchSummary.maintenance ?? 0) > 0" class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Manutenção</span>
          <strong class="text-ink font-bold">-{{ formatCurrency(match.lastMatchSummary.maintenance ?? 0) }}</strong>
        </div>
        <div v-if="(match.lastMatchSummary.interest ?? 0) > 0" class="min-w-0 p-3 rounded-xl bg-subtle break-words">
          <span class="text-ink-muted block">Juros da dívida</span>
          <strong class="text-dangerpro font-bold">-{{ formatCurrency(match.lastMatchSummary.interest ?? 0) }}</strong>
        </div>
      </div>

      <div
        v-if="match.lastMatchSummary.evolutions?.length || match.lastMatchSummary.milestones?.length"
        class="flex flex-wrap gap-1.5 min-w-0"
        aria-label="Evolução da partida"
      >
        <Badge
          v-for="(e, i) in match.lastMatchSummary.evolutions ?? []"
          :key="'ev' + i"
          tone="success-strong"
          size="sm"
          class="max-w-full min-w-0 truncate"
          :title="'+1 OVER: ' + e.name + ' (' + e.overall + ')'"
        >
          +1 OVER: {{ e.name }}
        </Badge>
        <Badge
          v-for="(m, i) in match.lastMatchSummary.milestones ?? []"
          :key="'ms' + i"
          tone="success-outline"
          size="sm"
          class="max-w-full min-w-0 break-words"
        >
          Marco: {{ m }}
        </Badge>
      </div>

      <p
        v-if="match.lastMatchSummary.forcedSale"
        class="min-w-0 p-3 rounded-xl border border-dangerpro/40 bg-dangerpro/10 text-xs text-dangerpro font-semibold break-words"
      >
        Venda forçada: {{ match.lastMatchSummary.forcedSale.name }} foi vendido por
        {{ formatCurrency(match.lastMatchSummary.forcedSale.price) }} para cobrir a dívida.
      </p>
    </template>
  </div>
</template>
```

- [ ] **Passo 6: verificar**

Rodar: `npm run build` → `✓ built in ...`.
Conferência visual (`npm run dev`): pré-jogo da liga igual ao de antes (bilheteria e patrocínio aparecem; botão "Continuar Temporada" no resumo). Pré-jogo do amistoso: trocar um titular forte por um reserva fraco em "Ajustar Tática" **não** baixa o OVER do rival, o prêmio nem a fama em jogo (piso da melhor escalação elegível) e faz aparecer o aviso âmbar "abaixo da melhor possível"; a chance de vitória cai. Titular lesionado: aviso "está lesionado ou suspenso" (nunca "suspenso na Amistoso"). Com uma partida de liga ao vivo: "Iniciar" desabilitado, `title` e aviso vermelho com "Há uma partida da Liga ao vivo...".

- [ ] **Passo 7: commit**

```bash
git add src/components/match/PreMatch.vue src/components/match/PostMatchSummary.vue
git commit -m "feat(partida): pre-jogo e resumo do amistoso"
```

**Pronto quando:** build passa; para competições que não são amistoso o markup visível é o mesmo de antes.

**Não fazer:** não mudar o cálculo de `estimateOutcome`; não mexer em `MatchView.vue`.

---

## Tarefa 15: tela, fichas, ranking e histórico

**Commit:** `feat(amistosos): tela, fichas, ranking e historico`
**Depende de:** Tarefas 2, 3, 4, 6b, 7, 10, 11, **13b** (`squad.friendlyStrength`, `friendlyLiveBlock`) (e 13 para o fluxo completo).

**Revisão do bloco 8-13 (já incorporada abaixo):** o "OVER do amistoso" e as cotações dos cartões usam o OVER efetivo `squad.friendlyStrength.over` (13b.1); com partida de outra competição ao vivo (`friendlyLiveBlock`, 13b.3) o sorteio continua livre, mas o "Jogar" dos cartões fica desabilitado com o rótulo "Outra partida ao vivo" e o motivo completo aparece em vermelho no cartão "Desafio".

Spec §7 (FriendliesView, OpponentCard, fluxo) e §8. Depois da 6b: `friendlies.draw()` não recebe argumentos; cada cartão mostra a cotação `friendlies.quote(opção, OVER atual, agora)` marcada como estimativa; o ranking é a tabela de classificação com as colunas da liga (`ranking.top`/`ranking.user` são `FriendlyRankingRow`). Esta tarefa mostra as 3 opções numa grade simples; a Tarefa 16 troca a grade pela roleta animada (deixe o `spinKey`/`spinning` já prontos na view).

**Arquivos:**
- Criar: `src/composables/useFriendlies.ts`
- Criar: `src/components/friendlies/TokenBar.vue`
- Criar: `src/components/friendlies/OpponentCard.vue`
- Criar: `src/components/friendlies/FriendlyRanking.vue`
- Criar: `src/components/friendlies/FriendlyHistory.vue`
- Criar: `src/views/FriendliesView.vue`
- Alterar: `src/router/index.ts`

- [ ] **Passo 1: `src/composables/useFriendlies.ts`**

```ts
import { computed } from 'vue'
import { router } from '@/router'
import type { FriendlyQuote } from '@/types/friendlies'
import { useFriendliesStore } from '@/stores/friendlies'
import { useClubStore } from '@/stores/club'
import { useMatchStore } from '@/stores/match'
import { useSquadStore } from '@/stores/squad'
import { useUiStore } from '@/stores/ui'
import { formatTokenCountdown } from '@/utils/friendlies/tokens'
import { rankBonus } from '@/utils/friendlies/draw'
import { usePersistence } from './usePersistence'
import { useMatchSimulation } from './useMatchSimulation'

const ELIGIBLE_NEEDED = 11
const NO_DRAWS = 'Sem sorteios restantes: escolha um dos 3 adversários.'

/** Orquestra a tela de amistosos: store + pré-jogo + toasts + save. */
export function useFriendlies() {
  const friendlies = useFriendliesStore()
  const club = useClubStore()
  const match = useMatchStore()
  const squad = useSquadStore()
  const ui = useUiStore()
  const { saveGame } = usePersistence()
  const { prepareMatch, friendlyLiveBlock } = useMatchSimulation()

  /** OVER efetivo do amistoso: max(escalação atual, melhor elegível), energia 100, sem arredondar (spec §6). É o do apito. */
  const userOver = computed(() => squad.friendlyStrength.over)
  const isLive = computed(() => match.isCompetitionLive('friendly'))
  /** Partida de outra competição ao vivo: amistoso não começa (spec §2.11). Sortear continua livre. */
  const liveBlock = computed(() => friendlyLiveBlock())
  const currentRankBonus = computed(() => rankBonus(friendlies.rank))
  /** Cotação de cada opção com o OVER atual (estimativa: o apito recalcula com o OVER do time que vai a campo). */
  const quotes = computed<Record<string, FriendlyQuote>>(() =>
    Object.fromEntries((friendlies.options ?? []).map((o) => [o.botId, friendlies.quote(o, userOver.value, club.clubNow)]))
  )
  const nextTokenIn = computed(() => formatTokenCountdown(friendlies.msToNext))
  const challengeBlock = computed<string | null>(() => {
    if (isLive.value) return 'Há um amistoso em andamento.'
    if (squad.friendlyEligibleCount < ELIGIBLE_NEEDED) return 'São precisos 11 atletas sem lesão e sem suspensão.'
    return null
  })

  /** Ao abrir a tela: fichas em dia e ranking dos bots simulado até agora (sem timer em segundo plano). */
  function open() {
    const now = Date.now()
    friendlies.regenTokens(now)
    friendlies.refresh(now)
    saveGame()
  }

  function runDraw(): boolean {
    if (!friendlies.draw()) {
      ui.showToast(NO_DRAWS, 'warning')
      return false
    }
    saveGame()
    return true
  }

  /** "Desafiar": com opções salvas, não sorteia (devolve false); senão faz o 1º sorteio. true = sorteou (a tela anima). */
  function challenge(): boolean {
    if (challengeBlock.value) {
      ui.showToast(challengeBlock.value, 'warning')
      return false
    }
    if (friendlies.options) return false
    return runDraw()
  }

  /** "Re-sortear": consome 1 dos 3 sorteios do desafio. */
  function redraw(): boolean {
    if (challengeBlock.value) {
      ui.showToast(challengeBlock.value, 'warning')
      return false
    }
    if (friendlies.drawsLeft <= 0) {
      ui.showToast(NO_DRAWS, 'warning')
      return false
    }
    return runDraw()
  }

  function watchLive() {
    match.activeMatchCompetition = 'friendly'
    router.push('/match')
  }

  /** "Jogar": escolhe a opção e abre o pré-jogo. A ficha só é gasta no apito inicial. */
  function play(botId: string) {
    if (isLive.value) {
      watchLive()
      return
    }
    if (liveBlock.value) {
      ui.showToast(liveBlock.value, 'warning')
      return
    }
    if (friendlies.tokens < 1) {
      ui.showToast(`Sem fichas. Próxima em ${nextTokenIn.value}.`, 'warning')
      return
    }
    if (!friendlies.select(botId)) return
    saveGame()
    prepareMatch('friendly')
  }

  return { userOver, isLive, liveBlock, currentRankBonus, quotes, nextTokenIn, challengeBlock, open, challenge, redraw, play, watchLive }
}
```

- [ ] **Passo 2: `src/components/friendlies/TokenBar.vue`**

```vue
<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'

// 10 fichas (cheias/vazias) e o contador da próxima; o contador some com o estoque cheio (nextIn = null).
defineProps<{ tokens: number; max: number; nextIn: string | null }>()
</script>

<template>
  <BaseCard padding="p-4" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div class="min-w-0">
      <span class="text-[11px] font-bold uppercase text-ink-muted block">Fichas</span>
      <div class="flex flex-wrap gap-1.5 mt-1.5" role="img" :aria-label="`${tokens} de ${max} fichas`">
        <span
          v-for="i in max"
          :key="i"
          class="w-5 h-5 rounded-full border-2"
          :class="i <= tokens ? 'bg-gold border-gold shadow-[0_0_6px_rgba(251,191,36,0.5)]' : 'bg-night border-borderline'"
        ></span>
      </div>
    </div>
    <p class="text-xs text-ink-muted shrink-0">
      <strong class="font-score text-lg text-ink">{{ tokens }}/{{ max }}</strong>
      <span v-if="nextIn"> • Próxima ficha em <strong class="text-ink">{{ nextIn }}</strong></span>
    </p>
  </BaseCard>
</template>
```

- [ ] **Passo 3: `src/components/friendlies/OpponentCard.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { FriendlyOption, FriendlyQuote } from '@/types/friendlies'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { formatCurrency } from '@/utils/format/formatCurrency'
import { signedFame } from '@/utils/friendlies/fame'

const props = defineProps<{
  option: FriendlyOption
  /** Cotação com o OVER atual do usuário: estimativa (o apito recalcula com o OVER do time que vai a campo). */
  quote: FriendlyQuote
  /** OVER do amistoso do usuário (sem arredondar). */
  userOver: number
  disabled: boolean
  /** Motivo exibido no botão quando desabilitado (ex.: "Sem fichas — próxima em 04:12"). */
  blockLabel: string | null
}>()
const emit = defineEmits<{ play: [botId: string] }>()

// Selo de diferença: rival mais forte em vermelho (+3), mais fraco em verde (−2).
const diff = computed(() => props.quote.oppOver - Math.round(props.userOver))
const diffLabel = computed(() => (diff.value > 0 ? `+${diff.value}` : `−${Math.abs(diff.value)}`))
</script>

<template>
  <div class="rounded-2xl border border-borderline bg-subtle p-4 flex flex-col gap-3 min-w-0">
    <div class="flex items-center gap-3 min-w-0">
      <TeamCrest :name="option.name" size="md" />
      <div class="min-w-0">
        <p class="font-extrabold text-ink truncate" :title="option.name">{{ option.name }}</p>
        <p class="text-[11px] text-ink-muted">Ranking #{{ option.rank }} • Fama {{ option.fame }}</p>
      </div>
    </div>
    <div class="flex items-baseline gap-2">
      <span class="text-[11px] font-bold uppercase text-ink-muted">OVER estimado</span>
      <strong class="font-score text-2xl text-ink" :title="'Estimativa com a melhor escalação disponível'">~{{ quote.oppOver }}</strong>
      <span v-if="diff !== 0" class="text-xs font-bold" :class="diff > 0 ? 'text-dangerpro' : 'text-emeraldpro'">{{ diffLabel }}</span>
    </div>
    <p class="text-xs text-ink break-words">
      <template v-if="quote.prize > 0">Prêmio: <strong class="text-emeraldpro">{{ formatCurrency(quote.prize) }}</strong></template>
      <template v-else>Prêmio: <strong>R$ 0</strong> — limite diário de vitórias pagas atingido</template>
    </p>
    <p class="text-xs text-ink">
      Fama:
      <strong class="text-emeraldpro">{{ signedFame(quote.fameWin) }}</strong> /
      <strong>{{ signedFame(quote.fameDraw) }}</strong> /
      <strong class="text-dangerpro">{{ signedFame(quote.fameLoss) }}</strong>
      <span class="text-ink-muted">(V/E/D)</span>
    </p>
    <p class="text-[11px] text-ink-muted break-words">Estimativa com a melhor escalação disponível; os valores são fixados no apito inicial.</p>
    <BaseButton
      class="mt-auto px-4 py-3 min-h-12 text-sm disabled:cursor-not-allowed"
      :disabled="disabled"
      @click="emit('play', option.botId)"
    >
      {{ disabled && blockLabel ? blockLabel : 'Jogar (1 ficha)' }}
    </BaseButton>
  </div>
</template>
```

- [ ] **Passo 4: `src/components/friendlies/FriendlyRanking.vue`**

Tabela de classificação no formato da tabela da liga (`src/views/LeagueView.vue`), com **Fama no lugar de P** (spec §7, item 5). A ordem já vem pronta de `friendlies.ranking` (fama → vitórias → saldo → gols pró, spec §6).

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { Trophy } from 'lucide-vue-next'
import type { FriendlyRankingRow, FriendlyRankingView } from '@/types/friendlies'
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import TeamCrest from '@/components/ui/TeamCrest.vue'

const props = defineProps<{ view: FriendlyRankingView; userName: string; total: number }>()
// Usuário no top 10: só a tabela. Fora: tabela + "…" + linha dele destacada.
const userInTop = computed(() => props.view.top.some((r) => r.isUser))
const rows = computed<FriendlyRankingRow[]>(() => (userInTop.value ? props.view.top : [...props.view.top, props.view.user]))
const nameOf = (r: FriendlyRankingRow) => (r.isUser ? props.userName : r.name)
const signed = (n: number) => (n > 0 ? `+${n}` : String(n))
</script>

<template>
  <BaseCard class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <SectionTitle class="min-w-0">
        <template #icon><Trophy class="w-4 h-4 text-gold shrink-0" /></template>
        Ranking de Fama
      </SectionTitle>
      <span class="shrink-0 text-[11px] text-ink-muted">Fama • V • SG • GP</span>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full min-w-[460px] md:min-w-0 text-xs text-left border-collapse">
        <thead>
          <tr class="border-b border-borderline text-[11px] uppercase text-ink-muted">
            <th class="py-2.5 px-2 w-9">#</th>
            <th class="py-2.5 px-2 sticky left-0 z-10 bg-surface md:static md:bg-transparent">Clube</th>
            <th class="py-2.5 px-2 text-center font-bold text-ink">Fama</th>
            <th class="py-2.5 px-2 text-center">J</th>
            <th class="py-2.5 px-2 text-center">V</th>
            <th class="py-2.5 px-2 text-center">E</th>
            <th class="py-2.5 px-2 text-center">D</th>
            <th class="py-2.5 px-2 text-center">GP</th>
            <th class="py-2.5 px-2 text-center">GC</th>
            <th class="py-2.5 px-2 pr-3 text-center">SG</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-borderline">
          <template v-for="(row, i) in rows" :key="row.id">
            <tr v-if="!userInTop && i === rows.length - 1" aria-hidden="true">
              <td colspan="10" class="py-1 px-2 text-center text-ink-muted">…</td>
            </tr>
            <tr
              :class="['transition-colors', row.isUser ? 'bg-emeraldpro-soft font-bold' : 'hover:bg-subtle/70']"
              :aria-current="row.isUser ? 'true' : undefined"
            >
              <td class="py-2.5 px-2 font-score font-bold text-ink-muted">{{ row.rank }}</td>
              <td
                :class="[
                  'py-2.5 px-2 text-ink max-w-[140px] sm:max-w-[190px] sticky left-0 z-10 md:static md:bg-transparent',
                  row.isUser ? 'bg-emeraldpro-soft' : 'bg-surface'
                ]"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <TeamCrest v-if="row.isUser" class="shrink-0" size="xs" is-user />
                  <TeamCrest v-else class="shrink-0" size="xs" :name="row.name" />
                  <span class="truncate" :title="nameOf(row)">{{ nameOf(row) }}</span>
                </span>
              </td>
              <td class="py-2.5 px-2 text-center font-score font-extrabold text-sm text-ink">{{ row.fame }}</td>
              <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.played }}</td>
              <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.won }}</td>
              <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.drawn }}</td>
              <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.lost }}</td>
              <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.gf }}</td>
              <td class="py-2.5 px-2 text-center text-ink-muted">{{ row.ga }}</td>
              <td class="py-2.5 px-2 pr-3 text-center font-semibold" :class="row.gd >= 0 ? 'text-emeraldpro' : 'text-dangerpro'">
                {{ signed(row.gd) }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <p class="text-[11px] text-ink-muted">
      {{ total }} clubes no ranking. Desempate como na liga: vitórias, saldo e gols pró. A fama e os jogos dos rivais mudam com o tempo.
    </p>
  </BaseCard>
</template>
```

- [ ] **Passo 5: `src/components/friendlies/FriendlyHistory.vue`**

```vue
<script setup lang="ts">
import { History } from 'lucide-vue-next'
import type { FriendlyResult } from '@/types/friendlies'
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import { OUTCOME_UI } from '@/utils/match/matchResult'
import { outcomeFromScore, signedFame } from '@/utils/friendlies/fame'
import { formatCurrency } from '@/utils/format/formatCurrency'

defineProps<{ results: FriendlyResult[] }>()
</script>

<template>
  <BaseCard class="space-y-3">
    <SectionTitle>
      <template #icon><History class="w-4 h-4 text-emeraldpro shrink-0" /></template>
      Últimos Amistosos
    </SectionTitle>
    <p v-if="!results.length" class="text-sm text-ink-muted">Nenhum amistoso jogado ainda.</p>
    <ul v-else class="divide-y divide-borderline">
      <li v-for="r in results" :key="r.at" class="flex items-center gap-3 py-2 min-w-0">
        <span
          class="w-6 h-6 rounded-full text-[11px] font-extrabold flex items-center justify-center shrink-0"
          :class="OUTCOME_UI[outcomeFromScore(r.userScore, r.oppScore)].cls"
          :title="OUTCOME_UI[outcomeFromScore(r.userScore, r.oppScore)].label"
        >{{ OUTCOME_UI[outcomeFromScore(r.userScore, r.oppScore)].letter }}</span>
        <TeamCrest :name="r.botName" size="xs" />
        <span class="flex-1 min-w-0 truncate text-sm text-ink" :title="r.botName">{{ r.botName }}</span>
        <span class="font-score font-bold text-ink shrink-0">{{ r.userScore }} x {{ r.oppScore }}</span>
        <span class="w-10 text-right text-xs font-bold shrink-0" :class="r.fameDelta > 0 ? 'text-emeraldpro' : r.fameDelta < 0 ? 'text-dangerpro' : 'text-ink-muted'">
          {{ signedFame(r.fameDelta) }}
        </span>
        <span class="hidden sm:inline w-24 text-right text-xs text-ink-muted shrink-0">{{ r.prize > 0 ? '+' + formatCurrency(r.prize) : '—' }}</span>
      </li>
    </ul>
  </BaseCard>
</template>
```

- [ ] **Passo 6: `src/views/FriendliesView.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Dices, RefreshCw, Swords } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import TokenBar from '@/components/friendlies/TokenBar.vue'
import OpponentCard from '@/components/friendlies/OpponentCard.vue'
import FriendlyRanking from '@/components/friendlies/FriendlyRanking.vue'
import FriendlyHistory from '@/components/friendlies/FriendlyHistory.vue'
import { useFriendliesStore } from '@/stores/friendlies'
import { useClubStore } from '@/stores/club'
import { useFriendlies } from '@/composables/useFriendlies'
import { FRIENDLIES } from '@/config'

const friendlies = useFriendliesStore()
const club = useClubStore()
const { userOver, isLive, liveBlock, currentRankBonus, quotes, nextTokenIn, challengeBlock, open, challenge, redraw, play, watchLive } = useFriendlies()

const total = FRIENDLIES.bots.count + 1
// spinKey sobe a cada sorteio novo (a roleta da Tarefa 16 anima); spinning trava "Jogar" e "Re-sortear" durante a animação.
const spinKey = ref(0)
const spinning = ref(false)
const optionsEl = ref<HTMLElement | null>(null)

const tokenBarNext = computed(() => (friendlies.tokens < FRIENDLIES.tokens.max ? nextTokenIn.value : null))
const bonusLabel = computed(() => '+' + currentRankBonus.value.toFixed(1).replace('.', ','))
const playBlock = computed<string | null>(() => {
  if (isLive.value) return 'Amistoso em andamento'
  // Rótulo curto no botão; o motivo completo aparece no cartão "Desafio".
  if (liveBlock.value) return 'Outra partida ao vivo'
  if (friendlies.tokens < 1) return `Sem fichas — próxima em ${nextTokenIn.value}`
  return challengeBlock.value
})
const playDisabled = computed(() => !!playBlock.value || spinning.value)
const redrawDisabled = computed(() => friendlies.drawsLeft <= 0 || spinning.value || !!challengeBlock.value)

onMounted(open)

function onChallenge() {
  if (isLive.value) {
    watchLive()
    return
  }
  if (challenge()) spinKey.value++
  // Com opções já sorteadas, "Desafiar" só leva até elas (não sorteia de novo).
  if (friendlies.options) optionsEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onRedraw() {
  if (redraw()) spinKey.value++
}
</script>

<template>
  <section class="space-y-4 animate-pop">
    <TokenBar :tokens="friendlies.tokens" :max="FRIENDLIES.tokens.max" :next-in="tokenBarNext" />

    <BaseCard class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="min-w-0">
        <span class="text-[11px] font-bold uppercase text-ink-muted block">Fama</span>
        <strong class="font-score text-2xl text-gold">{{ friendlies.fame }}</strong>
      </div>
      <div class="min-w-0">
        <span class="text-[11px] font-bold uppercase text-ink-muted block">Posição</span>
        <strong class="font-score text-2xl text-ink">#{{ friendlies.rank }}</strong>
        <span class="text-xs text-ink-muted"> de {{ total }}</span>
      </div>
      <div class="min-w-0">
        <span class="text-[11px] font-bold uppercase text-ink-muted block">OVER do amistoso</span>
        <strong class="font-score text-2xl text-ink">{{ Math.round(userOver) }}</strong>
        <span class="block text-[11px] text-ink-muted">energia 100 • melhor escalação</span>
      </div>
      <div class="min-w-0">
        <span class="text-[11px] font-bold uppercase text-ink-muted block">Bônus de posição</span>
        <strong class="font-score text-2xl text-ink">{{ bonusLabel }}</strong>
        <span class="block text-[11px] text-ink-muted">no OVER dos rivais</span>
      </div>
    </BaseCard>

    <BaseCard class="space-y-3">
      <SectionTitle>
        <template #icon><Swords class="w-4 h-4 text-emeraldpro shrink-0" /></template>
        Desafio
      </SectionTitle>
      <BaseButton class="w-full sm:w-auto px-6 py-3 min-h-12 text-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed" :disabled="!isLive && !!challengeBlock" @click="onChallenge">
        <Dices class="w-4 h-4" />
        {{ isLive ? 'Acompanhar amistoso' : 'Desafiar' }}
      </BaseButton>
      <p v-if="!isLive && challengeBlock" class="text-xs text-dangerpro">{{ challengeBlock }}</p>
      <p v-else class="text-xs text-ink-muted">Sortear não gasta ficha. A ficha é gasta só quando a partida começa.</p>
      <p v-if="!isLive && liveBlock" class="text-xs text-dangerpro break-words" role="status">{{ liveBlock }}</p>
    </BaseCard>

    <div v-if="friendlies.options" ref="optionsEl" class="space-y-3 scroll-mt-24">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <OpponentCard
          v-for="opt in friendlies.options"
          :key="opt.botId"
          :option="opt"
          :quote="quotes[opt.botId]"
          :user-over="userOver"
          :disabled="playDisabled"
          :block-label="playBlock"
          @play="play"
        />
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <BaseButton variant="secondary" class="px-4 py-2.5 min-h-12 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" :disabled="redrawDisabled" @click="onRedraw">
          <RefreshCw class="w-4 h-4" />
          Re-sortear
        </BaseButton>
        <span class="text-xs" :class="friendlies.drawsLeft > 0 ? 'text-ink-muted' : 'text-amberpro font-bold'">
          {{ friendlies.drawsLeft > 0 ? `Sorteios restantes: ${friendlies.drawsLeft}` : 'Sem sorteios restantes: escolha um dos 3 adversários' }}
        </span>
      </div>
    </div>

    <FriendlyRanking :view="friendlies.ranking" :user-name="club.name" :total="total" />
    <FriendlyHistory :results="friendlies.recent" />
  </section>
</template>
```

- [ ] **Passo 7: rota em `src/router/index.ts`**

Localizar:

```ts
    { path: '/competitions', name: 'competitions', component: () => import('../views/CompetitionsView.vue') },
```

substituir por:

```ts
    { path: '/competitions', name: 'competitions', component: () => import('../views/CompetitionsView.vue') },
    { path: '/friendlies', name: 'friendlies', component: () => import('../views/FriendliesView.vue') },
```

- [ ] **Passo 8: verificar**

Rodar: `npm run build` → `✓ built in ...`.
Manual (`npm run dev`, abrir `#/friendlies` pela URL; o item de menu vem na Tarefa 17):
1. 10 fichas, fama 0, `#101 de 101`, ranking em tabela (`# · Clube · Fama · J · V · E · D · GP · GC · SG`) com top 10, linha "…" e sua linha destacada; em 360 px a tabela rola dentro do cartão com a coluna Clube fixa e a página não rola na horizontal.
2. "Desafiar" mostra 3 cartões e "Sorteios restantes: 2"; "Re-sortear" duas vezes → "Sem sorteios restantes..." e botão desabilitado; recarregar → continua igual.
3. "Jogar" → pré-jogo com o rival; voltar → as 3 opções seguem. "Iniciar" → fichas 9, partida roda, resumo "Resultado do Amistoso", "Voltar aos Amistosos" volta a `/friendlies` sem opções, com 3 sorteios; na tabela, J/V/E/D/GP/GC do usuário mudaram.
4. Cartões mostram "OVER estimado ~N" e a nota de estimativa; trocar um titular forte por um reserva em Elenco & Tática e voltar → o OVER estimado, o prêmio e a fama em jogo dos 3 cartões **não** mudam (piso da melhor escalação elegível); lesionar o melhor atleta (editando o save) → eles caem.
5. Com uma partida de liga ao vivo: "Desafiar"/"Re-sortear" funcionam; "Jogar" desabilitado com "Outra partida ao vivo" e, no cartão "Desafio", "Há uma partida da Liga ao vivo. Termine-a antes de jogar um amistoso.". Encerrada a liga, "Jogar" volta.

- [ ] **Passo 9: commit**

```bash
git add src/composables/useFriendlies.ts src/components/friendlies/TokenBar.vue src/components/friendlies/OpponentCard.vue src/components/friendlies/FriendlyRanking.vue src/components/friendlies/FriendlyHistory.vue src/views/FriendliesView.vue src/router/index.ts
git commit -m "feat(amistosos): tela, fichas, ranking e historico"
```

**Pronto quando:** build passa e o roteiro manual do passo 8 funciona de ponta a ponta.

**Não fazer:** não implementar animação aqui (Tarefa 16); não adicionar item de navegação (Tarefa 17); não gastar ficha fora de `startLiveMatch`.

---

## Tarefa 16: roleta animada

**Commit:** `feat(amistosos): roleta animada`
**Depende de:** Tarefa 15.

Spec §7 (Roleta): o resultado já está salvo antes da animação (só visual); 3 slots lado a lado (≥ 640 px) ou empilhados; cada slot rola nomes e OVERs de bots trocando a cada 60 ms e desacelerando; param em sequência aos 900, 1300 e 1700 ms; ao parar viram o `OpponentCard` com `animate-pop` e brilho dourado; `prefers-reduced-motion: reduce` revela na hora; durante a animação "Jogar" e "Re-sortear" ficam desabilitados.

**Arquivos:**
- Criar: `src/components/friendlies/OpponentRoulette.vue`
- Alterar: `src/views/FriendliesView.vue`

- [ ] **Passo 1: criar `src/components/friendlies/OpponentRoulette.vue`**

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { FriendlyBot, FriendlyOption, FriendlyQuote } from '@/types/friendlies'
import OpponentCard from './OpponentCard.vue'

const props = defineProps<{
  options: FriendlyOption[]
  /** Cotação de cada opção (por botId) com o OVER atual: o que o cartão mostra e a base dos OVERs que rolam. */
  quotes: Record<string, FriendlyQuote>
  /** Bots do ranking: nomes que rolam nos slots. */
  bots: FriendlyBot[]
  /** Sobe a cada sorteio novo: dispara a animação. Ao montar não anima (recarregar mostra as opções salvas). */
  spinKey: number
  userOver: number
  disabled: boolean
  blockLabel: string | null
}>()
const emit = defineEmits<{ play: [botId: string]; spinning: [value: boolean] }>()

const STOP_MS = [900, 1300, 1700]
// false = slot ainda rolando. Ausente (undefined) conta como revelado.
const revealed = ref<boolean[]>([])
const glow = ref<boolean[]>([])
const reels = ref<Array<{ name: string; over: number }>>([])
let timers: ReturnType<typeof setTimeout>[] = []

const rolling = computed(() => revealed.value.some((r) => r === false))

function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function randomReel(i: number) {
  const bot = props.bots[Math.floor(Math.random() * props.bots.length)]
  const opt = props.options[i]
  const base = (opt && props.quotes[opt.botId]?.oppOver) ?? 60
  return { name: bot?.name ?? '???', over: Math.max(35, Math.min(99, base + Math.floor(Math.random() * 11) - 5)) }
}

function revealAll() {
  revealed.value = props.options.map(() => true)
  glow.value = props.options.map(() => false)
  emit('spinning', false)
}

function spin() {
  clearTimers()
  const n = props.options.length
  if (!n) return
  if (prefersReducedMotion() || !props.bots.length) {
    revealAll()
    return
  }
  revealed.value = props.options.map(() => false)
  glow.value = props.options.map(() => false)
  reels.value = props.options.map((_, i) => randomReel(i))
  emit('spinning', true)
  const start = performance.now()
  props.options.forEach((_, i) => {
    const stopAt = STOP_MS[i] ?? STOP_MS[STOP_MS.length - 1] + 400 * (i - STOP_MS.length + 1)
    const tick = () => {
      const elapsed = performance.now() - start
      if (elapsed >= stopAt) {
        revealed.value[i] = true
        glow.value[i] = true
        timers.push(setTimeout(() => (glow.value[i] = false), 700))
        if (!revealed.value.some((r) => r === false)) emit('spinning', false)
        return
      }
      reels.value[i] = randomReel(i)
      // Troca a cada 60 ms no começo e desacelera até ~180 ms perto de parar.
      timers.push(setTimeout(tick, 60 + Math.round((elapsed / stopAt) * 120)))
    }
    tick()
  })
}

watch(() => props.spinKey, spin)

onBeforeUnmount(() => {
  clearTimers()
  emit('spinning', false)
})
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <template v-for="(opt, i) in options" :key="opt.botId">
      <OpponentCard
        v-if="revealed[i] !== false"
        :option="opt"
        :quote="quotes[opt.botId]"
        :user-over="userOver"
        :disabled="disabled || rolling"
        :block-label="blockLabel"
        class="animate-pop transition-shadow duration-500"
        :class="glow[i] ? 'ring-2 ring-gold shadow-[0_0_18px_rgba(251,191,36,0.45)]' : ''"
        @play="emit('play', $event)"
      />
      <div
        v-else
        class="rounded-2xl border-2 border-dashed border-gold/50 bg-night p-4 min-h-[13.5rem] flex flex-col items-center justify-center gap-2 overflow-hidden min-w-0"
        aria-hidden="true"
      >
        <span class="text-[11px] font-bold uppercase text-gold">Sorteando…</span>
        <span class="font-extrabold text-ink text-center truncate max-w-full">{{ reels[i]?.name }}</span>
        <span class="font-score text-2xl text-ink-muted">{{ reels[i]?.over }}</span>
      </div>
    </template>
    <p class="sr-only" aria-live="polite">{{ rolling ? 'Sorteando adversários' : 'Adversários sorteados' }}</p>
  </div>
</template>
```

- [ ] **Passo 2: usar a roleta em `src/views/FriendliesView.vue`**

2a. No script, localizar:

```ts
import OpponentCard from '@/components/friendlies/OpponentCard.vue'
```

substituir por:

```ts
import OpponentRoulette from '@/components/friendlies/OpponentRoulette.vue'
```

2b. No template, localizar:

```vue
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <OpponentCard
          v-for="opt in friendlies.options"
          :key="opt.botId"
          :option="opt"
          :quote="quotes[opt.botId]"
          :user-over="userOver"
          :disabled="playDisabled"
          :block-label="playBlock"
          @play="play"
        />
      </div>
```

substituir por:

```vue
      <OpponentRoulette
        :options="friendlies.options"
        :quotes="quotes"
        :bots="friendlies.bots"
        :spin-key="spinKey"
        :user-over="userOver"
        :disabled="playDisabled"
        :block-label="playBlock"
        @play="play"
        @spinning="spinning = $event"
      />
```

- [ ] **Passo 3: verificar**

Rodar: `npm run build` → `✓ built in ...`.
Manual (`npm run dev`, `#/friendlies`):
1. "Desafiar": os 3 slots rolam e param em sequência (~0,9 s, 1,3 s, 1,7 s) com brilho dourado; "Jogar" e "Re-sortear" ficam desabilitados até o último parar.
2. Recarregar no meio: as 3 opções aparecem direto (já estavam salvas).
3. DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce": "Re-sortear" revela na hora.
4. Largura 360 px: slots empilhados, sem rolagem horizontal.

- [ ] **Passo 4: commit**

```bash
git add src/components/friendlies/OpponentRoulette.vue src/views/FriendliesView.vue
git commit -m "feat(amistosos): roleta animada"
```

**Pronto quando:** build passa e os 4 itens manuais conferem.

**Não fazer:** não sortear dentro do componente (o resultado vem da store); não criar keyframes novos (usar `animate-pop` de `src/styles/main.css`).

---

## Tarefa 17: navegação, subtítulo e cabeçalho

**Commit:** `feat(amistosos): navegacao, subtitulo e cabecalho`
**Depende de:** Tarefas 7 (store) e 9 (`navIdForCompetition('friendly') = 'friendlies'`). A rota `/friendlies` vem da Tarefa 15.

Spec §4.2: item "Amistosos" (ícone `Swords`) entre "Competições" e "Scouting", badge com as fichas; subtítulo `'Fichas e ranking'`; cabeçalho com Fichas, Fama e Posição **só** em `/friendlies` (as demais rotas seguem com `club.reputation`).

**Arquivos:**
- Alterar: `src/composables/useNavigation.ts`
- Alterar: `src/composables/usePageSubtitle.ts`
- Alterar: `src/composables/useHeaderStats.ts`

- [ ] **Passo 1: `useNavigation.ts`**

1a. Localizar:

```ts
import { Award, Building2, History, LayoutDashboard, Radar, Shield, Trophy } from 'lucide-vue-next'
import { useCompetitionsStore } from '@/stores/competitions'
```

substituir por:

```ts
import { Award, Building2, History, LayoutDashboard, Radar, Shield, Swords, Trophy } from 'lucide-vue-next'
import { useCompetitionsStore } from '@/stores/competitions'
import { useFriendliesStore } from '@/stores/friendlies'
```

1b. Localizar:

```ts
  const match = useMatchStore()

  const matchPath = computed(() => (match.isMatchActive ? '/match' : '/pre-match'))
```

substituir por:

```ts
  const match = useMatchStore()
  const friendlies = useFriendliesStore()

  const matchPath = computed(() => (match.isMatchActive ? '/match' : '/pre-match'))
```

1c. Localizar (fim do item `competitions`, início do item `scouting`):

```ts
        badge: competitions.hasPendingFinal || competitions.hasPendingThirdPlace ? '!' : null
      },
      {
        id: 'scouting',
```

substituir por:

```ts
        badge: competitions.hasPendingFinal || competitions.hasPendingThirdPlace ? '!' : null
      },
      {
        id: 'friendlies',
        label: 'Amistosos',
        shortLabel: 'Amist.',
        icon: Swords,
        path: '/friendlies',
        badge: friendlies.tokens > 0 ? friendlies.tokens : null
      },
      {
        id: 'scouting',
```

(O `live` do item já funciona: `navIdForCompetition('friendly')` devolve `'friendlies'`. O "Voltar" do pré-jogo/partida do amistoso usa `matchOwner`, que agora encontra este item.)

- [ ] **Passo 2: `usePageSubtitle.ts`**

Localizar:

```ts
  '/competitions': 'Copas e finais',
```

substituir por:

```ts
  '/competitions': 'Copas e finais',
  '/friendlies': 'Fichas e ranking',
```

- [ ] **Passo 3: `useHeaderStats.ts`**

3a. Localizar:

```ts
import { useSquadStore } from '@/stores/squad'
```

substituir por:

```ts
import { useSquadStore } from '@/stores/squad'
import { useFriendliesStore } from '@/stores/friendlies'
import { FRIENDLIES } from '@/config'
```

3b. Localizar:

```ts
  const match = useMatchStore()
  const { opponentFor, labelFor } = useMatchSimulation()
```

substituir por:

```ts
  const match = useMatchStore()
  const friendlies = useFriendliesStore()
  const { opponentFor, labelFor } = useMatchSimulation()
```

3c. Localizar:

```ts
      case '/competitions':
        return [
```

substituir por:

```ts
      case '/friendlies':
        // A fama só aparece aqui; as demais telas seguem com a reputação (fama e reputação são separadas).
        return [
          { label: 'Fichas', value: `${friendlies.tokens}/${FRIENDLIES.tokens.max}` },
          { label: 'Fama', value: friendlies.fame },
          { label: 'Posição', value: `#${friendlies.rank} de ${FRIENDLIES.bots.count + 1}` }
        ]
      case '/competitions':
        return [
```

- [ ] **Passo 4: verificar**

Rodar: `npm run build` → `✓ built in ...`.
Manual (`npm run dev`, largura ≥ 768 px): Sidebar mostra "Amistosos" entre "Competições" e "Scouting" com badge `10`; em `/friendlies` o título é "Amistosos", subtítulo "Fichas e ranking" e os chips do cabeçalho são Fichas/Fama/Posição; em `/club` o chip "Reputação" continua igual; com amistoso ao vivo e saindo da partida, o item mostra "AO VIVO".

- [ ] **Passo 5: commit**

```bash
git add src/composables/useNavigation.ts src/composables/usePageSubtitle.ts src/composables/useHeaderStats.ts
git commit -m "feat(amistosos): navegacao, subtitulo e cabecalho"
```

**Pronto quando:** build passa e o roteiro manual confere.

**Não fazer:** não mexer em `BottomNav.vue` nem acrescentar `primary` (Tarefa 18); não trocar a reputação pela fama em nenhuma outra rota.

---

## Tarefa 18: BottomNav com 4 itens e menu "+"

**Commit:** `feat(layout): bottomnav com 4 itens e menu +`
**Depende de:** Tarefa 17 (mesmo arquivo `useNavigation.ts`, item `friendlies`).

Spec §7 (BottomNav, decisão do dono): ordem **Início · Liga · [+] · Copas · Elenco**. Principais (`primary: true`): `dashboard`, `league`, `competitions`, `squad`. No "+" (`primary: false`), na ordem de `navItems`: Amistosos, Scouting, Partidas, Clube. "+" com ícone `Plus` e rótulo "Mais"; painel que sobe da base, fecha ao escolher item, ao tocar fora, com `Esc` e ao trocar de rota. Acessibilidade: `aria-label="Mais opções"`, `aria-expanded`, `aria-controls`; painel `role="dialog"` com `aria-label="Mais opções de navegação"`; foco no primeiro item ao abrir e de volta no "+" ao fechar; alvos ≥ 48 px. Estado do "+": dourado se o item ativo está no menu (ou com o painel aberto); ponto "ao vivo" se algum item do menu está ao vivo; badge "!" se algum item do menu tem badge, **exceto** as fichas de amistoso. Cabe em 360 px com `grid-cols-5`. A Sidebar continua usando `navItems` inteiro.

**Arquivos:**
- Alterar: `src/composables/useNavigation.ts`
- Substituir: `src/components/layout/BottomNav.vue`
- Criar: `src/components/layout/BottomNavMore.vue`

- [ ] **Passo 1: `NavItem.primary`**

Em `src/composables/useNavigation.ts`, localizar:

```ts
  active: boolean
  live: boolean
}
```

substituir por:

```ts
  active: boolean
  live: boolean
  /** Item fixo da BottomNav (4 telas de uso diário); os demais ficam no menu "+". */
  primary: boolean
}
```

- [ ] **Passo 2: marcar cada item**

No array `base`, acrescentar `primary` em cada item:

- `dashboard`: trocar `{ id: 'dashboard', label: 'Início', shortLabel: 'Início', icon: LayoutDashboard, path: '/', badge: null },` por `{ id: 'dashboard', label: 'Início', shortLabel: 'Início', icon: LayoutDashboard, path: '/', badge: null, primary: true },`
- `league`: trocar `{ id: 'league', label: 'Liga', shortLabel: 'Liga', icon: Trophy, path: '/league', badge: league.serieMeta.code },` por `{ id: 'league', label: 'Liga', shortLabel: 'Liga', icon: Trophy, path: '/league', badge: league.serieMeta.code, primary: true },`
- `competitions`: trocar a linha `badge: competitions.hasPendingFinal || competitions.hasPendingThirdPlace ? '!' : null` por:

```ts
        badge: competitions.hasPendingFinal || competitions.hasPendingThirdPlace ? '!' : null,
        primary: true
```

- `friendlies`: trocar a linha `badge: friendlies.tokens > 0 ? friendlies.tokens : null` por:

```ts
        badge: friendlies.tokens > 0 ? friendlies.tokens : null,
        primary: false
```

- `scouting`: trocar a linha `badge: scouting.visibleReports.length || null` por:

```ts
        badge: scouting.visibleReports.length || null,
        primary: false
```

- `squad`: trocar a linha `badge: market.incomingOffers.length || null` por:

```ts
        badge: market.incomingOffers.length || null,
        primary: true
```

- `matches`: trocar `{ id: 'matches', label: 'Partidas', shortLabel: 'Jogos', icon: History, path: '/matches', badge: null },` por `{ id: 'matches', label: 'Partidas', shortLabel: 'Jogos', icon: History, path: '/matches', badge: null, primary: false },`
- `club`: trocar `{ id: 'club', label: 'Clube', shortLabel: 'Clube', icon: Building2, path: '/club', badge: null }` por `{ id: 'club', label: 'Clube', shortLabel: 'Clube', icon: Building2, path: '/club', badge: null, primary: false }`

- [ ] **Passo 3: listas filtradas**

Localizar:

```ts
  const currentPageTitle = computed(() => {
```

substituir por:

```ts
  // BottomNav: 4 itens fixos + menu "+" com o resto (a Sidebar usa navItems inteiro).
  const primaryNavItems = computed(() => navItems.value.filter((i) => i.primary))
  const moreNavItems = computed(() => navItems.value.filter((i) => !i.primary))

  const currentPageTitle = computed(() => {
```

e localizar:

```ts
  return { navItems, currentPageTitle, isMatchRoute, matchOwner, goToMatchTab, goTo }
```

substituir por:

```ts
  return { navItems, primaryNavItems, moreNavItems, currentPageTitle, isMatchRoute, matchOwner, goToMatchTab, goTo }
```

- [ ] **Passo 4: criar `src/components/layout/BottomNavMore.vue`**

```vue
<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { NavItem } from '@/composables/useNavigation'

const props = defineProps<{ open: boolean; items: NavItem[] }>()
const emit = defineEmits<{ close: []; select: [item: NavItem] }>()
const panel = ref<HTMLElement | null>(null)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

// Aberto: Esc fecha e o foco vai ao primeiro item.
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onKey)
      await nextTick()
      panel.value?.querySelector<HTMLButtonElement>('button')?.focus()
    } else document.removeEventListener('keydown', onKey)
  }
)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div v-if="open" class="md:hidden fixed inset-0 z-30 bg-night/60" aria-hidden="true" @click="emit('close')"></div>
  <div
    v-if="open"
    id="bottom-nav-more"
    ref="panel"
    role="dialog"
    aria-label="Mais opções de navegação"
    class="md:hidden fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 bg-surface border border-borderline rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] p-2 animate-pop"
  >
    <ul class="grid grid-cols-1 gap-1">
      <li v-for="item in items" :key="item.id">
        <button
          type="button"
          @click="emit('select', item)"
          :class="[
            'w-full min-h-12 flex items-center justify-between gap-3 px-3.5 rounded-xl text-sm font-semibold transition-colors',
            item.active ? 'bg-emeraldpro text-night' : 'text-ink hover:bg-subtle'
          ]"
        >
          <span class="flex items-center gap-3 min-w-0">
            <component :is="item.icon" class="w-5 h-5 shrink-0" />
            <span class="truncate">{{ item.label }}</span>
          </span>
          <span class="flex items-center gap-2 shrink-0">
            <span
              v-if="item.live"
              :class="[
                'flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full',
                item.active ? 'bg-night text-emeraldpro-hover' : 'bg-emeraldpro-soft text-emeraldpro-hover'
              ]"
            >
              <span class="relative flex w-1.5 h-1.5">
                <span class="absolute inline-flex w-full h-full rounded-full bg-emeraldpro opacity-75 animate-ping"></span>
                <span class="relative inline-flex w-1.5 h-1.5 rounded-full bg-emeraldpro"></span>
              </span>
              AO VIVO
            </span>
            <span
              v-if="item.badge"
              :class="[
                'text-[11px] font-bold px-2 py-0.5 rounded-full',
                item.active ? 'bg-night/25 text-night' : 'bg-emeraldpro-soft text-emeraldpro-hover'
              ]"
            >{{ item.badge }}</span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
```

- [ ] **Passo 5: substituir `src/components/layout/BottomNav.vue` inteiro**

```vue
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import { useNavigation, type NavItem } from '@/composables/useNavigation'
import BottomNavMore from './BottomNavMore.vue'

const route = useRoute()
const { primaryNavItems, moreNavItems, goTo } = useNavigation()
const open = ref(false)
const plusBtn = ref<HTMLButtonElement | null>(null)

// Início · Liga · [+] · Copas · Elenco
const left = computed(() => primaryNavItems.value.slice(0, 2))
const right = computed(() => primaryNavItems.value.slice(2, 4))
const moreActive = computed(() => moreNavItems.value.some((i) => i.active))
const moreLive = computed(() => moreNavItems.value.some((i) => i.live))
// Fichas de amistoso não marcam o "+" (senão ele ficaria sempre marcado).
const moreBadge = computed(() => moreNavItems.value.some((i) => i.id !== 'friendlies' && !!i.badge))

const cellClass = 'flex flex-col items-center justify-center min-h-12 min-w-0 px-px py-1 rounded-lg text-[11px] leading-tight font-bold transition-colors relative'

function close(returnFocus = true) {
  if (!open.value) return
  open.value = false
  if (returnFocus) nextTick(() => plusBtn.value?.focus())
}

function toggle() {
  if (open.value) close()
  else open.value = true
}

function choose(item: NavItem) {
  close(false)
  goTo(item)
}

// Trocar de rota (por qualquer caminho) fecha o painel.
watch(() => route.fullPath, () => close(false))
</script>

<template>
  <BottomNavMore :open="open" :items="moreNavItems" @close="close()" @select="choose" />
  <nav class="md:hidden fixed bottom-0 inset-x-0 bg-night border-t border-borderline z-40 grid grid-cols-5 pt-1 px-0.5 pb-[calc(0.25rem+env(safe-area-inset-bottom))]">
    <button
      type="button"
      v-for="item in left"
      :key="item.id"
      @click="goTo(item)"
      :class="[cellClass, item.active ? 'text-gold' : 'text-ink-muted']"
    >
      <component :is="item.icon" class="w-5 h-5 mb-0.5 shrink-0" />
      <span class="truncate max-w-full">{{ item.shortLabel }}</span>
      <span
        v-if="item.badge"
        class="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-emeraldpro text-night text-[10px] leading-4 font-extrabold text-center"
      >{{ item.badge }}</span>
      <span v-if="item.live" class="absolute top-0.5 left-1 flex w-2.5 h-2.5" aria-label="Ao vivo">
        <span class="absolute inline-flex w-full h-full rounded-full bg-emeraldpro opacity-75 animate-ping"></span>
        <span class="relative inline-flex w-2.5 h-2.5 rounded-full bg-emeraldpro"></span>
      </span>
    </button>

    <button
      ref="plusBtn"
      type="button"
      aria-label="Mais opções"
      :aria-expanded="open"
      aria-controls="bottom-nav-more"
      @click="toggle"
      :class="[cellClass, moreActive || open ? 'text-gold' : 'text-ink-muted']"
    >
      <Plus class="w-5 h-5 mb-0.5 shrink-0 transition-transform" :class="open ? 'rotate-45' : ''" />
      <span class="truncate max-w-full">Mais</span>
      <span
        v-if="moreBadge"
        class="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-emeraldpro text-night text-[10px] leading-4 font-extrabold text-center"
      >!</span>
      <span v-if="moreLive" class="absolute top-0.5 left-1 flex w-2.5 h-2.5" aria-label="Ao vivo">
        <span class="absolute inline-flex w-full h-full rounded-full bg-emeraldpro opacity-75 animate-ping"></span>
        <span class="relative inline-flex w-2.5 h-2.5 rounded-full bg-emeraldpro"></span>
      </span>
    </button>

    <button
      type="button"
      v-for="item in right"
      :key="item.id"
      @click="goTo(item)"
      :class="[cellClass, item.active ? 'text-gold' : 'text-ink-muted']"
    >
      <component :is="item.icon" class="w-5 h-5 mb-0.5 shrink-0" />
      <span class="truncate max-w-full">{{ item.shortLabel }}</span>
      <span
        v-if="item.badge"
        class="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-emeraldpro text-night text-[10px] leading-4 font-extrabold text-center"
      >{{ item.badge }}</span>
      <span v-if="item.live" class="absolute top-0.5 left-1 flex w-2.5 h-2.5" aria-label="Ao vivo">
        <span class="absolute inline-flex w-full h-full rounded-full bg-emeraldpro opacity-75 animate-ping"></span>
        <span class="relative inline-flex w-2.5 h-2.5 rounded-full bg-emeraldpro"></span>
      </span>
    </button>
  </nav>
</template>
```

- [ ] **Passo 6: verificar**

Rodar: `npm run build` → `✓ built in ...`.
Manual (`npm run dev`, DevTools no modo dispositivo com 360 px de largura):
1. Barra com Início · Liga · Mais · Copas · Elenco, sem rolagem horizontal.
2. "Mais" abre o painel com Amistosos (badge com fichas), Scouting, Partidas, Clube; foco no primeiro item.
3. Fecha com `Esc` (foco volta ao "Mais"), tocando fora, e escolhendo um item (navega).
4. Em `/club`, o "Mais" fica dourado. Com amistoso ao vivo fora da tela da partida, ponto "ao vivo" no "Mais". Só as fichas não acendem o "!".
5. Largura ≥ 768 px: BottomNav some, Sidebar mostra todos os 8 itens.

- [ ] **Passo 7: commit**

```bash
git add src/composables/useNavigation.ts src/components/layout/BottomNav.vue src/components/layout/BottomNavMore.vue
git commit -m "feat(layout): bottomnav com 4 itens e menu +"
```

**Pronto quando:** build passa e os 5 itens manuais conferem.

**Não fazer:** não mudar a Sidebar; não reordenar `navItems` (a ordem do menu "+" vem dela); não usar biblioteca de modal.

---

## Tarefa 19: verificação manual e ajustes

**Commit (só se houver correção):** `chore(amistosos): verificacao manual e ajustes`
**Depende de:** Tarefas 1–18 (inclui 6b e 13b).

Só correções: nada de funcionalidade nova, nada de refatoração. Se não houver o que corrigir, **não** faça commit vazio; relate "roteiro sem falhas".

**Arquivos:** os que precisarem de correção (listar no relatório).

- [ ] **Passo 1: checagens automáticas**

Rodar: `node scripts/verify-friendlies/run.mjs` → `OK` em ranking, tokens, fame, draw, bots, provider, store, strength.
Rodar: `npm run build` → `✓ built in ...`.

- [ ] **Passo 2: roteiro manual (spec §9), com `npm run dev`**

Para editar o save: DevTools → Application → Local Storage → chave `super_xi_full_save_v7` (campo `friendlies`). Partida ao vivo: chave `super_xi_live_match_v1`.

1. **Fichas:** jogar 3 amistosos (ou só iniciar e terminar), conferir 7/10 e o contador "Próxima ficha em mm:ss"; editar `friendlies.tokenTickAt` para 30 min atrás, recarregar → +5 (teto 10).
2. **Energia:** baixar a energia do elenco (jogar partidas de liga) → "OVER do amistoso" igual ao OVER com energia 100; energia dos atletas igual antes e depois do amistoso; recuperação natural continua andando com o amistoso ao vivo.
3. **Lesão:** lesão sofrida no amistoso aparece no Elenco e tira o atleta da liga; lesões antigas não descontam jogo no amistoso.
4. **Cartões e estatísticas:** expulsão no amistoso não gera suspensão nem amarelo acumulado; artilharia/assistências/jogos da temporada e `matchHistory` (tela Partidas) iguais antes e depois.
5. **Fama:** vitória/empate/derrota batem com os valores do pré-jogo (V/E/D, recalculados com a escalação que foi a campo); derrota com fama 0 fica em 0; com fama 2, perder tira só 2 e o rival ganha só 2.
5b. **Farm de OVER:** escalar reservas ou titulares fora de posição e abrir `/friendlies` e o pré-jogo → OVER do rival, prêmio e fama em jogo **não** caem (piso da melhor escalação elegível) e o pré-jogo mostra o aviso âmbar "abaixo da melhor possível"; iniciar assim e usar "Reorganizar" ao vivo → fama e prêmio no fim batem com o mostrado antes do apito. Lesionar o melhor atleta (editar `injury` no save) → o OVER efetivo cai.
5c. **Tabela:** colunas Fama, J, V, E, D, GP, GC, SG; depois de um amistoso, as estatísticas do usuário e do rival mudam; reabrir `/friendlies` horas depois aumenta o J dos bots (1 por hora, até 72); com fama empatada, quem tem mais vitórias fica acima.
6. **Retomada:** recarregar no meio do amistoso retoma do mesmo minuto; apagar `super_xi_live_match_v1` e recarregar → toast "O amistoso anterior foi interrompido e não contou.", ficha não volta, fama e dinheiro iguais.
7. **Save:** remover o campo `friendlies` do save e recarregar → estado novo (10 fichas, fama 0, #101); "Nova carreira" (Clube) zera os amistosos.
8. **Roleta:** com `prefers-reduced-motion: reduce` revela na hora; 360 px sem rolagem horizontal.
9. **Sorteios:** Desafiar + 2 re-sorteios → "Sorteios restantes: 0" e botão desabilitado; sair, recarregar e voltar → continua 0 com as mesmas opções; iniciar a partida → o próximo desafio volta a 3.
10. **Reputação:** anotar `club.reputation` (chip "Reputação" em `/club`), jogar vitória e derrota no amistoso → igual; jogar uma partida de liga → a fama (em `/friendlies`) não muda.
11. **BottomNav em 360 px:** 4 itens + "+", sem rolagem; "+" abre e fecha (toque fora, `Esc`, escolher item), foco volta ao "+"; ponto "ao vivo" no "+" com amistoso rodando.
12. **Limite diário:** editar `friendlies.paidWins` para `{ "day": <dayStart de hoje>, "count": 5 }` (no console: `new Date().setHours(0,0,0,0)`), recarregar, sortear → cartões com "R$ 0 — limite diário de vitórias pagas atingido"; vencer → resumo com o aviso de limite.
13. **Partidas paralelas:** iniciar um amistoso e, com ele rodando, iniciar uma partida de liga → permitido (a decisão do dono bloqueia só o inverso); as duas aparecem no `MatchSwitcher`; a energia congela só por causa da liga.
14. **Amistoso bloqueado com outra partida ao vivo:** com uma partida de liga rodando (ou pausada na gaveta), em `/friendlies` sortear funciona, "Jogar" fica desabilitado com "Outra partida ao vivo" e o motivo completo aparece no cartão "Desafio"; abrir o pré-jogo do amistoso pelo `MatchSwitcher` → "Iniciar" desabilitado com aviso vermelho; nenhuma ficha gasta. Encerrada a liga, tudo volta.
15. **Gaveta sem cansaço:** com o elenco cansado (energia < 60), no amistoso o rótulo "OVER x → y na vaga" não desconta o cansaço, "Recomendar" não escolhe um reserva só por estar descansado e "Reorganizar" compara forças sem cansaço. Na liga, tudo como antes.
16. **Aviso de recuperação no Elenco:** com só um amistoso ao vivo, "Recuperação natural: ... próximo ponto em m:ss" (não "pausada"); com partida de liga ao vivo, "pausada".
17. **Pré-jogo do amistoso:** titular lesionado → aviso "está lesionado ou suspenso" (nunca "suspenso na Amistoso"); menos de 11 titulares → "Iniciar" desabilitado e aviso "Escalação incompleta".
18. **Desfazer o apito e encerramento idempotente:** cobertos pela checagem `store` do passo 1 (`cancelBegin`, motivos de `beginMatch`, `settle` repetido devolve `null`); a falha de rota não se reproduz à mão sem mexer no código.

- [ ] **Passo 3: corrigir o que falhar**

Para cada falha: localizar a causa, corrigir no menor trecho possível, rodar de novo `npm run build` e o item do roteiro que falhou.

- [ ] **Passo 4: commit (se houve correção)**

```bash
git add <arquivos corrigidos, um a um>
git commit -m "chore(amistosos): verificacao manual e ajustes"
```

**Pronto quando:** checagens automáticas OK, build passa e os 18 itens do roteiro (mais 5b e 5c) conferem (ou as falhas foram corrigidas e reverificadas).

**Não fazer:** não alterar `package.json`/versão; não fazer merge na `develop` nem push (a integração é decisão do dono do produto); não adicionar test runner.

---

## Autorrevisão (feita ao escrever o plano)

- **Cobertura da spec:** regras 1–12 (§2) → Tarefas 2, 4, 7, 8, 10–13, 15; modelo e persistência (§5) → 1, 7; fórmulas (§6) → 2–5; UI (§7) → 14–18; casos de borda (§8) → 7, 11, 13, 15, 19; testes (§9) → verificador das Tarefas 1–7 e roteiro da 19; tarefas da §10 → mesma numeração; decisões da §11 → respeitadas (fama separada da reputação, 3 sorteios, BottomNav 4 + "+").
- **Revisão do lote 1-7 (Tarefa 6b):** nomes novos `FriendlyStats`, `FriendlyStanding`, `FriendlyQuote`, `FriendlyReport`, `FriendlyRankingRow`; `emptyStats`/`sanitizeStats`/`addResult`/`goalDiff`/`compareStanding` (6b.1); `unit`/`safeRng`/`randIntWith`, `simScore` (6b.2); `drawOffset`/`opponentOverFrom`/`quoteOption`/`rankPool`, store `quote`, `stats`, `standing` e `draw()` sem argumentos (6b.3). As Tarefas 11, 14, 15, 16 e 19 foram ajustadas a essa API.
- **Revisão do bloco 8-13 (Tarefa 13b):** nomes novos `isFriendlyEligible`, `friendlyStrengthOf`, `FriendlyStrength`, `squad.friendlyStrength` (13b.1); `FriendlyBeginResult`, `cancelBegin` (13b.2); `friendlyLiveBlock` (13b.3). As Tarefas 14, 15 e 19 foram ajustadas: PreMatch e tela usam `friendlyStrength.over` e `friendlyLiveBlock`; roteiro manual com os itens 14–18 e a checagem `strength`.
- **Consistência de nomes:** `userRank`/`rankedBots` (1), `regenTokens`/`spendToken`/`msToNextToken`/`formatTokenCountdown` (2), `expectedScore`/`fameDelta`/`applyFame`/`outcomeFromScore`/`signedFame` (3), `rankBonus`/`opponentOver`/`friendlyPrize`/`drawOptions` (4), `allBotNames`/`generateBots`/`simulateBots`/`rankingView` (5), `createLocalBotProvider` (6), store `useFriendliesStore` com `rank`, `ranking`, `drawsLeft`, `selectedOption`, `msToNext`, `paidWinsLeft`, `regenTokens`, `refresh`, `draw`, `select`, `beginMatch`, `settle`, `resolveOrphan`, `toSave`, `fromSave`, `reset` (7), `freshTeamStrength`/`friendlyEligibleCount` (10), `lineupShort` (11), `useFriendlies` (15).

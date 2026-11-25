# Revisão T14: branch `feature/copa-dos-continentes`

Data: 2026-11-25. Revisor: Opus (somente leitura em `src/`). Base: `develop`. 15 commits (T0 a T13), 51 arquivos, +3965/−74.

## Veredito

**Pronto para merge com ressalvas.** Nenhum bloqueante. Há 3 achados importantes (um aviso com número errado, uma promessa de interface
que não existe e a decisão do corte do ranking, que depende do dono) e alguns nits. O corte do ranking **não** deve ir para 11 com base na T13
(ver seção 8).

## Verificação executada

| Comando | Resultado |
|---|---|
| `git diff develop..HEAD --stat` | 51 arquivos; `src/` só nos arquivos previstos pelo plano |
| `npm run build` | OK (só o aviso de chunk acima de 500 kB, que já existia) |
| `t40` a `t49` | todos OK; `t40` 1 = regressão byte a byte do continental e da Taça (sementes 1 a 20) OK |
| `t23-atletas` | `T23 OK` (h6: 25 chaves, 24 + `mundialState`) |
| Diagnóstico extra (cópia instrumentada do `calib-carreira.mjs` no scratchpad, sem tocar no repositório) | `maximoRot:12,forteRot:12` com log de cada `SeasonEcoRecord` (seção 8) |

O `--check` completo (cerca de 32 min) não foi refeito; vale o `CHECK OK` do relatório T13.

## Achados

### Bloqueantes

Nenhum.

### Importantes

**I1. Aviso do save antigo anuncia a edição na temporada atual quando ela é múltipla de 4.**
`src/composables/usePersistence.ts:243`: `next = Math.ceil(club.season / MUNDIAL_EVERY) * MUNDIAL_EVERY`.
- Cenário: save antigo na temporada 8 (ou 4, 12...). A edição só é aberta na virada (`useSeason.ts:208`), então nessa temporada não haverá
  Copa dos Continentes, mas o aviso diz "Próxima edição na temporada 8". O jogador espera uma competição que não vem.
- O `t46` 1f valida exatamente esse texto errado (save na temporada 4, aviso "temporada 4").
- Correção: usar `cycleTarget(club.season)` de `src/utils/competitions/mundialCycle.ts` (já trata o caso `season % 4 === 0` → `season + 4`)
  e ajustar o `t46` 1f para esperar "temporada 8".

**I2. Edição sem o usuário: o campo é descartado e o painel promete notícias que não existem.**
`src/stores/modules/competitions/mundial.ts:116-118` zera o estado quando o usuário não tem vaga; nada simula o torneio, nada grava o campeão.
`src/components/competitions/MundialPanel.vue:79` diz "os 8 grupos e o campeão saem nas notícias da virada", e o `lastChampion` (linha 36)
só encontra pódio de edições que o usuário jogou.
- Cenário: típico na A (classifica em 0% pela T13) chega à T8, abre a aba "Continentes", lê a promessa; na virada não aparece nada.
- O plano (seção 8) pede "Edição sem o usuário: grupos e campeão como notícia".
- Correção sugerida (pequena): no `openMundialEdition` sem vaga, simular os grupos e a chave (`simulateGroupRound` + `completeBracket` com o
  `rng`) e guardar só o pódio (`club.archivePodiums`) e, se quiser, os grupos finais num campo leve; o painel mostra o campeão e os grupos.
  Alternativa mínima: trocar o texto da linha 79 para não prometer notícia. Decisão do dono (pergunta 2).

**I3. Corte do Ranking Condor: a medição da T13 não serve para decidir (ver seção 8).** Manter 16 até medir com o perfil certo.

**I4. Cobertura de testes fraca nos pontos de integração da partida.**
- `docs/calibracao/t44-mundial-match.mjs` checks 8, 9 e 12 só fazem busca de texto no fonte de `useMatchSimulation.ts`; o 11 testa uma fórmula
  reescrita no próprio teste, não o `settleMatch`. Nenhum teste chama `prepareMatch('mundial')` → `concludeMatch` → `applyMundialResult`.
- Atenuante real: o `calib-carreira.mjs` da T13 joga as partidas do Mundial pelo fluxo real (`pickComp` com `'mundial'`, prêmio lido do
  `history`), sem erro nem NaN em centenas de edições. Ou seja, o caminho funciona; só não há asserção dele.
- Revisei à mão: `rawIsHomeFor('mundial') = false` (`useMatchSimulation.ts:146`), `homeBonusApplies` não inclui `mundial`, então nem o usuário
  nem o rival ganham +3 (`useMatchSimulation.ts:236-241`); a bilheteria usa `isHome` → 40% (`useEconomy.ts:18`).
- `t46` não joga rodadas antes do save (4b só confere o estado logo após a abertura).
- Correção sugerida (teste, não bloqueia): um `t44b` com pinia real que abre uma edição, chama `prepareMatch('mundial')`, simula os ticks,
  `concludeMatch()`, e confere `match.matchState`/`lastMatchSummary.ticket === round(projectedStadiumIncome × 0,4)`, `groupRound` avançado e
  `mundialOpponent` trocado; e um `t46` que joga 2 rodadas antes do save→load→save.

### Nits

- **N1.** `src/composables/useMatchSimulation.ts:521`: nos pênaltis, `first: isHomeFor(comp) ? 'user' : 'opp'` faz o rival bater primeiro em
  todo mata-mata do Mundial. Em campo neutro, sortear (`Math.random() < 0.5`).
- **N2.** `src/config/competitions.ts:47`: `{ id: 'casa', name: 'Brasil', user: true }` usa um nome real. Hoje não aparece na interface
  (todos os usos trocam por "Seu país"), mas a regra do plano é nenhum nome real; trocar por `'Seu país'`.
- **N3.** `src/utils/competitions/mundialField.ts:76`: etiqueta "Campeão da Condor de Ouro" sem "Copa"; o resto do jogo usa
  "Copa Condor de Ouro".
- **N4.** `useSeason.ts:106` e `:118`: os sorteios do campeão da A (usuário fora dela) e do campeão da outra copa continental usam
  `Math.random` direto. **Não contaminam o Mundial nem a recarga**: os dois são gravados no `SeasonEcoRecord` na mesma virada e o campo do
  Mundial lê o registro gravado; recarregar não muda nada. Efeitos: (a) o sorteio do campeão da A é uniforme no pool, então um clube fraco da A
  pode virar sede ou rival da Supercopa; (b) os testes não conseguem fixar esses valores. Sugestão: `startNewSeason` aceitar um `rng`
  opcional (padrão `Math.random`) e sortear o campeão da A ponderado pelo `basePower`.
- **N5.** `src/composables/usePersistence.ts:52`: a reconstrução põe `division: currentDivision` em temporadas sem título de série. Hoje é
  inofensivo (`leagueRank` fica `null`, então não pontua nem vira sede), mas o dado é falso; usar `division: 0` ou um campo "desconhecida".
- **N6.** Selo de pendência do Mundial só existe na aba "Continentes" (`CompetitionsView.vue:57`); o item "Competições" da navegação
  (`useNavigation.ts:48`) só acende para final ou 3º lugar. Igual ao continental de hoje, então é coerente, mas o plano (T7) citava o selo.
- **N7.** T15: `rivalOrigin` é gravado no save com "Taça Cacique" (`finalsRivals.ts`); o `NAME_MIGRATION_MAP` da T15 precisa cobrir
  `supercupState.rivalOrigin`, além do `NODE_LABEL` de `MundialCycleCard.vue:14-26`.
- **N8.** `podiumArchive` continua com 12 entradas e agora recebe também o pódio do Mundial; com 3 pódios por temporada o arquivo cobre
  cerca de 4 temporadas, no limite do ciclo. Não afeta a classificação (o `ecoRecords` é a fonte principal; o pódio é só reserva).
- **N9.** `src/config/competitions.ts:13`: `import type` no meio do arquivo; mover para o topo.

## Respostas aos focos pedidos

**(1) Regressão do continental e das chaves.** Sem regressão. `groups.ts` só reexporta; `simulateMatchScore`/`resolveTie`/`simulateTie`
ganharam parâmetros com padrão igual ao comportamento antigo; `continental.ts` não foi tocado; `t40` 1 confere byte a byte. Save: 25 chaves de
topo (`t23` h6 e `t46` 4d); `ecoRecords` fica dentro de `club`.

**(2) Ordem da virada e determinismo.** Ordem correta em `useSeason.ts:78-223`: W.O. de Taça e continental → leitura de liga, copas e
finais → `recordEcoSeason` (1) → `finishMundialForSeason` e arquivo do pódio (2) → `resetMundial` (3) → troca de temporada, liga, Taça,
continental → `buildMundialField` só em `season % 4 === 0`, já com o registro da temporada que acabou (4) → Supercopa e Recopa com rival
real (5). O registro é lido antes de qualquer redefinição. Determinismo: ver N4; os sorteios ficam gravados, não há contaminação.

**(3) Não duplicação e o suspeito "clube novo na Série A ganha ranking por default".** Não é bug de classificação do usuário:
- `ecoPoints` (`rankingCondor.ts:12-25`) só dá pontos de Série A com `division === 1` e `leagueRank` 1 a 6 (ou título). Um clube recém-chegado à
  A no meio da tabela soma 0 de liga.
- `userMundialEntry` exige `>= cutoff` no ciclo; o `ecoRecords` vazio (save novo) dá 0; a reconstrução deixa `leagueRank: null`.
- O único "default" de colocação é antigo: `userLeagueRank = row?.rank || 1` (`getters.ts:26`), que só valeria se o usuário sumisse da
  tabela da A, o que não acontece (a lista sempre tem `id: 'user'`). O mesmo default já decide a vaga da Ouro hoje.
- O que existe, e é desenho do plano (2.2, item 4), é a IA: as vagas de ranking que sobram vão aos clubes mais fortes de
  `LEAGUE_CLUBS_POOL[1]` e `CONTINENTAL_RIVALS` por OVER mais ruído (`mundialField.ts:135-145`), sem pontos de ranking. Um clube da A sem
  campanha pode entrar "por default". Aceitável; se o dono quiser, dá para gravar pontos fictícios da IA, mas fica fora da Fase 8.
- Não duplicação: chave por nome normalizado e `__user` para o usuário (`mundialField.ts:62-68`); ordem Ouro → sede → ranking; sul-americanas
  limitadas a 6. Coberto pelo `t42` (300 sementes) e pelo `t48` 2d (500 viradas, 290 edições).

**(4) Reconstrução idempotente.** Roda só com `p.club.ecoRecords` ausente (`usePersistence.ts:171`) e o `saveGame` logo depois grava o campo
(mesmo vazio, `[]`), então a segunda carga não reconstrói nem repete o aviso (`t46` 2a a 2c). Só temporadas encerradas. Ressalva: I1.

**(5) `LIVE_MATCH_KEY` e cadeias `comp ===`.** `saveLiveMatch`/`restoreLiveMatches` percorrem `COMPETITIONS_ORDER`, que já tem `'mundial'`;
`isCompetitionPlayable('mundial')` filtra a retomada. Grep amplo: os `Record<MatchCompetition, …>` (`match.ts`, `MatchSwitcher.vue`,
`suspension.ts`, `matchResult.ts`) têm a entrada; `rawIsHomeFor`, `rawOpponentFor`, `labelFor`, `needsShootout`, `concludeMatch`,
`isCompetitionPlayable`, `hasPendingThirdPlace`, `CUP_COMPETITIONS`, `navIdForCompetition` (cai em `competitions`), `resolvePrematchCompetition`
(usa `COMPETITIONS_ORDER`) cobrem o caso. Nenhum caso cai no rival da liga. `HistoryView` lê `COMPETITION_NAMES`, já com o Mundial.

**(6) Finais com rival real.** `finalsRivals.ts` segue a seção 3: liga → campeão da Taça; Taça → campeão da A; as duas → vice da Taça;
Ouro ↔ Prata. O rival nunca é o usuário (o vice da Taça e o vice da A excluem `isUser`; o campeão da outra copa é sorteado de
`CONTINENTAL_RIVALS`). Prêmios intactos (`t47` 9 e 10). Etiquetas: N3 e N7.

**(7) Cobertura.** Ver I4.

## 8. T13: forte rotativo em 35% a 37,5% com corte 16

**Diagnóstico: o problema é o perfil de teste, não o corte nem o desenho dos pontos.**

Rodei uma cópia instrumentada do script (log de cada `SeasonEcoRecord`). Em 12 temporadas de `forteRot` e de `maximoRot`:
- `ouro` foi `null` em **todas** as temporadas dos dois perfis; o continental, quando houve, foi sempre Prata (vindo da Taça).
- Causa: na rotação D, C, B, A, a temporada na A vem logo depois da B, então a vaga continental dessa temporada vem da B (só Prata pela Taça).
  Na temporada seguinte o perfil volta para a D e o `seasonSetup` (`calib-carreira.mjs:188`) reinicia o continental como `false` (só o
  `maximoRot` força a Ouro, e só na própria temporada da A, que depois o real `startNewSeason` não repete). A Ouro (2 a 12 pontos) é
  **inalcançável** no rotativo.
- Além disso, o rotativo fica 1 temporada em 4 na A (só 1 temporada pontua pela liga), e o `forteRot` tem OVER 86 na A (`TYP + 15`),
  não os 76 a 78 do "forte" do plano (seção 2.3). Os pontos que ele soma vêm quase todos de Taça e Supercopa nas séries de baixo
  (mediana 13).
- Mesmo efeito explica o `maximoRot` com 0 de 20 pela porta da Ouro na T13.

A estimativa do plano (forte cerca de 80% com 16) pressupõe o clube **na A as 4 temporadas do ciclo**, com Ouro em boa parte delas (cerca de
2,7 pontos de Condor por temporada). O rotativo mede outra coisa.

**Por que não baixar para 11 agora:** pela tabela do plano, o típico na A soma cerca de 9 (±4) por ciclo; com 11, ele passaria em algo como
30% a 35% das edições, e a vaga deixa de ser prêmio do topo (o próprio plano rejeitou 14 por deixar o típico em 1 de cada 8). E o rotativo
mostra que um clube dominante nas séries de baixo já chega a 26 pontos só com Taça e Supercopa; com corte 11, um clube da B poderia
classificar sem nunca ter jogado a A no ciclo.

**Recomendação (não aplicada):**
1. Manter `RANKING_CONTINENTAL.cutoff = 16`.
2. Medir com perfis presos à A e com o fluxo real do continental (sem o `seasonSetup` reiniciar a vaga): `forteA` (OVER `TYP[1] + 6` ≈ 77,
   o "forte" do plano) e `tipicoA` (já existe como `FORCE`), 40+ edições cada.
3. Critério: `forteA` entre 70% e 85% e `tipicoA` até cerca de 10%. Se o `forteA` ficar abaixo, o próximo passo é 14 (a outra linha da tabela
   do plano), não 11.
4. Pergunta de desenho ao dono, independente do corte: pontos de Taça e Supercopa ganhos **fora da A** devem contar para o Ranking Condor? Hoje
   contam (seção 2.2 do plano), e é isso que deixa o rotativo com mediana 13 sem jogar a Ouro.

## Perguntas ao dono

1. Corte do ranking: manter 16 e encomendar a medição com `forteA`/`tipicoA` antes de decidir (recomendado), ou decidir já?
2. Edição sem o usuário (I2): simular e mostrar campeão e grupos (pequena tarefa) ou só corrigir o texto do painel?
3. Títulos de Taça e Supercopa conquistados fora da Série A devem continuar valendo pontos no Ranking Condor?
4. I1 e N1 a N3 são correções de poucas linhas: entram nesta branch antes do merge (recomendado, com o `t46` 1f ajustado) ou numa `fix/` depois?

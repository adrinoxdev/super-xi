# Revisão T15: commit 3f030e1 (feature/universo-nomes)

Data: 2026-11-25. Escopo: renomeação de competições e clubes e migração de saves (plano fase 8, seções 6, 10 e T15). Revisão só de leitura: nada em `src/` nem nos testes foi alterado.

## Veredito

**Não aprovar ainda.** Tem 1 bloqueante, de correção trivial. A migração dos campos que o plano lista funciona com os 8 clubes e é idempotente. Ficam de fora quatro campos que guardam nome de clube, e o t50 não pega nenhuma das duas falhas.

## Verificações rodadas

| Item | Resultado |
|---|---|
| `git show 3f030e1 --stat` | 24 arquivos, +292/−65 |
| `npm run build` | passa (só o aviso de sempre, chunk > 500 kB) |
| t40 (sem flag) a t50, mais t44b | 12/12 OK |
| `t40-baseline.json` contra 765bbf4 | 1600 valores numéricos **idênticos**, 485 strings. Depois de aplicar o mapa dos 8 clubes, 0 diferenças (7 nomes aparecem, só nos textos `f`/`ts` dos pódios) |
| `t49-mundial-ui.mjs` | diff de uma linha: só os 3 nomes da lista `names` |
| Save antigo realista (script avulso no scratchpad, testado sem e com `ecoRecords`) | os 8 clubes estão em `leagueTeams`, nos times e no `label` da chave da Taça, no `trophyGallery` (4 textos), no `podiumArchive` (3 pódios com os 8 clubes), em `rivalName`/`rivalOrigin` das duas finais e no `matchHistory`. **Tudo isso migra, o `matchHistory` fica intacto e a segunda carga sai idêntica.** Falham `cupState.currentRival`, `continentalState.teams` e `mundialState.last` (ver I1 e N1) |
| Séries | `SERIE_META` intacto. Continuam "Série A" a "Série D" |
| Aliases | os 8 nomes antigos apontam para o mesmo id do novo, com o mesmo `getTeamIdentity`. Sem chave duplicada em `TEAM_ID_BY_NAME`. Os nomes novos não colidem com nenhum outro nome de `src/` |
| Comparações por string | `/prata/i` (usePersistence.ts:119, mundialField.ts:74) não é afetado, porque Prata não mudou. `^Campeão da Supercopa` e `^Campeão da Recopa` casam com os nomes novos. `OLD_CUP_NAMES` mantém o texto antigo de propósito (`LEGACY_CUP_FINAL_NAME`), o que está certo. `cupRoundLabel` não é comparado em lugar nenhum. Variantes históricas de texto de troféu no git (todas as revisões): só existem as 3 que o mapa cobre |
| `scripts/verify-competitions/run.mjs` | não rodou: falta `baseline.json` no worktree (já faltava antes; não é deste commit) |

## Bloqueante

### B1. "TAÇA CACIQUE" em maiúsculas continua na interface
- `src/components/competitions/CupPanel.vue:64`: selo `CAMPEÃO DA TAÇA CACIQUE!`, que fica visível o resto da temporada depois do título.
- `src/stores/modules/competitions/cup.ts:151`: toast `3º LUGAR NA TAÇA CACIQUE! Cota: ...`
- `src/stores/modules/competitions/cup.ts:187`: toast `CAMPEÃO DA TAÇA CACIQUE!`
- Cenário: o usuário ganha a Taça do Povo e lê "CAMPEÃO DA TAÇA CACIQUE!". Isso vai contra o critério 7 da T15 ("Cacique sumiu da interface").
- Por que o t50 não pegou: `docs/calibracao/t50-nomes.mjs`, passo 7, usa `/Cacique|Soberana|Recopa Condor/` sem a flag `i`.
- Correção: trocar por `CAMPEÃO DA TAÇA DO POVO!` e `3º LUGAR NA TAÇA DO POVO!`, e pôr a flag `i` na regex do passo 7. Com a flag, `Recopa Condor` não casa com nada legítimo; conferido por grep.

## Importante

### I1. Nomes de clube gravados fora do que `migrateNames` cobre
`src/composables/usePersistence.ts:47-75` migra `leagueTeams`, `bracket.teams`, pódios, `ecoRecords` e as finais. Ficam com o nome antigo:
1. **`cupState.currentRival.name`** (`CupRival` não tem id). Cenário: save 1.2.0 com a Taça em andamento contra c_11. O card "Seu Adversário" (CupPanel.vue:86-89) mostra "Esperança de Lagarto" e a chave mostra "Estrela do Agreste". O resumo da rodada (cup.ts:120 e 131) grava o nome antigo no histórico. `clubStyleByName` (DashboardView.vue:48) devolve `null`, porque o mapa de estilos agora só tem os nomes novos. E em save anterior à balance v2, `lookup(undefined, r.name)` (balanceMigration.ts:94 e 211) não acha mais o clube, porque `byName` só tem os nomes novos, e cai na conversão aproximada. Antes da T15, achava. O problema se corrige sozinho quando a rodada é jogada, porque `rivalFromTie` lê a chave.
2. **`continentalState.teams` e `otherGroups`** (têm `id`; clubes `a_*` da Série A entram, como a_8). Cenário: save com a fase de grupos da Copa Condor em andamento. A tabela, o `continentalOpponent` e o card do próximo jogo mostram "Farroupilha AC" durante toda a fase de grupos. O mata-mata herda o nome antigo, e a chave só é corrigida na carga seguinte.
- Correção (só em `migrateNames`, ainda idempotente): `if (cup.currentRival) cup.currentRival.name = migrateName(cup.currentRival.name)`, já que o mapa tem os 8 clubes. E `byId` em `continentalState.teams` e em cada `otherGroups[].teams`. Fazer isso **antes** de `migrateBalanceV2`, como já acontece. Acrescentar esses casos ao t50.

### I2. A sigla do escudo continua a do nome antigo
- `src/utils/identity/teamIdentities.ts:29, 38, 39, 41, 59, 63, 65, 76`: `shortName` TUP, FER, SBV, ESP, NOR, OPE, OES, FAR. `ClubCrest.vue:50` desenha essa sigla no escudo.
- Cenário: "Lua Nova EC" aparece com "TUP" no escudo e "Meridiano AC" com "FAR". O t50 (2b) só confere que o escudo é o mesmo para o nome antigo e o novo, e é por isso que passa.
- Correção: decisão do dono. Ou se mantém a sigla antiga por continuidade, ou se troca por uma do nome novo. Nesse caso, evitar SER, PIN e EST, que já existem (sugestões: LUA, VSO, PCE, POE, MER, VLA, SLU, EAG). A troca muda constante gerada por script e não afeta o save, que não grava identidade.

### I3. O t50 não testa o cenário que o plano pede
- `docs/calibracao/t50-nomes.mjs:49-52`: o save sai de `initializeFreshCareer` (Série D), então só o d_18 aparece em `leagueTeams`. O teste aceita `present.length >= 1`. A chave da Taça, as finais (`rivalName`/`rivalOrigin`), o `currentRival` e os outros 7 clubes não são testados na carga. O `matchHistory` testado é um objeto sintético.
- Correção: trocar ids em `leagueTeams` e nas fixtures para pôr os 8 clubes, marcar com nome antigo os times da chave vigente, preencher as finais com `rivalOrigin` antigo e acrescentar `currentRival` e `continentalState`. O script de revisão faz exatamente isso e pode servir de base.

## Nit

- **N1.** `mundialState.groups[].teams` e `mundialState.last` (rows, champion, runnerUp, third, fourth) não migram. Nenhum save de usuário tem `mundialState` antes da Fase 8 (765bbf4 não está na develop nem na master), então hoje o problema só atinge saves de desenvolvimento. Se for corrigir, `byId` nas rows e `migrateName` nos 4 campos de texto.
- **N2.** Textos livres com nome antigo: `podiumArchive[].finalSummary`/`thirdSummary`, `cupState.history[].summary` e `cupState.history[].roundName = 'Final da Taça Cacique'` (só save anterior às chaves). Aparecem no PodiumCard e em "Campanha na Taça do Povo". Dá para aceitar como registro de época, como o `matchHistory`. Se for migrar o `roundName`, fazer **depois** de `ensureBrackets()`, como hoje, porque `migrateLegacyCup` depende do texto antigo.
- **N3.** `usePersistence.ts:59`: o pódio passa por `migrateName(e.name)` mesmo quando `isUser` é verdadeiro. Se o usuário tiver dado ao clube um dos 8 nomes antigos (o nome é texto livre), as entradas dele no pódio e em `ecoRecords` viram o nome novo, enquanto `club.name` continua o antigo. Correção: pular `e.isUser || e.teamId === 'user'`. Também vale avisar que um clube do usuário chamado, por exemplo, "Lua Nova EC" passa a ter o mesmo nome de um rival. Nenhuma lógica quebra, porque o usuário usa `USER_KEY`, mas o nome fica ambíguo na tela.
- **N4.** O save da partida ao vivo (`LIVE_MATCH_KEY`) não passa pela migração. Uma partida interrompida antes da atualização volta com o nome antigo do adversário. Isso some ao terminar a partida.
- **N5.** Rótulo redundante que já existia antes: `useMatchSimulation.ts:213` gera "Taça do Povo • Final da Taça do Povo". Poderia usar "Final" quando o prefixo já é a competição.

## Colisão de nomes (o que a checagem web não cobre)

- Não há colisão interna: nenhum nome novo repete outro de `LEAGUE_CLUBS_POOL`, `CONTINENTAL_RIVALS`, `MUNDIAL_RIVALS`, `EXTRA_D_CLUBS` ou das chaves de `TEAM_ID_BY_NAME`. O `slug` de `mundialField` também não colide.
- Siglas: ver I2. As novas devem evitar SER, PIN e EST.
- O nome do clube do usuário pode coincidir com um nome novo ou antigo (N3).
- `checagem-nomes-t15.md` já registra a limitação da busca web para clubes amadores com nomes toponímicos ("Vale do Sol", "Serra do Luar") e para a "Taça do Povo". É risco residual, não bloqueia.

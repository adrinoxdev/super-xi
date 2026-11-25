# Fase 8: diário de execução, dívidas e pendências

Registro feito durante a execução sem o dono presente (2026-11-25). Nada foi mergeado na `develop`, nada foi enviado ao remoto e a versão do jogo (`package.json`) não mudou. Cada item de "Pendências" espera decisão.

Ambiente: worktree `C:\Users\elphant\Downloads\Super XI exec` (código; branches empilhadas `chore/calib-imports` → `chore/t23-chaves` → `feature/copa-dos-continentes`, base `develop` `e0dde7b`) e `...\Super XI plano-fase-8` (plano e este diário, branch `docs/plano-fase-8`). `node_modules` é uma junção para o da pasta principal. Relatórios no código: `docs/calibracao/relatorio-t13.md`, `docs/calibracao/revisao-t14.md`, `docs/calibracao/baseline-t0.md`.

## Estado das tarefas

| Tarefa | Branch | Commit | Estado |
|---|---|---|---|
| T0 calibração | chore/calib-imports | cc7aa4a | feita, `--check` OK |
| T1 t23 chaves | chore/t23-chaves | 83a8c87 (+727c4d1 na feature) | feita, ressalva P2 |
| T2 tipos e constantes | feature/copa-dos-continentes | 021fb27 | feita |
| T3 grupos e jogo neutro | idem | bb1fd7f | feita (t40) |
| T4 ranking e ecoRecords | idem | b8835c2 | feita (t41) |
| T5 campo de 32 | idem | c242c22 | feita (t42) |
| T6 store do Mundial | idem | 7f36735 | feita (t43) |
| T7 partida | idem | 95a5262 | feita (t44) |
| T8 virada de temporada | idem | c616843 | feita (t45) |
| T9 persistência e aviso | idem | 4075120 | feita (t46) |
| T10 finais com rival real | idem | 3d6028c | feita (t47) |
| T11 checagem do ecossistema | idem | bc1328f | feita (t48) |
| T12 interface | idem | 9b8c97a | feita (t49), sem verificação visual |
| T13 calibração | idem | 41392d1 | feita, `CHECK OK`, ver P3 |
| T14 revisão do Opus | idem | db880c3 | feita: pode ir a merge com ressalvas, sem bloqueante |
| T15 nomes | feature/universo-nomes | | NÃO iniciada (autorizado só até a T14) |

Tokens de subagentes (aprox.): T0 61 mil, diagnóstico Opus 114 mil, T1 53 mil, T2 76 mil, T3 90 mil, T4 72 mil, T5 98 mil, T6 118 mil, T7 74 mil, T8 94 mil, T9 100 mil, T10 72 mil, T11 90 mil, T12 117 mil, T13 134 mil, T14 203 mil. Total ≈ 1,57 mi.

## Pendências para decisão do dono

**P1. Elenco máximo na Série A perde ≈ R$ 790 a 820 mil por temporada** (T0: −788 mil; T13: −822 mil; o relatório antigo dizia −240 mil). Não é regressão: vem do salário por OVER, das luvas e da escala rebaixada. Consequência boa: o prêmio de 1,5 mi não ameaça o teto de 400 mil (`k_max` = 7,08). Decidir se o relatório (decisão 6) é atualizado.

**P2. `t23-atletas.mjs` asserção b2 instável** ("valor e salário seguem o OVER após evoluir"): falha em cerca de metade das execuções. Não investigada (pode ser teste sem semente fixa ou defasagem real de `value`/`wage` após evoluir). h6 (25 chaves) passa.

**P3. Corte do Ranking Condor (16): medição inconclusiva.** A T13 mediu o forte rotativo classificado em 35% a 37,5% (alvo 70% a 85%) e o agente propôs baixar para 11. O Opus (T14) discorda: o problema é o perfil de teste (o forte rotativo tem OVER 86 e fica só 1 temporada em 4 na A; nos perfis rotativos a Condor de Ouro nunca acontece), e o corte 11 deixaria o clube típico da A passar em cerca de 30% das edições. Recomendação do Opus: **manter 16** e medir com dois perfis presos à A, `forteA` (alvo 70% a 85%) e `tipicoA` (até ≈ 10%); se o `forteA` ficar abaixo, o próximo passo é **14**, não 11. Decidir: encomendar essa medição? Nenhuma constante foi alterada.

**P4. Edição sem o usuário classificado** (achado I2): o store descarta o campo e o painel promete "grupos e campeão nas notícias da virada", o que não acontece (o plano, seção 8, pede isso). Opções: simular e guardar campeão e grupos (mais dados no save, mais fiel ao ecossistema) ou só corrigir o texto do painel.

**P5. Aviso de save antigo** (achado I1, `usePersistence.ts:243`): em save carregado numa temporada múltipla de 4, o aviso diz que a próxima edição é na temporada atual, mas nenhuma edição abre nela. O t46 (1f) confere justamente esse texto errado. Correção pequena: usar `cycleTarget(club.season)` e ajustar o teste. Entra nesta branch antes do merge ou numa `fix/` depois?

**P6. Taça e Supercopa ganhas fora da Série A valem pontos no Ranking Condor?** Hoje valem (Taça campeão 3, vice 1; Supercopa 1). Confirmar.

**P7. Testes de integração fracos da partida** (achado I4): t44 checks 8, 9 e 12 só buscam texto no código, o 11 testa fórmula copiada, e a bilheteria de 40% foi conferida pela fórmula (o Opus revisou à mão e está certa; as partidas do Mundial rodaram pelo fluxo real na T13 sem erro). Recomendado um `t44b` com pinia real. Fazer agora ou depois?

**P8. Nome "Brasil" em `MUNDIAL_HOSTS`** (sede do usuário). Não aparece na tela (a interface mostra "Seu país"), mas é nome real no dado. Trocar?

**P9. Nomes de rivais do Mundial** (T2): 16 europeus (Real Montanha FC, Atlético Fiorde, Union Nordhaven, Sporting Castelmar, Dinamo Verdália, FC Aurelion, Borealis United, Stella Argenta, Olimpia Kronberg, Racing Valmonte, AS Belvedere, Wolfram Rovers, Athletic Lunaris, Torre Alta CF, Esperia Calcio, Vanguard Ostrava), 6 asiáticos, 6 africanos, 6 norte-americanos e 3 da Oceania. "Real", "Atlético", "Dinamo", "Sporting", "Olimpia" e "Racing" são prefixos comuns a clubes reais. Checagem contra nomes reais só na T15 (não iniciada).

**P10. T15 (aplicar nomes) não foi iniciada.** Ao rodá-la: a busca na web dos nomes novos para e pergunta ao dono se algum colidir (atenção à "Taça do Povo"); migrar os textos gravados de `rivalOrigin` e a lista `ECO_TITLE_LABELS`, o `NODE_LABEL` do `MundialCycleCard.vue` e as origens fixas de `finalsRivals.ts`. Falta também "Copa" na etiqueta "Campeão da Condor de Ouro" (nit).

**P11. Verificação visual** (ninguém viu o navegador): `MundialPanel`, `MundialCycleCard` e o card no Dashboard em desktop e 390 px (estouro de texto, tabela do grupo com rolagem horizontal, 7 abas de grupos, selo âmbar da aba, posição do card, botão de entrada na partida), uma edição inteira jogada, e carga de um save antigo real.

## Desvios do plano e decisões tomadas pelos agentes (para ciência)

- Jogo neutro entre OVER iguais: cada lado vence ≈ 35% e o empate ≈ 30%. O "40% para cada lado" do plano era a vitória do mandante com mando. O t40 afirma 35 ± 2.
- Grupos têm 3 rodadas (turno único), como a seção 1.
- Sorteios com `Math.random` na virada (campeão da Série A quando o usuário está fora dela; campeão da outra copa continental quando o usuário vence a sua) são gravados no `ecoRecords`: o Opus verificou que não contaminam o campo do Mundial nem a recarga.
- O aviso de save antigo usa o próprio `ecoRecords` como flag (sem chave nova de topo). Reconstrução de save antigo é aproximada (série e posição vêm do estado atual; poder de campeões vem de tabela).
- Arquivo extra fora do plano: `src/utils/competitions/mundialCycle.ts`.
- O rótulo do mata-mata vem de `mundialStageLabel.split(': ')[1]` (frágil se o formato mudar). O rival sempre bate primeiro nos pênaltis do Mundial (nit N do Opus).
- `docs/calibracao/` não era versionado; agora é. Os scripts calculam o `root` a partir do arquivo.
- O repositório principal foi trocado de branch por fora durante a sessão. Outros docs (`plano-*.md`, `relatorio-pendencias.md`) seguem sem rastreio na pasta principal.

## Para integrar (quando você decidir)

Ordem do plano: `chore/calib-imports`, `chore/t23-chaves` e `feature/copa-dos-continentes` já estão empilhadas (a feature contém as duas chores). Merge `--no-ff` na `develop`, `npm run build` e `--check` depois; não subir a versão até o pedido de lançamento (alvo 1.3.0). A T15 vai em `feature/universo-nomes` depois.

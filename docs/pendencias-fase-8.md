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

---

# Atualização 2 (depois das respostas do dono)

## Feito

- **P2 resolvida** (`367d808`): a b2 do t23 falhava porque o teste mudava o `potential` sem recalcular o valor; o jogo está correto. Corrigido o teste; 20 execuções seguidas OK. Ver `docs/calibracao/investigacao-t23-b2.md`.
- **P4, P5, P7 e país da sede** (`765bbf4`): edição sem o usuário agora é simulada e a última edição (grupos finais, campeão, vice, 3º, 4º, sede) é guardada em `mundialState.last`; painel mostra "Notícia"; aviso de save antigo usa `cycleTarget`; novo `t44b-mundial-match-real.mjs` joga a edição inteira pelo fluxo real; nits N1 (quem bate primeiro nos pênaltis é sorteado) e N3 (etiqueta "Campeão da Copa Condor de Ouro"). Pulados: N2 (dono aceitou "Brasil"), N4 a N9.
- **T15, nomes** (branch `feature/universo-nomes`, worktree `Super XI nomes`, sobre `feature/copa-dos-continentes`): `3f030e1` + correções `5a225ef` após revisão do Opus (`docs/calibracao/revisao-t15.md`). Checagem web sem colisão de nome completo (`docs/calibracao/checagem-nomes-t15.md`).
- **Corte do ranking** medido (`74ab543`): ver P3 abaixo.

## Pendências atualizadas

**P3 (substitui a anterior). Ranking Condor está FROUXO, não apertado.** Medido com perfis presos à Série A (60 temporadas, 15 edições, corte 16): `forteA` (OVER 77) classifica 100% (pontos 22/41/55); `tipicoA` (OVER 71) 80% (pontos 1/19/42; sem a 1ª edição o mínimo é 15). Critério do Opus (forteA 70-85%, tipicoA ≤ ~10%) NÃO atingido. Baixar o corte (14, 11) só piora. Um corte perto de 30-33 deixaria o tipicoA ≈ 10% mas o forteA ≈ 87%. O caminho provável é rever a tabela de pontos (Taça, Supercopa, Ouro, `RANKING_CONTINENTAL`) e/ou o perfil, não só o corte. A leitura anterior (forte 35%) era artefato do perfil rotativo. Decisão do dono: (a) rever a tabela de pontos (proponho valores e meço de novo, 40+ edições); (b) subir o corte para ~30; (c) aceitar como está. Nada foi alterado em constantes.

**P12. `--check` completo depois da mudança no `calib-carreira.mjs` NÃO foi confirmado.** O agente alterou 3 linhas (perfil `forteA`, só ele). O `--check` (≈ 30 min) foi iniciado e ainda rodava ao fim da sessão; log em `...\scratchpad\check.log` (a pasta temporária pode ser limpa). Reroda: `node docs/calibracao/calib-carreira.mjs 20 curva,tipicoRot:240,forteRot:80,fracoRot:80,maximoRot:120,tipico,tipicoD,forte,fraco,caroFraco,investidor --check`.

**P13. Siglas dos 8 escudos renomeados** (achado I2 da revisão T15): continuam as do nome antigo (ex.: TUP, FAR em `teamIdentities.ts`). Manter ou trocar?

**P14. Nits da revisão T15 não tratados:** `mundialState.last` e grupos não migram nomes (só saves de desenvolvimento); placares em pódios/histórico mantêm nomes antigos; entrada do usuário no pódio é migrada sem checar se é o usuário; partida ao vivo salva não passa pela migração; conversão de força do rival em save anterior à balance v2 só foi verificada lendo o código, não com save real.

**P15. Nomes: riscos residuais.** A web não elimina a chance de um torneio municipal "Taça do Povo" ou clubes amadores "Vale do Sol"/"Serra do Luar" existirem sem indexação (dono já aceitou os prefixos comuns nos rivais).

**P16. Alterações em testes por causa dos nomes:** `t40-baseline.json` foi regravado só com os nomes dos 8 clubes (o Opus confirmou: os 1600 valores numéricos são idênticos aos do commit anterior) e `t49-mundial-ui.mjs` só nos 3 nomes de competição.

## Estado atual das branches (sem merge, sem push)

| Branch | Worktree | Último commit |
|---|---|---|
| chore/calib-imports | Super XI exec (histórico) | cc7aa4a |
| chore/t23-chaves | Super XI exec (histórico) | 83a8c87 |
| feature/copa-dos-continentes | Super XI exec | 74ab543 |
| feature/universo-nomes | Super XI nomes | 5a225ef (contém a feature acima) |
| docs/plano-fase-8 | Super XI plano-fase-8 | este diário |

Ordem de integração sugerida (`--no-ff`, `npm run build` e `--check` depois de cada): `feature/copa-dos-continentes` (já contém as duas `chore/`) e depois `feature/universo-nomes`. Versão-alvo 1.3.0 só no pedido de lançamento.

Tokens de subagentes desde a T14: investigação P2 70 mil, correções P4/P5/P7 123 mil, medição do corte 88 mil, T15 129 mil, revisão Opus T15 146 mil, correções T15 66 mil. Total da sessão ≈ 2,2 mi.

---

# Atualização 3 (ranking e siglas)

- **Siglas dos 8 escudos trocadas** (P13 resolvida), `f7cc21f` na `feature/universo-nomes`: d_18 LUA, b_10 VSO, b_14 PCE, b_16 POE, a_8 MER, c_8 VLA, c_9 SDL, c_11 EAG. Sem duplicatas entre os 140; não conferidas contra lista de clubes reais.
- **Ranking Condor: nova tabela aplicada** (`feature/copa-dos-continentes`, commit seguinte a `74ab543`): Ouro 0/3/6/9/12; Prata 0/0/1/2/4; Série A título 8, 2º a 4º 2, 5º e 6º 0; Taça 3/1; Supercopa 1; Recopa 1; **corte 38** (proposta do Opus em `docs/calibracao/proposta-ranking.md`). Só `RANKING_CONTINENTAL` mudou; prêmios e vagas intactos. Testes t41, t42 e t49 ajustados nos valores esperados.
- **Medição** (`docs/calibracao/relatorio-ranking-novo.md`, 164 temporadas, 41 edições): `forteA` classifica 82,9% (dentro de 70-85%); `tipicoA` 24,4% (critério ≤ ~10%); `forteRot` e `tipicoRot` 0%.

## Nova pendência

**P17. `tipicoA` em 24%, acima do alvo.** O excesso não vem do ranking (só 3 edições pelo ranking; 9,8% com pontos ≥ 38) e sim das portas **Ouro** (5 edições) e **sede** (2) que o corte não afeta. Subir o corte não resolve (derruba o forteA). Opções: (a) aceitar (um clube típico que chega a campeão da Ouro merece a vaga; a amostra de 41 edições tem erro de ±6 a 7 pontos e o `tipicoA` do teste é mais forte que o típico do plano); (b) apertar a porta Ouro (ex.: só o campeão, não o vice) ou a da sede; (c) medir com mais edições antes de decidir.

**P18. Clubes rotativos (sobem e descem) ficam em 0% pelo ranking** com a tabela nova (forteRot máx. 25 pontos). Aceito pela lógica "quem passa o ciclo na A" ou o ranking deve ter regra de alívio para rotativos? Decisão do dono.

**P19. Integração:** a `feature/universo-nomes` foi criada antes desta tabela. Ao integrar, mergear `feature/copa-dos-continentes` primeiro e depois trazê-la para dentro da `feature/universo-nomes` (ou mergear as duas na `develop` na ordem sugerida).

---

# Atualização 4 (decisões do dono)

- **P17 decidida:** aceitar o `tipicoA` em 24% (um clube típico que chega a campeão da Ouro merece a vaga). Corte 38 mantido.
- **P18 decidida (recomendação):** sem regra de alívio para clubes rotativos. Pontos por subir (título da B 3, acesso 2, título da C/D 1) somariam ≈ 6 por ciclo e o `forteRot` (máx. 25) ainda ficaria abaixo de 38: seria cosmético. Se o dono quiser dar chance a quem sobe, o caminho é uma porta própria (repescagem), que é desenho novo e fica para depois.
- **P19 feita:** `feature/copa-dos-continentes` foi mergeada (`--no-ff`, sem conflito) dentro de `feature/universo-nomes`. Na branch combinada: `npm run build` OK e t40 a t50 (com t44b) OK.
- **Ordem de integração na `develop`** (ainda NÃO feita, aguarda o dono): como `feature/universo-nomes` já contém `feature/copa-dos-continentes`, basta um merge `--no-ff` da `feature/universo-nomes` (ou dois merges: copa, depois nomes). Versão 1.3.0 só no pedido de lançamento.
- **Ainda abertas:** P12 (`--check` completo após a mudança no `calib-carreira.mjs`), P11 (verificação visual), P14 e P15.

# Super XI: relatório de pendências e ajustes

> **Nota (1.3.0):** este documento descreve o jogo na data em que foi escrito. Depois dele, as competições foram renomeadas: Taça Cacique → Taça do Povo, Supercopa Soberana → Supercopa Zênite, Recopa Condor → Recopa dos Condores (ver `docs/plano-fase-8-mundial-patrocinador.md`). O texto abaixo mantém os nomes antigos como registro.

Escrito para o dono do projeto, para tratarmos depois que as tarefas terminaram.
Tudo abaixo está implementado e verificado por código (typecheck, build, 14 scripts de teste e simulação de 20 temporadas
× 7 estilos de jogo). **Nada foi visto no navegador pelos agentes**, exceto verificações pontuais com Playwright
(Copa → pré-jogo → partida, alinhamento da chave e estouro de texto, sem erro de console). A aparência fica para você
conferir com `npm run dev`.

## 1. O que foi entregue

**Chaveamento e pódio**
- Chave completa com sorteio, simulação dos outros confrontos pelo OVER, ida e volta, pênaltis no agregado empatado,
  disputa de 3º lugar e pódio em: Taça Cacique (Copa), Copa Condor de Ouro/Prata (continental), mata-mata da Série D
  (64 clubes, Playoff de Acesso) e final da Série C (campeões dos dois grupos, 3º entre os vices).
- Acesso e descenso das séries não mudaram. Na Série C o acesso continua saindo do quadrangular.
- Você joga a disputa de 3º lugar quando perde a semifinal; nos outros casos ela é simulada.
- Arquivo de pódios na virada de temporada (cartão no Painel, na Liga e nas Competições, com botão Ocultar).
- Linhas de ligação da chave alinhadas com os cards (medido: desvio de 0 px).
- Saves antigos migram (17 chaves mantidas; teste com save antigo sintético).
- 46 clubes extras da Série D com identidade visual própria (140 siglas únicas no total).

**Balanceamento (suas decisões 1, 2 e 3)**
- **Escala única de poder.** O OVER do time é a média ponderada dos 11 titulares, na mesma escala do atleta, e os rivais têm
  OVER de time por série (D 61, C 66, B 71, A 76). O painel passa a comparar o mesmo número dos dois lados. Mando de +3 OVER
  só na liga e no continental (não vale em Copa, Supercopa e Recopa). O reforço anual dos rivais saiu de todas as competições.
- **Curva de vitórias medida (3.000 jogos por ponto):** OVER igual 42,3%; +15 64,2%; −15 20,9%; +30 78,5%; −30 12,3%.
- **Economia.** Receita por série com base por jogo e teto de nível das instalações; manutenção das instalações
  (0,15% do valor investido por jogo; regra nova que você aprovou); folha por OVER (dobra a cada 15 de OVER, mínimo 500);
  caixa inicial R$ 150 mil; caixa pode ficar negativo com juros de 1% por jogo, gastos bloqueados e venda forçada de um
  atleta por jogo abaixo do limite da série (nunca menos de 11 atletas); custos de ampliação recalibrados.
- **Clube típico** (vitórias 40% a 45%): saldo por temporada com prêmios D +83 mil, C +129 mil, B +203 mil, A +405 mil;
  sem prêmio +8, +19, +22, +19 mil. Série D nunca travou (0 vendas forçadas). 0,6 a 0,9 ampliação por temporada.
- **Prêmios** conforme a pesquisa da premiação real (`docs/pesquisa-premiacao.md`) e as suas regras: sem cota base,
  rebaixados e quem cai cedo não recebem nada. Série A do 1º ao 16º (300 mil a 102 mil); B e C só os 4 que sobem
  (B 150/170/200/240 mil, C 85/100/115/140 mil, C ainda com bônus da final); D por fase no mata-mata (8 mil na 2ª fase até
  80 mil o campeão); Copa campeão 330 mil, vice 140 mil, 3º 25 mil, 4º 10 mil; continental 30 mil por vitória e bônus
  180/70/30 mil; Supercopa 40/15 mil; Recopa 60/25 mil. Escada entre séries sem violação em 7 estilos × 20 temporadas.
- Saves antigos: rivais convertidos para a escala nova, salários recalculados pelo OVER, caixa mantido, migração idempotente.

**Ajustes visuais da conversa:** OVER no lugar de "Team Power", cards dos atletas (também no campo tático), escudos com
10 formatos, duas cores, padrões e cor das iniciais, indicador AO VIVO, botões de Substituir e Velocidade ao lado do Lance a
Lance, estatísticas ao vivo com a cor primária de cada time e inversão por mando, duração da partida (2 min normal, 1 min no
2x), selo da Liga em verde, "Oficial" removido dos textos, quebra de linha segura em textos longos (55 estouros medidos antes,
0 depois), caixa negativo, manutenção, juros e teto de nível na interface.

## 2. Decisões suas (regra ou balanceamento): nada disto foi alterado além do que está dito

1. **Curva de vitórias: `slope` 0,0028 e piso/teto de chances aprovados (Proposta D).** `MATCH_SIM.chanceMin` passou de
   0,045 para 0,025 e `chanceMax` de 0,20 para 0,24, para o time muito superior perder pouco (zebra mínima de 2% a 3%) em
   vez de bater num piso alto. Até +15 de diferença a curva não muda. Medido com `calib-carreira.mjs --check` (20 temporadas,
   curva com 3.000 jogos por diferença, V/E/D %): -30 10,8/25,3/63,9; -20 14,9/26,3/58,8; -15 22,0/28,7/49,3;
   -10 28,5/30,1/41,4; -5 35,0/30,8/34,1; igual 43,2/28,2/28,6; +5 50,9/28,0/21,1; +10 58,7/25,7/15,7;
   +15 64,2/23,4/12,4; +20 72,3/20,1/7,6; +30 83,0/14,1/2,9 (exato com mando +3: +20 76,9/5,3; +25 82,1/3,1; +30 84,4/2,7;
   +40 88,1/2,0). O alvo do +30 passou de <=82% para <=88%. O +15 continua o ponto mais fraco (cerca de 64% a 67% entre
   execuções, alvo 65% a 75%, ruído de Monte Carlo). `--check` fechou OK, sem alvo de economia ou vitórias fora.
   **Orientação da zebra no pré-jogo:** o PreMatch mostra "Chance estimada*" (Vitória/Empate/Derrota, calculada por
   convolução em `src/utils/winChance.ts` com mentalidade e mando), e o aviso curto "*Estimativa pela diferença de OVER,
   mentalidade e mando. Zebras podem acontecer." (a linha "Risco de zebra" saiu: a barra de derrota já mostra o número). Validada contra 20 mil jogos reais por diferença
   (t23-winchance): erro máximo de 1,35 ponto percentual nas vitórias.
2. **Primeira ampliação da Série D custa R$ 58 mil** (a meta era 80 a 110 mil). Custos mais altos nos níveis baixos tiram
   o saldo sem prêmio do clube típico da Série A do mínimo de 3 mil que a calibração exige (hoje cerca de 7 mil, com ruído
   de ±10 a 20 mil). Subir a D exige aliviar esse mínimo ou a folha da A.
3. **Clube que compra todas as ampliações possíveis** chega a 54,8% de vitórias na C e 53,7% na B (acima de 50%), porque
   ficou com instalações melhores que o típico da série. A medição natural do `tipico` também fez 42 ampliações em 20
   temporadas, perto do limite de oferta de cada série.
4. **Time barato e fraco numa série alta lucra** antes de cair, porque a receita depende da série e não do desempenho. Aceito
   por enquanto. A alternativa é ligar parte da bilheteria ao aproveitamento (regra nova que pede nova calibração).
5. **Copa ganhável demais para o clube típico** (antes 12% a 22% dos títulos nas Séries C, B e A). O mando do usuário saiu
   da Copa, mas o efeito ainda não foi remedido de forma isolada.
6. **Elenco de craques não se paga sozinho** (decidido): um elenco de OVER 88 no máximo gasta mais do que ganha (−1,1 mi
   por temporada nas Séries D e C; −240 mil na A) e dispara venda forçada. É o contrapeso do jogo.
7. **Diferenças pequenas no pódio das Séries C e D** (10 a 15 mil entre vice, 3º e 4º) por causa do nivelamento. Se quiser
   os colocados mais beneficiados, diga quanto subir.
8. **Ids internos `libertadores` e `sulamericana`** continuam em `src/types/competitions.ts` (não aparecem na tela). São nomes
   reais dentro do código. Renomear para `ouro` e `prata` exige migrar o save, porque o `tier` fica gravado.
9. **Mando.** O usuário sempre manda a volta no mata-mata da Série D e o jogo na Copa, mesmo vindo do pote 2.
10. **Supercopa ou Recopa pendente na virada** é perdida sem W.O. registrado.
11. **Save antigo de Copa sem rival** só ganha chave na temporada seguinte.
12. **Nomes dos clubes.** Alguns nomes inventados lembram clubes menores reais (por exemplo "Noroeste do Vale", "Operário
    Araucário", "Oeste Catarinense", "Farroupilha AC", "Tupinambá EC"). Se quiser, troco por nomes mais distantes.
13. **Cores nas estatísticas ao vivo.** Cada time usa a cor primária do próprio escudo, então um adversário laranja (por
    exemplo "Sol Nascente EC") aparece laranja nas barras. Se quiser só verde e tinta nesse painel, é um ajuste em
    `src/utils/matchColors.ts`.
14. **Cores de alerta restantes** (âmbar e vermelho, herdadas do protótipo): botão de reiniciar carreira, selos de proposta,
    selo "Emprestado". Posso enquadrar tudo no 60-30-10 se quiser.
15. **Elenco em lista.** A lista do Elenco continua em linhas (o card aparece em Gerenciar e no campo tático). Posso trocar
    por grade de cards.
16. **Venda forçada** (regra nova, validada pelo Opus): abaixo do limite de dívida da série (D 150 mil, C 250 mil, B 400 mil,
    A 600 mil negativos), a diretoria vende um atleta por jogo a 70% do valor (banco de maior salário primeiro; no elenco mínimo
    de 11 vende o titular mais caro e sobe um jovem de OVER 52 a 56). Não deixa o elenco abaixo de 11 e ignora emprestados. Nas
    simulações a espiral de dívida é lenta, não explosiva (um craque OVER 85 numa Série D com caixa de 20 mil chegou a -98 mil
    em 3 temporadas, sem venda forçada). Entrou um aviso de folha na contratação.
17. **Valor do atleta é fixo** (não muda com OVER nem idade): um jovem que evolui é vendido pelo valor de origem.
18. **Contrato nunca vence** (mínimo 1 ano) e a renovação custa 22% do valor sem efeito real; a multa de 2,2x é decorativa.
19. **Revenda por proposta** rende em média 1,10x o valor (contraproposta de +20% com 62% de aceite). Hoje empata com o custo da
    missão, mas pode virar especulação.
20. **Degrau da Série A entre 16º (R$ 102 mil) e 17º (0)** equivale a cerca de 2,5 jogos de receita e coincide com o rebaixamento.
    O Opus acha aceitável; se quiser suavizar, o 11º ao 16º cairiam até ~60 mil.
21. **Staff cobra por dias reais, não por jogos** (já existia no protótipo).
22. **Saves antigos com caixa alto** mantêm o caixa sem teto (a folha e a manutenção novas o consomem aos poucos).

Corrigidas depois da revisão do Opus: venda de atleta emprestado (+137 mil por atleta), peneira infinita (+36 mil por ciclo; o
jovem promovido agora vale 25% do valor com teto de R$ 12.500 e há limite de 3 peneiras por temporada), empréstimo de saída
(25% para 10% do valor), elenco mínimo que contava emprestados.

Resolvidas por esta rodada (antes eram pendências): escala de poder (item 1 anterior), folha mínima de R$ 850, receita das
instalações sem teto, reforço anual só na liga, rebaixado da A pagando mais que quem fica na B (agora todo rebaixado recebe 0),
vice da Copa igual ao 3º.

## 2b. OVER máximo 99 (decidido pelo dono, aplicado)

- `ATHLETE_MAX_OVERALL = 99` em `constants.ts`. Potencial limitado a 99 (antes 96); atributos já limitavam a 99.
- Geração: faixas pedidas pelos chamadores mantidas. Só scouting (missões) e mercado de empréstimo usam `tail: true`: com 0,6% de
  chance o atleta salta para >= 90 e cada ponto seguinte sobe com chance 0,45 (até 95) e 0,32 (após 95). Medido (2 milhões):
  P(>=90) 0,6%, P(>=95) ~1,1e-4, P(>=98) ~3e-6, P(99) ~1e-6. Sem `tail` o teto segue 93 (academia, peneira, rivais, elenco inicial).
- Evolução (`applyPostMatchProgression`, único ponto que sobe OVER): ganho e probabilidade multiplicados por
  `evolutionFactor` = ((99 - OVER) / 14)^1,5 acima de 85, e teto duro de evolução em 98 (`EVOLUTION.hardCap`): 99 só nasce na geração.
- Salário (dobra a cada 15) e valor não saturam: OVER 99 = R$ 6.075/jogo e valor R$ 1,47 mi (OVER 70: 1.575 e 123,5 mil).
- Teste: t22-over99.mjs (scratchpad).

## 2c. Economia dos atletas (T1 a T7 implementadas)

Decisões do dono já tomadas: multa removida; base (academia/promoção) grátis, com venda travada na temporada da promoção (`acquiredSeason`, `acquiredFee = 0`); aposentadoria aos 37 anos para jogadores de linha e aos 45 para goleiros (`retireAgeFor`).

O que mudou: valor dinâmico (cresce com OVER e potencial, estável no pico de 24 a 27 anos, cai depois), salário por OVER recalculado quando a evolução sobe o OVER, contrato de 1 a 5 anos com renovação paga em luvas (valor x 0,025 x anos), saída grátis no fim do contrato, envelhecimento com perda de OVER por idade (goleiros mais tarde), venda sem arbitragem (valor x `saleShare`, empréstimo x `loanShare`), migração de saves antigos (`ATHLETE_ECONOMY_VERSION = 1`, save com 17 chaves) e textos/selos na interface.

Medido na T7 (`calib-carreira.mjs 20 ... --check`: CHECK OK; tsc e build OK; t17 com 7 políticas, 0 erros, 0 falhas de save, 0 violações; todos os t* e rt OK):

| tipicoRot (240 temporadas) | Luvas/temporada | Alvo | Saldo médio | Vitórias |
|---|---|---|---|---|
| D | R$ 10.372 | 9 a 13 mil | 78.622 | 42,3% |
| C | R$ 18.023 | 17 a 23 mil | 137.716 | 43,5% |
| B | R$ 39.787 | 40 a 48 mil | 241.458 | 44,1% |
| A | R$ 70.225 | 65 a 85 mil | 321.341 | 42,4% |

Caixa mínimo da tipicoRot R$ 882 mil, 0 vendas forçadas; a Série D não trava (saldo sem prêmio D +7,7 mil). Divergência: luvas da B 39,8 mil, 0,5% abaixo do piso de 40 mil (ruído de Monte Carlo; constantes não alteradas). Saídas por fim de contrato da tipicoRot: 0 (a política renova todos); aposentadorias por temporada: D 0,70, C 0,88, B 0,83, A 1,28. A idade média do elenco na A e o número de goleiros que ficam até os 40+ não saem do simulador de carreira (t25 confirma: GK de 40 anos fica e perde 3 de OVER; GK de 44 vira 45 e se aposenta; linha de 36 vira 37 e se aposenta).

### Bugs corrigidos na revisão final (teste: t27-final.mjs)

Nenhuma constante de economia (PRIZES, MATCH_SIM, SERIE_ECONOMY, UPGRADE_COSTS, economia dos atletas) foi alterada.

1. Base grátis + empréstimo burlava o `saleCap`: `loanOutPlayer` bloqueia atleta que chegou na temporada (`acquiredSeason`) e ignora quem já está emprestado. Emprestados (saída e entrada) não evoluem mais em `applyPostMatchProgression`.
2. `acceptIncomingOffer` recusa e remove proposta de atleta já emprestado ou emprestado de fora.
3. `startNewSeason` zera `market.incomingOffers`: proposta antiga não atravessa a virada.
4. Venda a R$ 0 bloqueada em `sellSquadPlayer` (toast) e botão Vender desabilitado com `title` no `PlayerDetails.vue`.
5. Selos do `PlayerDetails.vue`: `lastYear` exclui emprestado e quem se aposenta na virada; o selo duplicado "Contrato vence na virada" saiu.
6. "Perde N de OVER na próxima virada" usa `agingDrop(age + 1, position)` e só aparece com N > 0.
7. `canRenew` e `renewYearsFor` respeitam o teto de contrato e as temporadas até a aposentadoria (linha de 35 com 4 de contrato e goleiro de 44 não renovam); mensagens de toast mantidas.
8. Valor do goleiro sem salto aos 28/29 anos (idade efetiva = max(início do auge, idade - 4)). Efeito colateral: goleiros de 28 anos passam a valer como pico (antes 1,01 do pico).
10. Aposentadoria no `PlayerDetails.vue` vem de `retireAgeFor`; `PreMatch.vue` usa `ECONOMY.awayTicketShare`; `homeBonusApplies` exportado de `useMatchSimulation.ts` e usado em PreMatch e LiveStatsPanel.
11. Texto da Academia ("As promessas se renovam na virada de temporada") e potencial sem âmbar.
12. Dashboard não conta duas vezes quem vence o contrato e se aposenta (conta só como aposentadoria).
13. `STORAGE_KEY` definido só em `constants.ts`; `usePersistence.ts` importa e reexporta (compatibilidade com os testes).
14. Potencial gerado até 99 apenas com `tail`; sem `tail` fica em 96 (documentado em `generatePlayer.ts`). A evolução (`EVOLUTION.hardCap = 98`) chega ao teto só em atletas de cauda.

Testes: `calib-carreira.mjs --check` exige n >= 30 nos alvos de elenco máximo (script força n >= 40 em `maximoRot`); `t23-winchance.mjs` calcula a estimativa antes de simular.

## 2d. Limite de 25 atletas e Alojamento & Elenco (decidido pelo dono, aplicado)

- Novo limite absoluto `SQUAD_MAX_SIZE = 25` (constants.ts). `club.maxSquadCapacity = min(25, tabela[nível])`.
- Alojamento & Elenco agora vai até o **nível 10** (antes 9). Nova tabela de capacidade: 1:14, 2:15, 3:16, 4:17, 5:18,
  6:19, 7:20, 8:21, 9:23, 10:25. Quem estava no nível 9 passa de 22 para 23 vagas.
- Única mudança de custo: `UPGRADE_COSTS.squadCapacityLevel` ganhou o nível 10 (R$ 240 mil do 9 para o 10). O
  investimento acumulado da instalação sobe 240 mil no total e a manutenção sobe na mesma proporção. Nada mais da economia
  (PRIZES, MATCH_SIM, SERIE_ECONOMY, WAGE) mudou.
- O limite vale em todas as entradas de atleta: contratação por scouting, empréstimo de entrada, promoção da base, venda
  forçada (não repõe jovem se já estiver em 25) e virada de temporada (só completa até 11, nunca passa de 25). Propostas
  recebidas hoje só compram ou emprestam atletas seus, então não trazem atleta novo. Mensagem única: "Elenco cheio (N/CAP):
  venda ou rescinda um atleta para contratar." (com "Amplie o Alojamento & Elenco." quando CAP < 25).
- Save antigo com mais de 25 atletas não perde ninguém: as entradas ficam bloqueadas e o Elenco e o Painel mostram "Elenco
  acima do limite: venda atletas para voltar a contratar." `fromSave` limita o nível de qualquer instalação ao máximo.
- Interface: "(máx. 25)" no título do card, "Capacidade atual / Próximo nível" e "Capacidade máxima: 25 atletas" no card,
  selo âmbar "Elenco cheio" no Elenco, botões de contratar/emprestar/promover/comparar desabilitados com dica quando cheio.
- Teste: t28-squadcap.mjs (scratchpad).

## 2e. Progressão e escala nova de OVER (T1 a T8 implementadas; variante S53)

Decisões do dono (registradas em `docs/plano-progressao-meio-termo.md`):

- **Opção C**: escala D 50, C 57, B 64, A 71 (`SERIE_TYPICAL_OVER`); degrau entre séries de 7 pontos.
- **Início 53**: elenco inicial com OVER do time entre 50 e 56 (média ~53) e atletas entre 46 e 61 (não o início 49 do plano original).
- **Ritmo 5,25**: `PROGRESSION.seasonBase` = 5,25 (não 5,0).
- **Saves reescalados**: `migrateProgressionV3` desloca atletas e rivais (D -11, C -9, B -7, A -5); diferença de OVER usuário-rival preservada; idempotente; aviso único; 17 chaves de topo.
- **Gamificação**: ganhos "+1 OVER" no resumo da partida, evolução da temporada, marcos únicos (`club.progress`), faixas do `PlayerCard`.

Números medidos (T8, contra `src/`, sem sobreposição):

| Alvo | Medido | Resultado |
|---|---|---|
| Curva, OVER igual vence 40-50% | 42,5% (motor, 6.000 jogos), 43,1% (t31) | ok |
| Curva, +15 vence 63-76% | 65,0% (calib), 65,7% (t31); `estimateOutcome` 42,7% / 65,7% | ok |
| Curva, -15 / +30 | 21,0% / 83,3% | ok |
| Clube típico por série (vitórias / saldo sem prêmio) | D 39,8% / +12 mil; C 42,0% / +26 mil; B 42,7% / +33 mil; A 47,3% / +55 mil | ok (`CHECK OK`) |
| Elenco máximo (88) vitórias, tetos C/B/A 82%, D 90% | D 84,4%; C 77,3%; B 75,7%; A 69,6% | ok |
| `tipicoD` e `fraco` na D | 0 vendas forçadas, caixa mínimo +4 mil e +14 mil | ok |
| Elenco inicial (200 elencos) | OVER do time 50-56, média 52-54; atletas 46-61 | ok |
| Ritmo (2.000 temporadas sintéticas, CT 1, sem comissão) | titular 17 anos 5,24; reserva 3,17 (60%); 28 anos perto do potencial < 0,5 | ok |
| `t17-e2e` (7 políticas, 20 temporadas) | 0 erros de chave, 0 falhas de save | ok |
| `escada.mjs 30 fraco,medio,forte --runs 4`, OVER do time na T30 | fraco 62,4; médio 73,3; forte 76,3 (por carreira 81 / 66 / 80 / 80) | forte na borda inferior de 76-84 |
| Forte chega à Série A entre a 9ª e a 21ª em 4 de 4 | 13ª, 30ª, 14ª, 14ª | **falha em 1 de 4** (carreira 2: caixa perto de zero por mais de 20 temporadas, OVER do time 54-61) |
| Médio chega à A | 10ª, 6ª, 12ª, 14ª | informativo |
| Nenhum time 85+ | máximo 81 (forte); melhor atleta 89 | ok |
| Fraco sem A antes da 15ª | A só na 26ª e na 28ª (2 de 4) | ok |

Ajustes de teste (sem tocar em constantes de balanceamento): `calib-carreira.mjs` (escala nova lida de `SERIE_TYPICAL_OVER`, teto de 90% para o elenco máximo da D, `valueOf` do investidor e reposição do `fitSquad` lidos das constantes, investidor parte de 53); `t17-e2e`, `t20`, `t21`, `t22`, `t23-atletas`, `t24`, `t25`, `t26`, `t27`, `t28`, `t30` leem as constantes em vez de OVER fixo antigo; teste novo `t31-progressao.mjs`. No `t23-atletas` o item "valor 90 >= 1,9x valor 85" passou a comparar com o prêmio de estrela calculado pelas constantes: com o `VALUE` novo a razão real é 1,82x (era 2,02x).

## 3. Ajustes simples (constantes)

- Duração da partida: `MATCH_DURATION_NORMAL_MS` (120000) e `MATCH_DURATION_2X_MS` (60000) em
  `src/composables/useMatchSimulation.ts`.
- Curva de vitórias, mando, economia, folha, custos e limites de dívida: `MATCH_SIM`, `SERIE_ECONOMY`, `ECONOMY`, `WAGE`,
  `SERIE_TYPICAL_OVER` e `UPGRADE_COSTS` em `src/utils/constants.ts`. A calibração está em `docs/calibracao/calib-carreira.mjs`
  (`node docs/calibracao/calib-carreira.mjs 20 curva,tipicoRot:240,forteRot:80,fracoRot:80,maximoRot:40,tipico,tipicoD,forte,fraco,caroFraco,investidor --check`).
- Prêmios: objeto `PRIZES` em `src/utils/constants.ts` (o teste da escada, `t19-prizes.mjs` no scratchpad, confere a ordem).
- Nomes fictícios e identidades dos times: `src/utils/leagueScheduler.ts`, `src/utils/teamIdentities.ts` e
  `docs/identidades-times.md`.

## 4. Verificações que ainda faltam (precisam de você no navegador)

- Aparência de cada tela contra o protótipo, em desktop e em celular (~390 px): chave com linhas ligando confrontos, abas
  por fase, pódio, cards, escudos, contraste dos cards por tier, indicador AO VIVO, telas de finanças com caixa negativo.
- Uma Copa inteira até o pódio, a disputa de 3º lugar jogando, a Série D e C, o continental com 4 grupos, a virada de
  temporada com o cartão de pódios e uma temporada com venda forçada.
- Recarregar a página no meio de uma competição e importar um código de backup antigo (a migração de saves foi testada só
  com saves sintéticos).
- Conferir o efeito do mando fora de casa no continental na bilheteria.
- A sensação da dificuldade: clube típico vencendo cerca de 42% dos jogos e o primeiro título de Série D.
- Ao testar com `npm run dev`, não deixe agentes editando o código ao mesmo tempo: cada recarga do servidor de
  desenvolvimento apaga a partida em andamento.
- A revisão final do Opus do rebalanceamento foi feita; os bugs de dinheiro infinito que ela achou foram corrigidos (atleta
  emprestado vendável, peneira ilimitada, elenco mínimo contando emprestados, empréstimo de saída a 25% ao ano, mensagens de
  gasto recusado, textos do teto, cores, aviso de folha) e provados no teste t21-exploits.

## 5. Permissões e ações fora do comum durante a execução

- Nenhum pedido de permissão ficou sem resposta. Os agentes de verificação usaram Playwright, jsdom e scripts Node fora de
  `src/` (no scratchpad e em pastas temporárias); nada disso foi adicionado ao `package.json`.
- O repositório git da pasta do projeto foi criado por mim (`git init`) e não tem commits. A pasta `_origem/` guarda os
  arquivos originais da exportação.

## 6. Do projeto anterior (SoccerStar BR), só para registro

- O projeto foi cancelado e removido a seu pedido (banco de produção e de teste revertidos ao estado base, arquivos locais
  não commitados apagados, memória apagada).
- **Os tokens `sbp_` do Supabase continuam ativos** até você revogá-los no painel. Eu apenas deixei de usá-los.

## 2f. Revisão final da progressão (T9, Opus)

Corrigido: V3 não reescala mais um save já na escala nova; V3 inicializa `progress` (tendência e marcos de saves antigos); contraste AA dos textos verdes novos; `calib --check` usa `maximoRot:120`.

Decisões do dono:
- **b1** Série D é "armadilha de caixa": quem evolui paga mais salário sem receita extra. Opções: manter, permitir renovar com caixa negativo até o limite de dívida, ou subir o bônus de vitória da D.
- **b2** Jovem da base promovido de graça rende ~+21 mil por venda (~+100 mil/temporada com 5 jovens na D). Opção: estender o teto de venda (`saleCap`) por 2 temporadas para promovidos.
- **b3** Valor OVER 90 vs 85 = 1,82x. Recomendado manter.
- **b4** Titular de 17 anos evolui 5,17/temporada (alvo do plano 3,5–5,5). Manter.

A carreira "forte" lenta na escada foi diagnosticada: artefato do script (reserva de caixa baixa, renovação só na virada) mais b1; não é bug.

**Decisão do dono (2f):** manter os recomendados. b1 manter como está, b2 manter (sem estender `saleCap`), b3 manter 1,82x, b4 manter 5,17/temporada. Nenhuma constante alterada.

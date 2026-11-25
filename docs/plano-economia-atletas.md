# Plano: economia do atleta (custo-benefício para o clube)

> **Nota:** os scripts citados abaixo que não estão em `docs/calibracao/` (por exemplo `mkoverlay-atletas.mjs`) não foram versionados. O que foi medido está nas tabelas deste documento.

Escopo: responder se a folha por jogo pesa de fato nas rodadas, medir o custo-benefício dos atletas por OVER e por série, apontar as distorções e projetar um modelo único de valor, salário, contrato, venda, empréstimo e envelhecimento. Este documento só projeta. `src/` não foi tocado. Quem implementa são as tarefas da seção 6.

**Status (T7 concluída):** T1 a T7 prontas; testes, simulador (`--check` OK), tsc e build passam. Falta a T8 (revisão final em Opus). Luvas da B medidas em 39,8 mil (alvo 40 a 48 mil), as demais dentro do alvo.

**Atenção:** `src/` mudou enquanto este plano era escrito. Outra etapa está implantando o OVER máximo 99 raro (`ATHLETE_MAX_OVERALL`, `OVER_TAIL`, `EVOLUTION`, `evolutionFactor`, opção `tail` de `generatePlayer`). As trocas abaixo foram feitas sobre esse estado e não desfazem nada dele. Se `src/` mudar de novo, aplicar cada troca pelo sentido.

Scripts (todos em `docs/calibracao/`; copiar para a raiz do projeto para rodar e apagar a cópia depois):

| Script | O que faz |
|---|---|
| `mkoverlay-atletas.mjs` | Gera uma cópia de `src/` com todas as trocas deste plano, sem tocar em `src/`. É a referência exata de cada troca e falha se algum trecho original sumir. `node docs/calibracao/mkoverlay-atletas.mjs <pasta>` |
| `calib-atletas.mjs` | `calib-carreira.mjs` com três ajustes: o salário acompanha o OVER fixado pela política a cada jogo; quando o modelo novo está ativo, renova todo contrato no último ano (pagando as luvas reais) e guarda caixa para isso antes de ampliar; e quem sai é reposto na mesma posição, com a escalação refeita. Aceita `--overlay` e `--check`, como o original. |
| `vivo-atletas.mjs` | Carreira "viva": OVER real (evolução, envelhecimento, contratos), contratações pelo scouting, vendas, propostas e base pelo código real. Políticas: `vivo` (técnico razoável), `formador` (3 peneiras por temporada, segura os jovens 1 temporada e vende) e `flip` (compra 1 atleta por temporada só para revender). |
| `tabelas-atletas.mjs` | Tabelas por OVER e custo-benefício, com as fórmulas atual e nova. |
| `t23-atletas.mjs` | Teste novo (rascunho pronto e validado contra a cópia gerada pelo `mkoverlay-atletas.mjs`). |

---

## 0. Resposta curta ao dono

- **A folha é descontada de verdade, a cada partida do usuário, em todas as competições.** Entram todos os atletas do elenco, menos os emprestados para fora: os emprestados de entrada, os reservas e os lesionados também recebem. Não existe jogo sem receita. Copa, Supercopa, Recopa e o mata-mata continental são sempre em casa, com bilheteria cheia.
- **O problema não é a folha, é o atleta.** O valor de mercado é fixo desde a geração e não acompanha a evolução nem a idade. O contrato nunca vence (`max(1, anos − 1)`), então renovar não serve para nada. A multa de 2,2x só aparece na tela. Ninguém envelhece: o OVER só sobe e, na carreira viva atual, o clube chega a OVER 77 a 79 sem gastar com reposição. As propostas recebidas pagam até 1,38x o valor. E um atleta 99 custa 6.075 por jogo, só 2,9 vezes um titular típico da Série A.
- **Modelo novo:** valor recalculado sempre que o OVER ou a idade mudam; prêmio de estrela acima de OVER 85 no salário e no valor; contrato que vence e sai de graça se não for renovado (luvas de 2,5% do valor por temporada); queda de OVER a partir dos 31 e aposentadoria aos 37; nenhuma venda acima do valor pago na temporada da chegada; empréstimo e propostas sobre o valor atual.
- **Metas mantidas:** `--check` OK, clube típico com 40% a 45% de vitórias, saldo sem prêmio igual ao de antes, saldo total menor (as luvas custam de 10 mil por temporada na D a 76 mil na A), Série D sem travar e elenco de craques ainda mais longe de se pagar sozinho.

---

## 1. Diagnóstico

### 1.1 A folha por jogo (código)

| Ponto | Onde | Fato |
|---|---|---|
| Desconto por partida | `useMatchSimulation.concludeMatch` → `useEconomy.settleMatch` | `net = ticket + sponsor + winBonus − wages − interest − maintenance`. Roda em toda partida do usuário: liga (pontos corridos, grupos, mata-mata, playoff), Copa (inclusive a disputa de 3º), continental (grupos e mata-mata), Supercopa e Recopa. Jogos da IA não cobram nada. |
| Quem recebe | `squad.totalWageBill` | Soma de `p.wage` de todo o elenco, exceto `isLoanedOut`. **Emprestado de entrada: o usuário paga o salário inteiro.** Reserva, lesionado e quem não jogou também recebem. |
| Receita nos jogos sem mando | `activeMatchIsHome` | Copa, Supercopa e Recopa são sempre `true` (bilheteria cheia). No continental, o mata-mata é sempre em casa e os grupos têm 3 jogos em casa e 3 fora. Só a liga tem jogos fora (40% da bilheteria). **Não existe jogo sem receita**, e as finais únicas pagam a bilheteria inteira. |
| Quando o salário muda | `squad.applyEndOfSeason`, renovação, migração | Só na virada. A evolução pós-jogo (`applyPostMatchProgression`) sobe o OVER (de 0,09 a 0,33 por jogo com CT e comissão) sem subir o salário durante a temporada. |

Jogos do usuário por temporada (formatos de `SERIE_META`, medido no `tipicoRot`):

| Série | Liga | Copa | Continental / finais | Média medida | Folha anual do clube típico |
|---|---|---|---|---|---|
| D | 10 (grupos) a 20 (com mata-mata) | 1 a 5 | — | 16,4 a 17,4 | 275 mil |
| C | 19 a 27 (com quadrangular e final) | 1 a 5 | — | 26,1 a 26,9 | 613 mil |
| B | 38 | 1 a 5 | — | 41,3 | 1,33 M |
| A | 38 | 1 a 5 | 6 a 13 + 0 a 2 finais | 42,2 (até ~50 com continental) | 1,86 M |

Saldo de um jogo do clube típico (titulares no OVER típico, reservas 4 abaixo, instalações típicas da série):

| Série (estádio/finanças) | Receita em casa | Receita fora | Bônus V / E | Folha | Manutenção | Em casa sem vitória | Fora sem vitória |
|---|---|---|---|---|---|---|---|
| D (1/1) | 17.300 | 12.110 | 4.325 / 1.730 | 15.925 | ~60 | +1,3 mil | −3,9 mil |
| C (3/3) | 26.090 | 18.263 | 5.260 / 2.104 | 22.275 | ~1.050 | +2,8 mil | −5,1 mil |
| B (4/4) | 37.237 | 26.066 | 6.845 / 2.738 | 30.525 | ~2.470 | +4,2 mil | −6,9 mil |
| A (6/6) | 53.120 | 37.184 | 8.300 / 3.320 | 42.350 | ~5.490 | +5,3 mil | −10,7 mil |

A folha pesa nos jogos fora da liga e é coberta pelos jogos em casa e pelos bônus. Nenhuma competição tem jogo "só de despesa". O ajuste não está na folha por jogo, que já foi calibrada (`plano-balanceamento.md`, seção 4.2). Está no atleta.

### 1.2 Tabela por OVER: modelo atual

Fórmulas atuais: salário `max(500, arred25(1000 × 2^((OVER − 60)/15)))`. Valor (só na geração, nunca recalculado) `max(15.000, arred500((18.000 + max(0, OVER − 58)^2,15 × 450) × fIdade × (1 + 0,025 × (pot − OVER))))`, com `fIdade` em degraus: até 21 anos 1,25; até 26, 1,10; até 30, 0,92; depois 0,72. Potencial típico: +7 até 23 anos, +1,5 de 24 a 30, 0 depois.

| OVER | Salário/jogo | Valor 21a | Valor 25a | Valor 29a | Valor 33a | Venda 0,85 (25a) | Com Analista 0,935 | Venda forçada 0,7 | Renovação 22% | Multa 2,2x (decorativa) | Empréstimo saída 10% | Proposta média 1,05 | Proposta máx. 1,38 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 55 | 800 | 27 mil | 21 mil | 17 mil | 15 mil | 17 mil | 19 mil | 14 mil | 5 mil | 45 mil | 2 mil | 22 mil | 28 mil |
| 60 | 1.000 | 30 mil | 23 mil | 19 mil | 15 mil | 20 mil | 22 mil | 16 mil | 5 mil | 51 mil | 2 mil | 24 mil | 32 mil |
| 65 | 1.250 | 70 mil | 54 mil | 46 mil | 34 mil | 46 mil | 50 mil | 38 mil | 12 mil | 119 mil | 5 mil | 57 mil | 75 mil |
| 70 | 1.575 | 165 mil | 128 mil | 107 mil | 81 mil | 109 mil | 120 mil | 90 mil | 28 mil | 282 mil | 13 mil | 134 mil | 177 mil |
| 75 | 2.000 | 319 mil | 248 mil | 207 mil | 156 mil | 210 mil | 231 mil | 173 mil | 54 mil | 545 mil | 25 mil | 260 mil | 342 mil |
| 80 | 2.525 | 535 mil | 416 mil | 348 mil | 263 mil | 353 mil | 388 mil | 291 mil | 91 mil | 914 mil | 42 mil | 436 mil | 573 mil |
| 85 | 3.175 | 817 mil | 635 mil | 531 mil | 400 mil | 539 mil | 593 mil | 444 mil | 140 mil | 1,40 M | 63 mil | 666 mil | 876 mil |
| 90 | 4.000 | 1,16 M | 905 mil | 757 mil | 571 mil | 769 mil | 846 mil | 634 mil | 199 mil | 1,99 M | 91 mil | 950 mil | 1,25 M |
| 95 | 5.050 | 1,58 M | 1,23 M | 1,03 M | 776 mil | 1,04 M | 1,15 M | 860 mil | 270 mil | 2,70 M | 123 mil | 1,29 M | 1,70 M |
| 99 | 6.075 | 1,97 M | 1,53 M | 1,28 M | 964 mil | 1,30 M | 1,43 M | 1,07 M | 336 mil | 3,36 M | 153 mil | 1,60 M | 2,11 M |

Outros preços atuais: contratação por scouting = valor (100%) + missão (8 a 55 mil); empréstimo de entrada = 18% do valor (só jovens de 65 a 75); proposta de empréstimo recebida = 28% do valor; jovem promovido da base com valor travado em `min(25% do valor, 12.500)`.

### 1.3 Custo-benefício de +1 OVER no time

Curva atual (`MATCH_SIM`, inclinação 0,0030, mando 3; `curva.mjs`): no centro, **+1 OVER no time = +1,66 ponto percentual (p.p.) de vitória** e −0,23 p.p. de empate, ou +0,047 ponto por jogo. O valor de "~2,9 p.p. por OVER" citado na pergunta não confere: 2,9 p.p. seria a inclinação do motor antigo. A curva medida no jogo real dá 41 a 44% com OVER igual, 66 a 67% com +15 e 19% com −15.

+1 OVER no time = os 11 titulares 1 ponto melhores (ou trocar 2 titulares por atletas 5,5 melhores). Por temporada, no OVER típico da série:

| Série | OVER típico | Jogos | Folha extra | Compra (11 × Δvalor, 25 anos) | Custo anual atual (folha + 5% do capital) | Custo anual novo (folha + 12% do capital) | Retorno: bônus de vitória | Retorno: prêmios esperados | **R$ por p.p. de vitória, atual** | **R$ por p.p., novo** | Retorno por p.p. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| D | 61 | 16,4 | 9 mil | 50 mil | 11 mil | 15 mil | 1 mil | 6 mil | 7 mil | 9 mil | 4 mil |
| C | 66 | 26,6 | 18 mil | 143 mil | 25 mil | 35 mil | 2 mil | 9 mil | 15 mil | 21 mil | 7 mil |
| B | 71 | 41,2 | 36 mil | 242 mil | 48 mil | 65 mil | 4 mil | 17 mil | 29 mil | 39 mil | 13 mil |
| A | 76 | 41,6 | 45 mil | 347 mil | 63 mil | 87 mil | 5 mil | 21 mil | 38 mil | 52 mil | 16 mil |

- Capital por temporada: hoje, só o desconto de 15% na revenda dividido por ~3 temporadas (5%), porque o valor não cai. No modelo novo: 5% de revenda + 2,5% de luvas + ~4,5% de depreciação média por idade = 12%.
- Prêmios esperados por OVER: (prêmio médio do `forteRot`, +15, menos o do `fracoRot`, −15) ÷ 30, por série.
- **Leitura:** em nenhuma série +1 OVER se paga com bônus e prêmios. O retorno cobre de 40% a 55% do custo hoje e de 30% a 45% no modelo novo. Contratar caro é consumo do excedente do clube, não investimento, e é exatamente o "elenco de craques não se paga sozinho" já aprovado. O excedente do clube típico (saldo total por temporada, seção 3) compra de 7 a 8 p.p. sustentados na D (cerca de +4 a +5 OVER), 5 na C, 6 na B e 6 a 7 na A. **Contratar acima do típico só vale quando há prêmio ou caixa sobrando para isso**, e a tabela "R$ por p.p." diz quanto custa cada ponto.

### 1.4 Distorções encontradas

| # | Distorção | Evidência |
|---|---|---|
| 1 | **Valor estático.** Só é calculado em `generatePlayer`. A evolução sobe o OVER e a idade avança, mas o valor nunca muda. | Um jovem 60 que chega a 78 continua valendo o mesmo. Um veterano de 36 vale o mesmo que aos 29. |
| 2 | **Jovem da base travado em 12.500.** `promoteYouthProspect` grava `min(25% do valor, 12.500)` para sempre. | Formar e vender um jovem que virou 75 rende no máximo 11,7 mil. A base não tem valor econômico (`formador` atual: venda de jovens de 12 a 30 mil por temporada). |
| 3 | **Salário atrasado na temporada.** O OVER sobe após cada jogo e o salário só na virada. | Com CT 5 e Auxiliar, +0,33 OVER por jogo: até +13 OVER numa temporada da A pelo salário antigo. |
| 4 | **Contrato que nunca vence.** `squad.ts`: `contractYears = Math.max(1, contractYears − 1)`. | Ninguém sai. "Contrato: 1 temp." é eterno. |
| 5 | **Renovação sem efeito.** Custa 22% do valor e só soma +2 a um número que não serve para nada. | Dinheiro jogado fora; o jogador racional nunca renova. |
| 6 | **Multa decorativa.** `PlayerDetails.vue`: "Multa Rescisória (2.2x)" só é exibida. | Nenhum código a usa. |
| 7 | **Empréstimos incoerentes.** Saída manual 10% do valor por temporada (e a folha some); a mesma saída por proposta paga 28% (2,8x); entrada 18%. | Três preços para a mesma operação. |
| 8 | **Revenda por proposta acima do valor.** Propostas pagam de 0,95 a 1,15x o valor; a contraproposta dá +20% com 62% de chance; o máximo é 1,38x. | `flip` atual: lucro de 4,6 mil (B) a 6,9 mil (A) por temporada só comprando e revendendo. Na teoria, até +38% por ciclo num atleta listado. |
| 9 | **Venda manual:** 0,85 (0,935 com o Analista) é menor que 1, então comprar e vender na hora não dá lucro. Mas, com o valor estático, o preço de venda não tem relação com o atleta atual. | Distorções 1 e 2. |
| 10 | **Sem envelhecimento.** A idade sobe, mas OVER, valor e salário não caem, e não há aposentadoria. | `vivo` atual: OVER final de 74 a 79, sem gastar com reposição; um atleta de 40 anos joga como aos 28. |
| 11 | **Degraus de idade no valor.** −16% de uma vez aos 27, −22% aos 31. | Inofensivo hoje (o valor é fixo), mas seria um salto se o valor fosse recalculado. |
| 12 | **OVER 99 barato.** Salário de 6.075 por jogo (2,9x um titular típico da A, 2.100) e valor de 1,53 M (25 anos). | A regra nova de 99 raríssimo pede preço de exceção: no modelo novo, 16.000 por jogo e 4,0 M. |
| 13 | **Potencial sem teto.** +2,5% por ponto de diferença; uma Joia Rara com +30 vale 1,75x. | Infla o valor de jovens. |

---

## 2. Modelo novo

Princípio: **valor e salário sempre derivados do OVER e da idade atuais**, recalculados num único ponto (`refreshPlayerEconomy`). O contrato decide quanto tempo o atleta fica, não quanto ele custa por jogo. Nenhuma venda passa do valor pago na temporada em que o atleta chegou.

### 2.1 Fórmulas

```
fEstrela(OVER) = OVER > 85 ? 2^((OVER − 85) / 10) : 1

salário/jogo   = max(500, arred25(1000 × 2^((OVER − 60) / 15) × fEstrela(OVER)))

fIdade(idade)  = idade < 24  : min(1,25 ; 1,10 + 0,03 × (24 − idade))
                 24 a 27     : 1,10
                 idade > 27  : max(0,40 ; 1,10 − 0,09 × (idade − 27))
fPot           = 1 + 0,02 × min(20, max(0, potencial − OVER))
valor          = max(5.000, arred500((18.000 + max(0, OVER − 58)^2,15 × 450) × fIdade × fPot × fEstrela(OVER)))
```

**Quando recalcular** (`refreshPlayerEconomy(p)`: `p.value = valueForPlayer(p)` e `p.wage = wageForOverall(p.overall)`): ao gerar o atleta, sempre que a evolução pós-jogo subir o OVER, na virada (depois de envelhecer), na renovação e na migração do save.

**Contrato.** Cada virada tira 1 temporada do contrato. Quem chega a 0 sai de graça. Quem está com 1 aparece como "Último ano" na interface. A renovação é decisão do jogador: soma 2 temporadas (1 a partir dos 32 anos), com teto de 5, e cobra **luvas = arred(valor × 0,025 × temporadas)**. O salário segue o OVER atual. Com caixa negativo, a renovação fica bloqueada, como qualquer gasto.

**Envelhecimento** (na virada, com a idade já somada): perde 1 OVER aos 31 e 32 anos, 2 aos 33 e 34 e 3 aos 35 e 36. Os atributos caem o mesmo tanto, o potencial passa a ser o OVER atual (para de evoluir) e valor e salário são recalculados. **Aposenta-se aos 37** (sai na virada). Se o elenco cair abaixo de 11, a virada completa com jovens da base, como já faz hoje.

**Mercado.**

| Operação | Atual | Novo |
|---|---|---|
| Contratação pelo scouting | valor | valor (sem mudança) e grava `acquiredSeason` e `acquiredFee` |
| Venda manual | valor × 0,85 (× 1,10 com o Analista) | igual, sobre o valor atual; **na temporada da chegada, no máximo `acquiredFee`** |
| Venda forçada (dívida) | valor × 0,7 | igual, com o mesmo teto da chegada |
| Proposta de compra recebida | valor × 0,95 a 1,15; contraproposta ×1,20 (62%) | valor × 0,85 a 1,05; contraproposta ×1,15 (55%); mesmo teto da chegada |
| Empréstimo (saída manual, proposta recebida e entrada) | 10% / 28% / 18% | **12% do valor por temporada** nos três casos |
| Promoção da base | grátis, valor travado em `min(25%, 12.500)` | grátis, **valor real**; na temporada da promoção, `acquiredFee = 0` (vender nessa temporada rende 0) |
| Renovação | 22% do valor, sem efeito | luvas de 2,5% do valor por temporada; sem renovar, o atleta sai |
| Multa rescisória | 2,2x, só exibida | **removida** da interface (decisão 1) |

Por que 12%: é o custo de capital de uma temporada no modelo novo (seção 1.3). Pegar emprestado custa o mesmo que comprar e revender um ano depois.

### 2.2 Tabela por OVER: modelo novo

| OVER | Salário/jogo | Valor 21a | Valor 25a | Valor 29a | Valor 33a | Valor 35a | Venda 25a | Luvas +2 temporadas | Empréstimo 12% | Valor ÷ salário |
|---|---|---|---|---|---|---|---|---|---|---|
| 55 | 800 | 25 mil | 21 mil | 17 mil | 10 mil | 7 mil | 17 mil | 1 mil | 2 mil | 26 |
| 60 | 1.000 | 27 mil | 23 mil | 19 mil | 11 mil | 8 mil | 19 mil | 1 mil | 3 mil | 23 |
| 65 | 1.250 | 65 mil | 54 mil | 44 mil | 27 mil | 19 mil | 46 mil | 3 mil | 6 mil | 43 |
| 70 | 1.575 | 152 mil | 127 mil | 103 mil | 63 mil | 45 mil | 108 mil | 6 mil | 15 mil | 81 |
| 75 | 2.000 | 295 mil | 246 mil | 200 mil | 122 mil | 87 mil | 209 mil | 12 mil | 30 mil | 123 |
| 80 | 2.525 | 494 mil | 413 mil | 335 mil | 204 mil | 146 mil | 351 mil | 21 mil | 50 mil | 163 |
| 85 | 3.175 | 754 mil | 630 mil | 512 mil | 312 mil | 223 mil | 536 mil | 32 mil | 76 mil | 198 |
| 90 | **5.650** | 1,52 M | **1,27 M** | 1,03 M | 628 mil | 449 mil | 1,08 M | 64 mil | 152 mil | 225 |
| 95 | **10.075** | 2,92 M | **2,44 M** | 1,98 M | 1,21 M | 862 mil | 2,07 M | 122 mil | 293 mil | 242 |
| 99 | **16.000** | 4,79 M | **4,00 M** | 3,25 M | 1,98 M | 1,41 M | 3,40 M | 200 mil | 480 mil | 250 |

- Até OVER 85 o salário é **idêntico** ao atual (61 = 1.050, 76 = 2.100, 85 = 3.175): toda a calibração da folha fica de pé. O valor no pico (24 a 27 anos) fica a ±3% do atual.
- Acima de 85, salário e valor dobram a mais a cada 10 pontos. Um 99 custa 7,6 titulares típicos da A por jogo e de 10 a 12 temporadas de saldo de um clube típico da A. O valor cresce junto com o salário (a razão entre os dois varia de 198 a 250 na faixa de estrela), sem descolar.
- O valor cai com a idade a partir dos 28 anos e despenca dos 33 em diante (OVER perdido mais fator de idade): quem segura veterano perde revenda; quem renova veterano paga luvas baixas.

### 2.3 Constantes novas (valores finais)

**`src/utils/constants.ts`** (perto de `WAGE`):

```ts
/** Prêmio de estrela: acima de STAR.from, salário e valor dobram a mais a cada STAR.doubleEvery pontos de OVER. */
export const STAR = { from: 85, doubleEvery: 10 }
/** Valor de mercado: (floor + max(0, OVER - ref)^exp x mult) x idade x potencial x estrela; arred. a step; mínimo min. */
export const VALUE = { floor: 18000, ref: 58, exp: 2.15, mult: 450, potStep: 0.02, potMaxGap: 20, min: 5000, step: 500 }
/** Fator de idade do valor: jovem até youngMax, pico entre peakFrom e peakTo, cai oldStep por ano depois (piso oldMin). */
export const VALUE_AGE = { youngMax: 1.25, youngStep: 0.03, peakFrom: 24, peakTo: 27, peak: 1.1, oldStep: 0.09, oldMin: 0.4 }
/** Contrato: cai 1 por virada; em 0 o atleta sai de graça. Renovação: luvas = valor x renewFeePerYear x anos. */
export const CONTRACT = { renewYears: 2, veteranAge: 32, veteranRenewYears: 1, maxYears: 5, renewFeePerYear: 0.025, migrationMinYears: 2 }
/** Envelhecimento na virada: perde OVER a partir de declineFrom e se aposenta em retireAge. */
export const AGING = { declineFrom: 31, dropAt33: 2, dropAt35: 3, retireAge: 37 }
/** Mercado: venda manual, empréstimo e propostas recebidas, sempre sobre o valor atual. */
export const TRANSFER = { saleShare: 0.85, loanShare: 0.12, offerMin: 0.85, offerMax: 1.05, counterMult: 1.15, counterChance: 0.55 }
```

Removida: `YOUTH_PROMOTED_VALUE_CAP`. Mantidas: `WAGE` (`doubleEvery` 15, `min` 500), `ECONOMY.forcedSaleShare` 0,7, `STAFF_BONUS.analystSaleBonus` 0,1, `SERIE_ECONOMY`, `PRIZES`, `UPGRADE_COSTS`, `MATCH_SIM`.
`TRANSFER_LABELS` ganha `release: 'Fim de contrato'` e `retire: 'Aposentadoria'`; `TransferOperationType` (`src/types/club.ts`) ganha `'release' | 'retire'`.

**`src/utils/generatePlayer.ts`** (funções exportadas): `starFactor(overall)`, `ageValueFactor(age)`, `valueForPlayer({ overall, age, potential })`, `refreshPlayerEconomy(p)`, `agingDrop(age)` (0 até 30; 1 aos 31 e 32; 2 aos 33 e 34; 3 dos 35 em diante), `applyAging(p)`, `saleCap(p, amount, season)` (`p.acquiredSeason === season ? min(amount, p.acquiredFee ?? amount) : amount`). `wageForOverall` passa a multiplicar por `starFactor`. `generatePlayer` usa `valueForPlayer`.

**`src/types/player.ts`**: `acquiredSeason?: number` e `acquiredFee?: number` (opcionais: saves antigos não têm).

**`src/utils/balanceMigration.ts`**: `ATHLETE_ECONOMY_VERSION = 1` e `migrateAthleteEconomyV1(ctx)`, gravada em `club.athleteEconomyVersion`. Campo separado de `balanceVersion` (que segue 2, para não mexer no t20). Fica dentro de `club`: o save continua com 17 chaves.

### 2.4 Migração de saves (`migrateAthleteEconomyV1`, chamada em `usePersistence.loadGame` depois de `migrateBalanceV2`)

Só roda se `saved.club.athleteEconomyVersion < 1`. Para cada atleta do elenco:

1. guarda o valor antigo;
2. `age = min(age, AGING.retireAge − 2)` (35): ninguém se aposenta na primeira virada sem um ano de aviso;
3. `contractYears = min(5, max(2, contractYears))` (exceto emprestados de entrada): ninguém sai de graça na primeira virada;
4. `refreshPlayerEconomy(p)`;
5. `acquiredSeason = season atual`, `acquiredFee = min(valor antigo, valor novo)`: nesta temporada a venda fica limitada ao valor antigo, o que impede o lucro instantâneo com a revalorização (por exemplo, o jovem travado em 12.500 que hoje vale 100 mil).

Relatórios de scouting e jovens da base: só `refreshPlayerEconomy`. O caixa não é tocado. `saveGame` grava `athleteEconomyVersion: ATHLETE_ECONOMY_VERSION` em `club`. É idempotente: recarregar não muda nada (t23 h7).

---

## 3. Calibração: antes x depois

Medido com `calib-atletas.mjs` (fluxo real: Pinia, stores, `simulateMatchTick`, `settleMatch`, virada) contra `src/` (antes) e contra a cópia gerada por `mkoverlay-atletas.mjs` (depois).

Comando final (validado):

```
node docs/calibracao/mkoverlay-atletas.mjs <pasta>
node _calib-atletas.mjs 20 curva,tipicoRot:240,forteRot:80,fracoRot:80,maximoRot:40,tipico,tipicoD,tipicoC,tipicoB,tipicoA,forte,fraco,caroFraco,investidor --check --overlay <pasta>
```

Resultado: **CHECK OK: todos os alvos atingidos** (curva, saldo sem prêmio e total do típico por série, vitórias de 38% a 50%, teto do elenco máximo, saldo do elenco máximo na A abaixo de 400 mil, D sem trava, 0 erros). A linha de base (`src/` atual) também dá CHECK OK.

### 3.1 Clube típico por série (`tipicoRot`, 60 temporadas por série, caixa neutro a cada temporada)

| Série | Vitórias antes → depois | Saldo sem prêmio antes → depois | Luvas por temporada (renovações) | **Saldo total antes → depois** |
|---|---|---|---|---|
| D | 41,2% → 40,9% | +8,5 mil → +7,3 mil | 10,5 mil (8,9) | **+68 mil → +76 mil** |
| C | 41,9% → 42,4% | +24 mil → +25 mil | 20 mil (9,4) | **+131 mil → +115 mil** |
| B | 43,2% → 44,1% | +47 mil → +50 mil | 43 mil (10,7) | **+263 mil → +251 mil** |
| A | 45,2% → 44,1% | +39 mil → +34 mil | 76 mil (11,0) | **+430 mil → +334 mil** |

- O saldo sem prêmio não muda: a folha por jogo é a mesma abaixo de OVER 85.
- O saldo total cai pelo valor das luvas (de 1 a 2 renovações por titular a cada 2 temporadas). O ruído entre rodadas de 60 temporadas é de ±20 mil (a rodada com luvas a 0,025 deu D 62 mil, C 104 mil, B 215 mil e A 355 mil). As luvas medidas são estáveis: D 10 a 11 mil, C 18 a 20 mil, B 43 a 44 mil, A 69 a 76 mil.
- Luvas testadas: 0,02 (A −54 mil por temporada), **0,025 (A −69 a −76 mil, escolhida)** e 0,03 (A −82 mil; D cai para +67 mil). Com 0,025, renovar um titular típico por 2 temporadas custa 1,3 mil na D, 3,3 mil na C, 7 mil na B e 13,8 mil na A: dá para sentir, sem pesar.

### 3.2 Clube típico preso a uma série (20 temporadas, compra toda ampliação que cabe)

| Série | Ampliações por temporada antes → depois | Vitórias antes → depois | Saldo médio antes → depois | Caixa ao fim de cada temporada, depois (mil) |
|---|---|---|---|---|
| D (`tipicoD`) | 1,05 → 0,80 | 42,5% → 37,7% | 125 mil → 69 mil | 72, 288, 149, 95, 101, 59, 117, 52, 107, 142, 40, 98, 133, 208, 119, 201, 100, 214, 94, 174 |
| C (`tipicoC`) | 0,80 → 0,85 | 41,9% → 42,8% | 140 mil → 186 mil | 107, 554, 233, 158, 248, 198, 158, 491, 400, 534, 410, 362, 382, 506, 658, 879, 160, 155, 141, 497 |
| B (`tipicoB`) | 0,80 → 0,80 | 44,2% → 42,4% | 330 mil → 360 mil | 380, 525, 558, 417, 420, 347, 676, 329, 788, 469, 445, 821, 562, 1286, 714, 1004, 687, 954, 1529, 685 |
| A (`tipicoA`) | 0,65 → 0,50 | 44,8% → 42,2% | 628 mil → 470 mil | 426, 1107, 821, 1323, 794, 765, 847, 291, 516, 949, 1426, 1107, 822, 1421, 1190, 694, 1446, 1174, 1405, 1456 |

Antes (mil, fim de cada temporada): D 287, 237, 495, 183, 106, 112, 129, 185, 89, 437, 191, 195, 620, 320, 69, 90, 91, 75, 210, 200; C 84 … 337; B 487 … 75; A 587 … 272. Cada linha é uma única carreira, com o sorteio de Copa e acesso. A D nunca trava: caixa mínimo de +4 mil, 0 vendas forçadas, 0,8 ampliação por temporada.

Carreira natural `tipico` (D → A), caixa ao fim de cada temporada (mil):
- antes: 88, 74, 115, 87, 101, 141, 119, 338, 91, 208, 387, 620, 368, 607, 762, 667, 552, 1039, 1445, 1042 (34 ampliações);
- depois: 68, 173, 61, 215, 192, 191, 333, 261, 505, 489, 542, 905, 1034, 537, 873, 751, 871, 966, 601, 1386 (35 ampliações; luvas de 8 mil na D a 69 mil na A).

### 3.3 Elenco caro e elenco fraco

| Política | Antes | Depois | Leitura |
|---|---|---|---|
| `maximoRot` (11 × 88 + 7 × 80, tudo no máximo), A | vitórias 58%, saldo −382 mil | vitórias 61%, saldo **−1,02 M** | Com o prêmio de estrela, o 88 custa 4.500 por jogo (antes 3.650): o elenco de craques fica ainda mais longe de se pagar. |
| `forteRot` (+15), A | 66%, −1,27 M | 66%, −1,12 M | Na A o +15 é OVER 91. O saldo melhora só por um artefato do simulador: a venda forçada de estrelas valorizadas e a reposição grátis do `fitSquad`. No jogo real, a estrela foi comprada pelo valor cheio. |
| `fracoRot` (−15) | D +140 mil … A +903 mil | D +89 mil … A +923 mil | Mesmo comportamento (decisão 1 do plano de balanceamento, já aceita). |

### 3.4 Carreira viva (OVER real; `vivo-atletas.mjs`, 5 carreiras de 20 temporadas por política)

| Política | Antes | Depois |
|---|---|---|
| `vivo`: OVER do time na temporada 20 | 79, 77, 76, 74, 78 (média 76,8) | 72, 74, 75, 74, 71 (média 73,3) |
| `vivo`: caixa final | média 996 mil (5 de 5 na A) | média 720 mil (3 na A, 2 na B) |
| `vivo`: temporadas na A / vitórias na A | 39% / 40,4% | 43% / 37,6% |
| `vivo`: idade média do elenco na A | 28,8 (ninguém se aposenta) | 28,1 (6,6 saídas por carreira, entre fim de contrato e aposentadoria) |
| `vivo`: luvas por temporada | 0 | D 19 mil, C 40 mil, B 91 mil, A 97 mil |
| `formador`: venda de jovens por temporada | D 12 mil, A 28 mil | D 25 mil, C 100 mil, B 158 mil, A 352 mil (bruto) |
| `formador`: saldo na A, comparado ao `vivo` | 70 mil (vivo 96 mil) | 73 mil (vivo 41 mil): a base passa a valer +30 mil por temporada |
| `flip`: lucro de revenda por temporada | B 4,6 mil, A 6,9 mil | ~0 (D 0,8 mil); a política se prejudica (2 de 5 carreiras ficam presas na D) |

Leitura: o modelo novo acaba com a inflação gratuita de OVER (−3,5 OVER na temporada 20), põe custo recorrente no elenco (luvas e reposição de veteranos), dá valor econômico à base sem virar máquina de dinheiro e fecha a revenda por proposta.

### 3.5 Testes contra a cópia com as trocas

- `t17-e2e.mjs` (7 políticas, 20 temporadas): 0 erros de chave, 0 falhas de save (210 conferências de salvar e recarregar).
- `t19-prizes`, `t20-balance-migration`, `t21-exploits`: OK (inclusive o "peneira, promover e vender nunca dá lucro" e as "17 chaves").
- `t23-atletas` (novo, `docs/calibracao/t23-atletas.mjs`): 36 asserções OK. Cobre fórmulas e monotonia; evolução que recalcula valor e salário; contrato que vence; aposentadoria; envelhecimento; renovação (luvas, veterano, teto); 200 ciclos de contratar e vender (proposta e contraproposta) sem lucro; base grátis com venda 0 na temporada da promoção; venda forçada com teto; migração idempotente com 17 chaves.
- `vue-tsc --noEmit`: OK numa cópia do projeto com as trocas aplicadas.

---

## 4. Riscos e exploits remanescentes

1. **Lucro de formação.** Com valor real, segurar jovens da base uma temporada e vendê-los rende até ~350 mil brutos por temporada na A (`formador`). No líquido, a política fica só +30 mil por temporada acima do `vivo`, por causa da folha dos jovens e da vaga ocupada. Se pesar, as alavancas são `VALUE.potStep` (0,02 → 0,015) e `VALUE_AGE.youngMax` (1,25 → 1,15), sem tocar no resto. A variante com luvas de 35% do valor na promoção foi testada e rejeitada: derrubou os clubes pobres da D (`vivo` ficou preso na D/C em 3 de 4 carreiras).
2. **Armadilha de caixa zero.** Com caixa negativo, a renovação é bloqueada e o atleta sai. Um clube mal gerido pode encolher (a `flip` ficou presa na D). Mitigação: luvas baixas, aviso de "Último ano" com antecedência de uma temporada e reposição automática com jovens se o elenco cair abaixo de 11. O jogo não trava: a receita continua e o elenco nunca fica abaixo de 11.
3. **Empréstimo como "férias de folha".** Emprestar um reserva rende 12% do valor e zera o salário dele por uma temporada. É legítimo (o clube perde o atleta) e o preço agora é igual nos três caminhos.
4. **Contraproposta.** Uma temporada depois da chegada, uma proposta pode chegar a 1,05 × 1,15 = 1,21x o valor atual. O lucro só existe se o atleta evoluiu ou o tempo passou, com folha paga no meio. O `flip` mede ~0.
5. **Prêmio de estrela a partir de 85.** Já pesa de 86 a 89 (+7% a +32% no salário). Isso deixa a curva sem degrau, mas encarece o elenco máximo (−1,02 M por temporada na A).
6. **Simulador (`calib`) com OVER fixado:** a reposição grátis do `fitSquad` e a venda forçada de estrelas distorcem `forte` e `caroFraco`. Essas políticas não entram no `--check`.
7. **`src/` em mudança** (OVER 99): `generatePlayer` ainda limita o potencial a 96 enquanto o OVER pode ir a 99 pela cauda. `fPot` usa `max(0, pot − OVER)`, então não quebra. Fica para a outra etapa.
8. **Migração:** a idade dos veteranos de saves antigos é limitada a 35 (era ilimitada), o que é visível para o jogador. Contratos de 1 temporada viram 2.

---

## 5. Interface (resumo para a T6)

Paleta 60-30-10: fundo e cartões como hoje (60), texto e bordas neutros (30), destaque só em avisos (10): `amberpro` para "Último ano" e aposentadoria próxima, `dangerpro` para saída iminente. Rótulo "OVER" mantido. Textos em português, sem nomes reais.

- `PlayerDetails.vue`: "Contrato: N temp." com o selo **"Último ano: renove ou ele sai de graça na virada"** quando `contractYears === 1`, e **"Aposenta na virada"** quando `age === AGING.retireAge − 1`. O botão mostra "Renovar (+2 temp. • luvas R$ X)" (ou +1 para veterano), desabilitado quando `!canRenew(p)`, com o texto "Contrato no máximo (5 temp.)". Remover o cartão "Multa Rescisória (2.2x)" e pôr no lugar "Valor de mercado" (`player.value`). Na temporada da chegada, o botão Vender ganha o subtítulo "Recém-chegado: venda limitada ao valor pago".
- `SquadRoster.vue`: selo âmbar "Último ano" na linha do atleta; "Aposenta" para quem tem 36 anos.
- `DashboardView.vue`: cartão de alerta quando houver contratos no último ano ("N atletas em fim de contrato: renove até a virada") e aposentadorias na próxima virada.
- `YouthAcademyPanel.vue`: texto "Promoção grátis. Vendável a partir da próxima temporada."
- `LoanMarketModal.vue`: já mostra a taxa (`loanFee`), que muda de valor sozinha.
- Toast da virada (`useSeason`): "Saíram na virada: X (fim de contrato), Y (aposentadoria)." e registro em `transferHistory` com `release` ou `retire` (valor 0).

---

## 6. Tarefas de implementação (Sonnet, uma por delegação)

Regras para todas:

- Ler este plano e `docs/calibracao/mkoverlay-atletas.mjs`, que tem cada troca exata em texto (o padrão do script é a versão final: luvas 0,025, base grátis).
- `src/` pode ter mudado (OVER 99 em andamento). Aplicar cada troca pelo sentido e não apagar código novo (`tail`, `evolutionFactor`, `ATHLETE_MAX_OVERALL`).
- Pronto em todas: `npx vue-tsc --noEmit` e `npm run build` passam.
- Não fazer commit: a revisão em Opus (T8) vem antes.

Ordem: T1 → T2 → (T3, T4 e T5 em paralelo; não cruzam arquivos) → T6 → T7 → T8.

### T1 — `src/utils/constants.ts`
Acrescentar `STAR`, `VALUE`, `VALUE_AGE`, `CONTRACT`, `AGING` e `TRANSFER` com os valores da seção 2.3, perto de `WAGE`. Remover `YOUTH_PROMOTED_VALUE_CAP` (o único uso, em `useScouting.ts`, sai na T4; até lá a build pode quebrar, então a T1 e a T4 vão na mesma rodada, ou a remoção fica na T4). `TRANSFER_LABELS`: acrescentar `release: 'Fim de contrato'` e `retire: 'Aposentadoria'`. `src/types/club.ts`: `TransferOperationType` ganha `'release' | 'retire'`.
Pronto: as constantes são exportadas com esses nomes e valores.

### T2 — `src/utils/generatePlayer.ts` e `src/types/player.ts`
Funções da seção 2.3 (`starFactor`, `ageValueFactor`, `valueForPlayer`, `refreshPlayerEconomy`, `agingDrop`, `applyAging`, `saleCap`). `wageForOverall` multiplica por `starFactor`. `generatePlayer`: troca o bloco "Calibrated Economy Formula" por `const value = valueForPlayer({ overall, age, potential })`. `Player` ganha `acquiredSeason?` e `acquiredFee?`.
Pronto: `wageForOverall(61) === 1050`, `wageForOverall(85) === 3175`, `wageForOverall(90) === 5650`, `wageForOverall(99) === 16000`; `valueForPlayer({ overall: 76, age: 25, potential: 77.5 })` dá 275.000 e `({ overall: 61, age: 25, potential: 62.5 })` dá 26.000.

### T3 — `src/stores/squad.ts` e `src/composables/useSeason.ts`
`applyEndOfSeason()` passa a devolver `{ departed: Player[]; retired: Player[] }`: tira os emprestados de entrada; para cada atleta, `age += 1` e `contractYears −= 1`; com `age >= AGING.retireAge`, aposenta; com `contractYears <= 0`, sai. Remove quem saiu, completa até 11 com jovens (`generatePlayer({ minOvr: 52, maxOvr: 56, isYouth: true })`, gravando `acquiredSeason = useClubStore().season` e `acquiredFee = 0`) e refaz os titulares como hoje. Depois, em todos: `isLoanedOut = false`, `stamina = 100`, sem lesão, `applyAging(p)` e `refreshPlayerEconomy(p)`. Sai o `Math.max(1, …)`. Em `useSeason.startNewSeason`: guardar o retorno, mostrar o toast "Saíram na virada: …" (`warning`) e chamar `club.recordTransfer('release' | 'retire', nome, posição, OVER, 0)` para cada um.
Pronto: t23 itens c1 a c7.

### T4 — Mercado: `src/composables/useSquad.ts`, `src/composables/useScouting.ts`, `src/stores/market.ts`, `src/composables/useEconomy.ts`, `src/composables/useMatchSimulation.ts`
- `useSquad.ts`: `LOAN_OUT_SHARE = TRANSFER.loanShare`. `sellPriceFor` = `saleCap(p, arred(valor × saleShare × analista), club.season)`. Novas `renewYearsFor(p)` e `canRenew(p)`, exportadas no retorno. `getRenewalCost = arred(valor × renewFeePerYear × renewYearsFor(p))`. `renewPlayerContract` recusa com toast "Contrato já no máximo de 5 temporadas." quando `!canRenew`, soma `renewYearsFor(p)` e chama `refreshPlayerEconomy`.
- `useScouting.ts`: `signScoutedPlayer` grava `acquiredSeason = club.season` e `acquiredFee = valor pago`. `promoteYouthProspect`: sai o teto de valor; grava `acquiredSeason = club.season` e `acquiredFee = 0`. Tirar `YOUTH_PROMOTED_VALUE_CAP` do import.
- `market.ts`: proposta de compra = `saleCap(alvo, arred(valor × U(offerMin, offerMax)), temporada)`; empréstimo = `arred(valor × loanShare)`. `counterOffer`: `counterChance` e `counterMult`, com `saleCap` na compra. `refreshLoanCandidates`: `loanFee = arred(valor × loanShare)`.
- `useEconomy.ts`: a venda forçada usa `saleCap(alvo, arred(valor × forcedSaleShare), club.season)`; o jovem gerado na hora grava `acquiredSeason` e `acquiredFee = 0`.
- `useMatchSimulation.ts`: quando a evolução sobe o OVER, chamar `refreshPlayerEconomy(p)` logo em seguida.

Pronto: t23 itens b, d, e, f e g; t21 OK.

### T5 — Migração: `src/utils/balanceMigration.ts` e `src/composables/usePersistence.ts`
`ATHLETE_ECONOMY_VERSION = 1`, `AthleteMigrationCtx` e `migrateAthleteEconomyV1` como na seção 2.4 (texto exato no `mkoverlay-atletas.mjs`). `saveGame` grava `athleteEconomyVersion` em `club`; `loadGame` chama a migração depois de `migrateBalanceV2`. `BALANCE_VERSION` continua 2.
Pronto: t23 itens h1 a h7; t20 OK; o save continua com 17 chaves.

### T6 — Interface (seção 5)
`src/components/player/PlayerDetails.vue`, `src/components/squad/SquadRoster.vue`, `src/views/DashboardView.vue`, `src/components/scouting/YouthAcademyPanel.vue`. Só textos e selos, nos tokens de cor existentes (`amberpro`, `dangerpro`, `ink-muted`). Sair o cartão da multa.
Pronto: build OK, e uma conferência visual com `run` ou Playwright num save com um atleta em último ano e outro com 36 anos.

### T7 — Testes e simulador
1. Copiar `docs/calibracao/t23-atletas.mjs` para o scratchpad como `t23-atletas.mjs`, rodar da raiz e apagar a cópia.
2. Pôr o conteúdo de `docs/calibracao/calib-atletas.mjs` em `docs/calibracao/calib-carreira.mjs`. O `calib-atletas` é um superconjunto: sem `CONTRACT` em `constants.ts` ele se comporta como o antigo. Sem o ajuste de salário por jogo, a evolução com recálculo faria a política de OVER fixado pagar salário de OVER evoluído, e o saldo sem prêmio da D cairia perto do limite.
3. Rodar e anexar a saída: `t17-e2e.mjs` (7 políticas, 0 erros, 0 falhas de save); `t19-prizes`, `t20-balance-migration`, `t21-exploits` e `t23-atletas` OK; `node calib-carreira.mjs 20 curva,tipicoRot:240,forteRot:80,fracoRot:80,maximoRot:40,tipico,tipicoD,tipicoC,tipicoB,tipicoA,forte,fraco,caroFraco,investidor --check` com "CHECK OK".
4. Conferir os números da seção 3.1: luvas da `tipicoRot` em D 9 a 13 mil, C 17 a 23 mil, B 40 a 48 mil e A 65 a 85 mil.

Pronto: todos os itens acima.

### T8 — Revisão final em Opus
Diff completo contra este plano, os critérios das T1 a T7 e as regras do dono (sem nomes reais, sem citar federação, textos em português, OVER como rótulo, paleta 60-30-10). Só depois, commit.

---

## 7. Decisões do dono

Pendentes (só as inevitáveis):

1. **Multa rescisória: remover (recomendado) ou tornar real.** Real seria o rival pagar a multa (por exemplo, 1,5x o valor) e levar o atleta mesmo marcado como "Intocável". Isso abre o exploit de comprar e esperar a multa e acrescenta uma regra. Recomendação: remover da tela e mostrar o valor de mercado.
2. **Base: promoção grátis com venda travada na temporada da promoção (recomendado) ou luvas na promoção.** A versão grátis devolve à base o valor econômico (+30 mil por temporada na A para quem forma) sem lucro instantâneo. As luvas de 35% do valor seguram o lucro, mas travam os clubes pobres da D.
3. **Aposentadoria aos 37 (recomendado) ou sem aposentadoria.** Sem ela, o veterano apenas cai 3 de OVER por ano dos 35 em diante e ocupa vaga. A queda de OVER a partir dos 31 vale nos dois casos.

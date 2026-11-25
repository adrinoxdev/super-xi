# Plano de balanceamento: poder do time e economia

> **Nota (1.3.0):** este documento descreve o jogo na data em que foi escrito. Depois dele, as competições foram renomeadas: Taça Cacique → Taça do Povo, Supercopa Soberana → Supercopa Zênite, Recopa Condor → Recopa dos Condores (ver `docs/plano-fase-8-mundial-patrocinador.md`). O texto abaixo mantém os nomes antigos como registro.

> **Revisão (Brasileirão):** a Série D não tem mais playoff de acesso. `playoffLoss` e `playoffWin` viraram `qf` (34.000, quem perde as quartas). Sobem 4 clubes. A Série C rebaixa os 4 últimos (17º ao 20º). Valores abaixo são o histórico da calibração.


Escopo: rebalancear o poder do time (escala única de OVER, curva de vitórias, mando, reforço dos rivais) e a economia (receita por série com teto, folha por OVER, ampliações, manutenção, dívida). Este documento só projeta. Quem implementa é outra etapa, pelas tarefas da seção 6.

**Revisão 2 (fechamento dos prêmios).** O dono aprovou a manutenção das instalações e o "elenco de craques não se paga sozinho" (`WAGE.doubleEvery` = 15). Com base em `docs/pesquisa-premiacao.md` e nas regras do dono, a tabela `PRIZES` foi refeita (seção 4.6), substituindo a da seção 8 de `docs/plano-chaveamento.md`. As bases por jogo subiram (seção 4.1) para o clube típico fechar a conta sem prêmio. Todos os números das seções 4 e 5 são os da revisão 2.

Scripts de calibração (salvos no projeto):

- `docs/calibracao/curva.mjs`: curva exata (binomial por tick) de vitória por diferença de OVER, sem o jogo.
- `docs/calibracao/mkoverlay.mjs`: gera cópias modificadas de `src/` com todas as trocas deste plano, sem tocar em `src/`. É a referência exata das trocas e falha se algum trecho original mudou.
- `docs/calibracao/calib-carreira.mjs`: roda o fluxo real do jogo (Pinia, stores, composables, `simulateMatchTick`, `settleMatch`, virada de temporada) em várias políticas. Com `--overlay DIR`, usa as cópias. Sem ele, usa `src/`. Com `--check`, confere os alvos e sai com código 1 se algum falhar.

Atenção: `src/` mudou enquanto este plano era escrito (lesão ao vivo `rollLiveInjury`, penalidade por posição `positionPenalty`, `INJURY.playingInjuredPenalty` 25). As trocas abaixo são descritas por trecho e não desfazem essas mudanças.

---

## 1. Diagnóstico do estado atual

### 1.1 Escalas de poder

O poder do usuário é `calculateTeamStrength(...).total`, uma **soma** ponderada dos 11 titulares. Pesos por função: ataque 1,15 + 0,25 = 1,40; meio 1,10 + 0,35 + 0,35 = 1,80; defesa e goleiro 1,15 + 0,20 = 1,35. No 4-3-3 a soma dos pesos é 16,35, então `total ≈ 16,35 × OVER médio`. A soma varia com a formação: 4-4-2 dá 15,95 e 4-2-2-2 dá 16,75, o que é um bônus de formação sem intenção de design.

Os rivais têm `basePower` numa faixa que, convertida para OVER médio (÷ 16,35), corresponde a times muito fracos:

| Grupo | `basePower` atual | Equivale a OVER médio | Fonte |
|---|---|---|---|
| Série D (19 clubes) | 642 a 690 (média ≈ 668) | 39 a 42 | `leagueScheduler.ts` `LEAGUE_CLUBS_POOL[4]` |
| Extras da Série D (46) | 628 a 688 | 38 a 42 | `extraClubs.ts` `628 + ((i*17) % 61)` |
| Série C | 716 a 770 (≈ 737) | 44 a 47 | `LEAGUE_CLUBS_POOL[3]` |
| Série B | 766 a 810 (≈ 782) | 47 a 50 | `LEAGUE_CLUBS_POOL[2]` |
| Série A | 864 a 935 (≈ 895) | 53 a 57 | `LEAGUE_CLUBS_POOL[1]` |
| Continentais | 886 a 932 | 54 a 57 | `constants.ts` `CONTINENTAL_RIVALS` |
| Supercopa / Recopa (padrão) | 915 / 930 | 56 / 57 | `competitions.ts` `DEFAULT_*_RIVAL` |
| **Elenco inicial do usuário** | **≈ 1.055** (OVER médio 64,5) | 64,5 | `squad.initializeDefaultSquad` |

O painel mostra "OVER 1055" contra "OVER 668". O elenco inicial já é ~23 OVER mais forte que a Série D e ~8 mais forte que a Série A. Além disso, os rivais de liga ganham `+12` por temporada (`league.ts`, `initLeagueSeason`, `startSerieDKnockout` e `ensureKnockoutTies`). Copa, continental e finais não ganham esse reforço.

### 1.2 Curva de vitórias atual

`simulateMatchTick`: `chance = clamp(0,11 + (userAtk − oppPow)/1600, 0,05, 0,24)` por tick (45 ticks), conversão 0,56 × 0,44. Para o rival, `0,10 + (oppPow − userDef)/1600` com conversão 0,52 × 0,40. Mando: +18 de poder (≈ 1,1 OVER). Por ponto de OVER, a inclinação é 16,35/1600 = 0,0102, quase 4 vezes mais íngreme que o necessário.

Curva exata (`curva.mjs` com os parâmetros atuais, média de casa e fora):

| Diferença de OVER | −15 | −10 | −5 | 0 | +5 | +10 | +15 | +30 |
|---|---|---|---|---|---|---|---|---|
| Vitórias do usuário (atual) | 7% | 10% | 18% | 43% | **69%** | **80%** | 84% | 84% |

Com +5 de OVER, o usuário já vence 69%.

### 1.3 Resultados do T17 (estado atual, `t17-results-run1.json`)

| Política (T17) | Série | Vitórias | Saldo médio por temporada | Caixa na temporada 20 |
|---|---|---|---|---|
| `mid` (OVER 65/70/75/80, carreira natural) | D / C / B / A | 100% / 93% / 92% / 85% | 0,42M / 0,94M / 1,0M / 1,92M | **31,5 milhões** |
| `midForced` (rodízio D-C-B-A) | D / C / B / A | 82% / 83% / 86% / 85% | 108 mil / 508 mil / 840 mil / 1,09M | — |
| `weak` (OVER 48) | D / C | 32% / 29% | 150 mil / 221 mil | 3,8 milhões |
| `strong` (OVER 90, 16 atletas) | A | 86% | caixa preso em 0 (139 jogos com saldo 0) | 334 mil (só o prêmio) |
| `midPow` (poder igual ao dos rivais) | D a A | 41% a 53% | — | 36 milhões |

### 1.4 Economia atual

| Item | Regra atual | Problema |
|---|---|---|
| Bilheteria | `6500 × nível do estádio` em casa, 40% fora | não depende da série; nível 10 = 65 mil por jogo em qualquer série |
| Patrocínio | `7500 × nível de finanças` | idem; nível 5 de ambos = 70 mil por jogo |
| Bônus de resultado | 9.500 (V) / 3.500 (E), fixo | não depende da série |
| Folha | `max(850, 780 + 58 × (OVER − 55))` por atleta, a cada jogo | piso de 850 e curva quase plana (OVER 90 custa só 2.800) |
| Caixa zero | `club.budget = Math.max(0, …)` | dívida é perdoada: elenco caro joga de graça |
| Ampliações | `UPGRADE_COSTS` (estádio 60 mil a 1,4M) | sem custo recorrente; receita cresce sem limite |
| Caixa inicial | 280.000 | — |

---

## 2. Decisões de modelo (resumo)

1. **Escala única: OVER de time na unidade do OVER do atleta.** O poder do usuário passa a ser a **média ponderada** do OVER efetivo dos 11 titulares, com os mesmos pesos por setor. Os rivais passam a ter OVER de time (57 a 81). Opção de menor impacto que deixa o painel comparável: todas as telas já mostram `OVER {{ total }}` e `OVER {{ power }}`, então basta mudar o significado de `teamStrength.total` e os números dos rivais. Nenhum template muda.
2. **OVER típico por série** (média dos clubes da série): D 61, C 66, B 71, A 76. O elenco inicial (≈ 64,5) começa um pouco acima da D.
3. **Curva:** inclinação de 0,0028 por ponto de OVER, chances entre 0,025 e 0,24 por tick (ajuste aprovado depois; antes 0,045 e 0,20), mando de +3 OVER. Mentalidade passa a abrir ou fechar o jogo (multiplica as próprias chances e divide as do rival), em vez de somar poder bruto.
4. **Reforço anual dos rivais: nenhum (0), em todas as competições.** O elenco do usuário é limitado pelo scouting (OVER até 88 + 4) e o OVER típico fixo por série mantém a calibração estável. O `+12` por temporada sai dos três pontos de `league.ts`.
5. **Todos os jogos da IA usam `simulateMatchScore`**, inclusive pontos corridos e grupos. Sai a fórmula do protótipo `Math.random() * (2.4 + diff)`, que estava em outra unidade.
6. **Economia por série:** receita por jogo = base da série × fator do nível da instalação, com teto de nível por série. Folha exponencial por OVER. **Manutenção** das instalações por jogo (0,15% do valor investido). **Dívida permitida**, com juros, bloqueio de gastos e venda forçada acima do limite da série.

---

## 3. Novo modelo de poder

### 3.1 OVER do time (`src/utils/calculateTeamStrength.ts`)

Para cada vaga da formação, o grupo da função define os pesos `w = {atk, mid, def}`:

| Função da vaga | atk | mid | def |
|---|---|---|---|
| ST, LW, RW | 1,15 | 0,25 | 0 |
| CAM, CM, CDM | 0,35 | 1,10 | 0,35 |
| GK, CB, LB, RB | 0 | 0,20 | 1,15 |

`eff` = `getEffectiveOvr(jogador, função)`; vaga vazia conta 0, mas o peso entra na soma.

- `attack = round(Σ eff·w.atk / Σ w.atk)`, e o mesmo para `midfield` e `defense`: médias por setor, na escala 0 a 99.
- `rating = (Σ eff·(w.atk + w.mid + w.def)) / Σ (w.atk + w.mid + w.def)`, sem arredondar (usado pelo motor).
- `total = round(rating)` (exibição).

A formação deixa de mudar o poder por si só; só pesam as penalidades de posição. Os quatro cartões do `TeamPowerBar` (OVER, Ataque, Meio-Campo, Defesa) passam todos a ficar na escala 0 a 99.

### 3.2 OVER dos rivais

Mapa linear dentro de cada série, preservando a ordem, com média igual ao OVER típico. Na Série D, o grupo A1 do usuário (`d_1` a `d_5`) tem média 61. Valores exatos: seção 5.2.

### 3.3 Motor da partida do usuário (`useMatchSimulation.ts`)

```
userMatchRating     = squad.teamStrength.rating + (casa ? MATCH_SIM.homeAdvantage : 0)
opponentMatchRating = rival.power + (fora ? MATCH_SIM.homeAdvantage : 0)
effectiveUserPower / effectiveOpponentPower = Math.round(...)   (exibição: "OVER Efetivo: 67 vs 64")

diff = userMatchRating − opponentMatchRating
posse   = clamp(round(50 + 1,2·diff + 40·(atkMod − 1)), 32, 68) (+ ruído ±3, como hoje)
pUser   = clamp((0,11 + 0,0028·diff) × atkMod, 0,025, 0,24)
pRival  = clamp((0,10 − 0,0028·diff) / defMod, 0,025, 0,24)
gol do usuário = pUser × 0,56 × 0,44 ;  gol do rival = pRival × 0,52 × 0,40   (conversões mantidas)
```

A pequena vantagem própria do usuário (bases 0,11 contra 0,10 e conversões melhores) continua. É ela que põe o OVER igual em ~43% de vitórias, dentro do alvo de 40% a 50%.

### 3.4 Jogos da IA (`bracket.ts`, `simulateMatchScore`)

```
h = home + 3 + U(−1,5, +1,5) ;  a = away + U(−1,5, +1,5)
pH = clamp(0,105 + 0,0028·(h − a), 0,025, 0,24) ;  pA = clamp(0,105 + 0,0028·(a − h), 0,025, 0,24)
gol = p × 0,54 × 0,42   (45 ticks)
```

Pênaltis entre times da IA: `0,76 + clamp(Δ/250, −0,04, +0,04)` (antes Δ/4000, em unidades de poder). Sorteio dos grupos virtuais da Série D: ruído `rng() × 2,5` (antes ×40).

### 3.5 Curva obtida (motor real, 4.000 jogos por ponto, `calib-carreira.mjs curva`)

Usuário, metade em casa e metade fora, mentalidade equilibrada (V / E / D, em %):

| Diferença de OVER | −30 | −20 | −15 | −10 | −5 | 0 | +5 | +10 | +15 | +20 | +30 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Vitória | 12,3 | 15,7 | **20,6** | 28,2 | 34,8 | **43,0** | 50,8 | 58,6 | **65,5** | 72,5 | **77,8** |
| Empate | 23,9 | 25,8 | 28,9 | 31,0 | 29,0 | 29,1 | 27,7 | 25,1 | 23,6 | 19,6 | 16,6 |
| Derrota | 63,9 | 58,5 | 50,5 | 40,9 | 36,2 | 28,0 | 21,5 | 16,3 | 10,8 | 7,9 | 5,5 |

Ajuste posterior (piso 0,025, teto 0,24, medido): +20 72,3%; +30 83,0% (derrota 2,9%); o alvo do +30 passou de <=82% para <=88%. A tabela acima é da calibração original.

Alvos do dono: OVER igual 40% a 50% (**43,0**); +15 entre 65% e 75% (**65,5**; a curva exata dá 66); −15 entre 20% e 30% (**20,6**; exata 21); teto ~80% (**77,8** com +30). Dificuldade crescente: o clube típico de uma série enfrenta −5 na série de cima (35%) e −10 duas séries acima (28%).

IA mandante contra visitante (com +3 de mando): diferença 0 → 40,1 / 29,0 / 30,8; +15 → 62,6%; −15 → 19,3%; +30 → 74,2%.

Mentalidade (vitória / empate / derrota):

| | −15 | 0 | +15 |
|---|---|---|---|
| Muito Defensiva | 19,9 / 30,8 / 49,3 | 40,5 / 31,9 / 27,6 | 60,3 / 26,9 / 12,8 |
| Equilibrada | 20,4 / 29,1 / 50,5 | 42,9 / 29,1 / 28,0 | 66,3 / 21,9 / 11,8 |
| Muito Ofensiva | 21,7 / 24,3 / 54,0 | 45,3 / 26,6 / 28,1 | 69,0 / 20,0 / 11,0 |

A mentalidade troca empate por risco (±3 pontos de vitória) e não vira atalho de poder. Hoje ela soma até 18% do poder bruto ao ataque.

---

## 4. Nova economia

### 4.1 Receita por jogo (`club.ts`, `useEconomy.ts`)

```
fator(nível, série) = 1 + 0,12 × (min(nível, teto da série) − 1)
bilheteria = ticketBase[série] × fator(estádio)   (fora de casa: × 0,4)
patrocínio = sponsorBase[série] × fator(finanças)
bônus      = sponsorBase[série] × 0,5 na vitória, × 0,2 no empate
(× 1,2 com o Diretor Financeiro, como hoje: incomeMult)
```

| Série | `ticketBase` = `sponsorBase` | Teto de nível | Receita em casa, nível 1 | No teto | Limite de dívida |
|---|---|---|---|---|---|
| D | 8.650 | 3 | 17.300 | 21.450 (nível 3) | 150.000 |
| C | 10.520 | 5 | 21.040 | 31.140 (nível 5) | 250.000 |
| B | 13.690 | 7 | 27.380 | 47.090 (nível 7) | 400.000 |
| A | 16.600 | 10 | 33.200 | 69.060 (nível 10) | 600.000 |

Na revisão 1 as bases eram 5.400 / 8.350 / 12.200 / 15.500, quando a tabela de prêmios antiga ainda pagava todo mundo. Sem cota de TV e sem prêmio para quem fica no meio da tabela (fora a Série A), bilheteria, patrocínio e bônus de resultado passam a pagar a folha do clube típico. Sem prêmio nenhum, ele fecha com +9 mil na D, +25 mil na C, +43 mil na B e +40 mil na A.

Acima do teto da série, o nível não rende mais. Estádio nível 10 na Série D rende o mesmo que o nível 3.

### 4.2 Folha por OVER (`generatePlayer.ts`)

`salário por jogo = max(500, arred25(1000 × 2^((OVER − 60)/15)))`: dobra a cada 15 pontos.

| OVER | 52 | 58 | 61 | 64 | 66 | 71 | 76 | 81 | 85 | 88 | 90 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Novo | 700 | 900 | 1.050 | 1.200 | 1.325 | 1.650 | 2.100 | 2.650 | 3.175 | 3.650 | 4.000 |
| Atual | 850 | 950 | 1.125 | 1.300 | 1.425 | 1.700 | 2.000 | 2.300 | 2.525 | 2.700 | 2.800 |

Folha típica por jogo (11 titulares no OVER típico + reservas 4 abaixo): D (16 atletas) 15.925; C (18) 22.275; B (20) 30.525; A (22) 42.350. Elenco máximo (11 × 88 + 7 × 80): 57.825. Forte na A (22 atletas, 91/87): 84.425.

O salário passa a seguir o OVER: é recalculado na virada de temporada (`squad.applyEndOfSeason`), ao gerar o atleta, na renovação (sai o `× 1,12`) e na migração de saves.

### 4.3 Ampliações e manutenção (`constants.ts` `UPGRADE_COSTS`, `club.ts`)

Manutenção por jogo = 0,15% do valor já investido em todas as instalações (soma dos custos pagos). Cada ampliação vira um custo fixo por jogo: instalações de receita se pagam até o teto da série e deixam de valer a pena perto do nível 9 ou 10. Scouting, CT e Departamento Médico de nível alto viram luxo com custo recorrente. Isso segura o caixa sem um teto artificial.

| Instalação | Custos para sair do nível 1 → … (novos) | Total | Atual (total) |
|---|---|---|---|
| Estádio / Finanças | 40k, 55k, 80k, 115k, 170k, 260k, 500k, 800k, 1,2M | 3,22M | 6,4M / 6,3M |
| Scouting | 60k, 85k, 120k, 170k, 250k, 360k, 500k, 680k, 900k | 3,13M | 13,9M |
| Alojamento | 15k, 22k, 32k, 45k, 65k, 90k, 125k, 170k | 564k | 905k |
| CT | 70k, 140k, 260k, 450k | 920k | 4,0M |
| Médico | 60k, 120k, 230k, 400k | 810k | 3,6M |

Retorno de uma ampliação de receita na série em que ela é típica (ganho por jogo − manutenção, × jogos da temporada): finanças nível 1→2 na D, cerca de 3 temporadas; nível 3→4 na C, cerca de 3; nível 5→6 na B, cerca de 3; nível 7→8 na A, cerca de 9; nível 9→10 na A, nunca. (Valores da primeira calibração; os custos abaixo foram recalibrados e o retorno piora um pouco nos níveis altos.)

#### Recalibração dos custos de ampliação (só `UPGRADE_COSTS`)

Motivo: com os custos acima o clube típico (`tipico` de `docs/calibracao/calib-carreira.mjs`, compra toda ampliação que cabe no caixa) esgotava as instalações e acumulava caixa (B 2,1 M e A 5,0 M ao fim de 20 temporadas). Mudou só `UPGRADE_COSTS`; receita, prêmios, folha, curva, poder, `levelCap` e `maintenanceRate` ficaram iguais (a manutenção sobe junto, porque é 0,15% do investido por jogo).

Desenho da escala:
- Níveis baixos (os que o clube típico da A já tem pago) sobem pouco, +5% a +20%. O teto vem do `--check`: a manutenção desses níveis pesa em todo clube típico, e o saldo sem prêmio do típico da A (antes ~25 mil) precisa ficar acima de 3 mil. A margem total foi de cerca de +255 mil de investimento acumulado.
- Níveis altos, que só a B e a A alcançam (scouting 8 a 10, CT e Médico no nível 5, estádio e finanças 7 a 10), sobem de 1,4x a 2,4x e formam o sumidouro de caixa. Ordem estrita crescente em todas as instalações.
- Primeira ampliação do clube da D: estádio ou finanças a 58 mil (antes 40 mil), alojamento a 33 mil (antes 32 mil). Fica abaixo da faixa 80 a 110 mil pedida: custos de nível baixo mais altos derrubam o saldo sem prêmio do típico da A abaixo de 3 mil (ver pendências).

| Instalação | Custos para sair do nível 1 → … (antigo) | Custos novos | Total antigo → novo |
|---|---|---|---|
| Estádio / Finanças | 40k, 55k, 80k, 115k, 170k, 260k, 500k, 800k, 1,2M | 58k, 80k, 105k, 130k, 175k, 500k, 720k, 1,0M, 1,45M | 3,22M → 4,22M |
| Scouting | 60k, 85k, 120k, 170k, 250k, 360k, 500k, 680k, 900k | 70k, 90k, 125k, 175k, 250k, 350k, 750k, 1,05M, 1,45M | 3,13M → 4,31M |
| Alojamento | 15k, 22k, 32k, 45k, 65k, 90k, 125k, 170k | 15k, 23k, 33k, 47k, 68k, 94k, 130k, 178k | 564k → 588k |
| CT | 70k, 140k, 260k, 450k | 75k, 145k, 265k, 950k | 920k → 1,44M |
| Médico | 60k, 120k, 230k, 400k | 70k, 130k, 235k, 900k | 810k → 1,34M |

Resultado medido (`tipicoD/C/B/A` presos à própria série, 20 temporadas, 6 execuções; antes = 1 execução):

| Série | Ampliações por temporada (antes → depois) | Caixa final (antes → depois, média das execuções) | Vitórias |
|---|---|---|---|
| D | 1,05 → 0,93 (0,8 a 1,0) | 258 mil → ~170 mil | 36% a 47% |
| C | 0,95 → 0,83 | 490 mil → ~540 mil | 40% a 44% |
| B | 0,85 → 0,80 | 2,13 M → ~0,78 M | 41% a 45% |
| A | 0,65 → 0,61 (0,60 a 0,65) | 5,0 M → ~1,1 M (0,4 a 1,7 M) | 42% a 46% |

0 vendas forçadas e 0 erros. Limite: cada instalação tem oferta finita (A: 13 ampliações restantes no clube típico), então a média da A nunca passa de 0,65. `--check` completo OK (curva, folga do típico por série, elenco máximo, D sem travar). `docs/calibracao/calib-carreira.mjs` ganhou as políticas `tipicoC`, `tipicoB` e `tipicoA` (típico preso à série, com as instalações típicas dela).

### 4.4 Caixa zero e dívida (`useEconomy.settleMatch`)

1. O saldo **pode ficar negativo**: sai o `Math.max(0, …)`.
2. **Juros:** com saldo negativo, cada partida cobra 1% da dívida.
3. **Gastos bloqueados:** contratar, ampliar, scouting, comissão e fisioterapia já exigem `budget ≥ custo` (`club.spend`, `upgradeFacility`, `hireStaff`, `signScoutedPlayer`, `recoverSquadStamina`). Com saldo negativo, tudo fica bloqueado sem mudar código.
4. **Vendas sempre liberadas** (venda, empréstimo, propostas recebidas).
5. **Venda forçada:** se, depois de uma partida, o saldo ficar abaixo de `−debtLimit` da série, a diretoria vende **um** atleta por partida pelo valor × 0,7. Escolhe o reserva de maior salário (sem contar emprestados). Com elenco de 11, vende o titular de maior salário e sobe um jovem gerado na hora (`generatePlayer({ position, minOvr: 52, maxOvr: 56, isYouth: true })`) para manter 11. Toast `danger`: "Dívida acima do limite: a diretoria vendeu X por R$ Y."
6. O jogo nunca trava: a receita continua entrando, o elenco fica sempre com 11 ou mais e a folha cai a cada venda.

### 4.5 Caixa inicial, contratação, venda e scouting

- Caixa inicial: 280.000 → **150.000** (`ECONOMY.startBudget`): uma ou duas ampliações da D, ou um reforço.
- Fórmula de valor (`generatePlayer`): **mantida**. Valor por OVER (25 anos): 61 → 26,5 mil; 66 → 66 mil; 71 → 150 mil; 76 → 280 mil; 81 → 461 mil; 88 → 800 mil. Um reforço no OVER típico custa cerca de uma temporada de saldo do clube típico da série, contando os prêmios: D 26,5 a 45 mil contra saldo médio de 71 mil; A 280 mil contra 393 mil.
- Venda 85%, empréstimo 25% ou 18%, renovação 22% do valor: mantidos.
- Missões de scouting (8 a 55 mil), peneira (12 mil), fisioterapia (6 mil) e comissão: mantidas, porque já estão na proporção certa (missão local = 1/3 do saldo de uma temporada na D; internacional, a partir do nível 6 = 1/5 do saldo na A).

### 4.6 Prêmios (revisão 2: tabela nova, substitui `plano-chaveamento.md` seção 8)

**Regras do dono aplicadas.**

- Não existe cota base de TV.
- Rebaixado e eliminado cedo não recebem em nenhuma série.
- **A:** do 1º ao 16º, na proporção da pesquisa de 2024 (2º 95%, 5º 80%, 10º 55%, 11º 43%, 16º 34%). Do 17º ao 20º, nada.
- **B:** só os 4 que sobem.
- **C:** só os 4 que sobem, mais bônus do campeão da final e valores menores para o vice e para o 3º.
- **D:** por fase alcançada no mata-mata, a partir da 2ª fase. Quem cai nos grupos não recebe, e perder nas quartas paga `qf`.
- **Copa e continental:** pagam por fase ou por jogo. O campeão da Copa vale 1,1 vez o campeão da A e 4,1 vezes o campeão da D. O vice da Copa (somando as fases) fica em 42% do campeão, como na pesquisa (33/77).
- **Supercopa e Recopa:** valores pequenos, campeão acima do vice.

**Ordem de grandeza.** O campeão de cada série vale de 1 a 2 ampliações da série: D 80 mil contra 40 a 55 mil; C 140 mil contra 80 a 120 mil; B 240 mil contra 115 a 250 mil; A 300 mil contra 260 a 500 mil.

**Escada.** Em cada colocação comparável (campeão, vice, 3º e 4º), a série de cima paga estritamente mais: D < C < B < A. O campeão de uma série recebe no máximo o prêmio de subida (4º) da série de cima: campeão D 80 mil ≤ 4º C 85 mil; campeão C 140 mil ≤ 4º B 150 mil. Os zeros (rebaixado, eliminado, permanece) ficam fora da regra de "estritamente mais".

```ts
export const PRIZES = {
  // Sem cota base: só recebe quem sobe, avança no mata-mata ou fica no G-16 da A. Rebaixado e eliminado cedo = 0.
  // Copa e continental pagam por fase/jogo. Escada: série de cima paga estritamente mais na colocação comparável.
  cup: { rounds: [10000, 20000, 40000, 260000], finalLoss: 70000, thirdWin: 25000, thirdLoss: 10000 },
  continental: { win: 30000, other: 10000, champion: 180000, runnerUp: 70000, third: 30000 },
  supercup: { champion: 40000, runnerUp: 15000 },
  recopa: { champion: 60000, runnerUp: 25000 },
  serieD: { groups: 0, r64: 8000, r32: 15000, r16: 24000, qf: 34000, fourth: 52000, third: 60000, runnerUp: 68000, champion: 80000 },
  serieC: { relegated: 0, stayed: 0, quadElim: 0, fourth: 85000, third: 100000, runnerUp: 115000, champion: 140000 },
  serieB: { relegated: 0, stayed: 0, promotion: 150000, fourth: 150000, third: 170000, runnerUp: 200000, champion: 240000 },
  serieA: {
    relegated: 0,
    champion: 300000,
    // 1º ao 16º (índice = colocação - 1), proporções da pesquisa; 17º a 20º não recebem
    byRank: [300000, 285000, 270000, 255000, 240000, 225000, 210000, 195000, 180000, 165000, 129000, 120000, 111000, 108000, 105000, 102000]
  }
} as const
```

Acumulado por campanha:

| Competição | Campeão | Vice | 3º | 4º |
|---|---|---|---|---|
| Taça Cacique | 330 mil (10 + 20 + 40 + 260) | 140 mil | 95 mil | 80 mil |
| Continental (6 jogos de grupo + mata-mata) | ≈ 120 mil de cotas + 180 mil | ≈ 100 mil + 70 mil | ≈ 100 mil + 30 mil | ≈ 90 mil |

**Chaves.**

- **Novas:** `serieD.r64` (cai na 2ª fase), `serieD.r32` (cai na 3ª fase), `serieD.r16` (cai nas oitavas) e `serieA.byRank` (16 valores).
- **Removidas:** `serieD.knockout`, `serieA.stayed`, `serieA.fourth`, `serieA.third` e `serieA.runnerUp`.
- **Mantidas com valor 0**, para não mudar o código que as lê: `serieD.groups`, `serieC.relegated`, `serieC.stayed`, `serieC.quadElim`, `serieB.relegated`, `serieB.stayed` e `serieA.relegated`.
- `serieA.champion` fica igual a `byRank[0]`, porque `SERIE_META.championPrize` lê essa chave.
- `serieB.promotion` continua como sinônimo de `fourth`.
- `serieD.qf` é o valor de perder nas quartas (a série não tem mais playoff de acesso).

**Prêmios na receita (revisão de `φ`).** Só o topo recebe: 16 de 20 clubes na A, 4 de 20 na B, 4 de 20 na C e, na D, só quem avança no mata-mata. Clube típico, média por temporada (rodízio com 60 temporadas por série):

| Série | Prêmio médio de série | Copa (média) | Prêmios totais | `φ` (prêmios ÷ receita total) | Revisão 1 |
|---|---|---|---|---|---|
| D | 19 mil | 43 mil (Copa em 2 de 60) | 62 mil | 0,18 | 0,40 |
| C | 44 mil | 77 mil (Copa em 7 de 60) | 121 mil | 0,15 | 0,26 |
| B | 99 mil | 109 mil (Copa em 13 de 60) | 208 mil | 0,12 | 0,17 |
| A | 241 mil | 112 mil (Copa em 11 de 60) | 353 mil | 0,14 | 0,16 |

Na coluna Copa, o valor entre parênteses é quantas vezes, em 60 temporadas, o clube típico ganhou a Taça Cacique.

Se a tabela mudar de novo, a regra continua: (1) o clube típico precisa fechar positivo **sem prêmio** (coluna `semPremio` do `calib-carreira.mjs`, conferida pelo `--check`); (2) quem trocar o total esperado de prêmios ajusta as bases para manter o saldo; (3) rodar o `--check`.

---

## 5. Calibração e números finais

### 5.1 Como foi medido

- Comando final (validado):
  ```
  node docs/calibracao/mkoverlay.mjs      (OVERLAY_OUT=<pasta>)
  node docs/calibracao/calib-carreira.mjs 20 curva,tipicoRot:240,forteRot:80,fracoRot:80,maximoRot:40,tipico,tipicoD,forte,fraco,caroFraco,investidor --check --overlay <pasta>
  ```
  Resultado da revisão 2: **CHECK OK: todos os alvos atingidos**. Saídas em `C:\Users\elphant\AppData\Local\Temp\claude\0f8ef87c2114f600\48409bd1-6c12-4a38-8f86-3c063b9d548e\scratchpad\bal\premios-check2.txt` (rodízios, curva, D, fraco, caro) e `premios-check.txt` (carreiras `tipico`, `forte`, `investidor`). A pasta é temporária; o comando acima reproduz a rodada.
- O `--check` confere:
  - a curva;
  - o saldo do típico **sem prêmio** (positivo, até 70 mil na D, 110 mil na C, 200 mil na B e 220 mil na A);
  - o saldo do típico com prêmios (de 0 a 130 mil na D, 220 mil na C, 380 mil na B e 650 mil na A);
  - vitórias do típico entre 38% e 50%;
  - teto de vitórias do elenco máximo e saldo dele na A abaixo de 400 mil;
  - Série D sem trava;
  - nenhum erro de execução.
- `forteRot` e `fracoRot`: rodízio com típico + 10 e típico − 10, para medir campeões e rebaixados. O relatório separa o saldo por desfecho da temporada: campeão, sobe, meio (recebeu prêmio sem subir), sem prêmio e rebaixado.
- `tipicoRot`: rodízio D, C, B, A com elenco no OVER típico da série (16/18/20/22 atletas, reservas −4), instalações típicas da série e sem continental. Mede o saldo de uma temporada a partir de um caixa neutro. Instalações típicas (scouting / alojamento / CT / médico / estádio / finanças): D 1/3/1/1/1/1; C 3/5/2/2/3/3; B 5/7/3/3/4/4; A 7/9/4/4/6/6.
- Carreiras naturais, 20 temporadas, caixa inicial de 150 mil:
  - `tipico`: OVER típico da série em que está; compra qualquer ampliação que couber no caixa.
  - `tipicoD`: preso na D.
  - `forte`: típico + 15.
  - `fraco`: típico − 15.
  - `caroFraco`: típico + 10, 22 atletas, estádio e finanças travados no nível 1.
  - `investidor`: OVER absoluto que sobe quando o caixa passa da reserva (troca 2 titulares por atletas 5,5 OVER melhores) e compra só ampliações com retorno em até 6 temporadas.
  - `maximoRot`: 11 × 88 + 7 × 80, todas as instalações no máximo, continental na A.
- O T17 rodou com as trocas e a tabela nova (`t17-overlay.mjs` no scratchpad: plugin de sobreposição mais a escada adaptada da T11/T12), com as 7 políticas e 20 temporadas: **0 erros de chave, 0 falhas de save, escada de prêmios sem violação** (`t17p.out`). Desfechos observados: D `groups`, `r64`, `r32`, `r16`, `playoffLoss`, `playoffWin`, 3º, 4º, vice e campeão; A `rank1` a `rank15` e rebaixado; B e C subida e campeão.

### 5.2 Constantes: valor antigo e novo

**`src/utils/constants.ts`**

| Constante | Antigo | Novo |
|---|---|---|
| `SERIE_TYPICAL_OVER` (nova) | — | `{ 4: 61, 3: 66, 2: 71, 1: 76 }` |
| `MATCH_SIM` (nova) | valores espalhados no código | `{ ticks: 45, homeAdvantage: 3, slope: 0.0028, userChanceBase: 0.11, oppChanceBase: 0.10, aiChanceBase: 0.105, chanceMin: 0.025, chanceMax: 0.24, userOnTarget: 0.56, userGoal: 0.44, oppOnTarget: 0.52, oppGoal: 0.40, aiOnTarget: 0.54, aiGoal: 0.42, formSwing: 1.5, possessionPerOver: 1.2, shootoutDiv: 250, seedingNoise: 2.5 }` |
| (equivalências antigas) | mando 18; inclinação 1/1600 por poder (0,0102 por OVER); usuário [0,05, 0,24]; rival [0,04, 0,22]; IA [0,045, 0,23]; forma ±12; posse ÷14; pênaltis ÷4000; sorteio ×40 | ver linha acima |
| `SERIE_ECONOMY` (nova) | — | `4: { ticketBase: 8650, sponsorBase: 8650, levelCap: 3, debtLimit: 150000 }`, `3: { 10520, 10520, 5, 250000 }`, `2: { 13690, 13690, 7, 400000 }`, `1: { 16600, 16600, 10, 600000 }` |
| `ECONOMY` (nova) | bilheteria 6500 × nível, patrocínio 7500 × nível, bônus 9500/3500, fora 40%, caixa inicial 280000 | `{ facilityStep: 0.12, awayTicketShare: 0.4, winBonusShare: 0.5, drawBonusShare: 0.2, debtInterestPerMatch: 0.01, forcedSaleShare: 0.7, startBudget: 150000, maintenanceRate: 0.0015 }` |
| `WAGE` (nova) | `max(850, 780 + 58·(OVER−55))` | `{ base: 1000, refOvr: 60, doubleEvery: 15, min: 500, step: 25 }` |
| `facilityIncomeFactor(level, division)` (nova) | — | `1 + facilityStep × (min(level, levelCap) − 1)` |
| `UPGRADE_COSTS.scoutingLevel` | `[0, 120000, 260000, 450000, 700000, 1000000, 1500000, 2200000, 3200000, 4500000]` | `[0, 60000, 85000, 120000, 170000, 250000, 360000, 500000, 680000, 900000]` |
| `UPGRADE_COSTS.squadCapacityLevel` | `[0, 25000, 40000, 60000, 85000, 115000, 150000, 190000, 240000]` | `[0, 15000, 22000, 32000, 45000, 65000, 90000, 125000, 170000]` |
| `UPGRADE_COSTS.trainingCenterLevel` | `[0, 200000, 500000, 1100000, 2200000]` | `[0, 70000, 140000, 260000, 450000]` |
| `UPGRADE_COSTS.medicalCenterLevel` | `[0, 180000, 450000, 1000000, 2000000]` | `[0, 60000, 120000, 230000, 400000]` |
| `UPGRADE_COSTS.stadiumLevel` | `[0, 60000, 140000, 300000, 600000, 750000, 900000, 1050000, 1200000, 1400000]` | `[0, 40000, 55000, 80000, 115000, 170000, 260000, 500000, 800000, 1200000]` |
| `UPGRADE_COSTS.financeLevel` | `[0, 58000, 135000, 290000, 580000, 720000, 870000, 1020000, 1200000, 1400000]` | igual ao estádio |
| (recalibração posterior de `UPGRADE_COSTS`) | colunas "Novo" acima | valores finais na seção 4.3, "Recalibração dos custos de ampliação" |
| `CONTINENTAL_RIVALS[].power` | con_1 932, con_2 918, con_3 895, con_4 890, con_5 886, con_6 904, con_7 912, con_8 892 | 81, 80, 78, 77, 77, 79, 80, 78 |
| `PRIZES` | tabela da seção 8 de `plano-chaveamento.md` | objeto da seção 4.6 (tarefa T12) |
| `FACILITIES_LIST` (texto de estádio e finanças) | "Aumenta a receita fixa…" | acrescentar: "Rende conforme a série (teto por série). Cada nível soma manutenção por jogo." |

**`src/utils/leagueScheduler.ts` — `LEAGUE_CLUBS_POOL[n].basePower`**

| Série | Novo `basePower` por id (antigo entre parênteses) |
|---|---|
| D (média 61) | d_1 58 (642), d_2 63 (654), d_3 61 (662), d_4 59 (650), d_5 64 (668), d_6 60 (670), d_7 62 (676), d_8 61 (665), d_9 59 (660), d_10 63 (682), d_11 65 (685), d_12 64 (690), d_13 58 (658), d_14 60 (664), d_15 62 (666), d_16 64 (675), d_17 57 (684), d_18 61 (652), d_19 60 (669) |
| C (média 66) | c_1 63, c_2 64, c_3 65, c_4 66, c_5 67, c_6 68, c_7 68, c_8 69, c_9 70, c_10 70, c_11 63, c_12 64, c_13 65, c_14 66, c_15 63, c_16 67, c_17 66, c_18 64, c_19 66 |
| B (média 71) | b_1 75, b_2 75, b_3 74, b_4 73, b_5 72, b_6 72, b_7 71, b_8 71, b_9 72, b_10 71, b_11 70, b_12 69, b_13 70, b_14 70, b_15 69, b_16 68, b_17 69, b_18 68, b_19 69 |
| A (média 76) | a_1 81, a_2 81, a_3 80, a_4 79, a_5 78, a_6 77, a_7 76, a_8 76, a_9 75, a_10 76, a_11 75, a_12 76, a_13 74, a_14 75, a_15 74, a_16 73, a_17 73, a_18 72, a_19 72 |

Na Série D a ordem foi reembaralhada para o grupo A1 (`d_1` a `d_5`) ter média 61: antes eram os 5 mais fracos. Em C, B e A o mapa é linear e preserva a ordem.

**Demais arquivos**

| Arquivo | Constante ou trecho | Antigo | Novo |
|---|---|---|---|
| `src/utils/extraClubs.ts` | `basePower` | `628 + ((i * 17) % 61)` | `56 + ((i * 7) % 9)` (56 a 64, média 60) |
| `src/stores/competitions.ts` | `DEFAULT_SUPERCUP_RIVAL.power` / `DEFAULT_RECOPA_RIVAL.power` | 915 / 930 | 79 / 80 |
| `src/stores/league.ts` | reforço anual `boost` (3 lugares) | `(season − 1) × 12` | removido (0 em todas as competições) |
| `src/stores/league.ts` | `power` do usuário em `leagueTeams` | 700 / 750 / 800 / 900 | `SERIE_TYPICAL_OVER[divisão]` |
| `src/stores/league.ts` | fallbacks (`nextOpponent`, `powerOf`, `simulateOther`) | 700 | `SERIE_TYPICAL_OVER[club.division]` |
| `src/stores/league.ts` | `simulateOther` (fora do mata-mata) | `round(random × (2,4 + diff))` com `diff = (h + 15 − a)/75` | `simulateMatchScore(h, a)` em todos os jogos |
| `src/utils/bracketSeeding.ts` | usuário no continental / ruído do sorteio | 900 / `rng() × 40` | `SERIE_TYPICAL_OVER[1]` / `rng() × MATCH_SIM.seedingNoise` |
| `src/utils/bracket.ts` | `HOME_ADVANTAGE`, `FORM_SWING`, chances, `shootoutConversions` | 18, 12, `0,105 + Δ/1600` em [0,045, 0,23], Δ/4000 | `MATCH_SIM.homeAdvantage`, `MATCH_SIM.formSwing`, `aiChanceBase + slope·Δ` em [chanceMin, chanceMax], Δ/`shootoutDiv` |
| `src/composables/useMatchSimulation.ts` | mando, chances, posse | +18; `/1600`; posse `/14`; mentalidade multiplica o poder | seção 3.3 |
| `src/stores/club.ts` | `budget` inicial (2 lugares) | 280000 | `ECONOMY.startBudget` |
| `src/stores/club.ts` | `projectedStadiumIncome` / `projectedSponsorIncome` | `6500 × nível` / `7500 × nível` | seção 4.1 |
| `src/stores/club.ts` | `facilityInvestment`, `maintenanceCost`, `serieEconomy` (novos) | — | seção 4.3 |
| `src/composables/useEconomy.ts` | `settleMatch` | `max(0, …)`, bônus fixo | seção 4.4 |
| `src/utils/generatePlayer.ts` | `wage` | `max(850, …)` | `wageForOverall(overall)` (nova, exportada) |
| `src/stores/squad.ts` | `applyEndOfSeason` | — | `p.wage = wageForOverall(p.overall)` |
| `src/composables/useSquad.ts` | `renewPlayerContract` | `p.wage × 1,12` | `p.wage = wageForOverall(p.overall)` |

### 5.3 Saldo por temporada por série (revisão 2, 60 temporadas por série)

Clube típico (`tipicoRot`):

| Série | Vitórias | Jogos | Receita de jogos | Folha | Manutenção | **Saldo sem prêmio** | Prêmios | **Saldo total** | Próxima ampliação típica |
|---|---|---|---|---|---|---|---|---|---|
| D | 40,4% | 16,4 | 285 mil | 275 mil | 1 mil | **+9 mil** | 62 mil | **+71 mil** | 40 a 55 mil |
| C | 42,4% | 26,6 | 682 mil | 633 mil | 23 mil | **+25 mil** | 121 mil | **+147 mil** | 80 a 120 mil |
| B | 42,8% | 41,2 | 1,48M | 1,34M | 89 mil | **+43 mil** | 208 mil | **+251 mil** | 115 a 250 mil |
| A | 45,0% | 41,6 | 2,10M | 1,85M | 213 mil | **+40 mil** | 353 mil | **+393 mil** | 260 a 500 mil |

Saldo médio por desfecho da temporada. Coluna "sem prêmio": o clube não ganhou prêmio de série; o saldo ainda pode trazer cotas da Copa. "Meio" na A: do 2º ao 16º. Os valores marcados com * vêm de uma amostra de 1 a 4 temporadas.

| Série | Típico sem prêmio | Típico meio | Típico que sobe | Típico campeão | Forte (+10) campeão | Fraco (−10) rebaixado |
|---|---|---|---|---|---|---|
| D | +78 mil | +60 mil | +77 mil | +110 mil* | −97 mil | (não há rebaixamento) +99 mil sem prêmio |
| C | +86 mil | — | +240 mil | +241 mil | −366 mil | +242 mil |
| B | +165 mil | — | +326 mil | +362 mil | −812 mil | +661 mil |
| A | — | +360 mil | — | +513 mil | −1,25M | +913 mil |

Leitura:

- **Típico:** fecha positivo só com bilheteria, patrocínio e bônus de resultado (+9 a +43 mil). Os prêmios e as cotas da Copa somam o resto. Na média, isso dá de 1 a 1,5 ampliação por temporada na C, B e A. Na D dá 1,3 a 1,8, porque um único título de Copa (330 mil) pesa muito na economia pequena da D (seção 7).
- **Quem sobe ou é campeão** ganha de +150 a +200 mil a mais que o típico sem prêmio na C e na B: cerca de uma ampliação, relevante sem desbalancear.
- **Campeão com elenco caro (+10)** fica no vermelho mesmo com o título: o prêmio não paga uma folha 10 OVER acima (decisão do dono aprovada).
- **Fraco (−10) rebaixado tem lucro alto:** a folha barata e a receita da série dão lucro operacional na série alta (A +0,9M). A queda corrige isso na temporada seguinte. Seção 7 e decisão 1 da seção 8.

Elenco máximo (`maximoRot`: 11 × 88 + 7 × 80, tudo no nível máximo, continental na A): vitórias D 75,1%, C 70,6%, B 68,6%, A 63,5%. Saldo na A: −138 mil por temporada.

Curva (revisão 2, 4.000 jogos por ponto): OVER igual 42,3%, +15 66,1%, −15 20,7%, +30 77,7%.

### 5.4 Caixa ao longo de 20 temporadas (mil R$, fim de cada temporada, revisão 2)

| Política | Séries | Caixa |
|---|---|---|
| `tipico` (compra toda ampliação que cabe) | DCCCBAAAAAAAAAAAAAAA | 140, 59, 217, 253, 458, 514, 652, 966, 1020, 886, 754, 1023, 1179, 884, 1306, 926, 1528, 684, 481, 1006 |
| `tipicoD` (preso na D) | D × 20 | 451, 363, 228, 143, 161, 36, 82, 153, 213, 56, 266, 221, 295, 103, 173, 263, 91, 97, 111, 482 |
| `forte` (+15) | DCBA, depois A | −64, −35, −127, −225, 42, −169, −258, −114, −87, −159, −244, −90, 9, −147, −107, −67, −157, −214, −113, −71 |
| `fraco` (−15) | D × 20 | 142, 174, 306, 261, 224, 208, 216, 250, 257, 181, 294, 144, 234, 339, 241, 394, 211, 286, 761, 168 |
| `caroFraco` (+10, 22 atletas, receita no nível 1) | DCBA, depois A | 176, −109, −148, −300, −280, −306, −275, −336, −278, −256, −150, −270, −227, −424, −450, −316, −295, −252, −296, −310 |
| `investidor` (OVER 64 → 79) | DDDDDDDCCBBBABAAAAAA | 428, 241, 107, 76, 43, 69, 189, 265, 478, 1217, 873, 852, 1000, 1177, 1636, 1845, 1250, 1260, 1018, 808 |

- **Típico:** o caixa fica abaixo de 1,6 milhão e oscila; ele gasta em ampliações e a manutenção segura o resto. No estado atual, chega a 31,5 milhões.
- **Série D:** `tipicoD` nunca trava (caixa mínimo +16 mil, 0 vendas forçadas, 1,1 ampliação por temporada).
- **Forte (+15)** vence 63% a 68% na A e fica perto de zero. **Caro com instalações fracas** fica no vermelho sem travar (vendas forçadas seguram a dívida no limite da série).
- **Investidor** sobe da D à A em 13 temporadas e transforma caixa em OVER.

---

## 6. Tarefas de implementação (para Sonnet, uma por delegação)

Regras para todas:

- Ler este plano e `docs/calibracao/mkoverlay.mjs`, que tem cada troca exata em texto.
- `src/` pode ter mudado. Aplicar a troca pelo sentido e não apagar código novo (por exemplo `rollLiveInjury` e `positionPenalty`).
- `PRIZES` muda só na T12.
- Testes: `npx vue-tsc --noEmit` e `npm run build` precisam passar.
- Não fazer commit (a revisão em Opus vem antes).

Ordem: T1 primeiro. Depois T2 a T8, em paralelo quando os arquivos não se cruzam (T5 depende de T3 e T4). Depois T9, T10 e T12 (T12 depende de T1 e T5). Por último, T11.

### T1 — `src/utils/constants.ts`

Adicionar, antes de `PRIZES`: `SERIE_TYPICAL_OVER`, `MATCH_SIM`, `SERIE_ECONOMY` (com tipo `Record<number, { ticketBase; sponsorBase; levelCap; debtLimit }>`), `ECONOMY`, `WAGE` e `facilityIncomeFactor(level, division)`, com os valores da seção 5.2. Trocar `UPGRADE_COSTS` e `CONTINENTAL_RIVALS[].power`. Acrescentar o texto do teto e da manutenção em `FACILITIES_LIST` (estádio e finanças).

Pronto quando: `vue-tsc` passa e os valores conferem com a seção 5.2.

### T2 — `src/utils/calculateTeamStrength.ts`

`TeamStrengthBreakdown` ganha `rating: number`. `calculateTeamStrength` passa a devolver médias ponderadas (seção 3.1, código pronto em `mkoverlay.mjs`, bloco `calculateTeamStrength.ts`). Não mexer em `getEffectiveOvr`, `positionPenalty` nem `pickBestLineup`.

Pronto quando: um 4-3-3 com todos os titulares OVER 70 na posição certa dá `total = 70`, `rating = 70`, `attack = midfield = defense = 70`; uma vaga vazia baixa o `rating` em cerca de 1/11.

### T3 — `src/utils/leagueScheduler.ts` e `src/utils/extraClubs.ts`

Trocar os 76 `basePower` pela tabela da seção 5.2 e a fórmula dos extras para `56 + ((i * 7) % 9)`. Nomes, ids e estilos não mudam.

Pronto quando: as médias por série dão 61,1 / 66,0 / 70,9 / 76,0, o grupo `d_1` a `d_5` dá 61,0 e os extras dão ~60.

### T4 — `src/utils/bracket.ts` e `src/utils/bracketSeeding.ts`

`SIM_TICKS`, `HOME_ADVANTAGE` e `FORM_SWING` passam a ler `MATCH_SIM` (os exports continuam). As chances de `simulateMatchScore` passam a usar `aiChanceBase + slope·Δ` em [`chanceMin`, `chanceMax`], com conversão `aiOnTarget × aiGoal`. `shootoutConversions` usa ÷ `shootoutDiv`. Em `seedContinentalGroups`, o usuário passa a ter `SERIE_TYPICAL_OVER[1]`. Em `seedSerieDR64`, o ruído passa a ser `rng() * MATCH_SIM.seedingNoise`.

Pronto quando: com `simulateMatchScore(61, 61)` em 20 mil jogos, o mandante vence 40% ± 2.

### T5 — `src/stores/league.ts` e `src/stores/competitions.ts`

Em `league.ts`:

- Importar `SERIE_TYPICAL_OVER` e criar `typicalOver()`.
- Remover as 3 ocorrências de `boost` (`initLeagueSeason`, `startSerieDKnockout`, `ensureKnockoutTies`).
- `power` do usuário nos `leagueTeams` = `SERIE_TYPICAL_OVER[divisão]`.
- `simulateOther` usa `simulateMatchScore` para todo jogo.
- Fallbacks de 700 viram `typicalOver()`.

Em `competitions.ts`: `DEFAULT_SUPERCUP_RIVAL.power` = 79 e `DEFAULT_RECOPA_RIVAL.power` = 80.

Pronto quando: não sobra nenhum `700`, `750`, `800`, `900` ou `* 12` ligado a poder nesses arquivos.

### T6 — `src/composables/useMatchSimulation.ts`

Criar `userMatchRating` e `opponentMatchRating` (floats). `effectiveUserPower` e `effectiveOpponentPower` viram `Math.round` deles (seguem exportados para `PreMatch` e `Scoreboard`). Em `simulateMatchTick`, trocar `userAtk`, `userDef` e `oppPow` por `diff` e aplicar as fórmulas da seção 3.3 (posse, chances e conversões vindas de `MATCH_SIM`). Manter `rollLiveInjury(minute)` e tudo o que veio depois.

Pronto quando: `calib-carreira.mjs` na política `curva` dá OVER igual entre 40% e 50%, +15 entre 64% e 76% e −15 entre 19% e 31%.

### T7 — `src/utils/generatePlayer.ts`, `src/stores/squad.ts`, `src/composables/useSquad.ts`

Exportar `wageForOverall(overall)` (seção 4.2) e usar em `generatePlayer`. Em `applyEndOfSeason`, fazer `p.wage = wageForOverall(p.overall)`. Em `renewPlayerContract`, fazer `p.wage = wageForOverall(p.overall)` no lugar de `× 1.12`.

Pronto quando: `wageForOverall(60) = 1000`, `(75) = 2000`, `(90) = 4000` e `(45) = 500`.

### T8 — `src/stores/club.ts`, `src/composables/useEconomy.ts`, `src/types/match.ts`

`club.ts`:

- `budget` inicial = `ECONOMY.startBudget` (no `ref` e no padrão de `fromSave`).
- Criar `serieEconomy`.
- `projectedStadiumIncome` e `projectedSponsorIncome` passam a usar a seção 4.1.
- Criar `facilityInvestment` e `maintenanceCost` (seção 4.3) e exportar os dois.

`useEconomy.ts`: reescrever `settleMatch` com bônus por série, manutenção, juros, saldo negativo e venda forçada (código pronto em `mkoverlay.mjs`, bloco `useEconomy.ts`). A venda forçada não mexe em `youthAcademyProspects`: isso evita uma falha de ida e volta do save que o T17 detectou.

`LastMatchSummary` ganha `interest?: number`, `maintenance?: number` e `forcedSale?: { name: string; price: number } | null`.

Pronto quando: com saldo −200.000 na D, uma partida cobra 2.000 de juros e vende um atleta.

### T9 — Migração de saves (`src/utils/balanceMigration.ts` novo, chamado em `usePersistence.loadGame`)

Logo depois de `competitions.ensureBrackets()`, chamar `migrateBalanceV2(...)`.

Detecção de save antigo: algum `power > 120` em `leagueTeams` (fora o usuário), em `cupState.bracket.teams`, em `continentalState.teams`, `otherGroups` ou `bracket.teams`, ou `rivalPower > 120` em `supercupState` ou `recopaState`.

Conversão:

- Por id, ler o novo `basePower` em `LEAGUE_CLUBS_POOL`, `EXTRA_D_CLUBS` ou `CONTINENTAL_RIVALS`.
- `user` recebe `SERIE_TYPICAL_OVER`.
- Supercopa e Recopa: buscar pelo nome nas mesmas listas.
- Id desconhecido: `clamp(round(57 + (power − 640) × 0.08), 50, 85)`.
- Recalcular `wage` de todos os atletas do elenco, dos relatórios de scouting e da base com `wageForOverall`.
- O caixa do save antigo é mantido.

Pronto quando: o T17 (checagem de ida e volta do save) passa e um save antigo de teste com `power` 668 na Série D carrega com `d_*` entre 57 e 65.

### T10 — Interface

- `PostMatchSummary.vue`: linhas "Manutenção" e "Juros da dívida" (quando maiores que 0) e aviso da venda forçada.
- `FinanceSummary.vue`: manutenção por jogo (`club.maintenanceCost`) e, com saldo negativo, o saldo em vermelho com "Dívida — limite R$ X (`club.serieEconomy.debtLimit`)".
- `Header.vue`: saldo negativo em `text-dangerpro`.
- `UpgradeCard.vue`, só para estádio e finanças: "+R$ X por jogo" (diferença do fator, 0 se o nível passar do teto da série) e "+R$ Y de manutenção".

Pronto quando: `npm run build` passa e o texto está em português.

### T11 — Testes e simulador

- Atualizar `t02-bracket.mjs` e `t03-seeding.mjs` (e os outros `t*.mjs` que tiverem poder fixo 700 a 900 ou médias da fórmula antiga) para poderes em OVER (60 a 80).
- Ajustar `t17-e2e.mjs`:
  - `wageOf` → `wageForOverall` importado.
  - `TYP_OVER` → `SERIE_TYPICAL_OVER`.
  - `nextCost` → custo atual de `UPGRADE_COSTS` no nível típico.
  - `zeroMatches` → contar jogos com saldo negativo.
  - `strong` passa a aceitar vendas forçadas (o elenco pode encolher até 11).
  - `midPow` passa a comparar `teamStrength.rating` com a média dos rivais.
- No `t17-e2e.mjs`, adaptar também a escada de prêmios (código pronto em `scratchpadal	17-overlay.mjs`):
  - `keyOf` aceita `byRank` (`rank1` a `rank16`) e o valor 0;
  - a escada `CAT` compara só campeão, vice, 3º e 4º, com a A lida de `byRank[0..3]`;
  - "campeão ≤ permanece" vira "campeão ≤ subida (`fourth`) da série de cima" para D→C e C→B.
- Rodar todos os `t*.mjs` e depois `node docs/calibracao/calib-carreira.mjs 20 curva,tipicoRot:240,forteRot:80,fracoRot:80,maximoRot:40,tipico,tipicoD,forte,fraco,caroFraco,investidor --check` **sem** `--overlay`.

Pronto quando: T17 sem erros e calibração com "CHECK OK" (cerca de 3 minutos).

### T12 — Prêmios novos (`src/utils/constants.ts`, `src/stores/league.ts`, testes de prêmio)

1. Em `constants.ts`, trocar o objeto `PRIZES` pelo da seção 4.6, exatamente.
   - Chaves novas: `serieD.r64`, `r32`, `r16` e `serieA.byRank`.
   - Chaves removidas: `serieD.knockout` e `serieA.stayed`, `fourth`, `third`, `runnerUp`.
2. Em `league.ts`, `evaluateStageProgression`:
   - **Série D**, eliminação em `D_R64`, `D_R32` ou `D_R16`: `end(4, st === 'D_R64' ? P.r64 : st === 'D_R32' ? P.r32 : P.r16, …)` no lugar de `P.knockout`.
   - **Série A**: depois de `rank === 1` (campeão) e `rank >= 17` (rebaixado, `relegated` = 0), trocar o bloco `rank <= 4` e o `stayed` por `return end(1, PRIZES.serieA.byRank[rank - 1] ?? 0, \`Série A concluída em ${rank}º lugar!\`, 'success')`.
   - B e C não mudam de código (os zeros saem da tabela). Código pronto em `mkoverlay.mjs`, bloco `league.ts`, com as duas primeiras trocas.
3. `SERIE_META[n].championPrize` continua lendo `PRIZES.serieX.champion`. `CupPanel.vue`, `ContinentalPanel.vue` e `SupercupsPanel.vue` já leem `PRIZES` e não mudam.
4. Testes:
   - **`t19-prizes.mjs`:**
     - A escada (linhas 9 a 21) passa a comparar só `champion`, `runnerUp`, `third` e `fourth`. Na A, usar `byRank[0..3]`. Os zeros (`groups`, `relegated`, `stayed`, `quadElim`) saem da comparação "estritamente mais".
     - Linha 24: a A usa `byRank`.
     - Linha 26 vira `fourth > qf > r16 > r32 > r64 > groups === 0`.
     - Linha 27 vira `fourth > 0` e `quadElim === stayed === relegated === 0`.
     - Linha 29 vira: campeão D ≤ `serieC.fourth`; campeão C ≤ `serieB.fourth`; campeão B < `serieA.champion`.
     - Novos asserts:
       - `byRank` tem 16 valores, estritamente decrescente, com `byRank[0] === serieA.champion`;
       - proporções do 2º, 5º, 10º, 11º e 16º = 0,95 / 0,80 / 0,55 / 0,43 / 0,34 (±0,01);
       - todos os `relegated`, `groups`, `stayed` e `quadElim` = 0;
       - Copa: soma de `rounds` > `serieA.champion` e ≥ 3 × `serieD.champion`;
       - vice da Copa (soma das 3 primeiras fases + `finalLoss`) entre 35% e 50% do campeão.
   - **`t08-serie-d.mjs`**, linha 123: "eliminado no R32 paga `PRIZES.serieD.knockout`" vira `PRIZES.serieD.r32` (ou a chave da fase em que o teste elimina). A linha 113 (`groups`) continua, agora com 0. As outras ficam.
   - **`t09-serie-c.mjs`**: sem mudança de código. `quadElim`, `relegated` e `stayed` passam a valer 0, e os asserts comparam com `PRIZES.*`.
   - **`t07-continental.mjs`**: sem mudança de código (compara com `PRIZES.continental.*`). Só os textos das mensagens citam valores antigos ("40.000 + 25.000"); trocar por texto genérico.
   - **`t17-e2e.mjs`**: escada e `keyOf` como na T11.
   - Qualquer teste com um número de prêmio literal falha no assert "sem números de prêmio fixos fora de `PRIZES`" do t19.

Pronto quando: t07, t08, t09, t19 e T17 passam e o `--check` da T11 dá "CHECK OK".

Depois de T11 e T12: revisão final em Opus antes do commit.

---

## 7. Riscos

- **Sorteio na Série D:** as temporadas têm de 12 a 22 jogos e a Copa paga 330 mil ao campeão, então o saldo da D varia muito. O `--check` usa faixas largas.
- **Copa muito ganhável:** o clube típico ganha a Taça Cacique em 3% das temporadas na D, 12% na C, 22% na B e 18% na A. O campo tem só 4 clubes da A, o usuário sempre joga em casa (+3) e a curva equilibrada facilita surpresas. Por isso a Copa é a maior fonte de prêmio fora da A (decisão 2 da seção 8).
- **Time barato na série alta lucra:** a receita depende da série, não do desempenho. Um elenco −10 na A lucra cerca de 0,9 milhão antes de cair (decisão 1 da seção 8).
- **−15 perto do limite:** a curva fica no limite inferior do alvo (20,6%). Se quiser centralizar, `MATCH_SIM.slope` 0,0027 dá −15 → 22% e +15 → 65%.
- **Saves antigos com milhões em caixa:** continuam ricos. A manutenção e a folha nova gastam esse dinheiro aos poucos.
- **Telas que somavam ataque, meio e defesa:** nenhuma foi encontrada. `TeamPowerBar` só exibe os números.

## 8. Decisões do dono

Já aprovadas: (a) manutenção das instalações (0,15% do investido por jogo); (b) elenco de craques não se paga sozinho (`WAGE.doubleEvery` = 15).

Pendentes (só as inevitáveis):

1. **Receita independente do desempenho.** Um elenco barato e fraco numa série alta dá lucro alto até cair (A: cerca de +0,9 milhão por temporada; B: +0,66 milhão). As opções são aceitar, porque a queda já pune, ou ligar parte da bilheteria ao aproveitamento, o que é regra nova e pede outra calibração. Recomendação: aceitar por ora.
2. **Copa muito ganhável e generosa.** Com a regra "campeão da Copa > campeão da A", a Copa vira a maior fonte de prêmio dos clubes típicos da C e da B (de 77 a 109 mil por temporada em média). As opções são aceitar ou tirar o mando do usuário (+3) nos jogos de Copa, Supercopa e Recopa, o que corta cerca de um terço dos títulos. Recomendação: tirar o mando nas copas, uma mudança pequena na T6.

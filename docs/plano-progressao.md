# Plano: progressão do OVER e sensação de evolução contínua

> **Nota:** os scripts citados abaixo que não estão em `docs/calibracao/` (por exemplo `mkoverlay-progressao.mjs`) não foram versionados. O que foi medido está nas tabelas deste documento.

Escopo: baixar o começo da carreira (hoje o clube nasce com OVER 64,5), criar uma escada longa e visível até 99, deixar a evolução dos atletas perceptível e dar à gestão um retorno visível (gamificação), sem quebrar o equilíbrio de vitórias por série nem a economia. Este documento só projeta e calibra. `src/` não foi tocado. Quem implementa são as tarefas da seção 10.

**Atenção:** outra tarefa está editando agora `constants.ts`, `club.ts`, `useSquad.ts`, `SquadRoster.vue` (limite de 25 atletas e Alojamento). As trocas daqui foram medidas sobre o estado de `src/` em 13/11/2026 e não tocam no que aquela tarefa muda. Implementar depois que ela entrar; se algum trecho original mudar, o `mkoverlay-progressao.mjs` falha e aponta o trecho.

Scripts (em `docs/calibracao/`; copiar para a raiz do projeto para rodar e apagar a cópia depois):

| Script | O que faz |
|---|---|
| `mkoverlay-progressao.mjs` | Gera uma cópia de `src/` com todas as trocas deste plano, sem tocar em `src/`. É a referência exata de cada troca. `node docs/calibracao/mkoverlay-progressao.mjs <pasta> C` (opções A, B, C; chaves `base=`, `bench=`, `scout1=` etc. para recalibrar). Sem chaves, gera exatamente os valores finais. |
| `escada.mjs` | Carreira viva de N temporadas pelo código real (evolução, envelhecimento, contratos, scouting, base, ampliações, comissão) com três gestores: `fraco` (passivo: compra pouco, não amplia CT nem scouting, sem comissão), `medio` (compra até o OVER típico da série + 2, amplia o mais barato, promove a base boa) e `forte` (compra sempre que melhora o time, prioriza receita, CT e scouting, contrata Auxiliar e Treinador de Base, 3 peneiras, foco de treino no atributo-chave). Mede OVER do time por temporada, série, caixa, vitórias, evolução por idade e raridade de 85+/90+. `node _escada.mjs 30 fraco,medio,forte --runs 4 --overlay <pasta>` |
| `calib-carreira.mjs` | O de sempre (OVER fixado por política). Com `--overlay` e `ELITE=85` mede a economia na escala nova. |

Todos os números abaixo são do fluxo real (Pinia, stores, `simulateMatchTick`, `settleMatch`, virada), 4 carreiras de 30 temporadas por gestor e por opção (360 temporadas por opção).

---

## 0. Resposta curta ao dono

- **Recomendação: opção C, a escada deslocada e alongada.** O OVER típico das séries passa de D 61, C 66, B 71, A 76 para **D 50, C 57, B 64, A 71** (degrau de 7 em vez de 5). O clube nasce com **OVER ~49** (atletas de 42 a 57, com 2 promessas, uma delas joia), um ponto abaixo do típico da D.
- **A escada fica longa e contínua.** Gestor forte: Série A entre a 11ª e a 19ª temporada, OVER 60 na ~12ª, 70 na ~20ª, 80 na 24ª a 28ª. Ninguém chegou a OVER de time 85 em 30 temporadas; atleta 90+ apareceu em 7 de 360 temporadas, sempre depois da 26ª. Hoje o clube nasce a 3,5 da Série A e para de crescer em ~75.
- **A evolução fica perceptível.** Jovem longe do potencial ganha **+3,5 a +3,9 de OVER por temporada** (hoje 2 a 4, quase só na Série A, porque o ganho era por partida). O ganho agora depende de idade, distância ao potencial, Centro de Treinamento, comissão, minutos em campo e foco de treino, e é igual em qualquer série.
- **Vitórias por série e a curva de diferença de OVER não mudam.** O motor só olha a diferença de OVER; os rivais de cada série descem o mesmo tanto que o típico daquela série (D −11, C −9, B −7, A −5). Clube típico: 40% a 46% de vitórias em todas as séries (hoje 41% a 44%).
- **Economia fecha sem mexer em receita, prêmios nem custos.** Salário e valor passam a ser calculados na escala nova (`WAGE` dobra a cada 21 pontos a partir de 49; `VALUE` com referência 46), o que deixa a folha e o valor do atleta típico de cada série iguais aos de hoje (±1%). Saldo do típico com e sem prêmio dentro dos alvos, Série D sem travar, elenco de craques com −0,95 M por temporada na A.
- **Saves antigos são reescalados**, não ficam numa escala legada: cada OVER do save (atletas, potenciais, relatórios, base) cai o deslocamento da série atual do clube, e os rivais são relidos das listas novas. A força relativa do time na série fica idêntica.
- **Gamificação** em 5 peças pequenas (seção 9), todos os dados dentro do objeto `club` do save (as 17 chaves continuam as mesmas).

---

## 1. Diagnóstico numérico (estado atual)

### 1.1 Escalas

| Item | Hoje |
|---|---|
| Elenco inicial (`squad.initializeDefaultSquad`) | 14 atletas de 58 a 71 (líder CM 69-71, 2 promessas de 58-62, 8 titulares 62-68, 3 reservas 58-64). **OVER do time 64,5** (medido: 64,0 a 65,2), 3,5 acima do típico da D. |
| `SERIE_TYPICAL_OVER` | D 61, C 66, B 71, A 76 (degrau de 5) |
| `LEAGUE_CLUBS_POOL.basePower` | D 57-65 (média 61,1), C 63-70 (66,0), B 68-75 (71,0), A 72-81 (76,0) |
| `EXTRA_D_CLUBS` | 56 + ((i×7) mod 9) = 56-64 |
| `CONTINENTAL_RIVALS` | 77-81; Supercopa padrão 79, Recopa padrão 80 |
| `SCOUTING_LEVELS.maxOvr` | 70 a 88 (+2 por nível) |
| Base (`generateYouthAcademyBatch`, peneira) | 56-64 / 55-63 / 58-66; reposição automática 52-56; empréstimo 65-75 |
| Pisos no código | `generatePlayer` limita o OVER sorteado a 52-93; `getEffectiveOvr` a 40-99; `applyAging` a 40; estimativa do scouting a 48 |
| Salário (`WAGE`) | 1.000 × 2^((OVER − 60)/15); estrela acima de 85 |
| Valor (`VALUE`) | 18.000 + max(0, OVER − 58)^2,15 × 450 |

O começo alto não é só o elenco: o piso de 52 em `generatePlayer`, a base 52-66 e o scouting nível 1 até 70 impedem qualquer começo abaixo de ~58 hoje.

### 1.2 Evolução atual (`useMatchSimulation.applyPostMatchProgression`)

Por partida, todo atleta abaixo do potencial ganha +1 em um atributo com chance (0,14 + 0,06 × nível do CT + 0,30 Auxiliar + 0,25 Treinador de Base) × fator acima de 85; com 45% disso o OVER sobe 1. Com CT 1 e sem comissão: 0,09 de OVER por jogo, para titular e reserva. Consequências:

- **O ritmo depende da série, não do atleta:** a D tem ~17 jogos por temporada e a A ~45. O mesmo jovem ganha ~1,5 por temporada na D e ~4 na A. O começo, que deveria ser a fase de evolução rápida, é a mais lenta.
- **Idade não conta** (só o potencial: jovem da base nasce com +10 a +18, até 23 anos +4 a +10, depois +0 a +3) e **minutos não contam** (o reserva evolui igual ao titular).

Medido na carreira viva (`escada.mjs`, `src/` atual, 360 temporadas por gestor), OVER ganho por temporada pela evolução:

| Idade (longe do potencial = faltam 6+) | fraco | médio | forte |
|---|---|---|---|
| até 19 | 3,3 | 4,2 | 2,9 |
| 20-21 | 3,5 | 3,4 | 2,6 |
| 22-23 | 3,5 | 2,6 | 2,5 |
| 24-26, perto do potencial | 0,3 | 0,4 | 0,5 |
| 27+ | ~0,1 | ~0,1 | ~0,1 |

### 1.3 Carreira atual (OVER do time no início de cada temporada, média de 4 carreiras)

| Temporada | 1 | 3 | 5 | 8 | 10 | 12 | 15 | 18 | 20 | 25 | 30 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| fraco | 64,9 | 66,5 | 67,1 | 67,6 | 68,2 | 69,0 | 72,0 | 72,8 | 73,7 | 73,8 | 71,5 |
| médio | 64,4 | 67,1 | 66,9 | 68,6 | 70,8 | 71,6 | 73,9 | 74,5 | 74,7 | 76,3 | 78,2 |
| forte | 64,8 | 67,0 | 67,8 | 66,1 | 65,6 | 67,9 | 70,9 | 74,4 | 76,3 | 73,2 | 74,2 |

- Chegada à Série A: fraco 7-17, médio 7-28 (mediana 9,5), forte 10-19. **O fraco chega à A** (o começo já é forte demais).
- A escada inteira cabe em ~12 pontos (64 → 76); depois o time oscila entre 72 e 80. Atleta 90+ em 27 de 120 temporadas do forte e 16 de 120 do médio.
- Vitórias do clube típico por série (`calib-carreira`, plano de economia): 41% a 44%.

---

## 2. Princípio do desenho

1. **O motor de partida só enxerga a diferença de OVER** (`simulateMatchTick`, `simulateMatchScore`, `estimateOutcome`, pênaltis). Deslocar o usuário e os rivais de uma série pelo mesmo número deixa vitórias, empates e a curva iguais. Isso foi conferido: curva com OVER igual 43,5% (hoje 43%), +15 65,8% (64%), −15 ~21% (21%).
2. **Dentro da série, só deslocar; entre séries, alongar.** Cada série desce um número próprio (D −11, C −9, B −7, A −5): a dispersão interna de cada série fica igual (D 46-54 continua sendo 8 pontos), e o degrau entre séries passa de 5 para 7. O clube precisa crescer 21 pontos da D à A, não 15.
3. **Tudo o que é OVER absoluto passa pelo mesmo mapa**: scouting, base, reposição, empréstimo, pisos, salário e valor. Assim a mesma moeda compra a mesma posição relativa na série.
4. **Evolução por temporada, não por partida**: a chance por jogo é o ganho esperado da temporada dividido pelos jogos típicos da série, para o ritmo não depender da série.
5. **O que é raro continua absoluto**: `ATHLETE_MAX_OVERALL` 99, cauda `OVER_TAIL` (≥ 90), retorno decrescente da evolução acima de 85 (`EVOLUTION`), estrela acima de 85 (`STAR`). Na escala nova, 85 é o nível de uma dinastia (A + 14) e 90 fica mais raro do que hoje.

---

## 3. Opções comparadas

Todas com o mesmo elenco inicial (~49), os mesmos pisos e o mesmo modelo de evolução (seção 5, base 5,0), para a comparação ser justa. Muda só a escala dos rivais e da economia.

| | A: deslocar tudo 12 para baixo | B: manter rivais, só o início baixo | **C: deslocar e alongar (recomendada)** |
|---|---|---|---|
| Típico D/C/B/A | 49 / 54 / 59 / 64 | 61 / 66 / 71 / 76 | **50 / 57 / 64 / 71** |
| Rivais | todos −12 (continental 65-69) | iguais | D −11, C −9, B −7, A −5, continental/Supercopa/Recopa −5 |
| Scouting (`maxOvr` nível 1 → 10) | 58 → 76 | 70 → 88 | **61 → 88 (+3 por nível)** |
| Salário / valor | ref 48 / ref 46, mesma inclinação | iguais aos de hoje | **dobra a cada 21 a partir de 49 / ref 46, mult 218** |

### 3.1 OVER do time no início de cada temporada (média de 4 carreiras)

| Opção | Gestor | T1 | T3 | T5 | T8 | T10 | T12 | T15 | T18 | T20 | T25 | T30 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Hoje | médio | 64,4 | 67,1 | 66,9 | 68,6 | 70,8 | 71,6 | 73,9 | 74,5 | 74,7 | 76,3 | 78,2 |
| A | fraco | 48,7 | 51,6 | 52,7 | 53,4 | 53,9 | 55,7 | 56,5 | 58,9 | 61,1 | 62,5 | 61,8 |
| A | médio | 49,9 | 53,4 | 55,2 | 57,2 | 60,5 | 62,3 | 62,7 | 63,6 | 63,8 | 66,0 | 65,8 |
| A | forte | 49,1 | 52,3 | 54,8 | 57,4 | 59,7 | 61,3 | 65,2 | 65,1 | 67,7 | 68,4 | 64,6 |
| B | fraco | 49,4 | 53,1 | 56,7 | 60,8 | 62,3 | 63,1 | 66,3 | 69,7 | 71,3 | 73,2 | 73,5 |
| B | médio | 51,3 | 55,8 | 59,7 | 63,9 | 65,7 | 68,7 | 70,7 | 74,0 | 75,6 | 77,5 | 78,0 |
| B | forte | 51,7 | 57,6 | 61,8 | 64,6 | 67,1 | 67,4 | 68,3 | 68,5 | 71,0 | 73,8 | 75,6 |
| **C** | fraco | 48,9 | 51,6 | 53,0 | 54,3 | 56,2 | 56,7 | 57,9 | 59,6 | 60,5 | 60,7 | 60,7 |
| **C** | médio | 49,8 | 52,1 | 54,5 | 57,4 | 59,6 | 58,4 | 61,3 | 62,5 | 65,0 | 68,7 | 71,0 |
| **C** | **forte** | **49,8** | **52,5** | **55,1** | **56,7** | **58,1** | **60,4** | **64,7** | **68,5** | **71,8** | **77,7** | **80,5** |

### 3.2 Marcos (temporada em que acontece, nas 4 carreiras; "-" = não aconteceu em 30)

| Opção | Gestor | Sobe à C | Chega à A | Time 60 | Time 70 | Time 80 | Atleta 80 | Atleta 90 |
|---|---|---|---|---|---|---|---|---|
| Hoje | médio | 3/2/4/2 | 28/7/9/10 | 1 | 16/5/7/7 | -/28/-/- | 15/9/12/9 | -/25/24/28 |
| Hoje | forte | 28/2/3/11 | -/11/10/19 | 1 | -/11/7/19 | -/15/18/- | -/11/10/18 | -/13/13/- |
| A | médio | 2/8/3/3 | 12/23/7/7 | 10/22/9/9 | - | - | - | - |
| A | forte | 3/7/3/7 | 12/-/13/10 | 9/21/11/7 | 21/-/20/16 | - | -/-/28/16 | - |
| B | médio | 12/10/5/9 | 18/19/16/12 | 5/7/6/5 | 17/12/11/13 | - | 18/13/13/12 | - |
| B | forte | 12/14/5/7 | 29/20/14/- | 4/5/5/6 | -/17/13/28 | -/30/22/- | 19/9/11/19 | -/-/23/- |
| **C** | fraco | 17/2/4/7 | 28/22/27/16 | 27/14/25/13 | - | - | - | - |
| **C** | médio | 3/8/5/9 | 24/30/15/16 | 8/14/12/12 | 28/-/22/25 | - | 24/-/24/25 | - |
| **C** | **forte** | **9/7/6/7** | **11/19/17/15** | **9/14/12/14** | **16/21/20/20** | **24/-/26/28** | **19/23/23/19** | **29/-/-/26** |

### 3.3 Vitórias e saldo por série (carreira viva, temporadas somadas)

| Opção / gestor | D | C | B | A | Saldo médio por temporada |
|---|---|---|---|---|---|
| Hoje / médio | 47,7% | 41,9% | 38,4% | 38,8% | +52 mil |
| A / forte | 41,5% | 40,0% | 35,1% | 47,9% | +34 mil |
| B / médio | **34,0%** | 43,9% | 39,6% | 40,7% | +60 mil |
| B / forte | **35,3%** | 36,1% | 39,4% | 42,3% | +13 mil |
| **C / médio** | 43,3% | 45,8% | 36,0% | 38,3% | +51 mil |
| **C / forte** | 44,1% | 39,0% | 38,7% | 45,5% | +43 mil |

### 3.4 Leitura

- **A (deslocar tudo):** a carreira chega rápido à A (forte e médio na 7ª-13ª temporada) e para ali: a escada competitiva continua com 15 pontos, a A típica é 64, e de 65 a 99 não há rival nenhum (continental 65-69). Time de 70 já seria dinastia; 85 seria +21 sobre a A. Não cria a "escada até 99".
- **B (manter rivais):** o clube nasce 12 pontos abaixo da D e passa **10 a 25 temporadas na D com 33% a 35% de vitórias** (médio sobe à C entre a 5ª e a 12ª; fraco entre a 13ª e a 20ª). Depois que alcança o OVER 61, a carreira volta a ser a de hoje (A típica 76, platô ~75-78). É o começo frustrante que o dono quer evitar, e a escada visível fica só no "tutorial".
- **C (deslocar e alongar):** começa no nível da D (43% a 44% de vitórias desde a primeira temporada), sobe de forma contínua por 30 temporadas (forte: ~1 ponto por temporada, 49,8 → 80,5), separa bem os gestores (fraco para em ~61 e quase nunca chega à A; médio chega à A entre a 15ª e a 30ª; forte entre a 11ª e a 19ª) e mantém 85+ e 90+ como raridade de fim de carreira.

---

## 4. Recomendação: opção C

**Escada de referência (gestor forte, mediana de 4 carreiras):**

| Marco | Temporada |
|---|---|
| Início: OVER ~49 na Série D (típico 50) | 1 |
| Sobe para a C | 6-9 |
| OVER 60 | 9-14 |
| Chega à Série A | 11-19 (mediana ~16) |
| OVER 70 | 16-21 |
| Primeiro atleta 80 | 19-23 |
| OVER 80 | 24-28 (3 de 4 carreiras) |
| OVER 85 | nenhuma em 30 temporadas |
| Atleta 90+ | 2 de 4 carreiras, temporadas 26-29 |

O alvo do dono ("Série A em cerca de 10 a 15 temporadas para um bom gestor") fica no limite de cima: mediana ~16 com o forte. Se o dono quiser a A mais cedo, a alavanca é `PROGRESSION.seasonBase` (5,0 → 5,5) ou o primeiro nível de scouting (61 → 62); cada uma antecipa ~2 temporadas (medido entre base 4 e 5: chegada à A do forte 11-21 → 11-19; time 80 de nunca → 24-28).

---

## 5. Evolução nova (`useMatchSimulation.applyPostMatchProgression`)

Ganho esperado de OVER na temporada para cada atleta abaixo do potencial (emprestados não evoluem):

```
ganho = seasonBase (5,0)
      × idade        (≤19: 1,0 · 20-21: 0,9 · 22-23: 0,75 · 24-26: 0,5 · 27-29: 0,3 · 30+: 0,15)
      × distância    min(1, (potencial − OVER) / 6)        ← cai perto do potencial
      × (1 + 0,12 × (nível do CT − 1) + 0,30 Auxiliar Técnico + 0,25 Treinador de Base até 21 anos)
      × minutos      (titular na partida 1,0 · reserva 0,6)
      × foco         (1,10 se o foco de treino é o atributo-chave da posição)
      × evolutionFactor(OVER)                                ← retorno decrescente acima de 85 (igual a hoje)
chance de +1 por partida = min(0,5, ganho / jogos típicos da série) com jogos típicos D 22, C 30, B 44, A 46
```

Ao subir: +1 no OVER (até o potencial), +1 no atributo do foco (equilibrado = atributo aleatório), `refreshPlayerEconomy`. O atributo-chave por posição: GOL físico, ZAG e VOL marcação, LE/LD/PE/PD velocidade, MC e MEI passe, ATA finalização.

Os jogos típicos (22/30/44/46) são maiores que a média medida (D 16-17, C 25-27, B 42, A 45): o valor calibrado já desconta isso. Ritmo medido (opção C, gestor forte), OVER por temporada:

| Idade | longe do potencial | perto do potencial |
|---|---|---|
| até 19 | **3,9** | 2,1 |
| 20-21 | **3,8** | 1,0 |
| 22-23 | 3,4 | 0,8 |
| 24-26 | 2,2 | 0,4 |
| 27-29 | 1,0 | 0,1 |
| 30+ | — | 0,03 |

Teto teórico de um jovem titular com CT 5, Auxiliar e Treinador de Base: 5,0 × 2,03 × (17/22 jogos na D) ≈ +8 por temporada, até ficar a 6 do potencial (aí cai proporcionalmente). Reserva com CT 1 e sem comissão: 5,0 × 0,6 × 17/22 ≈ +2,3. Na média medida, que mistura titulares, reservas e a aproximação do potencial: forte 3,9, médio 3,5, fraco 3,6 no jovem até 19 anos.

---

## 6. Constantes: valor antigo e novo

### 6.1 `src/utils/constants.ts`

| Nome | Antigo | Novo |
|---|---|---|
| `SERIE_TYPICAL_OVER` | `{ 4: 61, 3: 66, 2: 71, 1: 76 }` | `{ 4: 50, 3: 57, 2: 64, 1: 71 }` |
| `SCOUTING_LEVELS[1..10].maxOvr` | 70, 72, 74, 76, 78, 80, 82, 84, 86, 88 | 61, 64, 67, 70, 73, 76, 79, 82, 85, 88 (resto do objeto igual; corrigir o comentário "sobe só 2 por nível" para 3, e "88+ só no nível 8" para "85+ só a partir do nível 9") |
| `CONTINENTAL_RIVALS[].power` | 81, 80, 78, 77, 77, 79, 80, 78 | 76, 75, 73, 72, 72, 74, 75, 73 |
| `WAGE` | `{ base: 1000, refOvr: 60, doubleEvery: 15, min: 500, step: 25 }` | `{ base: 1000, refOvr: 49, doubleEvery: 21, min: 500, step: 25 }` |
| `VALUE` | `{ floor: 18000, ref: 58, exp: 2.15, mult: 450, ... }` | `{ floor: 18000, ref: 46, exp: 2.15, mult: 218, ... }` (resto igual) |
| `PROGRESSION` (novo) | — | `{ seasonBase: 5, gapFull: 6, tcPerLevel: 0.12, benchShare: 0.6, focusBonus: 0.1, maxPerMatch: 0.5, matchesPerSeason: { 4: 22, 3: 30, 2: 44, 1: 46 }, ageBands: [[19, 1], [21, 0.9], [23, 0.75], [26, 0.5], [29, 0.3], [99, 0.15]] }` |
| `progressionAgeFactor(age)` (nova) | — | primeiro fator de `ageBands` com `age <= limite` |
| `POSITION_KEY_FOCUS` (novo) | — | `{ GK: 'physical', CB: 'defending', LB: 'pace', RB: 'pace', CDM: 'defending', CM: 'passing', CAM: 'passing', LW: 'pace', RW: 'pace', ST: 'shooting' }` |
| `MILESTONES` (novo, seção 9) | — | `{ teamOver: [55, 60, 65, 70, 75, 80, 85, 90], playerOver: [70, 80, 90] }` |
| Sem mudança | | `ATHLETE_MAX_OVERALL` 99, `OVER_TAIL`, `EVOLUTION`, `evolutionFactor`, `STAR`, `VALUE_AGE`, `CONTRACT`, `AGING`, `TRANSFER`, `MATCH_SIM`, `ECONOMY`, `SERIE_ECONOMY`, `PRIZES`, `UPGRADE_COSTS`, `STAFF_BONUS`, `STAFF_CATALOG`, `REST`, `SCOUT_OVR_OFFSETS` |

Salário e valor na escala nova (a mesma posição relativa custa o mesmo):

| Série (típico) | Salário hoje → novo | Valor hoje → novo |
|---|---|---|
| D (61 → 50) | 1.050 → 1.025 | 23.000 → 22.500 |
| C (66 → 57) | 1.325 → 1.300 | 57.500 → 56.000 |
| B (71 → 64) | 1.650 → 1.650 | 129.500 → 127.000 |
| A (76 → 71) | 2.100 → 2.075 | 243.000 → 239.000 |
| Elite (88 → 85) | 4.500 → 3.275 | 852.500 → 592.500 |
| 99 | 16.000 → 13.750 | 3,53 M → 2,98 M |

### 6.2 Rivais

Regra (script de mapeamento, já aplicada pelo `mkoverlay-progressao.mjs`): `novo = antigo + DESLOCAMENTO[série]` com `DESLOCAMENTO = { 4: −11, 3: −9, 2: −7, 1: −5 }`; continental, Supercopa e Recopa usam o da A (−5).

| Arquivo | Nome | Antigo | Novo |
|---|---|---|---|
| `src/utils/leagueScheduler.ts` | `LEAGUE_CLUBS_POOL[4].basePower` | 57-65 (média 61,1) | 46-54 (média 50,1) |
| | `LEAGUE_CLUBS_POOL[3].basePower` | 63-70 (66,0) | 54-61 (57,0) |
| | `LEAGUE_CLUBS_POOL[2].basePower` | 68-75 (71,0) | 61-68 (64,0) |
| | `LEAGUE_CLUBS_POOL[1].basePower` | 72-81 (76,0) | 67-76 (71,0) |
| `src/utils/extraClubs.ts` | `EXTRA_D_CLUBS.basePower` | `56 + ((i * 7) % 9)` | `45 + ((i * 7) % 9)` |
| `src/stores/competitions.ts` | `DEFAULT_SUPERCUP_RIVAL.power` | 79 | 74 |
| | `DEFAULT_RECOPA_RIVAL.power` | 80 | 75 |
| `src/utils/balanceMigration.ts` | `byName` dos rivais padrão | 79 / 80 | 74 / 75 |

A Copa e os sorteios de Supercopa/Recopa (`pickRandom(LEAGUE_CLUBS_POOL[1])`) leem as listas e acompanham sozinhos.

### 6.3 Elenco inicial, base e pisos

| Arquivo | Trecho | Antigo | Novo |
|---|---|---|---|
| `src/stores/squad.ts` `initializeDefaultSquad` | líder (CM) | 69-71 | 55-57 |
| | promessas (LW, ST, `isYouth`) | 58-62 | 44-47; a do ST com `isGem: true` (potencial ~+16 a +30) |
| | outros 8 titulares | 62-68 | 46-51 |
| | 3 reservas | 58-64 | 42-47 |
| | resultado | OVER 64,5 | **OVER 48,2 a 49,5** (medido em 12 carreiras; atletas 42-57) |
| `src/stores/squad.ts` `applyEndOfSeason` (reposição) | jovem | 52-56 | 41-45 |
| `src/composables/useEconomy.ts` `forcedSale` (reposição) | jovem | 52-56 | 41-45 |
| `src/stores/scouting.ts` `generateYouthAcademyBatch` | 2 jovens | 56-64 e 55-63 | 45-53 e 44-52 |
| `src/stores/scouting.ts` `addTryoutProspect` | peneira | 58-66 | 47-55 |
| `src/stores/scouting.ts` `completeMission` | piso da estimativa | 48 | 30 |
| `src/stores/market.ts` `refreshLoanCandidates` | empréstimo | 65-75 | 55-69 |
| `src/utils/generatePlayer.ts` | piso/teto do OVER sorteado | `clamp(…, 52, 93)` | `clamp(…, 35, 93)` |
| | pisos de atributo | 40 (geral), 50/55 (posição) | 25 (geral), 30 (posição) |
| | `applyAging` piso | 40 | 30 |
| `src/utils/calculateTeamStrength.ts` | `getEffectiveOvr` | `clamp(…, 40, 99)` | `clamp(…, 15, 99)` (senão a penalidade de posição some com OVER baixo) |
| `src/components/player/PlayerCard.vue` | faixas da carta | elite 85, ouro 75, prata 65 | elite 85, ouro 71, prata 57 (típicos da A e da C: a carta vira um marco visível) |
| | cor do atributo | 75 / 55 | 70 / 50 |

---

## 7. Calibração

### 7.1 Curva e economia (`calib-carreira.mjs`, overlay final, `ELITE=85`)

Comando: `ELITE=85 CURVE_N=6000 node _calib.mjs 20 curva,tipicoRot:240,maximoRot:40,tipico,tipicoD,fraco --check --overlay <pasta>`

Resultado: todos os alvos atingidos, menos um que é do teste e não do jogo (elenco máximo na D, seção 7.3).

Curva (usuário, 6.000 jogos por ponto, V/E/D %): −30 6,3/20,4/73,3 · −15 20,6/28,1/51,3 · 0 **43,5**/28,4/28,1 · +15 **65,8**/22,5/11,6 · +30 83,3/14,0/2,7. Igual à de hoje dentro do ruído.

Clube típico por série (`tipicoRot`, 60 temporadas por série, caixa neutro), comparado ao estado atual (plano de economia do atleta, seção 3.1):

| Série | Vitórias hoje → novo | Saldo sem prêmio hoje → novo (alvo) | Luvas por temporada | Saldo total hoje → novo (teto) |
|---|---|---|---|---|
| D | 40,9% → 40,1% | +7,3 mil → +12,6 mil (3-70 mil) | 10,1 mil | +76 mil → +70 mil (130 mil) |
| C | 42,4% → 39,9% | +25 mil → +20 mil (3-110 mil) | 19,0 mil | +115 mil → +110 mil (220 mil) |
| B | 44,1% → 41,2% | +50 mil → +39 mil (3-200 mil) | 43,3 mil | +251 mil → +176 mil (380 mil) |
| A | 44,1% → 45,6% | +34 mil → +56 mil (3-220 mil) | 67,2 mil | +334 mil → +407 mil (650 mil) |

- Receita, prêmios, manutenção e custos ficaram iguais (nenhuma constante de `ECONOMY`, `SERIE_ECONOMY`, `PRIZES` ou `UPGRADE_COSTS` mudou); a folha do típico fica a ±2% da de hoje porque `WAGE` e `VALUE` foram remapeados. A previsão de "folha 20% menor" só valeria se o salário continuasse preso ao OVER absoluto antigo, e aí cada série precisaria de receita nova.
- **Série D sem travar:** `tipicoD` 20 temporadas com 0 vendas forçadas, caixa mínimo +4 mil, +103 mil por temporada, 0,95 ampliação por temporada; `fraco` (−15) 0 vendas forçadas, +90 mil.
- **Elenco de craques não se paga:** `maximoRot` (11 × 85 + 7 × 77) perde −0,96 M (D) a −0,94 M (A) por temporada; vitórias C 73,4%, B 71,3%, A 63,3%.
- Carreira natural `tipico` (D → A em 10 temporadas com OVER fixo no típico): 37 ampliações, caixa mínimo +34 mil, 0 vendas forçadas.

### 7.2 Ritmo e raridade (`escada.mjs`, opção C final)

- OVER do time por temporada e marcos: seções 3.1 e 3.2.
- Raridade: time 85+ em 0 de 360 temporadas; atleta 85+ no elenco em 24 de 120 temporadas do forte (todas depois da 20ª) e 0 do médio e do fraco; atleta 90+ em 7 de 120 do forte (hoje 27 de 120). Atleta 99: só pela cauda da geração, como hoje (`OVER_TAIL`, ~1 em 10^6).
- Vitórias por série do clube que sobe (forte): D 44,1%, C 39,0%, B 38,7%, A 45,5%.
- Caixa (forte, média): fim da 10ª temporada 463 mil, 20ª 1,37 M, 30ª 1,43 M; 0,82 contratação por temporada. Médio: 111 mil, 721 mil, 1,67 M. Fraco acumula caixa (6,3 M na 30ª) porque não gasta: é o comportamento de hoje.

### 7.3 Ajustes de teste

- `calib-carreira.mjs --check`: o teto de 82% do elenco máximo vale para C, B e A. Na D o elenco máximo (85) fica 35 pontos acima do típico (hoje 27) e vence 84,6% a 85,9% (duas rodadas); isso não acontece numa carreira (o time só chega a 85 depois de 20+ temporadas, já na A). Proposta: teto 90% na D. `ELITE` padrão 88 → 85, `Xabs` do investidor 64 → 49, `valueOf` do investidor lendo `C.VALUE` em vez de 58/450, reposição do `fitSquad` 60-64 → `TYP[d] - 1` a `TYP[d] + 3`.
- O ponto −15 da curva deu 18,9% com 3.000 jogos e 20,6% com 6.000 (a curva é a mesma de hoje, o motor não mudou); usar `CURVE_N=6000` no `--check`.

---

## 8. Migração de saves (recomendado: reescalar)

**Recomendação: reescalar o save antigo**, não manter "escala legada". A legada exigiria dois jogos de constantes (rivais, scouting, base, salário, valor, evolução) e todo teste em dobro, e o save antigo ficaria para sempre com o começo alto e a escada curta.

`migrateProgressionV3` em `src/utils/balanceMigration.ts`, chamada em `usePersistence.loadGame` depois de `migrateBalanceV2` e `migrateAthleteEconomyV1`; `BALANCE_VERSION` 2 → 3 (gravado em `club.balanceVersion`, campo que já existe). Idempotente pela versão.

1. `d = DESLOCAMENTO[club.division]` (D −11, C −9, B −7, A −5).
2. Atletas do elenco, relatórios do scouting e jovens da base: `overall += d`, `potential += d`, cada atributo `+= d` (piso 25, teto 99), `potential >= overall`; depois `refreshPlayerEconomy`. Quem chegou nesta temporada: `acquiredFee = min(acquiredFee, value)` (sem lucro instantâneo).
3. Rivais (`leagueTeams`, chaves de Copa e continental, adversário atual da Copa, Supercopa, Recopa): relidos das listas novas por id e por nome (o índice da V2 já faz isso e lê as listas novas); quem não estiver nas listas recebe `power + d` (continental e finais: −5). O usuário recebe o típico da série, como na V2.
4. Caixa, contratos, troféus, histórico e instalações não mudam.
5. `club.progress` (seção 9) é criado com o OVER atual como início da temporada e com os marcos já alcançados marcados em silêncio (sem toast em cascata).
6. Um aviso único na carga: "Nova escala de OVER: todos os números do clube e dos rivais foram ajustados. A força do seu time na série não mudou."

Efeito: a diferença de OVER entre o time e os rivais da série atual fica idêntica (o motor dá os mesmos resultados). Um save na A perde 5 pontos de OVER em tudo; um na D perde 11. A folha cai de 0% a 10% conforme a distância ao típico (a curva de salário ficou mais suave por ponto). Um atleta 99 de save antigo vira 88 (save na D) a 94 (save na A); a raridade se mantém.

Saves v1 (anteriores ao balanceamento v2) passam pela V2, que já lê as listas novas, e depois pela V3 nos atletas.

---

## 9. Gamificação (paleta 60-30-10: superfície neutra 60, texto/bordas 30, esmeralda `emeraldpro` 10 só no destaque)

Dado novo, tudo dentro de `club` (campo opcional em `ClubSave`, sem nova chave de topo; as 17 chaves continuam):

```ts
progress?: {
  seasonStartOver: number                 // rating do time no início da temporada (1 casa)
  seasonStartPlayerOver: Record<string, number> // id → OVER no início da temporada
  seasonGains: Record<string, number>     // id → OVER ganho pela evolução nesta temporada
  lastSeason?: { season: number; division: number; overStart: number; overEnd: number; totalGain: number;
                 top: Array<{ name: string; gain: number; overall: number }>; seen: boolean }
  milestones: Array<{ id: string; season: number; title: string }>
}
```

| # | Item | Onde | Comportamento |
|---|---|---|---|
| G1 | Evolução após a partida | `applyPostMatchProgression` passa a devolver `[{ id, name, overall }]`; `LastMatchSummary.evolutions` (`src/types/match.ts`, store `match` não é salvo); `src/components/match/PostMatchSummary.vue` | Linha discreta abaixo do placar: chips esmeralda "+1 OVER · Fulano (53)", no máximo 3 e "+N" para o resto. O toast do jogo é um só e já é usado pelo resultado (`ui.showToast` sobrescreve), por isso o "+1 OVER" vai no resumo da partida e não em toast. |
| G2 | Evolução da temporada | `useSeason.startNewSeason` grava `progress.lastSeason` antes de `applyEndOfSeason` (OVER final sem o envelhecimento) e zera os dados da temporada depois; novo `src/components/club/SeasonReviewCard.vue` no topo do `DashboardView.vue` enquanto `seen === false` | "Temporada N: OVER do time 52,4 → 55,1 (+2,7) · elenco +14 de OVER · destaque: Fulano +5". Botão "Entendi" grava `seen = true`. |
| G3 | Tendência no Painel | `src/components/ui/TeamPowerBar.vue` (prop nova `trend`), alimentada no `DashboardView.vue` por `squad.teamStrength.rating − club.progress.seasonStartOver` | Seta e delta ao lado do OVER: "▲ +1,8 na temporada" em esmeralda; 0 em cinza; queda em âmbar (cor de aviso que já existe). |
| G4 | Barra até o potencial | `src/components/player/PlayerDetails.vue` com `src/components/ui/ProgressBar.vue` | "OVER 53 · potencial 68" com barra (OVER/potencial) e "+3 nesta temporada" (`seasonGains`). No potencial: "No auge". |
| G5 | Marcos | `src/utils/progression.ts` (novo, funções puras `checkMilestones(state)`), chamado em `concludeMatch` e em `startNewSeason`; lista em `src/components/club/MilestonesCard.vue` no `ClubView.vue`, junto da Sala de Troféus | Marcos: OVER do time 55/60/65/70/75/80/85/90 (`MILESTONES.teamOver`), primeiro atleta 70/80/90, primeira subida para C, B e A. Cada um uma vez, com a temporada. O card mostra o próximo marco ("Próximo: OVER 60 do time, faltam 2,6"). O marco novo aparece como chip no resumo da partida (G1). |

Os marcos de 55 e 65/75 não estavam no pedido; entram porque o primeiro 60 só chega entre a 9ª e a 27ª temporada e, sem eles, a primeira década fica sem marco de OVER.

---

## 10. Tarefas de implementação (Sonnet, uma por delegação, depois da tarefa do Alojamento)

Critério comum: `vue-tsc --noEmit` e `npm run build` passam; textos em português; sem nomes reais; OVER como rótulo.

**Status (variante S53 do dono: início ~53, `seasonBase` 5,25; ver `docs/plano-progressao-meio-termo.md`):**

| Tarefa | Status |
|---|---|
| T1 Constantes | pronta |
| T2 Rivais | pronta |
| T3 Elenco inicial, base e pisos | pronta (elenco 50-56, atletas 46-61, em vez de 46-52 / 42-57) |
| T4 Evolução | pronta |
| T5 Progresso e marcos | pronta |
| T6 Migração V3 | pronta |
| T7 Interface | pronta |
| T8 Simulador e testes | pronta, com uma divergência: forte chegou à Série A na 13ª, 30ª, 14ª e 14ª (alvo 9ª a 21ª em 4 de 4); OVER do time na 30ª: forte 76,3 (81 / 66 / 80 / 80). Detalhes em `docs/relatorio-pendencias.md`, seção 2e. O teste novo é `t31-progressao.mjs` (scratchpad), não `t29-progressao.mjs` (o nome t29 já existe para o teste de progresso). |
| T9 Revisão final em Opus | pendente |

### T1 — Constantes (`src/utils/constants.ts`)
Aplicar a seção 6.1 (valores exatos) e os comentários. **Pronto:** `node docs/calibracao/mkoverlay-progressao.mjs <pasta> C` gerado a partir do `src/` original e o `src/` alterado coincidem em `constants.ts` (diff vazio).

### T2 — Rivais (`leagueScheduler.ts`, `extraClubs.ts`, `competitions.ts`, `balanceMigration.ts` `byName`)
Seção 6.2. **Pronto:** médias das listas D 50,1 / C 57,0 / B 64,0 / A 71,0; diff vazio contra o overlay nesses arquivos.

### T3 — Elenco inicial, base e pisos (`squad.ts`, `useEconomy.ts`, `scouting.ts`, `market.ts`, `generatePlayer.ts`, `calculateTeamStrength.ts`)
Seção 6.3 (menos `PlayerCard.vue`). **Pronto:** 200 elencos iniciais com OVER do time entre 46 e 52 e atletas entre 42 e 57; diff vazio contra o overlay.

### T4 — Evolução (`useMatchSimulation.ts`, `src/types/match.ts`)
Substituir o bloco de evolução pelo da seção 5 (texto exato no overlay), devolvendo os ganhos; `LastMatchSummary.evolutions?: Array<{ name: string; overall: number }>` preenchido em `concludeMatch`. **Pronto:** diff do bloco igual ao overlay (sem a linha `globalThis.__progGains`, que é só do simulador); teste novo (T8) com o ritmo por idade.

### T5 — Dados de progresso e marcos (`src/types/club.ts`, `src/stores/club.ts`, `src/utils/progression.ts` novo, `useSeason.ts`, `useMatchSimulation.ts`)
`club.progress` (seção 9) em `toSave`/`fromSave`/`resetCareerRecords`; `checkMilestones` puro; gravação de `seasonGains` a cada evolução, `lastSeason` e reinício em `startNewSeason`, `seasonStartOver` em `initializeFreshCareer` e na virada. **Pronto:** save tem as mesmas 17 chaves de topo; `progress` sobrevive a salvar e recarregar; marcos não se repetem.

### T6 — Migração V3 (`src/utils/balanceMigration.ts`, `usePersistence.ts`)
Seção 8. **Pronto:** save antigo de cada série migra com a mesma diferença de OVER entre o usuário e cada rival da série (tolerância 0); segunda carga não muda nada; 17 chaves; aviso único.

### T7 — Interface (seção 9 e faixas do `PlayerCard.vue`)
G1 a G5 nos componentes indicados, paleta 60-30-10 (esmeralda só em ganho, marco e destaque). **Pronto:** revisão visual em 360 px e desktop, tema claro e escuro; sem texto em inglês.

### T8 — Simulador e testes
1. `calib-carreira.mjs`: ajustes da seção 7.3. Rodar `node _calib.mjs 20 curva,tipicoRot:240,maximoRot:40,tipico,tipicoD,forte,fraco --check` contra `src/` (com `CURVE_N=6000`): "CHECK OK".
2. `t17-e2e.mjs` (scratchpad): 7 políticas, 20 temporadas, 0 erros de chave e 0 falhas de save. Ajustar no script os números absolutos de OVER (típico, elenco) para ler `SERIE_TYPICAL_OVER`.
3. Revisar `t20-balance-migration`, `t21-exploits`, `t22-over99`, `t23-atletas`, `t25-aging-gk` (têm OVER e fórmulas da escala antiga: 52, 58, 60, 61, 76, 88, `0.45`); trocar números fixos por leitura das constantes, sem afrouxar asserções.
4. Teste novo `t29-progressao.mjs`: (a) elenco inicial 46-52; (b) listas de rivais com as médias da T2 e a mesma dispersão de antes; (c) curva igual (OVER igual 40-50%, +15 63-76%); (d) ritmo: 2.000 temporadas sintéticas de um jovem de 17 anos titular, CT 1, sem comissão, longe do potencial dão 3,5 a 5,5 por temporada; reserva ~60% disso; 28 anos perto do potencial < 0,5; (e) migração V3 idempotente e com diferença preservada; (f) marcos únicos; (g) 17 chaves.
5. `escada.mjs 30 fraco,medio,forte --runs 4` contra `src/`: forte chega à A entre a 9ª e a 21ª temporada em 4 de 4 carreiras, OVER do time na 30ª entre 76 e 84, nenhum time 85+, fraco sem A antes da 15ª.

### T9 — Revisão final em Opus
Diff completo contra este plano e as regras do dono (sem nomes reais, sem citar federação, português, OVER, paleta 60-30-10). Só depois, commit.

---

## 11. Riscos

1. **Gestor médio demora** (A entre a 15ª e a 30ª). É a separação que o dono pediu, mas o jogador casual pode achar lento. Alavanca única: `PROGRESSION.seasonBase`.
2. **Ganho por OVER ficou mais barato em dinheiro** (salário dobra a cada 21, não 15): estar +5 acima do típico custa menos que hoje. Medido: o forte não imprime dinheiro (saldo médio +43 mil por temporada) e o elenco máximo perde ~0,95 M por temporada na A.
3. **Elenco máximo na D** vence ~86% (teto de teste ajustado, seção 7.3). Só existe em teste.
4. **Pisos mais baixos** (`getEffectiveOvr` 15) tornam a penalidade de posição real em OVER baixo; time com lesionado e sem reserva fica mais fraco que hoje.
5. **Ritmo por jogos típicos:** quem joga Copa e continental até o fim evolui um pouco mais (mais partidas). Medido e incluído na calibração.
6. **`src/` em mudança** (25 atletas/Alojamento): o overlay falha se algum trecho mudar; aplicar pelo sentido.
7. **Saves antigos** veem todos os OVER caírem 5 a 11 pontos de uma vez. Mitigação: aviso único da seção 8.
8. **Toast único:** o "+1 OVER" vai no resumo da partida (G1), não num toast, porque o toast do resultado o apagaria.

---

## 12. Decisões do dono

Pendentes (só as inevitáveis):

1. **Escala: opção C (recomendada; D 50, C 57, B 64, A 71, começo ~49) ou A (tudo −12, A em 64, escada competitiva curta).**
2. **Saves existentes: reescalar (recomendado; todos os OVER caem 5 a 11, força relativa igual) ou escala legada (dois jogos de constantes).**
3. **Ritmo: manter Série A na ~16ª temporada para o gestor forte (recomendado, `seasonBase` 5,0) ou antecipar para ~13ª (`seasonBase` 5,5, com OVER 85 de time possível antes da 30ª).**

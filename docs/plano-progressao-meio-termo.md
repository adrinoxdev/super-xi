# Plano de progressão: meio-termo da opção C

Medição somente (nenhum arquivo de `src/` foi tocado). Complementa `docs/plano-progressao.md`, que não foi alterado.

## Método

`mkoverlay-progressao.mjs` (opção C) + `escada.mjs`, 4 carreiras de 30 temporadas por perfil de gestor (fraco, médio, forte), 12 carreiras por variante. Overlays só na pasta temporária.

| Variante | Início do elenco | seasonBase | Reforço |
|---|---|---|---|
| C0 | ~49 (`start=0`) | 5,0 | nenhum (opção C do plano) |
| C1 | ~50 (`start=1`) | 5,25 | nenhum |
| C2 | ~51 (`start=2`) | 5,25 | nenhum |
| C3 | ~50 (`start=1`) | 5,25 | atletas com até 23 anos ganham x(1 + 0,25 x (5 - temporada)/4) de evolução: 1,25 na T1, 1,0 a partir da T5 |

Definições: vitórias = vitórias/jogos por temporada, média das T1 a T5. Medianas de C/B/A sobre as 4 carreiras ("-" = mediana não alcançou; entre parênteses, quantas das 4 chegaram à A). OVER = do time, ao fim da temporada (após envelhecimento). Platô = maior sequência de temporadas em que o OVER do time no início subiu menos de 1 ponto (máximo entre as 4 carreiras, média entre parênteses). Queda = maior queda de vitórias (pontos percentuais) entre duas temporadas seguidas ao mudar de série; todas ocorreram em promoção. Saldo = variação de caixa por temporada (mil), depende da política do gestor. 85+/90+ = % de temporadas com ao menos um atleta 85+ / 90+; time 85+ = % de temporadas com OVER do time >= 85.

## Tabela comparativa

| Var | Perfil | Vit% T1-5 | Mediana C / B / A (chegaram à A) | OVER fim T1 / 5 / 10 / 15 / 20 / 30 | Platô máx (méd) | Queda máx vit pp | Saldo D / C (mil) | Atl 85+ / Atl 90+ / Time 85+ (%) |
|---|---|---|---|---|---|---|---|---|
| C0 | fraco | 38,2 | 12 / 17,5 / - (1/4) | 48,6 / 50,5 / 50,8 / 55,2 / 59,5 / 58,4 | 15 (13,8) | 33,8 | 96 / 244 | 0 / 0 / 0 |
| C0 | médio | 37,3 | 5,5 / 14,5 / 17 (4/4) | 49,3 / 53,8 / 54,1 / 57,5 / 63,6 / 69,0 | 10 (6,3) | 39,9 | -5 / -7 | 9,2 / 0 / 0 |
| C0 | forte | 38,2 | 7,5 / 10 / 14 (4/4) | 49,9 / 54,4 / 61,2 / 64,3 / 68,8 / 74,7 | 8 (6,3) | 42,9 | 0 / 47 | 18,3 / 1,7 / 0 |
| C1 | fraco | 37,4 | 6 / 11 / 29 (3/4) | 48,6 / 50,8 / 56,4 / 56,1 / 59,0 / 60,3 | 15 (11,3) | 41,2 | 112 / 213 | 0 / 0 / 0 |
| C1 | médio | 39,9 | 5,5 / 9,5 / 15 (3/4) | 49,0 / 54,9 / 57,1 / 61,7 / 65,0 / 68,2 | 8 (6,5) | 31,5 | 3 / -18 | 0,8 / 0 / 0 |
| C1 | forte | 43,3 | 4 / 9 / 12,5 (4/4) | 50,3 / 56,0 / 61,3 / 64,9 / 73,1 / 78,4 | 8 (6,5) | 31,8 | 3 / 36 | 28,3 / 0 / 0 |
| C2 | fraco | 39,1 | 8,5 / 13,5 / 28 (3/4) | 50,0 / 51,7 / 54,2 / 52,8 / 58,6 / 57,3 | 10 (7,5) | 46,3 | 62 / 253 | 0 / 0 / 0 |
| C2 | médio | 41,9 | 4 / 6,5 / 16 (3/4) | 51,6 / 54,4 / 58,0 / 63,5 / 63,5 / 69,3 | 10 (7,0) | 37,1 | -14 / -47 | 8,3 / 0 / 0 |
| C2 | forte | 39,2 | 3,5 / 16,5 / 19,5 (4/4) | 50,2 / 55,0 / 56,7 / 62,0 / 65,8 / 73,1 | 7 (4,8) | 41,7 | -21 / 45 | 14,2 / 0 / 0 |
| C3 | fraco | 35,7 | 6,5 / 9,5 / 25 (4/4) | 47,1 / 52,0 / 54,9 / 56,0 / 57,6 / 55,9 | 11 (9,3) | 38,0 | 70 / 176 | 0 / 0 / 0 |
| C3 | médio | 40,6 | 5 / 15,5 / 17,5 (3/4) | 49,3 / 55,3 / 56,3 / 60,8 / 63,1 / 66,3 | 8 (5,3) | 30,2 | 2 / -25 | 0 / 0 / 0 |
| C3 | forte | 41,9 | 6,5 / 9 / 15,5 (4/4) | 49,9 / 55,6 / 60,9 / 65,3 / 71,6 / 77,3 | 5 (4,5) | 40,9 | -6 / 13 | 10,0 / 4,2 / 0 |

OVER do time no início da T1 (média das 4 carreiras): C0 48,6 / 50,0 / 49,6 (fraco/médio/forte); C1 50,0 / 50,3 / 51,2; C2 50,3 / 51,5 / 51,7; C3 49,8 / 50,6 / 50,8.

### Resumo por variante (3 perfis juntos)

| Var | Vit% T1-5 (36 temp. por perfil, 108 no total) | Queda média ao subir de série (pp, por perfil F/M/Fo) | Platô médio (F/M/Fo) |
|---|---|---|---|
| C0 | 37,9 | 17,0 / 13,7 / 18,1 | 13,8 / 6,3 / 6,3 |
| C1 | **40,2** | 16,2 / 13,0 / **9,8** | 11,3 / 6,5 / 6,5 |
| C2 | 40,1 | 18,1 / 12,5 / 17,1 | 7,5 / 7,0 / 4,8 |
| C3 | 39,4 | 16,6 / 15,9 / 17,3 | 9,3 / 5,3 / 4,5 |

## Leitura

- **Início:** nenhuma variante entra de fato em 42% a 50% na média dos três perfis; C1 e C2 chegam a ~40% (C0 37,9%, C3 39,4%). Só o forte em C1 (43,3%) e o médio em C2 (41,9%) ficam na faixa. O ruído é grande (12 carreiras x 5 temporadas por variante; erro padrão da ordem de 2 a 3 pp), então as diferenças de 1 a 2 pp entre C1, C2 e C3 não são conclusivas. O que é claro: C0 é o mais difícil e subir o início para 50 e a base para 5,25 melhora ~2 pp.
- **Fluidez:** platôs longos (10 a 15 temporadas sem ganhar 1 ponto) aparecem quase só no gestor fraco, em todas as variantes, o que é esperado (passivo, sem CT). Para médio e forte, o platô médio é 5 a 7 temporadas e o máximo 5 a 10; C3 e C2 forte são os mais fluidos (4,5 e 4,8), C1 forte e médio ficam em 6,5. O reforço de C3 não mostrou ganho claro em vitórias e derrubou o fraco na T1 (OVER 47,1 ao fim da T1, por envelhecimento de elenco sem reposição).
- **Degrau:** a queda média de vitórias ao subir de série fica em 10 a 18 pp; C1 forte é o menor (9,8), C1 médio 13,0. Quedas máximas de 30 a 46 pp são outliers pontuais (subida de série logo após uma temporada excepcional) e aparecem em todas as variantes.
- **Raridade:** time 85+ nunca ocorreu. Atleta 90+ ocorreu só em C0 forte (1,7%) e C3 forte (4,2%). Atleta 85+ aparece em 10 a 28% das temporadas do gestor forte (C1: 28,3%, o mais alto) e em até 9% do médio, 0 no fraco. Isso continua raro por temporada de cada clube, mas C1 forte é o ponto mais perto do limite aceitável.
- **Economia:** saldo do gestor fraco é positivo e alto (passivo, não gasta). Médio e forte ficam perto de zero ou levemente positivos na D e entre -47 e +47 mil na C; nenhuma variante quebrou a economia.

## Recomendação: C1 (início 50, seasonBase 5,25, sem reforço)

- Maior vitória média nas T1 a T5 (40,2%; forte 43,3% já dentro da faixa) e menor queda média ao subir de série para o forte (9,8 pp), logo é o início menos difícil e o degrau mais suave sem tornar o começo fácil demais (~50 de OVER, igual ao típico da D).
- Marcos saudáveis e escalonados: forte sobe à C na T4, à B na T9, à A na T12,5; médio C 5,5, B 9,5, A 15; só o fraco quase não chega à A (29, 3 de 4), mantendo a diferença entre perfis.
- Fluidez igual à de C0 ou melhor para médio e forte (platô médio 6,5), sem criar o reforço de curto prazo de C3, que não pagou o custo (mais um parâmetro, T1 do fraco pior, vitórias menores que C1).
- Ressalva: o atleta 85+ no forte sobe para 28% das temporadas (C0: 18%, C3: 10%). Se o dono quiser essa cauda mais rara, usar seasonBase 5,1 a 5,15 com início 50, ou aceitar C3 apenas se quiser platô menor no forte (4,5 contra 6,5). C2 é alternativa se o início ainda parecer difícil (41,9% no médio), mas seu forte teve a mediana da B só na T16,5 e a queda de 17 pp ao subir, então fica menos fluido.
- Não medido: o ajuste fino de 5,1 a 5,15 e uma amostra maior (8+ carreiras por perfil) para separar C1, C2 e C3 com confiança.

Reprodução: `node docs/calibracao/mkoverlay-progressao.mjs <pasta> C start=<0|1|2> base=<5|5.25>`; C3 = C1 mais, em `useMatchSimulation.ts` do overlay, `const boost = p.age <= 23 ? 1 + 0.25 * Math.max(0, (5 - club.season) / 4) : 1` multiplicando `expected`; depois `node _escada.mjs 30 fraco,medio,forte --runs 4 --overlay <pasta>` (cópia temporária do `escada.mjs` na raiz).

## Ritmos 5,10 e 5,15 (8 carreiras por perfil)

Medição somente (nenhum arquivo de `src/` tocado). Mesmo método e scripts da seção acima; 8 carreiras de 30 temporadas por perfil (24 por variante), as três variantes no mesmo lote de execução. Todas com início 50 (`start=1`), sem reforço; só o `seasonBase` muda.

| Variante | seasonBase |
|---|---|
| C1-a (controle) | 5,25 |
| C1-b | 5,15 |
| C1-c | 5,10 |

Medianas de C/B/A: sobre as carreiras que chegaram (n entre parênteses; "-" quando menos da metade chegou). Vit série = vitórias % ponderadas por jogo em D/C/B/A (média geral por série). Platô = máximo entre as 8 carreiras (média dos máximos). Queda = média das quedas de vitórias (pp) ao subir de série. Saldo em mil por temporada. Erro padrão (EP) entre carreiras.

| Var | Perfil | Vit% T1-5 (EP) | Vit série D / C / B / A | Mediana C / B / A (n) | OVER fim T1 / 5 / 10 / 15 / 20 / 30 | Platô máx (méd) | Queda méd pp | Saldo D / C | Atl 85+ % (EP) / 90+ / time 85+ |
|---|---|---|---|---|---|---|---|---|---|
| a | fraco | 38,9 (2,1) | 41,4 / 40,3 / 32,4 / 24,8 | 5 (8) / 10 (8) / - (5 de 8; med 25) | 49,9 / 52,0 / 52,7 / 54,5 / 60,0 / 59,3 | 14 (10,9) | 15,7 | 102 / 227 | 0 (0) / 0 / 0 |
| a | médio | 37,2 (2,1) | 45,9 / 41,7 / 36,4 / 40,2 | 3 (8) / 5 (8) / 17 (8) | 49,4 / 55,0 / 59,7 / 64,1 / 66,3 / 69,7 | 9 (6,6) | 14,9 | 26 / -38 | 4,6 (2,4) / 0 / 0 |
| a | forte | 37,8 (1,3) | 42,7 / 39,4 / 40,1 / 45,3 | 6 (8) / 8,5 (8) / 15 (8) | 50,9 / 56,6 / 60,9 / 65,7 / 71,5 / 76,9 | 9 (6,5) | 13,5 | 6 / 1 | 22,5 (6,7) / 0,4 / 0 |
| b | fraco | 33,7 (1,7) | 42,5 / 38,9 / 33,0 / 27,7 | 7,5 (8) / 13,5 (8) / - (4 de 8; med 24) | 50,8 / 51,7 / 54,8 / 55,9 / 59,6 / 58,4 | 20 (12,9) | 14,5 | 84 / 219 | 0 (0) / 0 / 0 |
| b | médio | 38,9 (0,7) | 43,6 / 36,6 / 37,7 / 37,8 | 5 (8) / 12 (7) / 18 (7) | 50,1 / 55,1 / 55,9 / 60,9 / 63,6 / 68,5 | 9 (6,0) | 16,3 | 0 / -13 | 2,5 (2,5) / 0 / 0 |
| b | forte | 38,8 (1,3) | 42,4 / 38,4 / 41,1 / 45,4 | 5,5 (8) / 7 (7) / 12 (7) | 51,8 / 55,1 / 61,0 / 65,3 / 69,1 / 76,1 | 8 (5,0) | 14,1 | -3 / 11 | 19,6 (3,6) / 0 / 0 |
| c | fraco | 38,9 (1,4) | 42,4 / 39,4 / 32,9 / 21,3 | 7 (8) / 12,5 (8) / - (3 de 8; med 13) | 49,7 / 51,7 / 52,6 / 55,0 / 58,3 / 59,9 | 16 (10,8) | 17,4 | 87 / 199 | 0 (0) / 0 / 0 |
| c | médio | 36,6 (2,6) | 41,6 / 42,0 / 38,9 / 36,2 | 5,5 (8) / 10,5 (8) / 18 (8) | 49,8 / 54,4 / 58,3 / 62,6 / 64,5 / 70,9 | 14 (7,3) | 15,1 | -5 / -20 | 0 (0) / 0 / 0 |
| c | forte | 38,0 (1,9) | 43,4 / 43,4 / 39,4 / 42,5 | 5,5 (8) / 8,5 (8) / 13,5 (8) | 49,6 / 54,7 / 58,2 / 66,1 / 70,5 / 76,0 | 7 (5,4) | 14,8 | -4 / -24 | 23,8 (5,2) / 0 / 0 |

OVER do time no início da T1 (média): a 49,9 / 49,8 / 49,7; b 49,9 / 49,6 / 50,1; c 49,9 / 50,1 / 49,7 (fraco/médio/forte).

Resumo por variante (3 perfis juntos): vitórias T1-5 a 37,9% (EP 1,0), b 37,1% (EP 0,9), c 37,8% (EP 1,1). Queda média ao subir de série (F/M/Fo): a 15,7 / 14,9 / 13,5; b 14,5 / 16,3 / 14,1; c 17,4 / 15,1 / 14,8. Platô médio (F/M/Fo): a 10,9 / 6,6 / 6,5; b 12,9 / 6,0 / 5,0; c 10,8 / 7,3 / 5,4.

### Leitura

- **As três variantes não se distinguem estatisticamente.** Estatística t entre variantes, por perfil: temporada de chegada à A |t| <= 1,0; % de temporadas com 85+ |t| <= 0,7 no forte (1,9 no médio, de 4,6% contra 0%); vitórias T1-5 |t| <= 0,8, exceto o fraco (b com 33,7% contra 38,9% de a e c, |t| 2,0 a 2,4, no limite, e sem causa plausível: b e c têm quase o mesmo ritmo). Com 8 carreiras por perfil, diferenças de 0,05 a 0,15 no seasonBase (1 a 3%) ficam muito abaixo do ruído.
- **A cauda 85+ não cai com a redução do ritmo.** Forte: 22,5% (a), 19,6% (b), 23,8% (c), EP de 4 a 7 pp. O 28,3% da C1 na seção anterior e o 22,5% do controle agora, com a mesma configuração, mostram o tamanho do ruído (~6 pp). Nenhuma variante cumpre 85+ <= 15% no forte. Time 85+ nunca ocorreu; atleta 90+ só em 1 de 240 temporadas (a, forte).
- **Início:** vitórias T1-5 em ~37 a 39% nas três, abaixo da faixa 42 a 50% (o forte ficou em 37,8 a 38,0% aqui contra 43,3% antes: amostra anterior de 4 carreiras estava otimista). O início continua levemente difícil, mas o mesmo em todas as variantes.
- **Fluidez:** platô médio do forte 6,5 (a), 5,0 (b), 5,4 (c); médio 6,0 a 7,3; fraco longo em todas (10,8 a 12,9, esperado). Queda de vitórias ao subir: 13,5 a 17,4 pp, sem diferença clara.
- **Forte na Série A:** todas as carreiras chegam em a (mediana 15) e c (13,5); b 7 de 8 (mediana 12). As três ficam dentro da faixa 11ª a 17ª. Menor ritmo não atrasou o forte de forma mensurável (a 15, b 12, c 13,5, ruído grande).
- **Economia:** saldo do forte entre -24 e +11 mil na D/C, médio entre -38 e +26 mil; sem quebra.

### Recomendação

- Diferença entre 5,25, 5,15 e 5,10 é ruído nesta amostra. Qualquer um dos três serve para progressão e fluidez; não há evidência de que baixar o ritmo torne o 85+ mais raro nem de que deixe o forte lento (todos dentro da 11ª a 17ª temporada na A).
- Se o dono quiser a escolha mais conservadora: **5,15** (C1-b), que teve a menor taxa de 85+ no forte (19,6%), o menor platô do forte e o forte mais cedo à A (mediana 12), mas ela também teve o pior fraco no início (33,7%), por isso não é um ganho comprovado. Se quiser não mexer, **5,25** continua válido.
- Para atingir de fato 85+ <= 15% no forte, mudar só o seasonBase não basta (efeito menor que o ruído). A alavanca deve ser outra: efeito decrescente acima de 80 (`evolutionFactor`), teto de potencial ou menor gapFull para atletas de potencial alto. Isso não foi medido.
- Limitação: 8 carreiras por perfil deixam EP de 4 a 7 pp nas taxas de 85+; detectar uma queda de 22% para 15% pediria ~40 ou mais carreiras do forte por variante.

Reprodução: `node docs/calibracao/mkoverlay-progressao.mjs <pasta> C start=1 base=<5.25|5.15|5.10>`; depois `ESCADA_OUT=<saida.json> node _escada.mjs 30 fraco,medio,forte --runs 8 --overlay <pasta>` (cópia temporária do `escada.mjs` na raiz, removida ao fim).

## Início 51-53 e curva acima de 80

Medição somente (nenhum arquivo de `src/` tocado). Mesmo método e scripts das seções anteriores (opção C, séries D 50, C 57, B 64, A 71, `seasonBase` 5,25). Cinco variantes no mesmo lote de execução (20 processos em paralelo): 8 carreiras de 30 temporadas por perfil fraco e médio e 16 do forte por variante (160 carreiras; sem erros nem crashes).

| Variante | `start` do overlay | OVER inicial medido (3 perfis) | Evolução acima de 80 |
|---|---|---|---|
| S50 (controle) | 1 | 49,8 | atual (>85, expoente 1,5) |
| S51 | 2 | 50,9 | atual |
| S52 | 3 | 51,7 | atual |
| S53 | 4 | 52,8 | atual |
| S52H | 3 | 51,8 | `((99-ovr)/21)^2,0` acima de 78, teto 98 (só no overlay) |

Observações de método: o OVER inicial cresce ~1,0 por passo de `start` (o sorteio do elenco tem ruído, daí 51,7 e não 52,0). "Vit%" conta só vitórias (empates fora), ponderado por jogo; EP entre carreiras. OVER = fim da temporada (após envelhecimento). Platô: média = tamanho médio dos trechos seguidos com ganho de OVER do time < 1 ponto; máx = maior trecho (entre parênteses, média dos máximos por carreira). A definição de platô aqui conta trechos de qualquer tamanho, por isso a média (1,6 a 2,1) não é comparável com as seções anteriores; use os máximos. Queda = vitórias% da última temporada na série antiga menos a primeira na nova (n = subidas). Saldo em mil por temporada. Mediana de chegada sobre as carreiras que chegaram (n entre parênteses).

| Var | Perfil | n | OVER ini | Vit% T1-5 (EP) | T1 / T2 / T3 / T4 / T5 | Vit D / C / B / A | Mediana C / B / A (n) | OVER fim T1/5/10/15/20/30 | Platô méd / máx (méd dos máx) | Queda pp (n) | Saldo D / C | Atl 85+ % (EP) / 90+ % / time 85+ % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S50 | fraco | 8 | 49.8 | 37.9 (1.7) | 40.3 / 33.4 / 38.8 / 33.6 / 40.5 | 43.9 / 37.0 / 32.3 / 25.1 | 4.5 (8) / 17 (7) / 18 (2) | 49.9 / 52.3 / 53.9 / 56.4 / 59.5 / 57.6 | 2.1 / 8 (4.5) | 18.6 (38) | 94.8 / 201.8 | 0.0 (0.0) / 0.0 / 0.0 |
| S50 | medio | 8 | 49.9 | 38.7 (1.3) | 39.9 / 43.3 / 37.0 / 29.5 / 41.0 | 41.9 / 40.2 / 37.6 / 36.1 | 5 (8) / 11 (8) / 18 (7) | 50.6 / 54.8 / 58.2 / 61.6 / 63.6 / 66.7 | 1.8 / 8 (5.0) | 11.4 (48) | 5.5 / -30.2 | 0.0 (0.0) / 0.0 / 0.0 |
| S50 | forte | 16 | 49.8 | 41.9 (1.3) | 34.6 / 38.0 / 46.7 / 42.0 / 42.3 | 45.8 / 41.5 / 38.9 / 43.9 | 5 (16) / 8.5 (16) / 16 (16) | 51.1 / 55.2 / 60.1 / 65.4 / 70.1 / 77.6 | 1.7 / 5 (3.6) | 14.3 (79) | -2.7 / -23.3 | 18.5 (2.6) / 1.0 / 0.0 |
| S51 | fraco | 8 | 51.1 | 37.8 (1.1) | 28.7 / 35.3 / 43.5 / 41.4 / 34.7 | 40.5 / 41.3 / 32.8 / 27.0 | 6 (8) / 13 (8) / 18 (5) | 50.0 / 51.8 / 53.9 / 59.2 / 59.9 / 58.0 | 2.0 / 9 (5.1) | 18.0 (50) | 82.9 / 209.0 | 0.0 (0.0) / 0.0 / 0.0 |
| S51 | medio | 8 | 50.9 | 40.5 (1.0) | 39.8 / 40.9 / 35.3 / 44.3 / 38.8 | 42.6 / 41.0 / 38.6 / 37.5 | 7.5 (8) / 12.5 (8) / 17.5 (8) | 51.1 / 54.7 / 56.9 / 61.4 / 65.2 / 68.6 | 1.7 / 6 (4.0) | 16.4 (44) | -3.5 / -27.2 | 2.1 (1.4) / 0.0 / 0.0 |
| S51 | forte | 16 | 50.7 | 41.6 (1.5) | 41.0 / 42.2 / 41.8 / 42.9 / 40.0 | 44.8 / 41.9 / 39.1 / 43.5 | 4.5 (16) / 7 (16) / 13 (15) | 51.6 / 56.6 / 61.7 / 66.4 / 70.7 / 75.7 | 1.6 / 6 (3.2) | 14.4 (81) | 6.5 / -13.4 | 24.6 (3.5) / 3.5 / 0.0 |
| S52 | fraco | 8 | 51.8 | 36.0 (1.6) | 35.2 / 40.1 / 38.4 / 34.5 / 28.5 | 43.8 / 38.6 / 34.0 / 29.4 | 4 (8) / 11.5 (8) / 22.5 (6) | 50.6 / 53.7 / 56.2 / 58.3 / 60.9 / 57.8 | 2.0 / 7 (4.5) | 14.7 (57) | 78.0 / 208.1 | 0.0 (0.0) / 0.0 / 0.0 |
| S52 | medio | 8 | 51.8 | 40.6 (1.1) | 44.5 / 39.6 / 44.5 / 34.9 / 39.1 | 43.6 / 41.7 / 37.3 / 38.8 | 3.5 (8) / 7 (8) / 15 (8) | 51.5 / 55.2 / 58.5 / 62.7 / 66.4 / 68.6 | 1.6 / 8 (4.3) | 15.6 (46) | -5.4 / -22.3 | 5.4 (3.4) / 0.0 / 0.0 |
| S52 | forte | 16 | 51.6 | 40.1 (1.1) | 40.0 / 39.1 / 40.4 / 36.2 / 43.8 | 46.3 / 42.2 / 39.2 / 46.4 | 4 (16) / 8 (16) / 12.5 (16) | 52.2 / 57.4 / 61.9 / 67.3 / 71.9 / 76.7 | 1.7 / 6 (3.4) | 14.0 (90) | -6.8 / -42.3 | 29.0 (3.1) / 7.1 / 0.0 |
| S53 | fraco | 8 | 53.0 | 41.1 (1.5) | 36.6 / 48.8 / 37.4 / 38.5 / 40.8 | 44.2 / 41.4 / 34.0 / 25.6 | 6 (8) / 8 (8) / 18 (7) | 53.7 / 54.0 / 57.5 / 58.6 / 59.2 / 58.6 | 2.1 / 6 (4.3) | 13.8 (52) | 33.9 / 174.1 | 2.5 (1.6) / 0.4 / 0.0 |
| S53 | medio | 8 | 52.7 | 42.6 (1.8) | 37.7 / 46.7 / 44.7 / 43.9 / 38.2 | 47.2 / 40.3 / 40.8 / 37.8 | 5.5 (8) / 8.5 (8) / 14.5 (8) | 52.4 / 53.5 / 60.6 / 64.8 / 68.0 / 70.2 | 2.0 / 7 (4.9) | 15.5 (42) | -11.5 / 9.1 | 5.0 (3.3) / 0.8 / 0.0 |
| S53 | forte | 16 | 52.8 | 40.1 (1.3) | 41.5 / 43.8 / 39.7 / 36.0 / 38.5 | 45.6 / 41.9 / 39.2 / 45.6 | 3 (16) / 7 (16) / 13 (16) | 53.6 / 58.2 / 62.7 / 67.9 / 73.1 / 78.1 | 1.6 / 5 (3.1) | 14.7 (83) | -8.8 / -26.9 | 22.5 (3.5) / 5.6 / 0.0 |
| S52H | fraco | 8 | 52.0 | 38.3 (1.8) | 43.0 / 41.3 / 38.7 / 34.0 / 35.6 | 46.4 / 40.7 / 32.2 / 27.1 | 3.5 (8) / 6.5 (8) / 23 (7) | 50.7 / 55.5 / 55.8 / 57.2 / 59.3 / 57.5 | 1.8 / 5 (3.9) | 15.8 (59) | 35.3 / 202.6 | 0.0 (0.0) / 0.0 / 0.0 |
| S52H | medio | 8 | 51.8 | 38.3 (2.0) | 37.7 / 37.3 / 44.1 / 36.9 / 35.8 | 40.7 / 40.3 / 36.7 / 38.6 | 4.5 (8) / 7.5 (8) / 15 (7) | 51.4 / 56.0 / 58.1 / 62.4 / 67.1 / 68.5 | 1.6 / 4 (3.4) | 13.0 (47) | 2.1 / -44.1 | 5.0 (3.7) / 1.7 / 0.0 |
| S52H | forte | 16 | 51.7 | 43.1 (1.3) | 38.3 / 45.3 / 41.1 / 45.6 / 42.3 | 47.0 / 42.8 / 40.2 / 45.1 | 5 (16) / 7.5 (16) / 14 (16) | 52.5 / 56.1 / 61.0 / 65.8 / 71.3 / 76.5 | 1.6 / 6 (3.8) | 13.2 (84) | -5.2 / -13.7 | 25.4 (4.7) / 1.5 / 0.0 |

Resumo por variante (3 perfis) e testes contra S50 (|t| Welch)
| Var | Vit T1-5 média 3 perfis (EP) | T1 média 3 perfis | Forte: A med (n/16) | Forte 85+ % (EP) | |t| T1-5 fraco/médio/forte | |t| 85+ forte | |t| chegada A forte |
|---|---|---|---|---|---|---|---|
| S50 | 39.5 (0.8) | 38.3 | 16 (16) | 18.5 (2.6) | 0.0/0.0/0.0 | 0.0 | 0.0 |
| S51 | 40.0 (0.7) | 36.5 | 13 (15) | 24.6 (3.5) | 0.0/1.1/0.1 | 1.4 | 2.1 |
| S52 | 38.9 (0.8) | 39.9 | 12.5 (16) | 29.0 (3.1) | 0.8/1.1/1.0 | 2.6 | 2.2 |
| S53 | 41.3 (0.9) | 38.6 | 13 (16) | 22.5 (3.5) | 1.4/1.8/1.0 | 0.9 | 2.0 |
| S52H | 39.9 (1.0) | 39.7 | 14 (16) | 25.4 (4.7) | 0.2/0.2/0.7 | 1.3 | 1.2 |

### Leitura

- **Início (T1-5):** média dos 3 perfis S50 39,5% (EP 0,8), S51 40,0%, S52 38,9%, S52H 39,9%, S53 41,3% (EP 0,9). Só S53 sobe de forma visível, e ainda abaixo de 42%. Nenhuma variante entra na faixa 42 a 50%. Em todos os testes contra S50, |t| <= 1,8 por perfil: **ruído**. A subida de 1,8 pp entre S50 e S53 é coerente com o efeito esperado (+3 de OVER ~ +0,6 pp de vitória por ponto), mas com 8 a 16 carreiras não se separa do acaso.
- **Início fácil demais?** Não. Vitórias na T1 (média dos 3 perfis): 38,3 / 36,5 / 39,9 / 38,6 / 39,7%; o máximo por perfil nunca passa de 44,5% (limite 50%). A T1 não é sistematicamente a pior temporada (T2 a T5 oscilam no mesmo patamar, 33 a 49%, EP de cada célula ~3 pp).
- **Forte na Série A:** todas as variantes chegam dentro da faixa 11ª a 17ª (mediana S50 16, S51 13, S52 12,5, S53 13, S52H 14; 15 a 16 de 16 carreiras chegam). Início mais alto antecipa a A em 2 a 3 temporadas (|t| ~2,0 a 2,2, no limite); S50 está na borda superior (16). A curva dura (S52H) não atrasa o forte (14 contra 12,5 de S52, |t| 1,2).
- **Cauda 85+ do forte:** S50 18,5% (EP 2,6), S51 24,6%, S52 29,0%, S53 22,5%, S52H 25,4% (EP 4,7). Nenhuma atinge <= 15%; **nem o controle**. Subir o início tende a aumentar a cauda (S52 contra S50: |t| 2,6, o único efeito acima do ruído) porque o time forte parte mais alto e gasta mais tempo no teto. A curva dura reduziu a cauda só 3,6 pp frente a S52 (29,0 para 25,4; |t| ~0,6, ruído) e não mudou o 90+ de forma clara (7,1% para 1,5%, pequeno n). Atleta 85+ no médio fica em 0 a 5%, no fraco 0 a 2,5%.
- **Time 85+:** nunca ocorreu (0% em todas as variantes e perfis).
- **Fluidez:** platô máximo do forte 5 a 6 temporadas (média dos máximos 3,1 a 3,8) em todas; médio 4 a 8; fraco 5 a 9. Queda de vitórias ao subir de série 11 a 19 pp, sem diferença sistemática (forte 13,2 a 14,7). OVER do forte ao fim da T30: 75,7 a 78,1 (S52H 76,5): a curva dura quase não mexe no OVER do time, só levemente no topo.
- **Economia:** saldo do forte na D de -9 a +7 mil e na C de -42 a -13 mil; médio D -12 a +6, C -44 a +9; fraco D 34 a 95, C 174 a 209. Sem quebra, no mesmo patamar das seções anteriores.

### Recomendação

Nenhuma variante atinge todas as metas. **A mais próxima é S53 (início 53, curva atual)**: vitórias T1-5 41,3% (falta ~0,7 pp para 42%; fraco 41,1 e médio 42,6), forte na A com mediana 13 (16 de 16), nenhum time 85+, economia intacta, início não fácil (T1 38,6%). Falta a cauda 85+ do forte: 22,5% contra o máximo de 15% (nem o controle S50, com 18,5%, cumpre).

- A curva mais dura acima de 78 (S52H) **não resolveu a cauda**: -3,6 pp contra S52, dentro do ruído, e sem ganho no início. Não vale a complexidade. O 85+ do forte vem sobretudo de contratações e base de potencial alto (scouting, `tail`), não da evolução acima de 85, então a alavanca provável é limitar a geração de potencial/OVER alto no scouting e nas peneiras ou o `maxOvr` dos níveis altos de scouting. Isso não foi medido.
- A faixa de início 42-50% também pode exigir mais que 53 (cada ponto vale ~0,6 pp, com ruído de 1 pp no EP): testar início 54 a 55 ou um aumento pontual de `seasonBase` só nas séries D e C custaria cauda 85+ maior. As duas metas (início mais alto, cauda menor) puxam em sentidos opostos pelo mesmo parâmetro.
- Limitação: EP de 3 a 5 pp na cauda 85+ e de ~1 pp nas vitórias; detectar 22% contra 15% pediria ~40 carreiras do forte por variante.

Reprodução: `node docs/calibracao/mkoverlay-progressao.mjs <pasta> C start=<1|2|3|4> base=5.25`; S52H: no `utils/constants.ts` do overlay, em `evolutionFactor`, trocar `overall <= EVOLUTION.softStart` por `overall <= 78` e o `Math.pow(...)` por `Math.pow((ATHLETE_MAX_OVERALL - overall) / (ATHLETE_MAX_OVERALL - 78), 2.0)`; depois `ESCADA_OUT=<saida.json> node _escada.mjs 30 <perfil> --runs 8 --overlay <pasta>` (cópia temporária do `escada.mjs` na raiz, removida ao fim; forte rodado em dois processos de 8 carreiras).

# Checagem de nomes contra nomes reais (T15)

Data: 2026-11-25. Método: WebSearch (consultas agrupadas, mais uma consulta dedicada à "Taça do Povo"). Critério do dono: só conta colisão se o nome completo coincidir ou for quase idêntico a clube ou torneio real. Prefixos comuns (Real, Atlético, Sporting, Dinamo, Olimpia, Racing) liberados.

Resultado geral: **nenhuma colisão**. Todos os nomes seguem.

## Competições

| Nome | Resultado |
|---|---|
| **Taça do Povo** | Sem torneio de mesmo nome nas buscas (duas consultas). Parecidos, mas distintos: "Torneio do Povo" (CBD, 1971 a 1973, Corinthians/Flamengo/Coritiba), "Taça dos Povos Indígenas" (CBF, recente), "Taça das Favelas" e copas populares municipais. Torneio municipal ou de bairro com o nome exato pode existir sem indexação; o risco não é eliminável pela web, mas não há coincidência conhecida. Liberado. |
| Supercopa Zênite | Sem torneio de mesmo nome. Ressonância fraca com o Zenit (clube russo, Supercopa da Rússia); o nome da competição não coincide. Liberado. |
| Recopa dos Condores | Sem torneio de mesmo nome. A real é a "Recopa Sul-Americana" (CONMEBOL); distinta. Liberado. |
| Liga Boreal / Eclipse / Cometa / Polar / Fênix | Nenhuma liga de futebol com esses nomes. Só "Ceará Fênix" (futebol americano, outro nome completo). Liberado. |
| Ilhas Hoshi / Emirado de Najm / Reino de Nyota | Sem país, clube ou torneio real. Apenas "estrela" em japonês, árabe e suaíli. Liberado. |

## Clubes novos (ids internos mantidos)

Lua Nova EC (d_18), Vale do Sol (b_10), Pinhal Celeste (b_14), Poente FC (b_16), Meridiano AC (a_8), Via Láctea FC (c_8), Serra do Luar (c_9), Estrela do Agreste (c_11): nenhum clube profissional ou conhecido com o nome completo. Mais próximos, distintos: EC Meia Lua, Estrela do Norte FC (ES), Serrano FC (PE). Liberados. Observação: "Vale do Sol" e "Serra do Luar" são toponímicos comuns e podem existir como clube amador local, abaixo do que a busca alcança.

## MUNDIAL_RIVALS (src/config/competitions.ts)

- Europa (16): Real Montanha FC, Atlético Fiorde, Union Nordhaven, Sporting Castelmar, Dinamo Verdália, FC Aurelion, Borealis United, Stella Argenta, Olimpia Kronberg, Racing Valmonte, AS Belvedere, Wolfram Rovers, Athletic Lunaris, Torre Alta CF, Esperia Calcio, Vanguard Ostrava: sem coincidência. (Valmonte lembra Valmontone, clube italiano de nome diferente.) Liberados.
- Ásia (6): Tora FC, Akari United, Lótus Dourado SC, Meihua Dragons, Sunrise Kyoten, Jade Tigers: sem coincidência.
- África (6): Savana Stars, Baobá FC, Kilima United, Sahel Eagles, Jua Mkuu SC, Delta Lions: sem coincidência.
- América do Norte e Central (6): Pinheiral Rangers, Lagos del Norte FC, Caribe Sol SC, Gélido Wolves, Mesa Roja Club, Costa Azteca FC: sem coincidência.
- Oceania (3): Coral Bay FC, Kiwi Ridge United, Maré Austral SC: sem coincidência.

Limite: a busca web retorna resultados genéricos e não prova inexistência de clube amador local; serve para descartar clubes e torneios conhecidos.

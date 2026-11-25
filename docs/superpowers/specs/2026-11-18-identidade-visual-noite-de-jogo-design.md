# Identidade visual "Noite de jogo" (Super XI)

Branch: `feature/identidade-visual` (sai da `develop`). Não alterar `package.json` / versão.

## Problema
Feedback de teste: o sistema parece SaaS, não jogo. Causa: canvas cinza-claro, cards brancos, Inter, slate, sombras suaves. O logo (`public/logo.png`) é escudo verde/azul-marinho, dourado, branco, linhas táticas, tipografia itálica grossa.

## Direção
Tema escuro "estádio sob refletores", usando as cores do escudo: azul-noite (base), verde (ação), dourado (destaque/números).

## Escopo
Tema + componentes base + layout. Telas (partida, elenco, campo tático, troféus) NÃO são redesenhadas; só devem continuar legíveis (contraste) com os novos tokens.

## 1. Tokens (`tailwind.config.js`, manter os nomes para cascata)
| Token | Novo valor |
|---|---|
| `canvas` | `#0A1628` |
| `surface` | `#0F2238` |
| `subtle` | `#162E4A` |
| `borderline` | `#1F3F63` |
| `ink.DEFAULT` | `#F1F5F9` |
| `ink.muted` | `#8FA3BF` |
| `ink.light` | `#CBD5E1` |
| `emeraldpro.DEFAULT` | `#22C55E` |
| `emeraldpro.hover` | `#4ADE80` (usado também como texto: tem que ser claro) |
| `emeraldpro.soft` | `rgba(34,197,94,0.16)` |
| `amberpro.DEFAULT` | `#FBBF24` (dourado do logo) |
| `amberpro.soft` | `rgba(251,191,36,0.16)` |
| `dangerpro.DEFAULT` | `#F87171` |
| `dangerpro.soft` | `rgba(248,113,113,0.16)` |
Adicionar `gold: '#FBBF24'`, `gold-deep: '#B45309'`, `night: '#050D18'`.
Atenção: `text-white` sobre `bg-emeraldpro` (#22C55E) tem contraste fraco; botões/itens ativos verdes usam texto `text-night` (ou gradiente verde mais escuro `#16A34A` com texto branco). Escolher o que passar contraste ≥ 4.5 e aplicar de forma consistente.

## 2. Tipografia
- `font-score` (Rajdhani) passa a ser a fonte de títulos e números. Em `main.css`, `h1,h2,h3` e `.font-score` ganham `font-family: Rajdhani`, `font-style: italic`, `text-transform: uppercase`, `letter-spacing: .02em` onde fizer sentido (títulos, não parágrafos). Inter só no texto corrido.
- Adicionar peso 700/800 itálico do Rajdhani se necessário (Rajdhani não tem itálico real: usar `font-style: italic` sintético ou `transform: skewX(-8deg)` em títulos; decidir pelo melhor resultado visual).
- Números de placar/stat em dourado com leve `text-shadow` glow.

## 3. `main.css`
- `body`: fundo `canvas` + `radial-gradient` verde translúcido no topo (refletor) + textura sutil de linhas táticas (SVG inline `data:` ou CSS gradients, opacidade ≤ 0.05), `background-attachment: fixed`.
- `selection`: dourado.
- Scrollbar fina escura.
- Utilitários novos: `.clip-notch` (canto chanfrado via `clip-path`), `.glow-gold`, `.glow-green`, `.title-band` (faixa dourada lateral).
- `.pitch-bg` mantido (gramado listrado), ajustar se destoar.

## 4. Componentes base (`src/components/ui/`)
- `BaseCard`: `bg-surface`, borda `borderline`, `rounded-2xl` mantido ou canto chanfrado leve, sombra interna sutil + brilho dourado/verde no hover quando for clicável. Sem `shadow-sm` cinza.
- `BaseButton`: primário verde com bisel (sombra inferior sólida escura, "pressionável": `active:translate-y-px`), texto legível; `soft` com fundo verde translúcido; `secondary` com contorno dourado/azul.
- `Badge`: tons recalibrados para fundo escuro (usar tokens `soft`), `*-solid` com texto escuro.
- `StatTile`: estilo placar de estádio: fundo `night`, borda azul, valor em dourado com glow, rótulo caixa alta pequeno.
- `ProgressBar`: trilho escuro, barra com gradiente e brilho na ponta (visual de barra de energia).
- `SectionTitle`: barra dourada vertical à esquerda, caixa alta, fonte de título.
- `ListRow`, `EmptyState`, `BaseModal`, `ConfirmDialog`, `AppToast`: conferir e ajustar para o escuro (fundo, borda, overlay).

## 5. Layout (`src/components/layout/`)
- `Sidebar`: fundo `night` com borda direita azul; logo maior (h-14) com `drop-shadow` dourado/verde; item ativo = faixa verde com barra dourada à esquerda; badge `AO VIVO` mantém ping; rodapé com versão em "placa" dourada. Hover com fundo `subtle`.
- `Header` e `BottomNav`: mesmo vocabulário (fundo `night`, borda azul, item ativo verde/dourado).
- `index.html`: `theme-color` → `#0A1628`; `apple-mobile-web-app-status-bar-style` → `black-translucent` se não quebrar o safe-area.
- `public/manifest.webmanifest`: `background_color`/`theme_color` → `#0A1628`.

## 6. Pontos de atenção (varredura)
- Hardcoded claros a rever: `bg-white` e `text-white` em `Sidebar.vue` (badges), `TacticalPitch.vue` (borda branca de slot ok), `Scoreboard.vue` e `MatchRecordView.vue` (`text-slate-*`, provavelmente já escuros: conferir).
- Hex fixos de tinta escura (`#0F172A`) em `OutcomeBar.vue`, `EventIcon.vue`, `IdentityEditor.vue`: só alterar se ficarem ilegíveis.
- `PlayerCard.vue` tem tiers próprios (bronze/prata/ouro/elite): não mexer.
- Qualquer `text-emeraldpro-hover` como texto (5 usos) precisa ficar claro sobre fundo escuro.

## 7. Verificação
- `npm run build` passa (único portão do projeto).
- App rodando (`npm run dev`) conferido em desktop e mobile (~390px): sidebar/bottom nav, painel do clube, elenco, partida, mercado. Sem texto ilegível, sem fundo branco residual.

## Fora do escopo
Redesenho das telas, mudança de logo, mudança de versão, novos assets de imagem.

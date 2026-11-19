# Super XI (Super Onze) — Arquitetura Oficial Vue 3 + TypeScript

MVP funcional estruturado conforme o handoff técnico, atualizado com a identidade visual **Daylight Pro (60-30-10 Light Mode)** e o **rebalanceamento econômico**.

## Estrutura de Pastas
```bash
super-xi/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ui/                  # Design System: BaseCard, SectionTitle, ListRow, Badge, BaseButton, EmptyState, AppToast, BaseModal, ConfirmDialog (ver `docs/modais-confirmacao.md`), ClubCrest...
│   │   ├── layout/              # Sidebar.vue, BottomNav.vue, Header.vue
│   │   ├── player/              # PlayerDetails.vue, PlayerCompare.vue, LoanMarketModal.vue
│   │   ├── scouting/            # ScoutMissionCard.vue, ScoutReportCard.vue, YouthAcademyPanel.vue...
│   │   ├── match/               # Scoreboard.vue, MatchEventFeed.vue, PreMatch.vue, SubstitutionDrawer.vue...
│   │   ├── squad/               # SquadRoster.vue, TacticalPitch.vue, IncomingOffersPanel.vue
│   │   ├── competitions/        # CupPanel.vue, ContinentalPanel.vue, SupercupsPanel.vue
│   │   └── club/                # UpgradeCard.vue, FinanceSummary.vue, TrophyRoom.vue, BackupPanel.vue...
│   ├── composables/
│   │   ├── useScouting.ts
│   │   ├── useSquad.ts
│   │   ├── useMatchSimulation.ts
│   │   ├── useClub.ts
│   │   ├── useEconomy.ts
│   │   ├── useSeason.ts
│   │   ├── useHeaderStats.ts    # Chips do header por página
│   │   ├── usePersistence.ts
│   │   └── useNavigation.ts
│   ├── config/                  # Balanceamento e constantes por domínio (economy, match, squad, scouting, staff...); import via '@/config'
│   ├── migrations/              # Migrações de save antigo (legacyBracket, legacyCompetitions, balanceMigration)
│   ├── stores/
│   │   ├── club.ts
│   │   ├── squad.ts
│   │   ├── scouting.ts
│   │   ├── league.ts
│   │   ├── competitions.ts      # Fachada: compõe os módulos abaixo, API pública estável
│   │   ├── modules/competitions/  # cup, continental, finals, groups, save, defaults, types
│   │   ├── market.ts
│   │   ├── match.ts
│   │   └── ui.ts
│   ├── types/
│   │   ├── player.ts
│   │   ├── club.ts
│   │   ├── scouting.ts
│   │   ├── league.ts
│   │   ├── competitions.ts
│   │   ├── market.ts
│   │   ├── match.ts
│   │   └── index.ts
│   ├── utils/                   # Funções puras por domínio, imports diretos (sem barrels)
│   │   ├── core/                # random
│   │   ├── format/              # formatCurrency, formatDuration, formatOver
│   │   ├── identity/            # crest, teamIdentities, matchColors
│   │   ├── player/              # generatePlayer
│   │   ├── match/               # calculateTeamStrength, winChance, narration
│   │   ├── club/                # progression
│   │   ├── bracket/             # bracket, bracketSeeding
│   │   └── league/              # leagueScheduler, leagueKnockout, extraClubs
│   ├── views/
│   │   ├── DashboardView.vue
│   │   ├── ScoutingView.vue
│   │   ├── SquadView.vue
│   │   ├── LeagueView.vue
│   │   ├── CompetitionsView.vue
│   │   ├── HistoryView.vue      # Histórico de partidas (somente leitura)
│   │   ├── HistoryDetailView.vue # Detalhe de uma partida concluída
│   │   ├── MatchView.vue        # Subpágina da partida ao vivo (sem aba própria)
│   │   ├── PreMatchView.vue
│   │   └── ClubView.vue
│   ├── router/
│   │   └── index.ts
│   ├── styles/
│   │   └── main.css
│   ├── App.vue
│   └── main.ts
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── package.json
```

## Como Rodar Localmente
```bash
npm install
npm run dev
```

## Instalar no celular (PWA)
O jogo publicado no GitHub Pages pode ser instalado como app e abre sem internet. O save continua no `localStorage`, igual ao navegador.
- **Android (Chrome):** aparece o aviso "Instalar o Super XI" com o botão Instalar, ou menu do Chrome > Instalar app.
- **iPhone (Safari):** Compartilhar > Adicionar à Tela de Início (o aviso do jogo mostra o passo a passo).
- Arquivos: `public/manifest.webmanifest`, `public/sw.js` (cache do jogo) e os ícones `icon-*.png`. O service worker só é registrado no build de produção; no `npm run dev` ele fica desligado.
- Se mudar a lógica de `public/sw.js`, troque `VERSION` nele para descartar os caches antigos (os arquivos do jogo têm hash no nome e se renovam sozinhos).

## Roadmap de Evolução
- [x] **Fase 1:** Arquitetura Vue 3 + TS + Pinia + Tailwind (Daylight Pro) + Economia Calibrada
- [x] **Fase 2 (Pendente de Execução):** Novos mecanismos (Tabela de classificação da liga com 10 clubes, contratações por empréstimo / renovação de contrato e histórico de transferências)
- [x] **Fase 2.3:** Histórico de Transferências & Movimentações, Galeria de Troféus/Acessos, Artilharia Individual e Moeda Oficial em **R$**
- [x] **Fase 3 (Completa):** Copa Nacional Eliminatória (3.1), Treinamento Individual Direcionado (3.2), Substituições ao Vivo (3.3) e Ranking de Treinadores + Backup Portátil (3.4)
- [x] **Fase 4 (Completa):** Torneio Continental (Copa Condor de Ouro e de Prata) (4.1), Identidade & Cores do Clube (4.2) e Fadiga Física / Stamina (4.3)
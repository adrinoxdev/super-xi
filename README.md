# Super XI (Super Onze) — Arquitetura Oficial Vue 3 + TypeScript

MVP funcional estruturado conforme o handoff técnico, atualizado com a identidade visual **Daylight Pro (60-30-10 Light Mode)** e o **rebalanceamento econômico**.

## Estrutura de Pastas
```bash
super-xi/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ui/                  # Design System: AppToast, BaseModal, ClubCrest, ProgressBar, StatTile...
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
│   │   ├── usePersistence.ts
│   │   └── useNavigation.ts
│   ├── stores/
│   │   ├── club.ts
│   │   ├── squad.ts
│   │   ├── scouting.ts
│   │   ├── league.ts
│   │   ├── competitions.ts
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
│   ├── utils/
│   │   ├── generatePlayer.ts
│   │   ├── calculateTeamStrength.ts
│   │   ├── leagueScheduler.ts
│   │   ├── random.ts
│   │   ├── formatCurrency.ts
│   │   └── constants.ts
│   ├── views/
│   │   ├── DashboardView.vue
│   │   ├── ScoutingView.vue
│   │   ├── SquadView.vue
│   │   ├── LeagueView.vue
│   │   ├── CompetitionsView.vue
│   │   ├── MatchView.vue
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

## Roadmap de Evolução
- [x] **Fase 1:** Arquitetura Vue 3 + TS + Pinia + Tailwind (Daylight Pro) + Economia Calibrada
- [x] **Fase 2 (Pendente de Execução):** Novos mecanismos (Tabela de classificação da liga com 10 clubes, contratações por empréstimo / renovação de contrato e histórico de transferências)
- [x] **Fase 2.3:** Histórico de Transferências & Movimentações, Galeria de Troféus/Acessos, Artilharia Individual e Moeda Oficial em **R$**
- [x] **Fase 3 (Completa):** Copa Nacional Eliminatória (3.1), Treinamento Individual Direcionado (3.2), Substituições ao Vivo (3.3) e Ranking de Treinadores + Backup Portátil (3.4)
- [x] **Fase 4 (Completa):** Torneio Continental (Copa Condor de Ouro e de Prata) (4.1), Identidade & Cores do Clube (4.2) e Fadiga Física / Stamina (4.3)
<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'
import { computed } from 'vue'
import { useClubStore } from '@/stores/club'
import { useClub } from '@/composables/useClub'
import { CREST_SHAPES, CREST_COLORS, CREST_PATTERNS, CREST_ORIENTATIONS, CREST_STRIPE_OPTIONS } from '@/config'
import ClubCrest from '@/components/ui/ClubCrest.vue'
import CustomColorPicker from '@/components/ui/CustomColorPicker.vue'
import { contrastRatio, mixHex } from '@/utils/identity/crest'

const club = useClubStore()
const {
  saveIdentity,
  setShortName,
  setCrestShape,
  setPrimaryColor,
  setSecondaryColor,
  setCrestTextColor,
  setCrestTextStroke,
  setCrestPattern,
  setCrestOrientation,
  setCrestStripes
} = useClub()

const textBg = computed(() => (club.crestPattern === 'liso' ? club.primaryColor : mixHex(club.primaryColor, club.secondaryColor)))
const lowContrast = computed(() => club.crestTextColor !== 'auto' && contrastRatio(club.crestTextColor, textBg.value) < 3)
const isText = (c: string) => club.crestTextColor.toLowerCase() === c.toLowerCase()
// Mesma paleta do escudo: o #0F172A já é o "preto"; um #000000 extra só repetia a cor.
const TEXT_COLORS = CREST_COLORS

const chip = (on: boolean) => [
  'px-2.5 py-1 rounded-lg text-xs font-bold border',
  on ? 'bg-emeraldpro text-white border-emeraldpro' : 'bg-subtle text-ink-muted border-borderline'
]
</script>

<template>
  <BaseCard padding="p-4 sm:p-6" class="space-y-5">
    <div class="min-w-0">
      <h2 class="text-lg sm:text-xl font-bold text-ink break-words">Identidade & Escudo do Clube</h2>
      <p class="text-xs text-ink-muted break-words">Personalize nome, sigla, estádio, formato, padrão e cores do escudo.</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
      <!-- Coluna esquerda: prévia + dados -->
      <div class="min-w-0 rounded-xl border border-borderline bg-subtle p-4 space-y-4 lg:self-start">
        <div class="flex flex-col items-center gap-3 text-center">
          <div class="w-32 h-40 flex items-center justify-center overflow-hidden">
            <div class="scale-[2.2] origin-center">
              <ClubCrest size="lg" />
            </div>
          </div>
          <div class="min-w-0 max-w-full">
            <p class="text-base font-bold text-ink break-words">{{ club.name }}</p>
            <p class="text-xs text-ink-muted break-words">{{ club.shortName }} · {{ club.stadiumName }}</p>
          </div>
        </div>

        <div class="border-t border-borderline pt-4 space-y-3 text-xs">
          <h3 class="text-[11px] font-bold uppercase text-ink-muted">Dados do clube</h3>
          <div class="min-w-0">
            <label class="font-bold text-ink block mb-1">Nome do Clube</label>
            <input
              v-model="club.name"
              @change="saveIdentity"
              maxlength="24"
              class="w-full px-3 py-2 rounded-xl bg-surface border border-borderline font-semibold text-ink"
            />
          </div>
          <div class="min-w-0">
            <label class="font-bold text-ink block mb-1">Sigla (3 Letras)</label>
            <input
              :value="club.shortName"
              @input="setShortName(($event.target as HTMLInputElement).value)"
              @change="saveIdentity"
              maxlength="3"
              class="w-full px-3 py-2 rounded-xl bg-surface border border-borderline font-bold text-ink uppercase"
            />
          </div>
          <div class="min-w-0">
            <label class="font-bold text-ink block mb-1">Nome do Estádio</label>
            <input
              v-model="club.stadiumName"
              @change="saveIdentity"
              maxlength="28"
              class="w-full px-3 py-2 rounded-xl bg-surface border border-borderline font-semibold text-ink"
            />
          </div>
        </div>
      </div>

      <!-- Coluna direita: escudo + cores -->
      <div class="min-w-0 lg:col-span-2 space-y-6">
        <section class="space-y-4">
          <h3 class="text-[11px] font-bold uppercase text-ink-muted">Escudo</h3>

          <div class="space-y-2">
            <span class="text-xs font-bold text-ink block">Formato</span>
            <div class="grid grid-cols-3 sm:grid-cols-5 gap-3">
              <button
                type="button"
                v-for="sh in CREST_SHAPES"
                :key="sh.id"
                @click="setCrestShape(sh.id)"
                :aria-pressed="club.crestShape === sh.id"
                :class="[
                  'flex flex-col items-center gap-1.5 p-2.5 rounded-xl border',
                  club.crestShape === sh.id ? 'border-emeraldpro bg-emeraldpro/10' : 'border-borderline bg-subtle'
                ]"
              >
                <ClubCrest size="sm" :shape="sh.id" />
                <span class="text-[10px] font-bold text-ink-muted leading-tight text-center">{{ sh.label }}</span>
              </button>
            </div>
          </div>

          <div class="space-y-2">
            <span class="text-xs font-bold text-ink block">Padrão</span>
            <div class="flex flex-wrap gap-1.5">
              <button type="button" v-for="p in CREST_PATTERNS" :key="p.id" @click="setCrestPattern(p.id)" :class="chip(club.crestPattern === p.id)">
                {{ p.label }}
              </button>
            </div>
          </div>

          <template v-if="club.crestPattern !== 'liso'">
            <div class="space-y-2">
              <span class="text-xs font-bold text-ink block">Orientação</span>
              <div class="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  v-for="o in CREST_ORIENTATIONS"
                  :key="o.id"
                  @click="setCrestOrientation(o.id)"
                  :class="chip(club.crestOrientation === o.id)"
                >
                  {{ o.label }}
                </button>
              </div>
            </div>
            <div v-if="club.crestPattern === 'listras' || club.crestPattern === 'xadrez'" class="space-y-2">
              <span class="text-xs font-bold text-ink block">{{ club.crestPattern === 'xadrez' ? 'Casas' : 'Listras' }}</span>
              <div class="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  v-for="s in CREST_STRIPE_OPTIONS"
                  :key="s.value"
                  @click="setCrestStripes(s.value)"
                  :class="chip(club.crestStripes === s.value)"
                >
                  {{ s.label }}
                </button>
              </div>
            </div>
          </template>
        </section>

        <section class="border-t border-borderline pt-5 space-y-4">
          <h3 class="text-[11px] font-bold uppercase text-ink-muted">Cores</h3>

          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span class="text-xs font-bold text-ink sm:w-32 shrink-0">Cor primária</span>
            <div class="flex flex-wrap items-center gap-2.5 min-w-0">
              <button
                type="button"
                v-for="c in CREST_COLORS"
                :key="'p' + c"
                @click="setPrimaryColor(c)"
                :aria-label="`Cor primária ${c}`"
                :style="{ backgroundColor: c }"
                :class="club.primaryColor.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-offset-2 ring-ink scale-110' : ''"
                class="w-7 h-7 rounded-full border border-borderline transition-transform"
              ></button>
              <CustomColorPicker :model-value="club.primaryColor" :presets="CREST_COLORS" label="cor primária" @pick="setPrimaryColor" />
            </div>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span class="text-xs font-bold text-ink sm:w-32 shrink-0">Cor secundária</span>
            <div class="flex flex-wrap items-center gap-2.5 min-w-0">
              <button
                type="button"
                v-for="c in CREST_COLORS"
                :key="'s' + c"
                @click="setSecondaryColor(c)"
                :aria-label="`Cor secundária ${c}`"
                :style="{ backgroundColor: c }"
                :class="club.secondaryColor.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-offset-2 ring-ink scale-110' : ''"
                class="w-7 h-7 rounded-full border border-borderline transition-transform"
              ></button>
              <CustomColorPicker :model-value="club.secondaryColor" :presets="CREST_COLORS" label="cor secundária" @pick="setSecondaryColor" />
            </div>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span class="text-xs font-bold text-ink sm:w-32 shrink-0">Cor das iniciais</span>
            <div class="flex flex-wrap items-center gap-2.5 min-w-0">
              <button
                type="button"
                @click="setCrestTextColor('auto')"
                aria-label="Cor das iniciais automática"
                title="Automática"
                :aria-pressed="club.crestTextColor === 'auto'"
                :style="{ background: 'linear-gradient(135deg, #ffffff 50%, #0F172A 50%)' }"
                :class="club.crestTextColor === 'auto' ? 'ring-2 ring-offset-2 ring-ink scale-110' : ''"
                class="w-7 h-7 rounded-full border border-borderline transition-transform"
              ></button>
              <button
                type="button"
                v-for="c in TEXT_COLORS"
                :key="'t' + c"
                @click="setCrestTextColor(c)"
                :aria-label="`Cor das iniciais ${c}`"
                :style="{ backgroundColor: c }"
                :class="isText(c) ? 'ring-2 ring-offset-2 ring-ink scale-110' : ''"
                class="w-7 h-7 rounded-full border border-borderline transition-transform"
              ></button>
              <CustomColorPicker :model-value="club.crestTextColor" :presets="TEXT_COLORS" label="cor das iniciais" @pick="setCrestTextColor" />
            </div>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span class="text-xs font-bold text-ink sm:w-32 shrink-0">Borda das iniciais</span>
            <div class="flex flex-wrap items-center gap-2.5 min-w-0">
              <button
                type="button"
                @click="setCrestTextStroke('auto')"
                aria-label="Borda das iniciais automática"
                title="Automática"
                :aria-pressed="club.crestTextStroke === 'auto'"
                :style="{ background: 'linear-gradient(135deg, #ffffff 50%, #0F172A 50%)' }"
                :class="club.crestTextStroke === 'auto' ? 'ring-2 ring-offset-2 ring-ink scale-110' : ''"
                class="w-7 h-7 rounded-full border border-borderline transition-transform"
              ></button>
              <button
                type="button"
                v-for="c in TEXT_COLORS"
                :key="'b' + c"
                @click="setCrestTextStroke(c)"
                :aria-label="`Borda das iniciais ${c}`"
                :style="{ backgroundColor: c }"
                :class="club.crestTextStroke.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-offset-2 ring-ink scale-110' : ''"
                class="w-7 h-7 rounded-full border border-borderline transition-transform"
              ></button>
              <CustomColorPicker :model-value="club.crestTextStroke" :presets="TEXT_COLORS" label="borda das iniciais" @pick="setCrestTextStroke" />
            </div>
          </div>

          <p v-if="lowContrast" class="text-[11px] text-ink-muted break-words" role="status">
            Atenção: contraste baixo entre as iniciais e o fundo do escudo. Pode ficar difícil de ler.
          </p>
        </section>
      </div>
    </div>
  </BaseCard>
</template>

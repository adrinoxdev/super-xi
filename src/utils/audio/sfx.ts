/**
 * Efeitos sonoros do jogo, sintetizados com Web Audio (sem arquivos de áudio: nada para baixar ou licenciar).
 * Os sons são aproximações sintéticas: apito, torcida, "aaah" de lamento, "uhh" de dor e aplausos.
 */

type SfxSettings = { muted: boolean; volume: number }

const STORAGE_KEY = 'superxi.sfx'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
const settings: SfxSettings = loadSettings()

function loadSettings(): SfxSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<SfxSettings>
      return { muted: !!p.muted, volume: typeof p.volume === 'number' ? Math.min(1, Math.max(0, p.volume)) : 0.7 }
    }
  } catch {
    /* sem storage: usa o padrão */
  }
  return { muted: false, volume: 0.7 }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    /* ignora */
  }
}

export function isSfxMuted(): boolean {
  return settings.muted
}

export function setSfxMuted(muted: boolean) {
  settings.muted = muted
  saveSettings()
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : settings.volume, ctx.currentTime, 0.02)
}

/** Garante o AudioContext (criado sob demanda: navegadores só liberam áudio após um gesto do usuário). */
function audio(): { c: AudioContext; out: GainNode } | null {
  if (settings.muted) return null
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
      master = ctx.createGain()
      master.gain.value = settings.volume
      const comp = ctx.createDynamicsCompressor()
      master.connect(comp)
      comp.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return { c: ctx, out: master! }
  } catch {
    return null
  }
}

/** Ruído rosa (mais grave que o branco: soa como multidão, não como chiado). */
function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 3, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.969 * b2 + w * 0.153852
      b3 = 0.8665 * b3 + w * 0.3104856
      b4 = 0.55 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.016898
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    }
  }
  return noiseBuf
}

function noiseSource(c: AudioContext, start: number, dur: number): AudioBufferSourceNode {
  const s = c.createBufferSource()
  s.buffer = noise(c)
  s.loop = true
  s.start(start, Math.random())
  s.stop(start + dur)
  return s
}

// ---------- Apito ----------

/** Um sopro de apito (bolinha de cortiça: tom ~3 kHz com trinado rápido). */
function blast(c: AudioContext, out: GainNode, at: number, dur: number, vol = 0.32) {
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(2850, at)
  osc.frequency.linearRampToValueAtTime(3050, at + dur)
  const trill = c.createOscillator()
  trill.frequency.value = 42
  const trillAmt = c.createGain()
  trillAmt.gain.value = 140
  trill.connect(trillAmt)
  trillAmt.connect(osc.frequency)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + 0.02)
  g.gain.setValueAtTime(vol, at + dur - 0.04)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(g)
  // Sopro de ar junto do tom.
  const air = noiseSource(c, at, dur)
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 3500
  const ag = c.createGain()
  ag.gain.value = vol * 0.18
  air.connect(hp)
  hp.connect(ag)
  ag.connect(g)
  g.connect(out)
  osc.start(at)
  trill.start(at)
  osc.stop(at + dur + 0.02)
  trill.stop(at + dur + 0.02)
}

export type WhistleKind = 'start' | 'half' | 'full' | 'foul' | 'offside' | 'penalty' | 'stop'

/**
 * Apito conforme a regra do jogo:
 * início e 2º tempo = 1 apito médio; intervalo e fim = 3 apitos longos; falta/impedimento = 1 seco;
 * pênalti = 1 longo e firme; lance parado (lesão, briga) = 2 curtos.
 */
export function playWhistle(kind: WhistleKind) {
  const a = audio()
  if (!a) return
  const t = a.c.currentTime + 0.02
  const { c, out } = a
  switch (kind) {
    case 'start':
      blast(c, out, t, 0.55)
      break
    case 'half':
    case 'full':
      blast(c, out, t, 0.5)
      blast(c, out, t + 0.62, 0.5)
      blast(c, out, t + 1.24, 0.85)
      break
    case 'foul':
    case 'offside':
      blast(c, out, t, 0.26)
      break
    case 'penalty':
      blast(c, out, t, 0.9)
      break
    case 'stop':
      blast(c, out, t, 0.2)
      blast(c, out, t + 0.28, 0.2)
      break
  }
}

// ---------- Torcida ----------

/** Curva de ganho irregular (muitas vozes se somando, sem pulsar de forma regular). */
function randomCurve(n: number, depth: number): Float32Array {
  const v = new Float32Array(n)
  for (let i = 0; i < n; i++) v[i] = 1 - depth * Math.random()
  return v
}

/**
 * Rugido da torcida: ruído rosa em 3 faixas (corpo, voz, brilho) com ataque rápido, queda longa e oscilação irregular.
 * `power` 0..1.
 */
function crowdRoar(c: AudioContext, out: GainNode, at: number, dur: number, power: number, centre = 1100) {
  const layers: Array<{ f: number; q: number; vol: number }> = [
    { f: centre * 0.35, q: 0.6, vol: 1 },
    { f: centre, q: 0.8, vol: 0.9 },
    { f: centre * 2.4, q: 0.7, vol: 0.35 }
  ]
  const env = c.createGain()
  const peak = 0.9 * power
  const rise = Math.min(0.25, dur * 0.12)
  env.gain.setValueAtTime(0.0001, at)
  env.gain.exponentialRampToValueAtTime(peak, at + rise)
  env.gain.setTargetAtTime(peak * 0.55, at + rise, dur * 0.18)
  env.gain.setTargetAtTime(0.0001, at + dur * 0.7, dur * 0.12)
  env.connect(out)
  for (const l of layers) {
    const src = noiseSource(c, at, dur + 0.5)
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = l.f
    bp.Q.value = l.q
    const am = c.createGain()
    am.gain.setValueCurveAtTime(randomCurve(Math.max(4, Math.round(dur * 9)), 0.35), at, dur)
    const g = c.createGain()
    g.gain.value = l.vol * 2.2
    src.connect(bp)
    bp.connect(am)
    am.connect(g)
    g.connect(env)
  }
}

/** Vogal coletiva ("aaah", "uuh"): vários serrotes desafinados passando por filtros de formante. */
function crowdVowel(
  c: AudioContext,
  out: GainNode,
  at: number,
  dur: number,
  f0: number,
  f0End: number,
  formants: [number, number],
  vol: number
) {
  // Filtros de formante (Q alto) deixam passar pouco sinal: ganho de compensação.
  const loud = vol * 9
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(loud, at + 0.12)
  g.gain.setValueAtTime(loud, at + dur * 0.5)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  for (const fm of formants) {
    const f = c.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = fm
    f.Q.value = 5
    const fg = c.createGain()
    fg.gain.value = fm === formants[0] ? 1 : 0.6
    f.connect(fg)
    fg.connect(g)
    for (let i = 0; i < 6; i++) {
      const o = c.createOscillator()
      o.type = 'sawtooth'
      const detune = (Math.random() - 0.5) * 70
      o.detune.value = detune
      const base = f0 * (0.85 + Math.random() * 0.5)
      const end = f0End * (base / f0)
      o.frequency.setValueAtTime(base, at)
      o.frequency.exponentialRampToValueAtTime(end, at + dur)
      const og = c.createGain()
      og.gain.value = 0.16
      o.connect(og)
      og.connect(f)
      o.start(at)
      o.stop(at + dur + 0.05)
    }
  }
  // Fôlego da multidão por baixo da vogal.
  const air = noiseSource(c, at, dur)
  const abp = c.createBiquadFilter()
  abp.type = 'bandpass'
  abp.frequency.value = formants[1]
  abp.Q.value = 1
  const ag = c.createGain()
  ag.gain.value = 0.35
  air.connect(abp)
  abp.connect(ag)
  ag.connect(g)
  g.connect(out)
}

/** Gol (ou vitória): torcida explode. `big` deixa mais longo e forte. */
export function playCheer(big = false) {
  const a = audio()
  if (!a) return
  const t = a.c.currentTime + 0.02
  crowdRoar(a.c, a.out, t, big ? 4.5 : 3.2, big ? 1 : 0.8, 1000)
}

/** Lamento da arquibancada: "Aaah!" descendente (derrota, gol sofrido, chance perdida). */
export function playGroan(strong = true) {
  const a = audio()
  if (!a) return
  const t = a.c.currentTime + 0.02
  const dur = strong ? 1.7 : 1.1
  crowdVowel(a.c, a.out, t, dur, 300, 170, [750, 1150], strong ? 0.2 : 0.14)
  crowdRoar(a.c, a.out, t, dur, strong ? 0.35 : 0.22, 700)
}

/** "Uhh!" curto de dor/susto da torcida (falta dura, lesão). */
export function playOuch() {
  const a = audio()
  if (!a) return
  const t = a.c.currentTime + 0.02
  crowdVowel(a.c, a.out, t, 0.7, 260, 190, [320, 900], 0.2)
}

/**
 * Bola na trave: pancada seca da bola + "tlim" metálico do poste (tubo de aço: parciais inarmônicos que somem rápido).
 * É um som físico, igual para os dois lados.
 */
export function playPostHit() {
  const a = audio()
  if (!a) return
  const { c, out } = a
  const t = c.currentTime + 0.02
  const g = c.createGain()
  g.gain.value = 0.6
  g.connect(out)
  // Impacto: tum grave curto + estalo de couro/ar.
  const thud = c.createOscillator()
  thud.type = 'sine'
  thud.frequency.setValueAtTime(150, t)
  thud.frequency.exponentialRampToValueAtTime(55, t + 0.08)
  const tg = c.createGain()
  tg.gain.setValueAtTime(0.7, t)
  tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
  thud.connect(tg)
  tg.connect(g)
  thud.start(t)
  thud.stop(t + 0.12)
  const click = noiseSource(c, t, 0.03)
  const chp = c.createBiquadFilter()
  chp.type = 'highpass'
  chp.frequency.value = 1800
  const cg = c.createGain()
  cg.gain.setValueAtTime(0.45, t)
  cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03)
  click.connect(chp)
  chp.connect(cg)
  cg.connect(g)
  // Ressonância do poste: parciais de um tubo, os agudos morrem primeiro.
  const detune = 0.97 + Math.random() * 0.06
  const partials: Array<[number, number, number]> = [
    [410, 0.5, 0.55],
    [1080, 0.38, 0.38],
    [1950, 0.24, 0.24],
    [3100, 0.14, 0.14]
  ]
  for (const [f, vol, decay] of partials) {
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.value = f * detune
    const pg = c.createGain()
    pg.gain.setValueAtTime(vol, t + 0.004)
    pg.gain.exponentialRampToValueAtTime(0.0001, t + 0.004 + decay)
    o.connect(pg)
    pg.connect(g)
    o.start(t)
    o.stop(t + decay + 0.05)
  }
}

/** "Ohhh!" de quase-gol (bola na trave): sobe e cai. */
export function playOoh() {
  const a = audio()
  if (!a) return
  const t = a.c.currentTime + 0.02
  crowdVowel(a.c, a.out, t, 1.3, 230, 340, [450, 1000], 0.18)
  crowdRoar(a.c, a.out, t + 0.1, 1.1, 0.25, 900)
}

/** Aplausos: rajada densa de estalos filtrados que cresce e some. */
export function playApplause(seconds = 5) {
  const a = audio()
  if (!a) return
  const { c, out } = a
  const t = c.currentTime + 0.02
  const src = noiseSource(c, t, seconds + 0.2)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2600
  bp.Q.value = 0.5
  // Estalos: ganho modulado por um oscilador rápido e irregular.
  const clap = c.createGain()
  clap.gain.value = 0.35
  const lfo = c.createOscillator()
  lfo.type = 'square'
  lfo.frequency.value = 17
  const lfo2 = c.createOscillator()
  lfo2.type = 'square'
  lfo2.frequency.value = 23
  const lg = c.createGain()
  lg.gain.value = 0.3
  lfo.connect(lg)
  lfo2.connect(lg)
  lg.connect(clap.gain)
  const env = c.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(0.9, t + 0.8)
  env.gain.setValueAtTime(0.9, t + seconds * 0.65)
  env.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
  src.connect(bp)
  bp.connect(clap)
  clap.connect(env)
  env.connect(out)
  lfo.start(t)
  lfo2.start(t)
  lfo.stop(t + seconds + 0.2)
  lfo2.stop(t + seconds + 0.2)
  crowdRoar(c, out, t, seconds, 0.45, 1500)
}

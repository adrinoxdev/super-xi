import { computed, ref } from 'vue'

// Instalação como app (PWA). Android/Chrome/Edge disparam `beforeinstallprompt` e deixam instalar com um toque.
// O iOS não tem esse evento: só dá para "Adicionar à Tela de Início" pelo menu Compartilhar, então mostramos a dica.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'super_xi_install_dismissed'
const DISMISS_DAYS = 14

function readDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000
  } catch {
    return false
  }
}

function runningAsApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// Estado único para o app todo: o evento do navegador só dispara uma vez.
const deferred = ref<BeforeInstallPromptEvent | null>(null)
const installed = ref(false)
const dismissed = ref(false)
let started = false

function start() {
  if (started) return
  started = true
  installed.value = runningAsApp()
  dismissed.value = readDismissed()
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // guarda o evento para o botão Instalar, em vez do mini-aviso do navegador
    deferred.value = e as BeforeInstallPromptEvent
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    deferred.value = null
  })
}

export function useInstallPrompt() {
  start()

  /** O navegador oferece instalação (Android/desktop) e o usuário ainda não dispensou. */
  const canInstall = computed(() => !!deferred.value && !installed.value && !dismissed.value)
  /** iPhone/iPad no navegador: instalação manual pelo menu Compartilhar. */
  const showIosHint = computed(() => isIos() && !installed.value && !dismissed.value)

  function dismiss() {
    dismissed.value = true
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* sem armazenamento: o aviso só some até recarregar */
    }
  }

  async function install() {
    const event = deferred.value
    if (!event) return
    await event.prompt()
    const { outcome } = await event.userChoice
    deferred.value = null
    if (outcome === 'dismissed') dismiss()
  }

  return { canInstall, showIosHint, install, dismiss }
}

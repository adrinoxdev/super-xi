import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import './styles/main.css'

createApp(App).use(createPinia()).use(router).mount('#app')

// App instalável e abrindo sem internet (PWA). Só em produção: no `vite dev` o cache atrapalharia as mudanças ao vivo.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* sem service worker o jogo funciona igual, só não instala nem abre offline */
    })
  })
}

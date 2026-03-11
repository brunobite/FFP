export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.info('[pwa] service worker registrado', { scope: registration.scope })

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return

          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              console.info('[pwa] nova versão disponível; atualize para obter correções.')
            }
          })
        })
      },
      (error) => {
        console.warn('[pwa] falha ao registrar service worker', error)
      },
    )
  })
}

import { useEffect, useReducer } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const subscribers = new Set<() => void>()
const notify = () => subscribers.forEach((f) => f())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as InstallPromptEvent
  notify()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  notify()
})

export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Estado de instalación: aviso nativo (Android/escritorio) o instrucciones (iPhone). */
export function useInstall() {
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    subscribers.add(force)
    return () => void subscribers.delete(force)
  }, [])
  const installed = isStandalone()
  return {
    installed,
    canPrompt: !installed && !!deferred,
    iosManual: !installed && !deferred && isIOS(),
    async prompt() {
      if (!deferred) return false
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      deferred = null
      notify()
      return outcome === 'accepted'
    },
  }
}

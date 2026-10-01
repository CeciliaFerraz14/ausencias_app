import { Download, RefreshCw, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useInstall } from '../lib/pwa'
import { useUI } from '../lib/ui'

const DISMISS_KEY = 'ausencias:install-dismissed'

/** Tarjeta que invita a instalar la app (aviso nativo o instrucciones en iPhone). */
export function InstallBanner() {
  const install = useInstall()
  const ui = useUI()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  const show = !dismissed && (install.canPrompt || install.iosManual)

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* sin almacenamiento */
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="card mt-5 flex items-center gap-3 p-3 pl-4">
            <img src="/icon-192.png" alt="" className="size-11 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">Instala la app</p>
              <p className="text-sm text-muted">Ábrela desde tu pantalla de inicio.</p>
            </div>
            <button
              type="button"
              className="btn-primary min-h-10 rounded-xl px-3.5 text-sm"
              onClick={() => (install.canPrompt ? install.prompt() : ui.openSheet({ kind: 'install-ios' }))}
            >
              <Download size={16} /> Instalar
            </button>
            <button type="button" onClick={dismiss} aria-label="No mostrar más" className="grid size-8 place-items-center rounded-full text-muted hover:bg-soft">
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Avisa cuando hay una versión nueva de la app lista para usar. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Comprueba si hay versión nueva cada hora mientras la app está abierta.
      if (registration) setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000)
    },
  })

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+12px)] z-[70] flex justify-center px-4"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-[#1d1934] py-2.5 pr-2.5 pl-4 text-sm font-semibold text-white shadow-xl ring-1 ring-white/10">
            Hay una versión nueva
            <button type="button" onClick={() => updateServiceWorker(true)} className="brand-gradient inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-bold">
              <RefreshCw size={14} /> Actualizar
            </button>
            <button type="button" onClick={() => setNeedRefresh(false)} aria-label="Más tarde" className="grid size-8 place-items-center rounded-full text-white/60 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

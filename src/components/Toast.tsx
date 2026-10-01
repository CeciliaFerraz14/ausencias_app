import { AnimatePresence, motion } from 'motion/react'
import type { ToastAction } from '../lib/ui'

export type ToastData = { id: number; text: string; action?: ToastAction }

export function Toast({ toast, onDone }: { toast: ToastData | null; onDone: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-[60] flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex max-w-md items-center gap-4 rounded-2xl bg-[#1d1934] px-4 py-3 text-sm font-medium text-white shadow-xl shadow-black/20 ring-1 ring-white/10"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 400 }}
          >
            <span>{toast.text}</span>
            {toast.action && (
              <button
                type="button"
                className="shrink-0 font-bold text-fuchsia-300 hover:text-fuchsia-200"
                onClick={() => {
                  toast.action!.run()
                  onDone()
                }}
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

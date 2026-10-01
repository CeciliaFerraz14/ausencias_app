import { X } from 'lucide-react'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

/** Panel inferior animado; se cierra arrastrando hacia abajo, con Escape o tocando fuera. */
export function Sheet({ open, onClose, title, children, footer }: Props) {
  const drag = useDragControls()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            className="absolute inset-0 bg-[#0d0b18]/45 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[2rem] bg-card shadow-2xl ring-1 ring-line sm:rounded-[2rem]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%', transition: { duration: 0.22, ease: 'easeIn' } }}
            transition={{ type: 'spring', damping: 34, stiffness: 380 }}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose()
            }}
          >
            <div className="touch-none cursor-grab select-none px-5 pt-3 active:cursor-grabbing" onPointerDown={(e) => drag.start(e)}>
              <div className="mx-auto h-1.5 w-11 rounded-full bg-muted/25" />
              <div className="flex items-center justify-between pt-3 pb-2">
                <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="grid size-9 place-items-center rounded-full bg-soft text-muted transition hover:text-fg"
                  aria-label="Cerrar"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
            {footer && <div className="border-t border-line px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)]">{footer}</div>}
            {!footer && <div className="pb-[calc(env(safe-area-inset-bottom)+8px)]" />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
